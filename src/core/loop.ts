import type { ModelClient, Message } from "./model-client.ts";
import { resolveModelClient, resolveDefaultModel } from "./providers/resolve.ts";
import { setActiveProvider, type ProviderId } from "./auth/store.ts";
import { ToolDispatcher } from "./tool-dispatcher.ts";
import { SessionStore } from "./session/store.ts";
import { RetrievalGate } from "./memory/retrieval-gate.ts";
import { db } from "./memory/schema.ts";
import { regenerateMemoryMd } from "./memory/mirror.ts";
import { SkillRegistry } from "./memory/skills.ts";
import { SOUL_PATH } from "./tau-dir.ts";
import { Tracer } from "./ops/tracing.ts";
import { UsageLedger } from "./ops/usage.ts";
import { initTriageGraph, triageGraph } from "./graph/triage.ts";
import { setSkillRegistry } from "./tools/create-skill.ts";
import type { PermissionGate } from "./permission-gate.ts";
import * as fs from "node:fs/promises";

export interface LoopResult {
    reply: string;
    toolCalls: { tool: string; args: any; output: string }[];
    iterations: number;
}

export type Observer = (
    kind: 'turn_start' | 'llm' | 'tool' | 'text' | 'turn_end',
    event: Record<string, any>
) => void;

export interface TurnContext {
    source: 'cli' | 'telegram' | 'dashboard' | 'voice';
    sessionId: string;
    observer?: Observer;
}

export class Agent {
    private model: string;
    private client: ModelClient;
    public dispatcher: ToolDispatcher;
    public store = new SessionStore();
    public sessionId: string;
    public parentId: string | null = null;
    private maxIterations: number;

    private gate = new RetrievalGate();
    private skillRegistry = new SkillRegistry();
    private tracer = new Tracer();
    private usage = new UsageLedger();

    constructor(options: { maxIterations?: number; permissionGate?: PermissionGate; model?: string } = {}) {
        this.model = options.model ?? resolveDefaultModel();
        this.client = resolveModelClient(this.model);
        this.dispatcher = new ToolDispatcher(options.permissionGate);
        this.sessionId = this.store.createSession();
        this.maxIterations = options.maxIterations ?? 10;

        setSkillRegistry(this.skillRegistry);
        initTriageGraph(this);
    }

    /** Switches the model used for subsequent turns (e.g. from a `/model <name>` CLI command). */
    public setModel(model: string): void {
        this.model = model;
        this.client = resolveModelClient(model);
    }

    /** Switches both the active provider (persisted globally) and model — used when `/model` picks a model from a different subscription. */
    public switchProvider(provider: ProviderId, model: string): void {
        setActiveProvider(provider);
        this.setModel(model);
    }

    public getModel(): string {
        return this.model;
    }

    public async processTurn(userPrompt: string, ctx: TurnContext): Promise<LoopResult> {
        // If graph workflows are enabled, route through triage first
        if (process.env.TAU_GRAPH_WORKFLOWS === "1") {
            try {
                const graphRes = await triageGraph.run({
                    input: userPrompt,
                    sessionId: ctx.sessionId,
                    source: ctx.source,
                    state: {}
                });
                return { reply: graphRes.output, toolCalls: [], iterations: 0 };
            } catch (err: any) {
                console.warn("[Graph] Failed, falling back to basic loop:", err.message);
            }
        }

        const notify = ctx.observer ?? (() => {});
        const result: LoopResult = { reply: '', toolCalls: [], iterations: 0 };

        notify('turn_start', { sessionId: ctx.sessionId, message: userPrompt });
        
        // Use tracer ID as parent if possible or generate one
        const turnId = `turn-${Date.now()}`;
        this.tracer.startTurn(turnId, { sessionId: ctx.sessionId, message: userPrompt });

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
            
            // Record usage
            if (response.usage) {
                this.usage.record({
                    model: this.model,
                    prompt_tokens: response.usage.prompt_tokens,
                    completion_tokens: response.usage.completion_tokens,
                    turn_id: turnId
                });
            }

            this.tracer.event("llm_call", { 
                model: this.model,
                prompt_tokens: response.usage?.prompt_tokens,
                completion_tokens: response.usage?.completion_tokens,
            });

            notify('llm', { iteration: i });

            this.parentId = this.store.appendTurn(this.sessionId, this.parentId, response);

            // Did the AI decide to use a tool?
            if (response.tool_calls && response.tool_calls.length > 0) {
                for (const toolCall of response.tool_calls) {
                    this.tracer.event("tool_call", { tool: toolCall.name, args: toolCall.arguments });
                    
                    const output = await this.dispatcher.execute(toolCall);
                    
                    this.tracer.event("tool_result", { tool: toolCall.name, output });
                    
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
                this.tracer.endTurn({ reply: result.reply });
                
                await this.saveEpisodeAndConsolidate(userPrompt, result, ctx.sessionId);
                return result;
            }
        }

        result.reply = '(Hit iteration limit — try breaking the request into smaller steps.)';
        notify('turn_end', { result });
        this.tracer.endTurn({ reply: result.reply });
        
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

        // Write the MEMORY.md mirror
        try {
            await regenerateMemoryMd();
        } catch (e) {
            console.warn("[Memory] Failed to regenerate MEMORY.md:", e);
        }
    }

    private async buildWorkingMemory(userPrompt: string, history: Message[]): Promise<Message[]> {
        let soul = '';
        try {
            soul = await fs.readFile(SOUL_PATH, 'utf-8');
        } catch (e) {
            // ignore
        }

        // Gate Memory Retrieval
        const gateDecision = await this.gate.decide(userPrompt);
        this.tracer.event("gate_decision", { decision: gateDecision.decision, reason: gateDecision.reason });

        let memories: string[] = [];
        if (gateDecision.decision === "retrieve" && gateDecision.query.trim()) {
            try {
                const stmt = db.query(`SELECT content FROM facts_fts WHERE facts_fts MATCH $query ORDER BY rank LIMIT 5`);
                const rows = stmt.all({ $query: gateDecision.query }) as { content: string }[];
                memories = rows.map((r) => r.content);
            } catch (e) {
                console.warn("[Memory] FTS search failed:", e);
            }
        }

        // Retrieve Skills
        const matchedSkills = this.skillRegistry.match(userPrompt);
        const skillTexts = matchedSkills.map(s => `[Skill: ${s.name}]\n${s.body}`);

        const systemParts = [
            soul,
            memories.length ? `Relevant memories:\n${memories.map(m => `- ${m}`).join('\n')}` : '',
            skillTexts.length ? `Relevant skills:\n${skillTexts.join('\n\n')}` : '',
            `Current time: ${new Date().toISOString()}`
        ].filter(Boolean);

        return [
            { role: "user", content: `[SYSTEM CONTEXT]\n${systemParts.join('\n\n')}\n[/SYSTEM CONTEXT]` },
            ...history
        ];
    }
}
