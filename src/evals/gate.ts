/**
 * gate.ts — Release gate that combines deterministic + judge evals.
 * 
 * Run with: bun run eval:gate
 * 
 * 1. Runs deterministic suite first. If any fail → gate blocked.
 * 2. Runs judge suite. If score < threshold → gate blocked.
 * 3. On pass, bumps version in .tau/version.
 */

import { VERSION_PATH } from "../core/tau-dir.ts";
import * as fs from "node:fs";
import { $ } from "bun";

const THRESHOLD = parseInt(process.env.TAU_EVAL_THRESHOLD || "80", 10);

async function main() {
    console.log("🚀 Running Eval Release Gate\n");
    console.log(`   Threshold: ${THRESHOLD}%`);
    console.log("=".repeat(60));

    // Step 1: Deterministic suite
    console.log("\n📋 Step 1: Deterministic Suite");
    console.log("-".repeat(40));

    try {
        const deterministicResult = await $`bun test src/evals/deterministic/`.quiet();
        console.log(deterministicResult.text());
        console.log("✅ Deterministic suite passed.\n");
    } catch (err: any) {
        console.error("❌ Deterministic suite FAILED.");
        console.error(err.text?.() || err.message);
        console.log("\n🚫 Release gate BLOCKED — fix deterministic tests first.");
        process.exit(1);
    }

    // Step 2: Judge suite
    console.log("📋 Step 2: LLM-as-Judge Suite");
    console.log("-".repeat(40));

    try {
        const judgeResult = await $`bun run src/evals/judge/judge.ts`.quiet();
        const output = judgeResult.text();
        console.log(output);

        // Parse percentage from judge output
        const match = output.match(/(\d+)%/);
        if (match) {
            const score = parseInt(match[1]!, 10);
            if (score < THRESHOLD) {
                console.log(`\n🚫 Release gate BLOCKED — judge score ${score}% < ${THRESHOLD}% threshold.`);
                process.exit(1);
            }
        }

        console.log("✅ Judge suite passed.\n");
    } catch (err: any) {
        console.error("❌ Judge suite FAILED.");
        console.error(err.text?.() || err.message);
        console.log("\n🚫 Release gate BLOCKED — judge suite failed.");
        process.exit(1);
    }

    // Step 3: Bump version
    let version = 1;
    try {
        if (fs.existsSync(VERSION_PATH)) {
            version = parseInt(fs.readFileSync(VERSION_PATH, "utf-8").trim(), 10) + 1;
        }
    } catch {
        // Start at 1
    }

    fs.writeFileSync(VERSION_PATH, String(version), "utf-8");

    console.log("=".repeat(60));
    console.log(`\n✅ Release gate PASSED — version bumped to v${version}`);
    console.log(`   Written to ${VERSION_PATH}\n`);
}

main().catch((err) => {
    console.error("Release gate crashed:", err);
    process.exit(1);
});
