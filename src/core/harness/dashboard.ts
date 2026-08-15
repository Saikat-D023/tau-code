import { Hono } from 'hono';
import { serveStatic } from 'hono/bun';
import type { Agent, Observer } from '../loop.ts';
import type { GatewayAdapter } from './types.ts';

export class DashboardGateway implements GatewayAdapter {
    private app = new Hono();
    private server?: ReturnType<typeof Bun.serve>;

    async start(agent: Agent) {
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
        // Stubbed APIs for Dashboard
        this.app.get('/api/overview', (c) => {
            return c.json({
                spent: 0.03,
                avgTurn: 9.4,
                turns: 1,
                toolCalls: 2,
                facts: 3,
                events: 1,
                gateStats: { retrieved: 1, skipped: 0 }
            });
        });

        this.app.get('/api/memory/semantic', (c) => {
            return c.json([
                { id: 'f1', content: 'User prefers dark mode', created_at: '2026-08-01', source: 'dashboard' },
                { id: 'f2', content: 'TauCode runs locally', created_at: '2026-08-02', source: 'cli' },
                { id: 'f3', content: 'Always check KI summaries first', created_at: '2026-08-09', source: 'system' }
            ]);
        });

        this.app.get('/api/memory/episodic', (c) => {
            return c.json([
                { id: 'e1', date: '2026-08-08', summary: 'Discussed graph workflows', raw_chat_snippet: 'User: how to enable graph mode?\nAgent: You can toggle it...' }
            ]);
        });

        this.app.get('/api/memory/procedural', (c) => {
            return c.json([
                { name: 'search_web', description: 'Search the web using duckduckgo', origin: 'built-in' },
                { name: 'create_event', description: 'Create a calendar event', origin: 'community' }
            ]);
        });

        this.app.get('/api/loop', (c) => {
            return c.json([
                {
                    id: 'turn_1', timestamp: '10:42 AM', iter: 3, tokens: 450, cost: '$0.01', gate: 'retrieve',
                    steps: [
                        { type: 'reason', content: 'I need to check the local files' },
                        { type: 'act', content: 'read_file({ path: "README.md" })' },
                        { type: 'observe', content: 'File contents returned' }
                    ],
                    reply: 'I checked the README file and it looks good.'
                }
            ]);
        });

        this.app.get('/api/tools', (c) => {
            return c.json({
                registry: [
                    { name: 'run_shell', description: 'Execute bash commands', origin: 'built-in', lastUsed: '2 mins ago' },
                    { name: 'github_mcp', description: 'Github integration', origin: 'mcp', lastUsed: 'never' }
                ],
                mcpServers: [
                    { name: 'StitchMCP', status: 'connected' }
                ]
            });
        });

        this.app.get('/api/ops', (c) => {
            return c.json({
                releaseGate: 'pass',
                evalHistory: [
                    { date: '2026-08-08', deterministic: 98, judge: 95, verdict: 'pass' }
                ],
                slowestTurns: [
                    { id: 'turn_4', latency: '12.4s' }
                ]
            });
        });

        this.app.get('/api/database/schema', (c) => {
            return c.json(['facts', 'episodes', 'traces']);
        });

        this.app.post('/api/database/query', async (c) => {
            const body = await c.req.json();
            const query = (body.query || '').trim();
            const destructiveRegex = /\b(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE)\b/i;
            
            if (destructiveRegex.test(query)) {
                return c.json({ error: 'Write operations are forbidden via the dashboard console.' }, 403);
            }
            
            return c.json({
                columns: ['id', 'content'],
                rows: [
                    ['f1', 'User prefers dark mode'],
                    ['f2', 'TauCode runs locally']
                ]
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
