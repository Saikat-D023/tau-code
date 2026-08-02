import { Type } from "typebox";
import type { Tool } from "../model-client.ts";

export const bashToolDefinition: Tool = {
    name: "bash",
    description: "Execute a bash/shell command.",
    parameters: Type.Object({
        command: Type.String({ description: "The shell command to execute" })
    })
};

export async function bashToolHandler(args: Record<string, any>): Promise<string> {
    const { command } = args;
    
    // TODO: Implement executing the shell command.
    // Remember for Step 5, this should eventually call through the e2b-adapter!
    // For now, you can use Bun.spawn() or Node's child_process.exec()
    
    return `TODO: Executed command: ${command}`;
}
