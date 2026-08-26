import type { Tool, ToolCall } from "./model-client.ts";
import { LocalOperations } from "./operations.ts";
import { readToolDefinition, readToolHandler } from "./tools/read.ts";
import { writeToolDefinition, writeToolHandler } from "./tools/write.ts";
import { editToolDefinition, editToolHandler } from "./tools/edit.ts";
import { bashToolDefinition, bashToolHandler } from "./tools/bash.ts";
import { manageMemoryToolDefinition, manageMemoryToolHandler } from "./tools/manage-memory.ts";
import { updateSoulToolDefinition, updateSoulToolHandler } from "./tools/update-soul.ts";
import { createSkillToolDefinition, createSkillToolHandler } from "./tools/create-skill.ts";
import { searchWebToolDefinition, searchWebToolHandler } from "./tools/search-web.ts";
import { CliPermissionGate, requiresConfirmation, type PermissionGate } from "./permission-gate.ts";

export class ToolDispatcher {
    // Operations are scoped to the directory taucode was launched from — your project,
    // not an arbitrary subfolder, and not the rest of the filesystem. See CONTEXT.md: Operations.
    private operations = new LocalOperations(process.cwd());
    private gate: PermissionGate;

    constructor(gate: PermissionGate = new CliPermissionGate()) {
        this.gate = gate;
    }

    public getPermissionGate(): PermissionGate {
        return this.gate;
    }

    public getToolDefinitions(): Tool[] {
        return [
            readToolDefinition, writeToolDefinition, editToolDefinition, bashToolDefinition,
            manageMemoryToolDefinition, updateSoulToolDefinition, createSkillToolDefinition, searchWebToolDefinition
        ];
    }

    public async execute(toolCall: ToolCall): Promise<string> {
        try {
            if (requiresConfirmation(toolCall.name)) {
                const approved = await this.gate.request(toolCall.name, toolCall.arguments);
                if (!approved) {
                    return `Denied by user: "${toolCall.name}" was not executed.`;
                }
            }

            switch (toolCall.name) {
                case "read_file": return await readToolHandler(toolCall.arguments, this.operations);
                case "write_file": return await writeToolHandler(toolCall.arguments, this.operations);
                case "edit_file": return await editToolHandler(toolCall.arguments, this.operations);
                case "bash": return await bashToolHandler(toolCall.arguments, this.operations);
                case "manage_memory": return await manageMemoryToolHandler(toolCall.arguments);
                case "update_soul": return await updateSoulToolHandler(toolCall.arguments);
                case "create_skill": return await createSkillToolHandler(toolCall.arguments);
                case "search_web": return await searchWebToolHandler(toolCall.arguments);
                default:
                    throw new Error(`Unknown tool: ${toolCall.name}`);
            }
        } catch (error: any) {
            return `Error executing tool: ${error.message}`;
        }
    }
}
