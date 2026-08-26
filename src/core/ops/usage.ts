/**
 * usage.ts — Append-only cost ledger at .tau/usage.jsonl.
 * 
 * Each line records one LLM call with model, token counts, cost estimate, and turn ID.
 * Provides aggregation methods for the dashboard.
 */

import { USAGE_PATH } from "../tau-dir.ts";
import { getCost } from "./rates.ts";
import * as fs from "node:fs";

export interface UsageRecord {
    ts: string;
    model: string;
    prompt_tokens: number;
    completion_tokens: number;
    cost_usd: number;
    turn_id: string;
}

export class UsageLedger {
    /**
     * Record an LLM call to the usage ledger.
     */
    record(entry: {
        model: string;
        prompt_tokens: number;
        completion_tokens: number;
        turn_id: string;
    }): UsageRecord {
        const cost_usd = getCost(entry.model, entry.prompt_tokens, entry.completion_tokens);
        const record: UsageRecord = {
            ts: new Date().toISOString(),
            model: entry.model,
            prompt_tokens: entry.prompt_tokens,
            completion_tokens: entry.completion_tokens,
            cost_usd: Math.round(cost_usd * 1_000_000) / 1_000_000, // 6 decimal places
            turn_id: entry.turn_id,
        };

        fs.appendFileSync(USAGE_PATH, JSON.stringify(record) + "\n", "utf-8");
        return record;
    }

    /**
     * Read all usage records from the ledger.
     */
    readAll(): UsageRecord[] {
        if (!fs.existsSync(USAGE_PATH)) return [];
        
        const raw = fs.readFileSync(USAGE_PATH, "utf-8").trim();
        if (!raw) return [];

        return raw.split("\n").map(line => {
            try { return JSON.parse(line); }
            catch { return null; }
        }).filter(Boolean) as UsageRecord[];
    }

    /**
     * Get aggregate totals for the dashboard.
     */
    getTotals(): { totalCost: number; totalPromptTokens: number; totalCompletionTokens: number; callCount: number } {
        const records = this.readAll();
        return {
            totalCost: records.reduce((sum, r) => sum + r.cost_usd, 0),
            totalPromptTokens: records.reduce((sum, r) => sum + r.prompt_tokens, 0),
            totalCompletionTokens: records.reduce((sum, r) => sum + r.completion_tokens, 0),
            callCount: records.length,
        };
    }

    /**
     * Get per-day breakdown for the dashboard.
     */
    getByDay(): Record<string, { cost: number; calls: number }> {
        const records = this.readAll();
        const byDay: Record<string, { cost: number; calls: number }> = {};

        for (const r of records) {
            const day = r.ts.slice(0, 10);
            if (!byDay[day]) byDay[day] = { cost: 0, calls: 0 };
            byDay[day]!.cost += r.cost_usd;
            byDay[day]!.calls += 1;
        }

        return byDay;
    }
}
