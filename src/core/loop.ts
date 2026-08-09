import { OpenAIClient, type Message } from "./model-client.ts";
import { ToolDispatcher } from "./tool-dispatcher.ts";
import { SessionStore } from "./session/store.ts";

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
            const messages = this.store.getBranch(this.sessionId, this.parentId as string);
            
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
                return result;
            }
        }

        result.reply = '(Hit iteration limit — try breaking the request into smaller steps.)';
        notify('turn_end', { result });
        return result;
    }
}
