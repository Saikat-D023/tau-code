/**
 * cli/auth.ts — First-run / `taucode auth` provider picker.
 *
 * OpenAI: triggers a real browser OAuth login against ChatGPT/Codex's own
 * login flow. Claude: prompts for a pasted Anthropic developer API key
 * instead — see docs/adr/0003 for why subscription OAuth was dropped for
 * Claude specifically. Control always returns to the taucode CLI; taucode is
 * the single agent shell, providers are swapped-in backends behind ModelClient.
 */

import * as readline from "readline/promises";
import { PROVIDERS } from "../core/providers/registry.ts";
import { listAuthenticatedProviders, setActiveProvider, setCredential, type ProviderId } from "../core/auth/store.ts";
import { loginOpenAI } from "../core/providers/openai-auth.ts";

async function loginClaudeWithApiKey(rl: readline.Interface): Promise<void> {
    const key = (await rl.question("Paste your Anthropic API key (from console.anthropic.com): ")).trim();
    if (!key) throw new Error("No API key entered.");
    setCredential("claude", { type: "api_key", api_key: key });
    console.log("Claude API key saved.");
}

async function login(provider: ProviderId, rl: readline.Interface): Promise<void> {
    if (provider === "openai") await loginOpenAI();
    else if (provider === "claude") await loginClaudeWithApiKey(rl);
    setActiveProvider(provider);
}

/** Runs the interactive provider picker. Used by `taucode auth` and on first run. */
export async function runAuthFlow(): Promise<void> {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    try {
        console.log("\nPick a provider to log in with:");
        PROVIDERS.forEach((p, i) => {
            console.log(`  ${i + 1}) ${p.label}`);
        });

        const answer = (await rl.question("\n> ")).trim();
        const index = parseInt(answer, 10) - 1;
        const provider = PROVIDERS[index];

        if (!provider) {
            console.log("Not a valid choice.");
            return;
        }

        await login(provider.id, rl);
    } finally {
        rl.close();
    }
}

/**
 * True if any provider has stored credentials, or a dev-path API key env var
 * (OPENAI_API_KEY / ANTHROPIC_API_KEY) is set — either is enough to skip the
 * first-run picker.
 */
export function isAuthenticated(): boolean {
    return listAuthenticatedProviders().length > 0
        || Boolean(process.env.OPENAI_API_KEY)
        || Boolean(process.env.ANTHROPIC_API_KEY);
}
