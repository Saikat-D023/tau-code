/**
 * judge.ts — LLM-as-Judge eval suite.
 * 
 * After a deterministic test run, feeds conversation traces to a judge model
 * and scores: helpfulness (1-5), accuracy (1-5), tool correctness (1-5).
 * Returns a percentage score.
 * 
 * Run with: bun run src/evals/judge/judge.ts
 */

import { Agent, type LoopResult } from "../../core/loop.ts";
import { OpenAIClient } from "../../core/model-client.ts";
import { AutoApprovePermissionGate } from "../../core/permission-gate.ts";

interface JudgeScore {
    helpfulness: number;
    accuracy: number;
    tool_correctness: number;
    explanation: string;
}

interface JudgeResult {
    case_name: string;
    prompt: string;
    reply: string;
    score: JudgeScore;
}

const JUDGE_CASES = [
    {
        name: "General knowledge question",
        prompt: "What is the capital of France?",
    },
    {
        name: "Explanation request",
        prompt: "Explain how a binary search algorithm works in simple terms.",
    },
    {
        name: "Creative task",
        prompt: "Write a haiku about programming.",
    },
];

async function judgeConversation(
    judgeClient: OpenAIClient,
    caseName: string,
    prompt: string,
    result: LoopResult,
): Promise<JudgeScore> {
    const toolSummary = result.toolCalls.length > 0
        ? `\nTools used: ${result.toolCalls.map(tc => `${tc.tool}(${JSON.stringify(tc.args).slice(0, 50)})`).join(", ")}`
        : "\nNo tools were used.";

    const judgePrompt = `You are an AI evaluator. Score the following agent interaction on three criteria, each from 1-5:

1. **Helpfulness** (1-5): Did the agent address the user's request fully and usefully?
2. **Accuracy** (1-5): Is the response factually correct and free of hallucinations?
3. **Tool Correctness** (1-5): Did the agent use tools appropriately (or correctly decide not to use them)?

User Prompt: "${prompt}"
Agent Reply: "${result.reply}"${toolSummary}
Iterations: ${result.iterations}

Reply with ONLY valid JSON:
{"helpfulness": N, "accuracy": N, "tool_correctness": N, "explanation": "brief reason"}`;

    try {
        const res = await judgeClient.complete([{ role: "user", content: judgePrompt }]);
        const text = res.content ?? "";
        const jsonStart = text.indexOf("{");
        const jsonEnd = text.lastIndexOf("}") + 1;

        if (jsonStart !== -1 && jsonEnd > jsonStart) {
            const parsed = JSON.parse(text.slice(jsonStart, jsonEnd));
            return {
                helpfulness: Math.min(5, Math.max(1, parsed.helpfulness || 1)),
                accuracy: Math.min(5, Math.max(1, parsed.accuracy || 1)),
                tool_correctness: Math.min(5, Math.max(1, parsed.tool_correctness || 1)),
                explanation: parsed.explanation || "",
            };
        }
    } catch {
        // Default low scores if judge fails
    }

    return { helpfulness: 1, accuracy: 1, tool_correctness: 1, explanation: "Judge failed to parse" };
}

async function main() {
    console.log("🧑‍⚖️ Running LLM-as-Judge Eval Suite\n");
    console.log("=".repeat(60));

    const agent = new Agent({ maxIterations: 5, permissionGate: new AutoApprovePermissionGate() });
    const judgeClient = new OpenAIClient(process.env.TAU_JUDGE_MODEL || "gpt-4o");

    const results: JudgeResult[] = [];
    let totalScore = 0;
    const maxScore = JUDGE_CASES.length * 15; // 3 criteria × 5 max × N cases

    for (const testCase of JUDGE_CASES) {
        console.log(`\n📝 Case: ${testCase.name}`);
        console.log(`   Prompt: "${testCase.prompt}"`);

        const result = await agent.processTurn(testCase.prompt, {
            source: "cli",
            sessionId: `judge-${Date.now()}`,
        });

        console.log(`   Reply: "${result.reply.slice(0, 100)}..."`);

        const score = await judgeConversation(judgeClient, testCase.name, testCase.prompt, result);
        const caseTotal = score.helpfulness + score.accuracy + score.tool_correctness;
        totalScore += caseTotal;

        results.push({
            case_name: testCase.name,
            prompt: testCase.prompt,
            reply: result.reply,
            score,
        });

        console.log(`   Scores: H=${score.helpfulness} A=${score.accuracy} T=${score.tool_correctness} (${caseTotal}/15)`);
        console.log(`   Reason: ${score.explanation}`);
    }

    const percentage = Math.round((totalScore / maxScore) * 100);

    console.log("\n" + "=".repeat(60));
    console.log(`\n📊 Final Score: ${totalScore}/${maxScore} = ${percentage}%`);
    console.log(`   ${percentage >= 80 ? "✅ PASS" : "❌ FAIL"} (threshold: 80%)\n`);

    // Return exit code for CI
    process.exit(percentage >= 80 ? 0 : 1);
}

main().catch((err) => {
    console.error("Judge eval failed:", err);
    process.exit(1);
});
