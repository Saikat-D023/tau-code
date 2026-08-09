import type { ModelClient } from '../model-client.ts';
import { db } from './schema.ts';

export async function consolidateIfNeeded(sessionId: string, client: ModelClient) {
    const countRow = db.query(`SELECT COUNT(*) as c FROM episodes WHERE session_id = ?`).get(sessionId) as { c: number };
    if (!countRow || countRow.c < 5) return; // run every 5 turns

    const episodes = db.query(`SELECT summary FROM episodes WHERE session_id = ? ORDER BY created_at DESC LIMIT 5`)
        .all(sessionId) as { summary: string }[];

    const prompt = `Distill these conversation summaries into durable facts about the user or the project. One per line, no fluff, start each with a hyphen:\n\n${episodes.map(e => `- ${e.summary}`).join('\n')}`;
    
    try {
        const res = await client.complete([{ role: 'user', content: prompt }]);
        const facts = (res.content ?? '').split('\n').filter(f => f.trim().startsWith('-'));
        
        for (const f of facts) {
            const factContent = f.slice(1).trim(); // remove the hyphen
            if (factContent) {
                db.run(`INSERT INTO facts (content, source) VALUES (?, 'consolidation')`, [factContent]);
            }
        }

        // Archive these episodes so we don't process them again
        db.run(`UPDATE episodes SET session_id = ? || '_archived' WHERE session_id = ?`, [sessionId, sessionId]);
    } catch (error) {
        console.error("[Memory] Consolidation failed:", error);
    }
}
