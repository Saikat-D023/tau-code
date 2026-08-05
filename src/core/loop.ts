import { OpenAIClient, type Message } from "./model-client.ts";
import { ToolDispatcher } from "./tool-dispatcher.ts";
import { SessionStore } from "./session/store.ts";
import { hooks } from "./hooks.ts";

export class Agent {
    private client = new OpenAIClient();
    public dispatcher = new ToolDispatcher();
    public store = new SessionStore();
    public sessionId: string;
    public parentId: string | null = null;

    constructor() {
        this.sessionId = this.store.createSession();
    }

    public async processTurn(userPrompt: string) {
        const initialMessage: Message = { role: "user", content: userPrompt };
        this.parentId = this.store.appendTurn(this.sessionId, this.parentId, initialMessage);

        await hooks.emitTurnStart({ prompt: userPrompt });

        // The Agent Loop
        while (true) {
            const tools = this.dispatcher.getToolDefinitions();
            const messages = this.store.getBranch(this.sessionId, this.parentId as string);
            // Send history and tools to the AI
            const response = await this.client.complete(messages, tools.length > 0 ? tools : undefined);
            this.parentId = this.store.appendTurn(this.sessionId, this.parentId, response);

            // Did the AI decide to use a tool?
            if (response.tool_calls && response.tool_calls.length > 0) {
                console.log(`[AI] wants to use tool: ${response.tool_calls[0]?.name}`);

                for (const toolCall of response.tool_calls) {
                    await hooks.emitBeforeToolCall({ toolCall });
                    const result = await this.dispatcher.execute(toolCall);
                    await hooks.emitAfterToolCall({ toolCall, result });

                    this.parentId = this.store.appendTurn(this.sessionId, this.parentId, {
                        role: "tool",
                        tool_call_id: toolCall.id,
                        content: result
                    });
                }
            } else {
                // The AI didn't use a tool, so it must be talking to us normally!
                console.log(`[AI] ${response.content}`);

                await hooks.emitTurnComplete({ finalResponse: response });
                break;
            }
        }
    }
}
