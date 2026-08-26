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
import * as fs from 'node:fs';

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
            
            let facts = 0;
            let events = 0;
            try {
                facts = (db.query(`SELECT COUNT(*) as c FROM facts`).get() as any).c;
                events = (db.query(`SELECT COUNT(*) as c FROM episodes`).get() as any).c;
            } catch {}

            return c.json({
                spent: usageTotals.totalCost.toFixed(4),
                avgTurn: usageTotals.callCount > 0 ? "2.5" : "0", // placeholder
                turns: usageTotals.callCount,
                toolCalls: 0, // placeholder
                facts,
                events,
                gateStats
            });
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
