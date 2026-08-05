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

    const agent = new Agent();

    while (true) {
        const userInput = await rl.question("\nYou: ");

        const trimmed = userInput.trim();
        if (trimmed.toLowerCase() === "exit" || trimmed.toLowerCase() === "quit") {
            console.log("Goodbye!");
            break;
        }

        if (!trimmed) continue;

        try {
            await agent.processTurn(trimmed);
        } catch (error) {
            console.error("Error processing turn:", error);
        }
    }

    rl.close();
}

main().catch(console.error);
