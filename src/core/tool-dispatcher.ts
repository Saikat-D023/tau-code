import type { Tool, ToolCall } from "./model-client.ts";
import { LocalOperations } from "./operations.ts";
import * as path from "path";
import { readToolDefinition, readToolHandler } from "./tools/read.ts";
import { writeToolDefinition, writeToolHandler } from "./tools/write.ts";
import { editToolDefinition, editToolHandler } from "./tools/edit.ts";
import { bashToolDefinition, bashToolHandler } from "./tools/bash.ts";

export class ToolDispatcher {
    private operations = new LocalOperations(path.join(process.cwd(), "workspace"));

    public getToolDefinitions(): Tool[] {
        return [readToolDefinition, writeToolDefinition, editToolDefinition, bashToolDefinition];
    }

    public async execute(toolCall: ToolCall): Promise<string> {
        try {
            switch (toolCall.name) {
                case "read_file":
                    return await readToolHandler(toolCall.arguments, this.operations);
                case "write_file":
                    return await writeToolHandler(toolCall.arguments, this.operations);
                case "edit_file":
                    return await editToolHandler(toolCall.arguments, this.operations);
                case "bash":
                    return await bashToolHandler(toolCall.arguments, this.operations);
                default:
                    throw new Error(`Unknown tool: ${toolCall.name}`);
            }
        } catch (error: any) {
            return `Error executing tool: ${error.message}`;
        }
    }
}
