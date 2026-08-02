import type { Tool, ToolCall } from "./model-client.ts";

export class ToolDispatcher {
    // TODO (Step 3): Implement tool registry + dispatch + idempotency key 
    // TODO (Step 4): Register the 4 handlers (read, write, edit, bash) into the dispatcher

    // This array holds the definitions we send to the OpenAI Client 
    public getToolDefinitions(): Tool[] {
        return [];
    }

    // This function executes the tool the AI asked for
    public async execute(toolCall: ToolCall): Promise<string> {
        try {
            // TODO (Step 5): Make sure tool handlers call through e2b-adapter, never touching host fs directly
            throw new Error(`Unknown tool: ${toolCall.name}`);
        } catch (error: any) {
            return `Error executing tool: ${error.message}`;
        }
    }
}
