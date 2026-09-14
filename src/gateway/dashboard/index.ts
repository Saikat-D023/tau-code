/**
 * dashboard/index.ts — Web Dashboard Gateway.
 * 
 * Serves the static dashboard UI and live API routes.
 */

import { Hono } from 'hono';
import { serveStatic } from 'hono/bun';
import type { Agent, Observer } from '../../core/loop.ts';
import type { GatewayAdapter } from '../types.ts';
import { UsageLedger } from '../../core/ops/usage.ts';
import { Tracer } from '../../core/ops/tracing.ts';
import { db } from '../../core/memory/schema.ts';
import { SkillRegistry } from '../../core/memory/skills.ts';
import { SOUL_PATH, VERSION_PATH } from '../../core/tau-dir.ts';
import { triageGraphDef } from '../../core/graph/triage.ts';
import { requiresConfirmation } from '../../core/permission-gate.ts';
import { listAuthenticatedProviders, getActiveProvider, getCredential, type ProviderId } from '../../core/auth/store.ts';
import * as fs from 'node:fs';

/** Last `n` YYYY-MM-DD date strings, oldest first — used to build sparkline series. */
function lastNDays(n: number): string[] {
    const days: string[] = [];
    for (let i = n - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        days.push(d.toISOString().slice(0, 10));
    }
    return days;
}

function providerForModel(model: string): ProviderId {
    return /claude/i.test(model) ? 'claude' : 'openai';
}

export class DashboardGateway implements GatewayAdapter {
    private app = new Hono();
    private server?: ReturnType<typeof Bun.serve>;
    private usage = new UsageLedger();
    private tracer = new Tracer();
    private skills = new SkillRegistry();

