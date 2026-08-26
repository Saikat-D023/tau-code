/**
 * manage-memory.ts — Tool for correcting or forgetting facts in state.db.
 * 
 * When the user says a fact is wrong, the agent can call this tool to
 * update or delete it. Triggers MEMORY.md regeneration.
 */

import { Type } from "typebox";
import type { Tool } from "../model-client.ts";
import { db } from "../memory/schema.ts";
import { regenerateMemoryMd } from "../memory/mirror.ts";

export const manageMemoryToolDefinition: Tool = {
    name: "manage_memory",
    description: "Correct or forget a stored fact. Use 'update' to change a fact, 'delete' to forget it, or 'add' to store a new one.",
    parameters: Type.Object({
        action: Type.Union([
            Type.Literal("add"),
            Type.Literal("update"),
            Type.Literal("delete"),
        ], { description: "The action to perform: 'add', 'update', or 'delete'" }),
        fact_id: Type.Optional(Type.Number({ description: "The ID of the fact to update or delete (required for update/delete)" })),
        content: Type.Optional(Type.String({ description: "The fact content (required for add and update)" })),
        source: Type.Optional(Type.String({ description: "Source label for the fact (optional, defaults to 'agent')" })),
    }),
};

export async function manageMemoryToolHandler(args: Record<string, any>): Promise<string> {
    const { action, fact_id, content, source } = args;

    try {
        switch (action) {
            case "add": {
                if (!content) return "Error: 'content' is required for add action.";
                db.run(`INSERT INTO facts (content, source) VALUES (?, ?)`, [content, source || "agent"]);
                // Also insert into FTS index
                const lastId = db.query(`SELECT last_insert_rowid() as id`).get() as { id: number };
                db.run(`INSERT INTO facts_fts(rowid, content) VALUES (?, ?)`, [lastId.id, content]);
                await regenerateMemoryMd();
                return `Added fact: "${content}"`;
            }
            case "update": {
                if (!fact_id) return "Error: 'fact_id' is required for update action.";
                if (!content) return "Error: 'content' is required for update action.";
                db.run(`UPDATE facts SET content = ? WHERE id = ?`, [content, fact_id]);
                // Update FTS index
                db.run(`DELETE FROM facts_fts WHERE rowid = ?`, [fact_id]);
                db.run(`INSERT INTO facts_fts(rowid, content) VALUES (?, ?)`, [fact_id, content]);
                await regenerateMemoryMd();
                return `Updated fact #${fact_id} to: "${content}"`;
            }
            case "delete": {
                if (!fact_id) return "Error: 'fact_id' is required for delete action.";
                db.run(`DELETE FROM facts WHERE id = ?`, [fact_id]);
                db.run(`DELETE FROM facts_fts WHERE rowid = ?`, [fact_id]);
                await regenerateMemoryMd();
                return `Deleted fact #${fact_id}.`;
            }
            default:
                return `Error: Unknown action '${action}'. Use 'add', 'update', or 'delete'.`;
        }
    } catch (err: any) {
        return `Error managing memory: ${err.message}`;
    }
}
