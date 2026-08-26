/**
 * types.ts — Graph Workflow types.
 */

export type NodeName = string;

export interface GraphContext {
    input: string;
    sessionId: string;
    source: string;
    state: Record<string, any>;
}

export interface GraphNodeResult {
    output?: string;
    stateUpdates?: Record<string, any>;
    nextRoute?: string | null;
}

export type NodeFunction = (ctx: GraphContext) => Promise<GraphNodeResult>;

export interface GraphNode {
    name: NodeName;
    execute: NodeFunction;
}

export interface GraphEdge {
    from: NodeName;
    to: NodeName;
    condition?: (ctx: GraphContext) => boolean;
}

export interface GraphDefinition {
    nodes: GraphNode[];
    edges: GraphEdge[];
    start: NodeName;
}
