import { OpenAIClient, type Message } from "./model-client.ts";
import { ToolDispatcher } from "./tool-dispatcher.ts";
import { SessionStore } from "./session/store.ts";
import { shouldRetrieve } from "./memory/gate.ts";
import { db } from "./memory/schema.ts";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";
export interface LoopResult {
    reply: string;
    toolCalls: { tool: string; args: any; output: string }[];
    iterations: number
}

export type Observer = (
    kind: 'turn_start' | 'llm' | 'tool' | 'text' | 'turn_end',
    event: Record<string, any>
) => void;

export interface TurnContext {
    source: 'cli' | 'telegram' | 'dashboard' | 'voice'
    sessionId: string,
    observer?: Observer
}

export class Agent {
    private client = new OpenAIClient();
    public dispatcher = new ToolDispatcher();
    public store = new SessionStore();
    public sessionId: string;
    public parentId: string | null = null;
    private maxIterations: number;

    constructor(options: { maxIterations?: number } = {}) {
        this.sessionId = this.store.createSession();
        this.maxIterations = options.maxIterations ?? 10;
    }

    public async processTurn(userPrompt: string, ctx: TurnContext): Promise<LoopResult> {
        const notify = ctx.observer ?? (() => {});
        const result: LoopResult = { reply: '', toolCalls: [], iterations: 0 };

        notify('turn_start', { sessionId: ctx.sessionId, message: userPrompt });

        const initialMessage: Message = { role: "user", content: userPrompt };
        this.parentId = this.store.appendTurn(this.sessionId, this.parentId, initialMessage);

        // The Agent Loop
        for (let i = 1; i <= this.maxIterations; i++) {
            result.iterations = i;

            const tools = this.dispatcher.getToolDefinitions();
            const history = this.store.getBranch(this.sessionId, this.parentId as string);
            
            const messages = await this.buildWorkingMemory(userPrompt, history);

            // Send history and tools to the AI
            const response = await this.client.complete(messages, tools.length > 0 ? tools : undefined);
            
            notify('llm', { iteration: i });

            this.parentId = this.store.appendTurn(this.sessionId, this.parentId, response);

            // Did the AI decide to use a tool?
            if (response.tool_calls && response.tool_calls.length > 0) {
                for (const toolCall of response.tool_calls) {
                    const output = await this.dispatcher.execute(toolCall);
                    
                    const event = { tool: toolCall.name, args: toolCall.arguments, output };
                    result.toolCalls.push(event);
                    notify('tool', event);

                    this.parentId = this.store.appendTurn(this.sessionId, this.parentId, {
                        role: "tool",
                        tool_call_id: toolCall.id,
                        content: output
                    });
                }
            } else {
                // The AI didn't use a tool, so it must be talking to us normally!
                result.reply = response.content ?? '';
                notify('turn_end', { result });
                await this.saveEpisodeAndConsolidate(userPrompt, result, ctx.sessionId);
                return result;
            }
        }

        result.reply = '(Hit iteration limit — try breaking the request into smaller steps.)';
        notify('turn_end', { result });
        await this.saveEpisodeAndConsolidate(userPrompt, result, ctx.sessionId);
        return result;
    }

    private async saveEpisodeAndConsolidate(userPrompt: string, result: LoopResult, sessionId: string) {
        try {
            const summaryPrompt = `Summarize the following interaction in a single short sentence:\nUser: ${userPrompt}\nAssistant: ${result.reply}`;
            const sumRes = await this.client.complete([{ role: "user", content: summaryPrompt }]);
            const summary = sumRes.content ?? "No summary";
            
            db.query(`INSERT INTO episodes (session_id, summary, raw_messages) VALUES (?, ?, ?)`).run(
                sessionId,
                summary,
                JSON.stringify([{ role: "user", content: userPrompt }, { role: "assistant", content: result.reply }])
            );
        } catch (e) {
            console.warn("[Memory] Failed to append episode:", e);
        }
        
        try {
            const { consolidateIfNeeded } = await import("./memory/consolidation.ts");
            await consolidateIfNeeded(sessionId, this.client);
        } catch (e) {
            console.error("[Memory] Consolidation failed:", e);
        }
    }

    private async buildWorkingMemory(userPrompt: string, history: Message[]): Promise<Message[]> {
        const soulFile = path.join(os.homedir(), '.tau', 'SOUL.md');
        let soul = '';
        try {
            soul = await fs.readFile(soulFile, 'utf-8');
        } catch (e) {
            // ignore
        }

        const gate = await shouldRetrieve(this.client, userPrompt);
        let memories: string[] = [];

        if (gate.retrieve && gate.query.trim()) {
            try {
                // SQLite FTS5 matching
                const stmt = db.query(`SELECT content FROM facts_fts WHERE facts_fts MATCH $query ORDER BY rank LIMIT 5`);
                const rows = stmt.all({ $query: gate.query }) as { content: string }[];
                memories = rows.map((r) => r.content);
            } catch (e) {
                // FTS queries can throw if syntax is invalid
                console.warn("[Memory] FTS search failed:", e);
            }
        }

        const systemParts = [
            soul,
            memories.length ? `Relevant memories:\n${memories.map(m => `- ${m}`).join('\n')}` : '',
            `Current time: ${new Date().toISOString()}`
        ].filter(Boolean);


        return [
            { role: "user", content: `[SYSTEM CONTEXT]\n${systemParts.join('\n\n')}\n[/SYSTEM CONTEXT]` },
            ...history
        ];
    }
}
