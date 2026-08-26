/**
 * types.ts — Gateway Adapter Types.
 */
import type { Agent } from "../core/loop.ts"

export interface TurnRequest {
    message: string;
    source: 'cli' | 'telegram' | 'dashboard' | 'voice';
    sessionId: string
}

export interface GatewayAdapter {
    start(agent: Agent): Promise<void>;
    stop(): Promise<void>;
}
