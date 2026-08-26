/**
 * tracing.ts — Per-day JSONL tracer for turn-level observability.
 * 
 * Each turn produces a sequence of events written to .tau/traces/YYYY-MM-DD.jsonl.
 * Events include: turn_start, gate_decision, llm_call, tool_call, tool_result, turn_end.
 */

import { TRACES_DIR } from "../tau-dir.ts";
import * as path from "node:path";
import * as fs from "node:fs";

export type TraceEventKind =
    | "turn_start"
    | "gate_decision"
    | "llm_call"
    | "tool_call"
    | "tool_result"
    | "turn_end";

export interface TraceEvent {
    ts: string;
    turn_id: string;
    kind: TraceEventKind;
    model?: string;
    prompt_tokens?: number;
    completion_tokens?: number;
    latency_ms?: number;
    cost_usd?: number;
    [key: string]: any;
}

export class Tracer {
    private turnId: string = "";
    private turnStart: number = 0;

    /**
     * Get the current trace file path (based on today's date).
     */
    private getTracePath(): string {
        const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
        return path.join(TRACES_DIR, `${today}.jsonl`);
    }

    /**
     * Append a trace event to today's JSONL file.
     */
    private append(event: TraceEvent): void {
        try {
            fs.appendFileSync(this.getTracePath(), JSON.stringify(event) + "\n", "utf-8");
        } catch (err) {
            console.warn("[Tracer] Failed to write trace:", err);
        }
    }

    /**
     * Start a new turn. Returns the turn ID.
     */
    startTurn(turnId: string, data: Record<string, any> = {}): void {
        this.turnId = turnId;
        this.turnStart = Date.now();
        this.append({
            ts: new Date().toISOString(),
            turn_id: turnId,
            kind: "turn_start",
            ...data,
        });
    }

    /**
     * Record a generic event within the current turn.
     */
    event(kind: TraceEventKind, data: Record<string, any> = {}): void {
        this.append({
            ts: new Date().toISOString(),
            turn_id: this.turnId,
            kind,
            ...data,
        });
    }

    /**
     * End the current turn.
     */
    endTurn(data: Record<string, any> = {}): void {
        const totalLatency = Date.now() - this.turnStart;
        this.append({
            ts: new Date().toISOString(),
            turn_id: this.turnId,
            kind: "turn_end",
            total_latency_ms: totalLatency,
            ...data,
        });
    }

    /**
     * Read today's trace events (for dashboard).
     */
    readToday(): TraceEvent[] {
        const tracePath = this.getTracePath();
        if (!fs.existsSync(tracePath)) return [];

        const raw = fs.readFileSync(tracePath, "utf-8").trim();
        if (!raw) return [];

        return raw.split("\n").map(line => {
            try { return JSON.parse(line); }
            catch { return null; }
        }).filter(Boolean) as TraceEvent[];
    }

    /**
     * Read trace events for a specific date.
     */
    readDate(date: string): TraceEvent[] {
        const tracePath = path.join(TRACES_DIR, `${date}.jsonl`);
        if (!fs.existsSync(tracePath)) return [];

        const raw = fs.readFileSync(tracePath, "utf-8").trim();
        if (!raw) return [];

        return raw.split("\n").map(line => {
            try { return JSON.parse(line); }
            catch { return null; }
        }).filter(Boolean) as TraceEvent[];
    }

    /**
     * Get gate decision stats from today's traces.
     */
    getGateStats(): { retrieved: number; skipped: number } {
        const events = this.readToday();
        let retrieved = 0;
        let skipped = 0;

        for (const e of events) {
            if (e.kind === "gate_decision") {
                if (e.decision === "retrieve") retrieved++;
                else if (e.decision === "skip") skipped++;
            }
        }

        return { retrieved, skipped };
    }

    /**
     * Get structured turn data for the Loop tab.
     */
    getTurns(): any[] {
        const events = this.readToday();
        const turnMap = new Map<string, any>();

        for (const e of events) {
            if (!turnMap.has(e.turn_id)) {
                turnMap.set(e.turn_id, {
                    id: e.turn_id,
                    timestamp: "",
                    iter: 0,
                    tokens: 0,
                    cost: "$0.00",
                    gate: "skip",
                    steps: [],
                    reply: "",
                });
            }
            const turn = turnMap.get(e.turn_id)!;

            switch (e.kind) {
                case "turn_start":
                    turn.timestamp = new Date(e.ts).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
                    turn.message = e.message;
                    break;
                case "gate_decision":
                    turn.gate = e.decision;
                    break;
                case "llm_call":
                    turn.iter++;
                    turn.tokens += (e.prompt_tokens || 0) + (e.completion_tokens || 0);
                    turn.cost = `$${((parseFloat(turn.cost.slice(1)) || 0) + (e.cost_usd || 0)).toFixed(4)}`;
                    turn.steps.push({ type: "reason", content: `LLM call (${e.model || "unknown"})` });
                    break;
                case "tool_call":
                    turn.steps.push({ type: "act", content: `${e.tool}(${JSON.stringify(e.args || {}).slice(0, 80)})` });
                    break;
                case "tool_result":
                    turn.steps.push({ type: "observe", content: (e.output || "").slice(0, 120) });
                    break;
                case "turn_end":
                    turn.reply = e.reply || "";
                    break;
            }
        }

        return Array.from(turnMap.values());
    }
}
