/**
 * permission-gate.ts — Confirms every non-read tool call before it runs.
 *
 * `read_file` and `search_web` are exempt (see CONTEXT.md: Permission Gate).
 * Everything that mutates state — writes, edits, shell commands, memory
 * writes — asks first, since Operations now run unsandboxed on the user's
 * real machine (see docs/adr/0001).
 */

import * as readline from "readline/promises";

export interface PermissionGate {
    /** Resolves true if the user approves, false if they deny. */
    request(tool: string, args: Record<string, any>): Promise<boolean>;
}

const EXEMPT_TOOLS = new Set(["read_file", "search_web"]);

export function requiresConfirmation(tool: string): boolean {
    return !EXEMPT_TOOLS.has(tool);
}

/** Prompts on the terminal the process was started from — shared by both the CLI and dashboard gateways. */
export class CliPermissionGate implements PermissionGate {
    // Reuses the CLI gateway's own readline interface when attached, since Node only
    // reliably delivers stdin input to one readline.Interface at a time — two interfaces
    // on the same stream race and silently drop input (see docs/adr note in cli/index.ts).
    private rl?: readline.Interface;

    attach(rl: readline.Interface): void {
        this.rl = rl;
    }

    async request(tool: string, args: Record<string, any>): Promise<boolean> {
        const rl = this.rl ?? readline.createInterface({ input: process.stdin, output: process.stdout });
        try {
            console.log(`\n[permission] taucode wants to run "${tool}" with: ${JSON.stringify(args)}`);
            const answer = (await rl.question("Allow? (y/N) ")).trim().toLowerCase();
            return answer === "y" || answer === "yes";
        } finally {
            if (!this.rl) rl.close();
        }
    }
}

/** Approves everything without asking — for evals/tests where a human isn't present to confirm. */
export class AutoApprovePermissionGate implements PermissionGate {
    async request(): Promise<boolean> {
        return true;
    }
}
