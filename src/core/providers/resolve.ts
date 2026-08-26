/**
 * providers/resolve.ts — Picks the concrete ModelClient for the active provider.
 */

import type { ModelClient } from "../model-client.ts";
import { OpenAIClient } from "../model-client.ts";
import { ClaudeClient } from "./claude-client.ts";
import { getActiveProvider } from "../auth/store.ts";
import { getProviderMeta } from "./registry.ts";

export function resolveModelClient(model?: string): ModelClient {
    const provider = getActiveProvider() ?? "openai";
    if (provider === "claude") return new ClaudeClient(model);
    return new OpenAIClient(model);
}

export function resolveDefaultModel(): string {
    const provider = getActiveProvider() ?? "openai";
    if (provider === "openai" && process.env.OPENAI_MODEL) return process.env.OPENAI_MODEL;
    return getProviderMeta(provider).defaultModel;
}
