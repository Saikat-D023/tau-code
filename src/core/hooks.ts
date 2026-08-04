import type { Message, ToolCall } from "./model-client.ts";

// Define the shape of the data for each hook
export interface TurnStartData {
    prompt: string;
}

export interface BeforeToolCallData {
    toolCall: ToolCall;
}

export interface AfterToolCallData {
    toolCall: ToolCall;
    result: string;
}

export interface TurnCompleteData {
    finalResponse: Message;
}

// A generic type for our hook callbacks
export type HookCallback<T> = (data: T) => void | Promise<void>;

export class AgentHooks {
    private onTurnStartListeners: HookCallback<TurnStartData>[] = []
    private beforeToolCallListeners: HookCallback<BeforeToolCallData>[] = []
    private afterToolCallListeners: HookCallback<AfterToolCallData>[] = []
    private onTurnCompleteListeners: HookCallback<TurnCompleteData>[] = []

    // --- Registration Methods ---

    public onTurnStart(callback: HookCallback<TurnStartData>) {
        this.onTurnStartListeners.push(callback);
    }

    public onBeforeToolCall(callback: HookCallback<BeforeToolCallData>) {
        this.beforeToolCallListeners.push(callback);
    }

    public onAfterToolCall(callback: HookCallback<AfterToolCallData>) {
        this.afterToolCallListeners.push(callback);
    }

    public onTurnComplete(callback: HookCallback<TurnCompleteData>) {
        this.onTurnCompleteListeners.push(callback);
    }

    // --- Trigger (Emit) Methods ---

    public async emitTurnStart(data: TurnStartData) {
        for (const listener of this.onTurnStartListeners) {
            await listener(data);
        }
    }

    public async emitBeforeToolCall(data: BeforeToolCallData) {
        for (const listener of this.beforeToolCallListeners) {
            await listener(data);
        }
    }

    public async emitAfterToolCall(data: AfterToolCallData) {
        for (const listener of this.afterToolCallListeners) {
            await listener(data);
        }
    }

    public async emitTurnComplete(data: TurnCompleteData) {
        for (const listener of this.onTurnCompleteListeners) {
            await listener(data);
        }
    }
}

// Export a singleton instance to use throughout the app
export const hooks = new AgentHooks();
