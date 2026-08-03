import { Type } from "typebox";
import type { Tool } from "../model-client.ts";
import type { E2BAdapter } from "../sandbox/e2b-adapter.ts";

export const bashToolDefinition: Tool = {
    name: "bash",
    description: "Execute a bash/shell command.",
    parameters: Type.Object({
        command: Type.String({ description: "The shell command to execute" })
    })
};

export async function bashToolHandler(args: Record<string, any>, e2b: E2BAdapter): Promise<string> {
    const { command } = args;
    
    return await e2b.executeBash(command);
}
