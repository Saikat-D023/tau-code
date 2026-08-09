import { Type } from "typebox";
import type { Tool } from "../model-client.ts";
import type { Operations } from "../operations.ts";

export const editToolDefinition: Tool = {
    name: "edit_file",
    description: "Make a surgical string replacement in a file.",
    parameters: Type.Object({
        path: Type.String({ description: "Path to the file to edit" }),
        find: Type.String({ description: "The exact string to find and replace" }),
        replace: Type.String({ description: "The string to replace it with" })
    })
};

export async function editToolHandler(args: Record<string, any>, ops: Operations): Promise<string> {
    const { path, find, replace } = args;
    
    return await ops.editFile(path, find, replace);
}
