import { Type } from "typebox";
import type { Tool } from "../model-client.ts";
import type { E2BAdapter } from "../sandbox/e2b-adapter.ts";

export const writeToolDefinition: Tool = {
    name: "write_file",
    description: "Write content to a file, overwriting it completely or creating it.",
    parameters: Type.Object({
        path: Type.String({ description: "Path to the file to write" }),
        content: Type.String({ description: "The complete content to write into the file" })
    })
};

export async function writeToolHandler(args: Record<string, any>, e2b: E2BAdapter): Promise<string> {
    const { path, content } = args;
    
    return await e2b.writeFile(path, content);
}
