/**
 * retrieval-gate.ts — Cheap, fast gate that decides whether the current turn needs memory retrieval.
 * 
 * Uses a configurable cheap model (TAU_GATE_MODEL env, default gpt-4o-mini).
 * Returns "skip" or "retrieve" + search query. When "skip", no FTS5 query runs.
 * This prevents irrelevant facts from biasing pure math / generic questions.
 */

import type { ModelClient } from "../model-client.ts";
import { resolveModelClient } from "../providers/resolve.ts";

export type GateDecision = {
    decision: "skip" | "retrieve";
    query: string;
    reason: string;
};

// Quick heuristic patterns that never need memory
const SKIP_PATTERNS = [
    /^(hi|hello|hey|howdy|greetings|sup|yo)\b/i,
    /^what\s+(is|are)\s+\d+\s*[\+\-\*\/×÷]\s*\d+/i,  // "what is 2+2"
    /^\d+\s*[\+\-\*\/×÷]\s*\d+/,                       // "2+2"
    /^(thanks|thank you|thx|ok|okay|bye|goodbye)\b/i,
];

export class RetrievalGate {
    private gateClient: ModelClient;

    constructor() {
        // TAU_GATE_MODEL only applies when the active provider is OpenAI — otherwise the
        // provider's own default model is used, since a raw OpenAI model id would be invalid elsewhere.
        this.gateClient = resolveModelClient(process.env.TAU_GATE_MODEL);
    }

    /**
     * Decide whether the given prompt needs memory retrieval.
     * Uses a fast heuristic first, then falls back to the cheap gate model.
     */
    async decide(userPrompt: string): Promise<GateDecision> {
        // Fast heuristic pre-filter — skip obvious patterns without an LLM call
        for (const pattern of SKIP_PATTERNS) {
            if (pattern.test(userPrompt.trim())) {
                return { decision: "skip", query: "", reason: "heuristic match" };
            }
        }

        // Short prompts (< 5 words) that look like greetings or math
        const wordCount = userPrompt.trim().split(/\s+/).length;
        if (wordCount <= 2 && !/\b(remember|recall|last|previous|when|who)\b/i.test(userPrompt)) {
            return { decision: "skip", query: "", reason: "too short for memory" };
        }

        // LLM gate call
        const prompt = `You are a retrieval gate. Given a user message, decide if the agent needs to search its stored memories (facts about the user, past events, preferences).

        Rules:
        - If the message is a greeting, math question, general knowledge, or doesn't reference anything personal → "skip"
        - If the message references the user's preferences, past conversations, scheduled events, or people the agent should know → "retrieve"

        Reply with ONLY valid JSON: {"decision": "skip" or "retrieve", "query": "search query if retrieve", "reason": "3-5 words"}

        Message: ${userPrompt}`;

        try {
            const res = await this.gateClient.complete([{ role: "user", content: prompt }]);
            const text = res.content ?? "";
            const jsonStart = text.indexOf("{");
            const jsonEnd = text.lastIndexOf("}") + 1;

            if (jsonStart !== -1 && jsonEnd > jsonStart) {
                const parsed = JSON.parse(text.slice(jsonStart, jsonEnd));
                return {
                    decision: parsed.decision === "skip" ? "skip" : "retrieve",
                    query: parsed.query || userPrompt,
                    reason: parsed.reason || "",
                };
            }

            // If we can't parse JSON, default to retrieve (fail-open)
            return { decision: "retrieve", query: userPrompt, reason: "no json parsed" };
        } catch {
            // Gate failed — fail open, always retrieve
            return { decision: "retrieve", query: userPrompt, reason: "gate error" };
        }
    }
}
