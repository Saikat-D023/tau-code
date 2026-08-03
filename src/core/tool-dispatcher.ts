import type { Tool, ToolCall } from "./model-client.ts";
import { E2BAdapter } from "./sandbox/e2b-adapter.ts";
import { readToolDefinition, readToolHandler } from "./tools/read.ts";
import { writeToolDefinition, writeToolHandler } from "./tools/write.ts";
import { editToolDefinition, editToolHandler } from "./tools/edit.ts";
import { bashToolDefinition, bashToolHandler } from "./tools/bash.ts";

export class ToolDispatcher {
    private e2b = new E2BAdapter();

    public getToolDefinitions(): Tool[] {
        return [readToolDefinition, writeToolDefinition, editToolDefinition, bashToolDefinition];
    }

    public async execute(toolCall: ToolCall): Promise<string> {
        try {
            switch (toolCall.name) {
                case "read_file":
                    return await readToolHandler(toolCall.arguments, this.e2b);
                case "write_file":
                    return await writeToolHandler(toolCall.arguments, this.e2b);
                case "edit_file":
                    return await editToolHandler(toolCall.arguments, this.e2b);
                case "bash":
                    return await bashToolHandler(toolCall.arguments, this.e2b);
                default:
                    throw new Error(`Unknown tool: ${toolCall.name}`);
            }
        } catch (error: any) {
            return `Error executing tool: ${error.message}`;
        }
    }
}
