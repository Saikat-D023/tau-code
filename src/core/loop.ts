import { OpenAIClient, type Message } from "./model-client.ts";
import { ToolDispatcher } from "./tool-dispatcher.ts";
import { SessionStore } from "./session/store.ts";

export async function runAgent(userPrompt: string) {
    const client = new OpenAIClient();
    const dispatcher = new ToolDispatcher();

    const store = new SessionStore();
    const sessionId = store.createSession();
    let parentId: string | null = null;

    // TODO (Step 7): Append the initial user message to the session store and update current parentId
    const initialMessage: Message = { role: "user", content: userPrompt };
    parentId = store.appendTurn(sessionId, parentId, initialMessage);

    console.log(`[User] ${userPrompt}`);

    // The Agent Loop
    while (true) {
        const tools = dispatcher.getToolDefinitions();
        const messages = store.getBranch(sessionId, parentId as string);
        // Send history and tools to the AI
        const response = await client.complete(messages, tools.length > 0 ? tools : undefined);
        parentId = store.appendTurn(sessionId, parentId, response);

        // Did the AI decide to use a tool?
        if (response.tool_calls && response.tool_calls.length > 0) {
            console.log(`[AI] wants to use tool: ${response.tool_calls[0]?.name}`);

            for (const toolCall of response.tool_calls) {
                const result = await dispatcher.execute(toolCall);

                parentId = store.appendTurn(sessionId, parentId, {
                    role: "tool",
                    tool_call_id: toolCall.id,
                    content: result
                });
            }
        } else {
            // The AI didn't use a tool, so it must be talking to us normally!
            console.log(`[AI] ${response.content}`);
            break;
        }
    }
}

// Minimal execution for testing. 
// We will move the real CLI/interactive entrypoint to src/cli in Step 9!
const prompt = process.argv.slice(2).join(" ") || "Hello, who are you?";
runAgent(prompt);
