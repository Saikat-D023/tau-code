import { Type } from "typebox";
import type { Tool } from "../model-client.ts";
import type { Operations } from "../operations.ts";

export const readToolDefinition: Tool = {
    name: "read_file",
    description: "Read the contents of a file.",
    parameters: Type.Object({
        path: Type.String({ description: "Absolute or relative path to the file to read" })
    })
};

export async function readToolHandler(args: Record<string, any>, ops: Operations): Promise<string> {
    const { path } = args;
    
    return await ops.readFile(path);
}
