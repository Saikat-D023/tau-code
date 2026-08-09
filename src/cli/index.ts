import * as readline from "readline/promises";
import { Agent } from "../core/loop.ts";

async function main() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    console.log("Starting TauCode Agent CLI...");
    console.log("Type 'exit' or 'quit' to end the session.");
    console.log("---------------------------------------");

    const agent = new Agent({ maxIterations: 10 });

    while (true) {
        const userInput = await rl.question("\nYou: ");

        const trimmed = userInput.trim();
        if (trimmed.toLowerCase() === "exit" || trimmed.toLowerCase() === "quit") {
            console.log("Goodbye!");
            break;
        }

        if (!trimmed) continue;

        try {
            const result = await agent.processTurn(trimmed, {
                source: 'cli',
                sessionId: 'cli-session',
                observer: (kind, ev) => {
                    if (kind === 'tool') {
                        console.log(`\n  [tool] ${ev.tool} with args: ${JSON.stringify(ev.args)}`);
                    } else if (kind === 'llm') {
                        process.stdout.write('.');
                    }
                }
            });
            console.log(`\nAgent: ${result.reply}`);
        } catch (error) {
            console.error("Error processing turn:", error);
        }
    }

    rl.close();
}

main().catch(console.error);
