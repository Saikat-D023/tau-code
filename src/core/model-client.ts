import type { TSchema } from "typebox"


// 1. Core Types
export type Message = UserMessage | AssistantMessage | ToolResultMessage;

export interface UserMessage {
    role: "user",
    content: string;
}

export interface AssistantMessage {
    role: "assistant";
    content: string;
    tool_calls?: ToolCall[];
}

export interface ToolResultMessage {
    role: "tool";
    tool_call_id: string;
    content: string;
}

export interface ToolCall {
    id: string;
    name: string;
    arguments: Record<string, any>; // the parsed JSON args
}

export interface Tool<TParameters extends TSchema = TSchema> {
    name: string;
    description: string;
    parameters: TParameters;  //the typeBox schema
}

export interface ModelClient {
    complete(messages: Message[], tools?: Tool[]): Promise<AssistantMessage>
}

// 2. The Client Implementation
export class OpenAIClient implements ModelClient {
    private apiKey: string;
    private model: string;

    constructor(model: string = "gpt-4o-mini") {
        const key = (globalThis as any).process?.env?.OPENAI_API_KEY;
        if (!key) throw new Error("OPENAI_API_KEY environment variable is missing");

        this.apiKey = key;
        this.model = model;
    }

    async complete(messages: Message[], tools?: Tool[]): Promise<AssistantMessage> {
        // Map the `messages` array
        const mappedMessages = messages.map(message => {
            if (message.role === "user") {
                return {
                    role: "user",
                    content: message.content
                };
            }

            if (message.role === "assistant") {
                return {
                    role: "assistant",
                    content: message.content,
                    // If the assistant previously called tools, map them to OpenAI's format
                    tool_calls: message.tool_calls?.map(tc => ({
                        id: tc.id,
                        type: "function",
                        function: {
                            name: tc.name,
                            arguments: JSON.stringify(tc.arguments)
                        }
                    }))
                };
            }

            if (message.role === "tool") {
                return {
                    role: "tool",
                    tool_call_id: message.tool_call_id,
                    content: message.content
                };
            }

            throw new Error(`Unknown message role`);
        });

        //Map the `tools` array (if provided)
        let mappedTools;
        if (tools && tools.length > 0) {
            mappedTools = tools.map(tool => ({
                type: "function",
                function: {
                    name: tool.name,
                    description: tool.description,
                    parameters: tool.parameters
                }
            }));
        }

        let finalModel = this.model;
        if (this.apiKey.startsWith("sk-or-") && !finalModel.includes('/')) {
            finalModel = `openai/${finalModel}`;
        }

        // Prepare the request body
        const requestBody: any = {
            model: finalModel,
            messages: mappedMessages
        };

        // OpenAI crashes if you pass an empty `tools: []` array, so we only add it if tools exist
        if (mappedTools) {
            requestBody.tools = mappedTools;
        }

        const isOpenRouter = this.apiKey.startsWith("sk-or-");
        const endpoint = isOpenRouter 
            ? "https://openrouter.ai/api/v1/chat/completions" 
            : "https://api.openai.com/v1/chat/completions";

        // Make the fetch request
        const response = await fetch(endpoint, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${this.apiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(requestBody)
        });

        // Basic error handling so you aren't debugging blindly!
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`OpenAI API Error (${response.status}): ${errorText}`);
        }

        // Parse response and return the unified format
        const data = await response.json() as any;
        const responseMessage = data.choices[0].message;

        // Parse stringified tool arguments back into objects
        let parsedToolCalls;
        if (responseMessage.tool_calls) {
            parsedToolCalls = responseMessage.tool_calls.map((tc: any) => ({
                id: tc.id,
                name: tc.function.name,
                arguments: JSON.parse(tc.function.arguments)
            }));
        }

        return {
            role: "assistant",
            // Sometimes models return `null` content if they ONLY call a tool, so we default to ""
            content: responseMessage.content || "",
            tool_calls: parsedToolCalls
        };
    }
}
