import { Type } from "typebox";
import type { Tool } from "../model-client.ts";
import type { E2BAdapter } from "../sandbox/e2b-adapter.ts";

export const readToolDefinition: Tool = {
    name: "read_file",
    description: "Read the contents of a file.",
    parameters: Type.Object({
        path: Type.String({ description: "Absolute or relative path to the file to read" })
    })
};

export async function readToolHandler(args: Record<string, any>, e2b: E2BAdapter): Promise<string> {
    const { path } = args;
    
    return await e2b.readFile(path);
}
