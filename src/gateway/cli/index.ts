/**
 * cli/index.ts — CLI Gateway.
 */

import * as readline from "readline/promises";
import type { Agent } from "../../core/loop.ts";
import type { GatewayAdapter } from "../types.ts";
import { PROVIDERS } from "../../core/providers/registry.ts";
import { getCredential, type ProviderId } from "../../core/auth/store.ts";
import { runAuthFlow } from "../../cli/auth.ts";
import { CliPermissionGate } from "../../core/permission-gate.ts";

// Minimal ANSI styling — no dependency, just enough to separate roles at a glance.
const dim = (s: string) => `\x1b[2m${s}\x1b[0m`;
const bold = (s: string) => `\x1b[1m${s}\x1b[0m`;
const cyan = (s: string) => `\x1b[36m${s}\x1b[0m`;
const green = (s: string) => `\x1b[32m${s}\x1b[0m`;
const yellow = (s: string) => `\x1b[33m${s}\x1b[0m`;

function isProviderUsable(id: ProviderId): boolean {
    if (id === "openai" && process.env.OPENAI_API_KEY) return true;
    if (id === "claude" && process.env.ANTHROPIC_API_KEY) return true;
    return Boolean(getCredential(id));
}

export class CliGateway implements GatewayAdapter {
    private rl?: readline.Interface;

    async start(agent: Agent) {
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        this.attachPermissionGate(agent);

        console.log(bold("taucode") + dim(`  (model: ${agent.getModel()})`));
        console.log(
            dim("  /model           list subscriptions + models") + "\n" +
            dim("  /auth            log in to a provider") + "\n" +
            dim("  exit, quit       end the session")
        );

        while (true) {
            let userInput: string;
            try {
                userInput = await this.rl.question(`\n${cyan("›")} `);
            } catch {
                // stdin closed (Ctrl+D, or piped input ran out) — end the session instead of crashing
                break;
            }

            const trimmed = userInput.trim();
            if (trimmed.toLowerCase() === "exit" || trimmed.toLowerCase() === "quit") {
                console.log(dim("Goodbye."));
                break;
            }

            if (!trimmed) continue;

            if (trimmed === "/model" || trimmed.startsWith("/model ")) {
                const arg = trimmed.slice("/model".length).trim();
                if (arg) {
                    // Quick path: `/model <name>` sets the model directly on the current subscription.
                    agent.setModel(arg);
                    console.log(dim(`Model set to ${arg}`));
                } else {
                    await this.pickModel(agent);
                }
                continue;
            }

            if (trimmed === "/auth") {
                // runAuthFlow() opens its own readline on stdin — hand ours off so they don't fight over input.
                this.rl.close();
                try {
                    await runAuthFlow();
                } catch (error) {
                    console.error(yellow("Login failed:"), error);
                }
                this.rl = readline.createInterface({ input: process.stdin, output: process.stdout });
                this.attachPermissionGate(agent);
                continue;
            }

            try {
                const result = await agent.processTurn(trimmed, {
                    source: 'cli',
                    sessionId: 'cli-session',
                    observer: (kind, ev) => {
                        if (kind === 'tool') {
                            console.log(dim(`  ↳ ${ev.tool} ${JSON.stringify(ev.args)}`));
                        }
                    }
                });
                console.log(`\n${green("taucode")} ${result.reply}`);
            } catch (error) {
                console.error(yellow("Error:"), error);
            }
        }

        await this.stop();
    }

    /** Points the tool-call permission gate at this gateway's own readline interface, so they don't race over stdin. */
    private attachPermissionGate(agent: Agent) {
        const gate = agent.dispatcher.getPermissionGate();
        if (gate instanceof CliPermissionGate && this.rl) {
            gate.attach(this.rl);
        }
    }

    /** Lists every provider's subscription status and models, and lets the user pick one. */
    private async pickModel(agent: Agent) {
        const entries: { provider: ProviderId; model: string; usable: boolean }[] = [];

        console.log("");
        for (const p of PROVIDERS) {
            const usable = isProviderUsable(p.id);
            const status = usable ? green("logged in") : dim("not logged in — run `taucode auth`");
            console.log(`${bold(p.label)}  ${status}`);

            for (const model of p.models) {
                entries.push({ provider: p.id, model, usable });
                const n = entries.length;
                const current = model === agent.getModel() ? cyan(" (current)") : "";
                const line = `  ${n}) ${model}${current}`;
                console.log(usable ? line : dim(line));
            }
        }

        const answer = (await this.rl!.question(`\n${cyan("›")} pick a number (or Enter to cancel): `)).trim();
        if (!answer) return;

        const choice = entries[parseInt(answer, 10) - 1];
        if (!choice) {
            console.log(yellow("Not a valid choice."));
            return;
        }
        if (!choice.usable) {
            console.log(yellow(`${choice.provider} isn't logged in yet — run \`taucode auth\` first.`));
            return;
        }

        agent.switchProvider(choice.provider, choice.model);
        console.log(dim(`Switched to ${choice.provider} / ${choice.model}`));
    }

    async stop() {
        this.rl?.close();
    }
}
