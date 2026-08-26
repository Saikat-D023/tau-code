/**
 * engine.ts — Graph Workflow Engine.
 * 
 * Executes a directed acyclic graph (DAG) of nodes.
 * Fall-open: if the graph errors, it throws so the loop can catch and fallback to the normal agent.
 */

import type { GraphContext, GraphDefinition, NodeName } from "./types.ts";

export class GraphWorkflow {
    private def: GraphDefinition;

    constructor(def: GraphDefinition) {
        this.def = def;
    }

    /**
     * Describe the topology of the graph (useful for dashboard).
     */
    describe(): any {
        return {
            nodes: this.def.nodes.map(n => ({ id: n.name, label: n.name })),
            edges: this.def.edges.map(e => ({ from: e.from, to: e.to }))
        };
    }

    /**
     * Run the graph workflow.
     */
    async run(initialContext: GraphContext): Promise<{ output: string, state: Record<string, any> }> {
        let currentNodeName: NodeName | null = this.def.start;
        const ctx: GraphContext = { ...initialContext, state: { ...initialContext.state } };

        let lastOutput = "";
        const visited = new Set<string>();

        while (currentNodeName) {
            if (visited.has(currentNodeName)) {
                throw new Error(`Cycle detected at node ${currentNodeName}`);
            }
            visited.add(currentNodeName);

            const node = this.def.nodes.find(n => n.name === currentNodeName);
            if (!node) {
                throw new Error(`Node not found: ${currentNodeName}`);
            }

            // Execute node
            const result = await node.execute(ctx);

            if (result.output) {
                lastOutput = result.output;
            }
            if (result.stateUpdates) {
                ctx.state = { ...ctx.state, ...result.stateUpdates };
            }

            // Determine next node
            let nextNodeName: NodeName | null = null;

            // If the node explicitly dictates the next route, use that (e.g. for dynamic routing)
            if (result.nextRoute !== undefined) {
                nextNodeName = result.nextRoute;
            } else {
                // Otherwise find the first matching edge
                const nextEdge = this.def.edges.find(
                    e => e.from === currentNodeName && (!e.condition || e.condition(ctx))
                );
                nextNodeName = nextEdge?.to ?? null;
            }
            currentNodeName = nextNodeName;
        }
        return { output: lastOutput, state: ctx.state };
    }
}
