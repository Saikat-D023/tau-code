/**
 * runner.ts — Deterministic eval runner using Bun test.
 * 
 * Iterates eval cases, runs agent.processTurn() for each, and asserts
 * the defined expectations. Run with: bun test src/evals/deterministic/
 */

import { describe, test, expect } from "bun:test";
import { Agent } from "../../core/loop.ts";
import { DETERMINISTIC_CASES } from "./cases.ts";
import type { EvalCase, Assertion } from "./cases.ts";
import type { LoopResult } from "../../core/loop.ts";
import { AutoApprovePermissionGate } from "../../core/permission-gate.ts";

function checkAssertion(assertion: Assertion, result: LoopResult): { pass: boolean; message: string } {
    switch (assertion.type) {
        case "no_tool_call":
            if (result.toolCalls.length === 0) {
                return { pass: true, message: "No tool calls (expected)" };
            }
            return {
                pass: false,
                message: `Expected no tool calls, but got: ${result.toolCalls.map(tc => tc.tool).join(", ")}`,
            };

        case "tool_called":
            if (result.toolCalls.some(tc => tc.tool === assertion.tool)) {
                return { pass: true, message: `Tool '${assertion.tool}' was called (expected)` };
            }
            return {
                pass: false,
                message: `Expected tool '${assertion.tool}' to be called, but got: ${result.toolCalls.map(tc => tc.tool).join(", ") || "none"}`,
            };

        case "tool_not_called":
            if (!result.toolCalls.some(tc => tc.tool === assertion.tool)) {
                return { pass: true, message: `Tool '${assertion.tool}' was NOT called (expected)` };
            }
            return {
                pass: false,
                message: `Expected tool '${assertion.tool}' NOT to be called, but it was`,
            };

        case "reply_contains":
            if (result.reply.toLowerCase().includes(assertion.value!.toLowerCase())) {
                return { pass: true, message: `Reply contains '${assertion.value}' (expected)` };
            }
            return {
                pass: false,
                message: `Expected reply to contain '${assertion.value}', got: "${result.reply.slice(0, 100)}..."`,
            };

        case "reply_not_contains":
            if (!result.reply.toLowerCase().includes(assertion.value!.toLowerCase())) {
                return { pass: true, message: `Reply does NOT contain '${assertion.value}' (expected)` };
            }
            return {
                pass: false,
                message: `Expected reply NOT to contain '${assertion.value}', but it does`,
            };

        case "tool_arg_contains": {
            const tc = result.toolCalls.find(tc => tc.tool === assertion.tool);
            if (!tc) {
                return { pass: false, message: `Tool '${assertion.tool}' was not called` };
            }
            const argVal = String(tc.args[assertion.argKey!] || "");
            if (argVal.toLowerCase().includes(assertion.value!.toLowerCase())) {
                return { pass: true, message: `Tool arg '${assertion.argKey}' contains '${assertion.value}'` };
            }
            return {
                pass: false,
                message: `Expected tool arg '${assertion.argKey}' to contain '${assertion.value}', got: "${argVal}"`,
            };
        }

        default:
            return { pass: false, message: `Unknown assertion type: ${assertion.type}` };
    }
}

describe("Deterministic Evals", () => {
    const agent = new Agent({ maxIterations: 5, permissionGate: new AutoApprovePermissionGate() });

    for (const evalCase of DETERMINISTIC_CASES) {
        test(evalCase.name, async () => {
            const result = await agent.processTurn(evalCase.prompt, {
                source: "cli",
                sessionId: `eval-${Date.now()}`,
            });

            for (const assertion of evalCase.assertions) {
                const check = checkAssertion(assertion, result);
                expect(check.pass).toBe(true);
                if (!check.pass) {
                    console.error(`  ✗ ${check.message}`);
                }
            }
        }, { timeout: 60_000 }); // 60s timeout per test (LLM calls)
    }
});
