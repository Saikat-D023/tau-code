import { Type } from "typebox";
import type { Tool } from "../model-client.ts";

export const writeToolDefinition: Tool = {
    name: "write_file",
    description: "Write content to a file, overwriting it completely or creating it.",
    parameters: Type.Object({
        path: Type.String({ description: "Path to the file to write" }),
        content: Type.String({ description: "The complete content to write into the file" })
    })
};

export async function writeToolHandler(args: Record<string, any>): Promise<string> {
    const { path, content } = args;
    
    // TODO: Implement writing to the file.
    // Remember for Step 5, this should eventually call through the e2b-adapter!
    // For now, you can use Bun.write(path, content) to write it.
    
    return `TODO: Wrote to ${path}`;
}
