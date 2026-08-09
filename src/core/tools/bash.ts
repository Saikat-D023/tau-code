import { Type } from "typebox";
import type { Tool } from "../model-client.ts";
import type { Operations } from "../operations.ts";

export const bashToolDefinition: Tool = {
    name: "bash",
    description: "Execute a shell command on the host OS. Note: this runs in the default host shell (e.g., cmd.exe on Windows).",
    parameters: Type.Object({
        command: Type.String({ description: "The shell command to execute" })
    })
};

export async function bashToolHandler(args: Record<string, any>, ops: Operations): Promise<string> {
    const { command } = args;
    
    return await ops.executeBash(command);
}