    async start(agent: Agent) {
        // Chat Streaming API
        this.app.post('/api/chat', async (c) => {
            const body = await c.req.json();
            const message = body.message;
            const sessionId = body.sessionId || 'web-session';

            const stream = new ReadableStream({
                start: (controller) => {
                    const encoder = new TextEncoder();
                    const observer: Observer = (kind, event) => {
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ kind, ...event })}\n\n`));
                    };

                    agent.processTurn(message, { source: 'dashboard', sessionId, observer })
                        .then((result) => {
                            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ kind: 'done', reply: result.reply })}\n\n`));
                            controller.close();
                        })
                        .catch((error) => {
                            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ kind: 'error', message: error.message })}\n\n`));
                            controller.close();
                        });
                },
            });

            return new Response(stream, {
                headers: { 
                    'Content-Type': 'text/event-stream', 
                    'Cache-Control': 'no-cache',
                    'Connection': 'keep-alive'
                },
            });
        });

        // Overview API
        this.app.get('/api/overview', (c) => {
            const usageTotals = this.usage.getTotals();
            const gateStats = this.tracer.getGateStats();
            const days = lastNDays(14);

            let facts = 0;
            let events = 0;
            let factsByDay: Record<string, number> = {};
            let episodesByDay: Record<string, number> = {};
            try {
                facts = (db.query(`SELECT COUNT(*) as c FROM facts`).get() as any).c;
                events = (db.query(`SELECT COUNT(*) as c FROM episodes`).get() as any).c;

                const factRows = db.query(`
                    SELECT date(created_at, 'unixepoch') as day, COUNT(*) as c
                    FROM facts GROUP BY day
                `).all() as any[];
                factsByDay = Object.fromEntries(factRows.map(r => [r.day, r.c]));

                const epRows = db.query(`
                    SELECT date(created_at, 'unixepoch') as day, COUNT(*) as c
                    FROM episodes GROUP BY day
                `).all() as any[];
                episodesByDay = Object.fromEntries(epRows.map(r => [r.day, r.c]));
            } catch {}

            // Sessions active per day, from the session store's turn timestamps.
            let sessionsByDay: Record<string, number> = {};
            try {
                const sessions = agent.store.listSessions(200);
                for (const s of sessions) {
                    const day = (s.lastActivity || '').slice(0, 10);
                    if (!day) continue;
                    sessionsByDay[day] = (sessionsByDay[day] || 0) + 1;
                }
            } catch {}

            // Retrieval Gate hit rate per day, from trace files.
            let gateRateByDay: Record<string, number> = {};
            for (const day of days) {
                try {
                    const events = this.tracer.readDate(day);
                    let retrieved = 0, skipped = 0;
                    for (const e of events) {
                        if (e.kind === 'gate_decision') {
                            if (e.decision === 'retrieve') retrieved++;
                            else if (e.decision === 'skip') skipped++;
                        }
                    }
                    const total = retrieved + skipped;
                    gateRateByDay[day] = total > 0 ? Math.round((retrieved / total) * 100) : 0;
                } catch {
                    gateRateByDay[day] = 0;
                }
            }

            const gateTotal = gateStats.retrieved + gateStats.skipped;
            const gateHitRate = gateTotal > 0 ? Math.round((gateStats.retrieved / gateTotal) * 100) : 0;

            let activeSessions = 0;
            try { activeSessions = agent.store.listSessions(1000).length; } catch {}

            return c.json({
                spent: usageTotals.totalCost.toFixed(4),
                turns: usageTotals.callCount,
                facts,
                events,
                gateStats,
                stats: {
                    activeSessions: { value: activeSessions, series: days.map(d => sessionsByDay[d] || 0) },
                    facts: { value: facts, series: days.map(d => factsByDay[d] || 0) },
                    episodes: { value: events, series: days.map(d => episodesByDay[d] || 0) },
                    gateHitRate: { value: gateHitRate, series: days.map(d => gateRateByDay[d] || 0) },
                }
            });
        });

        // Session Overview — real branching sessions for the dashboard's main panel.
        this.app.get('/api/sessions', (c) => {
            try {
                return c.json(agent.store.listSessions(8));
            } catch {
                return c.json([]);
            }
        });

        this.app.get('/api/sessions/:id/timeline', (c) => {
            try {
                return c.json(agent.store.getSessionTimeline(c.req.param('id')));
            } catch {
                return c.json([]);
            }
        });

        // Permission Gate — recent Operations pulled from today's trace, flagged gated vs exempt.
        this.app.get('/api/operations', (c) => {
            try {
                const events = this.tracer.readToday();
                const ops = events
                    .filter(e => e.kind === 'tool_call')
                    .slice(-20)
                    .reverse()
                    .map(e => ({
                        tool: e.tool,
                        args: e.args,
                        gated: requiresConfirmation(e.tool),
                        ts: e.ts,
                    }));
                return c.json(ops);
            } catch {
                return c.json([]);
            }
        });

        // Provider breakdown — real usage split by provider, joined with auth state.
        this.app.get('/api/providers', (c) => {
            const records = this.usage.readAll();
            const byProvider: Record<string, { calls: number; cost: number; promptTokens: number; completionTokens: number }> = {};

            for (const r of records) {
                const p = providerForModel(r.model);
                if (!byProvider[p]) byProvider[p] = { calls: 0, cost: 0, promptTokens: 0, completionTokens: 0 };
                byProvider[p]!.calls++;
                byProvider[p]!.cost += r.cost_usd;
                byProvider[p]!.promptTokens += r.prompt_tokens;
                byProvider[p]!.completionTokens += r.completion_tokens;
            }

            const active = getActiveProvider();
            const authenticated = new Set(listAuthenticatedProviders());
            const providers: ProviderId[] = ['claude', 'openai'];

            const result = providers
                .filter(p => authenticated.has(p) || byProvider[p])
                .map(p => {
                    const cred = getCredential(p);
                    const usage = byProvider[p] || { calls: 0, cost: 0, promptTokens: 0, completionTokens: 0 };
                    return {
                        id: p,
                        label: p === 'claude' ? 'Claude' : 'Codex',
                        authMethod: cred?.type === 'oauth' ? 'OAuth' : cred?.type === 'api_key' ? 'API key' : 'Not connected',
                        active: p === active,
                        calls: usage.calls,
                        cost: usage.cost,
                        tokens: usage.promptTokens + usage.completionTokens,
                    };
                });

            return c.json(result);
        });

        // Memory APIs
        this.app.get('/api/memory/semantic', (c) => {
            const facts = db.query(`SELECT id, content, source, datetime(created_at, 'unixepoch') as created_at FROM facts ORDER BY created_at DESC`).all();
            return c.json(facts);
        });

        this.app.get('/api/memory/episodic', (c) => {
            const eps = db.query(`SELECT id, summary, datetime(created_at, 'unixepoch') as date FROM episodes ORDER BY created_at DESC`).all();
            return c.json(eps);
        });

        this.app.get('/api/memory/procedural', (c) => {
            const list = this.skills.list().map(s => ({
                name: s.name,
                description: s.description,
                origin: 'local skill'
            }));
            return c.json(list);
        });

        // Loop API (Tracing)
        this.app.get('/api/loop', (c) => {
            return c.json(this.tracer.getTurns());
        });

        // Tools API
        this.app.get('/api/tools', (c) => {
            const tools = agent.dispatcher.getToolDefinitions().map(t => ({
                name: t.name,
                description: t.description,
                origin: 'built-in',
                lastUsed: 'unknown'
            }));
            return c.json({ registry: tools, mcpServers: [] });
        });

        // Ops API
        this.app.get('/api/ops', (c) => {
            let version = "unknown";
            try {
                if (fs.existsSync(VERSION_PATH)) version = fs.readFileSync(VERSION_PATH, "utf-8").trim();
            } catch {}

            return c.json({
                releaseGate: `v${version}`,
                evalHistory: [], // TODO read from an eval log
                slowestTurns: []
            });
        });

        // Database Console APIs
        this.app.get('/api/database/schema', (c) => {
            return c.json(['facts', 'episodes', 'facts_fts']);
        });

        this.app.post('/api/database/query', async (c) => {
            const body = await c.req.json();
            const query = (body.query || '').trim();
            const destructiveRegex = /\b(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE)\b/i;
            
            if (destructiveRegex.test(query)) {
                return c.json({ error: 'Write operations are forbidden via the dashboard console.' }, 403);
            }
            
            try {
                const results = db.query(query).all();
                if (results.length === 0) return c.json({ columns: [], rows: [] });
                
                const columns = Object.keys(results[0] as object);
                const rows = results.map((r: any) => columns.map(col => r[col]));
                return c.json({ columns, rows });
            } catch (err: any) {
                return c.json({ error: err.message }, 400);
            }
        });

        // Graph Topology
        this.app.get('/api/graph', (c) => {
            return c.json({
                nodes: triageGraphDef.nodes.map(n => ({ id: n.name, label: n.name })),
                edges: triageGraphDef.edges.map((e: any) => ({ from: e.from, to: e.to }))
            });
        });

        // Serve any static files from the 'static' folder
        this.app.get('*', serveStatic({ root: './static' }));

        this.server = Bun.serve({ port: 7777, fetch: this.app.fetch });
        console.log('Dashboard running on http://localhost:7777');
    }

    async stop() {
        this.server?.stop();
    }
}
