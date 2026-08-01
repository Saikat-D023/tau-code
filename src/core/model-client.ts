import type { TSchema } from "typebox"

//1. core types

export type Message = UserMessage | AssistantMessage | ToolResultMessage ;

export interface UserMessage {
    role: "user" ,
    content: string;
}

export interface AssistantMessage {
    role: "assistant";
    content: string,
    tool_calls?: ToolCall[];
}

export interface ToolResultMessage {
    role: "tool";
    tool_call_id: string,
    content: string
}

export interface ToolCall {
    id: string,
    name: string,
    arguments: Record<string, any>   // the parsed JSON args
}

export interface Tool<TParameters extends TSchema = TSchema> {
    name: string,
    description: string,
    parameters: TParameters;  //the typeBox schema
}

export interface ModelClient {
    complete(messages: Message[], tools?:Tool[]): Promise<AssistantMessage>
}

export class OpenAIClient implements ModelClient {
	private apiKey: string;
	private model: string;
	constructor(model: string = "gpt-4o-mini") {
		const key = process.env.OPENAI_API_KEY;
		if (!key) throw new Error("OPENAI_API_KEY environment variable is missing");
		
		this.apiKey = key;
		this.model = model;
	}
	async complete(messages: Message[], tools?: Tool[]): Promise<AssistantMessage> {
        const mappedMessages = messages.map(message => {

            if(message.role === "user"){
                return {
                    role: "user",
                    content: message.content
                }
            }

            if(message.role === "assistant"){
                return {
                    role: "assistant",
                    content: message.content,
                    tool_calls: message.tool_calls?.map(tc => {

                    })
                }
            }
        })
		
        
        throw new Error("Not implemented yet!");
	}
}