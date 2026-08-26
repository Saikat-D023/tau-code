/**
 * telegram/index.ts — Telegram Gateway Skeleton.
 * 
 * To enable: set TELEGRAM_BOT_TOKEN in .env.
 */

import type { Agent } from "../../core/loop.ts";
import type { GatewayAdapter } from "../types.ts";

export class TelegramGateway implements GatewayAdapter {
    private botToken: string | undefined;

    constructor() {
        this.botToken = process.env.TELEGRAM_BOT_TOKEN;
    }

    async start(agent: Agent) {
        if (!this.botToken) {
            console.log("Telegram Gateway: Disabled (no TELEGRAM_BOT_TOKEN)");
            return;
        }

        console.log("Starting Telegram Gateway (Skeleton)...");
        // Skeleton logic for polling Telegram API would go here.
        // E.g.
        // setInterval(async () => {
        //   const updates = await fetchUpdates();
        //   for (const msg of updates) {
        //     agent.processTurn(msg.text, { source: "telegram", sessionId: msg.chat.id.toString() });
        //   }
        // }, 1000);
    }

    async stop() {
        // Stop polling
    }
}
