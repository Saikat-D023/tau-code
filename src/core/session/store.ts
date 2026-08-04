import { Database } from "bun:sqlite";
import type { Message } from "../model-client.ts";
import { join } from "path";
import { readFileSync, existsSync, mkdirSync } from "fs";
import { randomUUID } from "crypto";

export class SessionStore {
    private db: Database;

    constructor(dbPath: string = ".tau/session.sqlite") {
        // Create directory if it doesn't exist
        const dir = join(process.cwd(), ".tau");
        if (!existsSync(dir)) {
            mkdirSync(dir, { recursive: true });
        }

        const fullDbPath = join(process.cwd(), dbPath);
        this.db = new Database(fullDbPath, { create: true });
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

    public getBranch(sessionId: string, leafId: string): Message[] {
        // TODO (Step 6): Write a while loop to query backwards from the leafId up to the root (where parent_id is null)
        // TODO (Step 6): Reconstruct the `Message[]` array by unshifting each row into an array and return it
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
