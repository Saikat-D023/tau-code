import { Type } from "typebox";
import type { Tool } from "../model-client.ts";
import type { Operations } from "../operations.ts";

export const writeToolDefinition: Tool = {
    name: "write_file",
    description: "Write content to a file, overwriting it completely or creating it.",
    parameters: Type.Object({
        path: Type.String({ description: "Path to the file to write" }),
        content: Type.String({ description: "The complete content to write into the file" })
    })
};

export async function writeToolHandler(args: Record<string, any>, ops: Operations): Promise<string> {
    const { path, content } = args;
    
    return await ops.writeFile(path, content);
}
