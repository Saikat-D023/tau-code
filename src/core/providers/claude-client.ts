/**
 * providers/claude-client.ts — Claude provider (Anthropic Messages API).
 *
 * Uses a real Anthropic developer API key (`x-api-key`), not a Claude Pro/Max
 * subscription OAuth token. See docs/adr/0003 for why: making an OAuth token
 * work against the Messages API requires every request to claim to be
 * "Claude Code, Anthropic's official CLI" — spoofing a different Anthropic
 * product's identity to get access a third-party tool isn't meant to have.
 * That's documented to get real accounts banned, so taucode doesn't do it.
 */

import type { ModelClient, Message, Tool, AssistantMessage, ToolCall } from "../model-client.ts";
import { getCredential } from "../auth/store.ts";

const MESSAGES_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";

interface AnthropicContentBlock {
    type: "text" | "tool_use" | "tool_result";
    text?: string;
    id?: string;
    name?: string;
    input?: Record<string, any>;
    tool_use_id?: string;
    content?: string;
}

interface AnthropicMessage {
    role: "user" | "assistant";
    content: AnthropicContentBlock[];
}

/**
 * Anthropic requires strict user/assistant alternation, with tool results as
 * `tool_result` blocks inside a user turn. Our Message[] has a separate
 * "tool" role per result, so consecutive tool messages get folded into one
 * user turn here.
 */
function toAnthropicMessages(messages: Message[]): AnthropicMessage[] {
    const result: AnthropicMessage[] = [];

    for (const message of messages) {
        if (message.role === "user") {
            result.push({ role: "user", content: [{ type: "text", text: message.content }] });
        } else if (message.role === "assistant") {
            const blocks: AnthropicContentBlock[] = [];
            if (message.content) blocks.push({ type: "text", text: message.content });
            for (const tc of message.tool_calls ?? []) {
                blocks.push({ type: "tool_use", id: tc.id, name: tc.name, input: tc.arguments });
            }
            result.push({ role: "assistant", content: blocks });
        } else if (message.role === "tool") {
            const block: AnthropicContentBlock = {
                type: "tool_result",
                tool_use_id: message.tool_call_id,
                content: message.content,
            };
            const last = result[result.length - 1];
            if (last?.role === "user" && last.content.every(b => b.type === "tool_result")) {
                last.content.push(block);
            } else {
                result.push({ role: "user", content: [block] });
            }
        }
    }

    return result;
}

/** A real Anthropic developer API key — from the auth store (pasted via `taucode auth`) or ANTHROPIC_API_KEY. */
export function resolveClaudeApiKey(): string {
    const cred = getCredential("claude");
    if (cred?.type === "api_key") return cred.api_key;

    const envKey = process.env.ANTHROPIC_API_KEY;
    if (envKey) return envKey;

    throw new Error("No Anthropic API key found. Run `taucode auth` and paste one, or set ANTHROPIC_API_KEY.");
}

export class ClaudeClient implements ModelClient {
    private model: string;

    constructor(model: string = "claude-sonnet-4-5-20250929") {
        this.model = model;
    }

    async complete(messages: Message[], tools?: Tool[]): Promise<AssistantMessage> {
        const apiKey = resolveClaudeApiKey();

        const requestBody: any = {
            model: this.model,
            max_tokens: 4096,
            messages: toAnthropicMessages(messages),
        };
        if (tools && tools.length > 0) {
            requestBody.tools = tools.map(t => ({
                name: t.name,
                description: t.description,
                input_schema: t.parameters,
            }));
        }

        const response = await fetch(MESSAGES_URL, {
            method: "POST",
            headers: {
                "x-api-key": apiKey,
                "anthropic-version": ANTHROPIC_VERSION,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
            throw new Error(`Claude API Error (${response.status}): ${await response.text()}`);
        }

        const data = await response.json() as {
            content: AnthropicContentBlock[];
            usage?: { input_tokens: number; output_tokens: number };
        };

        let content = "";
        const toolCalls: ToolCall[] = [];
        for (const block of data.content) {
            if (block.type === "text" && block.text) content += block.text;
            if (block.type === "tool_use" && block.id && block.name) {
                toolCalls.push({ id: block.id, name: block.name, arguments: block.input ?? {} });
            }
        }

        return {
            role: "assistant",
            content,
            tool_calls: toolCalls.length > 0 ? toolCalls : undefined,
            usage: data.usage ? {
                prompt_tokens: data.usage.input_tokens,
                completion_tokens: data.usage.output_tokens,
            } : undefined,
        };
    }
}
