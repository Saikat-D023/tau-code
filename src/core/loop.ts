import { OpenAIClient, type Message } from "./model-client.ts";
import { ToolDispatcher } from "./tool-dispatcher.ts";

export async function runAgent(userPrompt: string) {
    const client = new OpenAIClient();
    const dispatcher = new ToolDispatcher();

    const messages: Message[] = [
        { role: "user", content: userPrompt }
    ];

    console.log(`[User] ${userPrompt}`);

    // The Agent Loop
    while (true) {
        const tools = dispatcher.getToolDefinitions();
        // Send history and tools to the AI
        const response = await client.complete(messages, tools.length > 0 ? tools : undefined);

        messages.push(response);

        // Did the AI decide to use a tool?
        if (response.tool_calls && response.tool_calls.length > 0) {
            console.log(`[AI] wants to use tool: ${response.tool_calls[0]?.name}`);

            for (const toolCall of response.tool_calls) {
                const result = await dispatcher.execute(toolCall);
                messages.push({
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
