import { Database } from "bun:sqlite";
import type { Message } from "../model-client.ts";
import { join } from "path";
import { readFileSync, existsSync, mkdirSync } from "fs";
import { randomUUID } from "crypto";
import { TAU_DIR, SESSION_DB_PATH } from "../tau-dir.ts";

export class SessionStore {
    private db: Database;

    constructor() {
        if (!existsSync(TAU_DIR)) {
            mkdirSync(TAU_DIR, { recursive: true });
        }

        this.db = new Database(SESSION_DB_PATH, { create: true });
        this.initSchema();
    }

    private initSchema() {
        const schemaPath = join(import.meta.dir, "schema.sql");
        const schema = readFileSync(schemaPath, "utf-8");
        this.db.exec(schema);
    }

    public createSession(): string {
        const id = randomUUID();
        this.db.query("INSERT INTO sessions (id) VALUES (?)").run(id);
        return id;
    }

    public appendTurn(sessionId: string, parentId: string | null, message: Message): string {
        const turnId = randomUUID();

        let toolCalls = null;
        if (message.role === "assistant" && message.tool_calls) {
            toolCalls = JSON.stringify(message.tool_calls);
        }

        let toolCallId = null;
        if (message.role === "tool") {
            toolCallId = message.tool_call_id;
        }

        this.db.query(
            "INSERT INTO turns (id, session_id, parent_id, role, content, tool_calls, tool_call_id) VALUES (?, ?, ?, ?, ?, ?, ?)"
        ).run(
            turnId,
            sessionId,
            parentId,
            message.role,
            message.content,
            toolCalls,
            toolCallId
        );

        return turnId;
    }

    /** Recent sessions with turn/branch counts, for the dashboard's Session Overview panel. */
    public listSessions(limit = 8): {
        id: string;
        turnCount: number;
        branchCount: number;
        startedAt: string;
        lastActivity: string;
        preview: string;
    }[] {
        const rows = this.db.query(`
            SELECT
                t.session_id as id,
                COUNT(*) as turnCount,
                MIN(t.created_at) as startedAt,
                MAX(t.created_at) as lastActivity,
                (
                    SELECT content FROM turns
                    WHERE session_id = t.session_id AND role = 'user'
                    ORDER BY created_at ASC LIMIT 1
                ) as preview,
                (
                    SELECT COUNT(*) FROM (
                        SELECT parent_id FROM turns
                        WHERE session_id = t.session_id AND parent_id IS NOT NULL
                        GROUP BY parent_id HAVING COUNT(*) > 1
                    )
                ) as branchCount
            FROM turns t
            GROUP BY t.session_id
            ORDER BY lastActivity DESC
            LIMIT ?
        `).all(limit) as any[];

        return rows.map(r => ({
            id: r.id,
            turnCount: r.turnCount,
            branchCount: r.branchCount ?? 0,
            startedAt: r.startedAt,
            lastActivity: r.lastActivity,
            preview: (r.preview || "").slice(0, 96),
        }));
    }

    /** Ordered turn nodes for one session, for rendering a branch-timeline chart. */
    public getSessionTimeline(sessionId: string): {
        id: string;
        parentId: string | null;
        role: string;
        createdAt: string;
    }[] {
        const rows = this.db.query(`
            SELECT id, parent_id, role, created_at FROM turns
            WHERE session_id = ?
            ORDER BY created_at ASC
        `).all(sessionId) as any[];

        return rows.map(r => ({
            id: r.id,
            parentId: r.parent_id,
            role: r.role,
            createdAt: r.created_at,
        }));
    }

    public getBranch(sessionId: string, leafId: string): Message[] {
        const messages: Message[] = [];
        let currentId: string | null = leafId;

        const stmt = this.db.query("SELECT * FROM turns WHERE id = ? AND session_id = ?");

        while (currentId) {
            const row = stmt.get(currentId, sessionId) as any;
            if (!row) {
                break;
            }

            const message: any = {
                role: row.role,
                content: row.content || "",
            };

            if (row.role === "assistant" && row.tool_calls) {
                message.tool_calls = JSON.parse(row.tool_calls);
            }

            if (row.role === "tool") {
                message.tool_call_id = row.tool_call_id;
            }

            messages.unshift(message as Message);
            currentId = row.parent_id;
        }

        return messages;
    }
}
