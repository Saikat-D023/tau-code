/**
 * mirror.ts — Regenerates .tau/MEMORY.md from state.db after every turn.
 * 
 * This file is for the human. The agent still queries state.db directly.
 * Structured as markdown with Semantic Facts and Recent Episodes sections.
 */

import { db } from "./schema.ts";
import { MEMORY_MD_PATH } from "../tau-dir.ts";
import * as fs from "node:fs/promises";

export async function regenerateMemoryMd(): Promise<void> {
    const now = new Date().toISOString().replace("T", " ").slice(0, 19) + " UTC";

    // Read semantic facts
    const facts = db.query(
        `SELECT content, source, datetime(created_at, 'unixepoch') as created_at FROM facts ORDER BY created_at DESC LIMIT 100`
    ).all() as { content: string; source: string | null; created_at: string }[];

    // Read recent episodes
    const episodes = db.query(
        `SELECT summary, session_id, datetime(created_at, 'unixepoch') as created_at FROM episodes ORDER BY created_at DESC LIMIT 50`
    ).all() as { summary: string; session_id: string; created_at: string }[];

    const lines: string[] = [
        `# Memory — last updated: ${now}`,
        ``,
        `> This file is auto-generated from \`state.db\`. Do not edit manually.`,
        ``,
    ];

    // Semantic Facts
    lines.push(`## Semantic Facts`);
    lines.push(``);
    if (facts.length === 0) {
        lines.push(`_No facts stored yet._`);
    } else {
        for (const f of facts) {
            const date = f.created_at ? `[${f.created_at.slice(0, 10)}]` : `[unknown]`;
            const source = f.source ? ` (${f.source})` : '';
            lines.push(`- ${date} ${f.content}${source}`);
        }
    }
    lines.push(``);

    // Recent Episodes
    lines.push(`## Recent Episodes`);
    lines.push(``);
    if (episodes.length === 0) {
        lines.push(`_No episodes recorded yet._`);
    } else {
        for (const e of episodes) {
            const ts = e.created_at ? `[${e.created_at.slice(0, 16).replace("T", " ")}]` : `[unknown]`;
            lines.push(`- ${ts} ${e.summary}`);
        }
    }
    lines.push(``);

    await fs.writeFile(MEMORY_MD_PATH, lines.join("\n"), "utf-8");
}
