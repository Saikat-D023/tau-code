/**
 * update-soul.ts — Tool for saving standing preferences to .tau/SOUL.md.
 * 
 * The agent calls this when the user expresses a lasting preference
 * (e.g., "I prefer morning meetings", "Always use TypeScript").
 */

import { Type } from "typebox";
import type { Tool } from "../model-client.ts";
import { SOUL_PATH } from "../tau-dir.ts";
import * as fs from "node:fs/promises";

export const updateSoulToolDefinition: Tool = {
    name: "update_soul",
    description: "Save or update a standing preference in the user's SOUL.md persona file. Use 'append' to add a new preference, or 'replace' to update the entire file.",
    parameters: Type.Object({
        action: Type.Union([
            Type.Literal("append"),
            Type.Literal("replace"),
        ], { description: "'append' to add a preference line, 'replace' to rewrite the entire soul" }),
        content: Type.String({ description: "The preference text to append, or the full new content if replacing" }),
    }),
};

export async function updateSoulToolHandler(args: Record<string, any>): Promise<string> {
    const { action, content } = args;

    try {
        if (action === "replace") {
            await fs.writeFile(SOUL_PATH, content, "utf-8");
            return `SOUL.md replaced with new content.`;
        }

        // append
        let existing = "";
        try {
            existing = await fs.readFile(SOUL_PATH, "utf-8");
        } catch {
            // File doesn't exist yet, that's fine
        }

        const newContent = existing.trimEnd() + "\n- " + content + "\n";
        await fs.writeFile(SOUL_PATH, newContent, "utf-8");
        return `Appended to SOUL.md: "${content}"`;
    } catch (err: any) {
        return `Error updating SOUL.md: ${err.message}`;
    }
}
