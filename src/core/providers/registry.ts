/**
 * providers/registry.ts — The provider picker's source of truth.
 *
 * Each Provider is a backend behind ModelClient (see CONTEXT.md). taucode is
 * the single agent shell; providers are swapped in, never a separate CLI.
 */

import type { ProviderId } from "../auth/store.ts";

export interface ProviderMeta {
    id: ProviderId;
    label: string;
    defaultModel: string;
    /** Curated list of model ids selectable via `/model` — not fetched live. */
    models: string[];
}

export const PROVIDERS: ProviderMeta[] = [
    {
        id: "openai",
        label: "OpenAI (ChatGPT / Codex — browser login, or OPENAI_API_KEY)",
        defaultModel: "gpt-4o-mini",
        models: ["gpt-4o", "gpt-4o-mini", "gpt-4.1", "gpt-4.1-mini", "gpt-4.1-nano", "o3", "o3-mini", "o4-mini"],
    },
    {
        id: "claude",
        label: "Claude (Anthropic — developer API key, see docs/adr/0003)",
        defaultModel: "claude-sonnet-4-5-20250929",
        models: ["claude-opus-4-1-20250805", "claude-sonnet-4-5-20250929", "claude-haiku-4-5-20251001"],
    },
];

export function getProviderMeta(id: ProviderId): ProviderMeta {
    const meta = PROVIDERS.find(p => p.id === id);
    if (!meta) throw new Error(`Unknown provider: ${id}`);
    return meta;
}
