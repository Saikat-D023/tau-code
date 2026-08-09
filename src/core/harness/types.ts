import type { Agent } from "../loop.ts"

export interface TurnRequest {
    message: string;
    source: 'cli' | 'telegram' | 'dashboard' | 'voice';
    sessionId: string
}

export interface GatewayAdapter {
    start(agent: Agent): Promise<void>;
    stop(): Promise<void>;
}