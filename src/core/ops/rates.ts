/**
 * rates.ts — Per-model rate card for cost estimation.
 * 
 * Prices are in USD per 1M tokens. Loaded from .tau/rates.json.
 * Falls back to built-in defaults if the file doesn't exist.
 */

import { RATES_PATH } from "../tau-dir.ts";
import * as fs from "node:fs";

interface RateEntry {
    prompt: number;     // USD per 1M prompt tokens
    completion: number; // USD per 1M completion tokens
}

let rateCard: Record<string, RateEntry> | null = null;

/** Default rates (USD per 1M tokens) */
const DEFAULT_RATES: Record<string, RateEntry> = {
    "gpt-4o":        { prompt: 2.50,  completion: 10.00 },
    "gpt-4o-mini":   { prompt: 0.15,  completion: 0.60  },
    "gpt-4.1":      { prompt: 2.00,  completion: 8.00  },
    "gpt-4.1-mini": { prompt: 0.40,  completion: 1.60  },
    "gpt-4.1-nano": { prompt: 0.10,  completion: 0.40  },
    "o3":            { prompt: 2.00,  completion: 8.00  },
    "o3-mini":       { prompt: 1.10,  completion: 4.40  },
    "o4-mini":       { prompt: 1.10,  completion: 4.40  },
};

function loadRates(): Record<string, RateEntry> {
    if (rateCard) return rateCard;

    try {
        if (fs.existsSync(RATES_PATH)) {
            const raw = fs.readFileSync(RATES_PATH, "utf-8");
            rateCard = JSON.parse(raw);
            return rateCard!;
        }
    } catch {
        // Fall through to defaults
    }

    rateCard = DEFAULT_RATES;
    return rateCard;
}

/**
 * Calculate the estimated cost (USD) for a given model and token counts.
 * Returns 0 if the model is unknown.
 */
export function getCost(model: string, promptTokens: number, completionTokens: number): number {
    const rates = loadRates();

    // Try exact match, then strip prefix (e.g. "openai/gpt-4o" → "gpt-4o")
    let entry = rates[model];
    if (!entry) {
        const stripped = model.includes("/") ? model.split("/").pop()! : model;
        entry = rates[stripped];
    }

    if (!entry) return 0;

    return (promptTokens / 1_000_000) * entry.prompt + (completionTokens / 1_000_000) * entry.completion;
}

/**
 * Reset the cached rate card (useful for testing or after editing rates.json).
 */
export function resetRateCache(): void {
    rateCard = null;
}
