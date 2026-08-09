import type { ModelClient } from "../model-client.ts";

export async function shouldRetrieve(
    client: ModelClient,
    message: string
): Promise<{ retrieve: boolean; query: string; reason: string }> {
    const prompt = `You are a retrieval gate. Does this message need the user's stored memories (facts, preferences, past events)? Reply with ONLY JSON: {"retrieve": true/false, "query": "search query", "reason": "<5 words"}\n\nMessage: ${message}`;

    try {
        const res = await client.complete([{ role: 'user', content: prompt }]);
        const text = res.content ?? '';
        const jsonStart = text.indexOf('{');
        const jsonEnd = text.lastIndexOf('}') + 1;
        
        if (jsonStart !== -1 && jsonEnd !== -1) {
            const json = text.slice(jsonStart, jsonEnd);
            const decision = JSON.parse(json);
            return { 
                retrieve: !!decision.retrieve, 
                query: decision.query || message, 
                reason: decision.reason || '' 
            };
        }
        return { retrieve: true, query: message, reason: 'no json found' };
    } catch (error) {
        return { retrieve: true, query: message, reason: 'gate failed open' };
    }
}