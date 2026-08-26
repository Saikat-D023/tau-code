/**
 * triage.ts — Default Triage Graph Workflow.
 * 
 * Enabled by TAU_GRAPH_WORKFLOWS=1.
 * 1. classify (cheap model)
 * 2. route:
 *    - if greeting: quick_reply -> END
 *    - else: full_agent -> END
 */

import { GraphWorkflow } from "./engine.ts";
import type { GraphDefinition } from "./types.ts";
import type { ModelClient } from "../model-client.ts";
import { resolveModelClient } from "../providers/resolve.ts";
import { Agent } from "../loop.ts";

// Shared instance so we don't recreate the client every turn
let client: ModelClient | null = null;
let tauAgent: Agent | null = null;

export function initTriageGraph(agentInstance: Agent) {
    tauAgent = agentInstance;
    client = resolveModelClient(process.env.TAU_GATE_MODEL);
}

export const triageGraphDef: GraphDefinition = {
    start: "classify",
    nodes: [
        {
            name: "classify",
            execute: async (ctx) => {
                if (!client) throw new Error("Triage graph not initialized");
                
                const prompt = `Classify this user message into one of two categories: 'greeting' or 'other'.
Message: "${ctx.input}"
Reply with ONLY the category name.`;
                
                const res = await client.complete([{ role: "user", content: prompt }]);
                const category = res.content.trim().toLowerCase().includes("greeting") ? "greeting" : "other";
                
                return {
                    stateUpdates: { category },
                    nextRoute: "route"
                };
            }
        },
        {
            name: "route",
            execute: async (ctx) => {
                const cat = ctx.state.category;
                return {
                    nextRoute: cat === "greeting" ? "quick_reply" : "full_agent"
                };
            }
        },
        {
            name: "quick_reply",
            execute: async (ctx) => {
                if (!client) throw new Error("Triage graph not initialized");
                
                const res = await client.complete([{ role: "user", content: `Reply nicely to this greeting: "${ctx.input}"` }]);
                
                return {
                    output: res.content,
                    nextRoute: null // END
                };
            }
        },
        {
            name: "full_agent",
            execute: async (ctx) => {
                if (!tauAgent) throw new Error("Triage graph not initialized");
                
                // Route through the standard tau agent
                const res = await tauAgent.processTurn(ctx.input, {
                    sessionId: ctx.sessionId,
                    source: ctx.source as any,
                });
                
                return {
                    output: res.reply,
                    nextRoute: null // END
                };
            }
        }
    ],
    edges: []
};

export const triageGraph = new GraphWorkflow(triageGraphDef);
