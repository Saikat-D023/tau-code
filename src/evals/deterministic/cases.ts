/**
 * cases.ts — Deterministic eval test cases.
 * 
 * Each case defines a prompt and assertions about the expected behavior.
 * These are 0/1 pass-fail, no LLM judges them.
 */

export type AssertionType = 
    | "no_tool_call"
    | "tool_called"
    | "tool_not_called"
    | "reply_contains"
    | "reply_not_contains"
    | "tool_arg_contains";

export interface Assertion {
    type: AssertionType;
    tool?: string;            // Tool name (for tool_called / tool_not_called / tool_arg_contains)
    argKey?: string;          // Argument key (for tool_arg_contains)
    value?: string;           // Expected substring (for reply_contains / tool_arg_contains)
}

export interface EvalCase {
    name: string;
    prompt: string;
    assertions: Assertion[];
}

export const DETERMINISTIC_CASES: EvalCase[] = [
    {
        name: "Pure math — no tools needed",
        prompt: "What is 2+2?",
        assertions: [
            { type: "no_tool_call" },
            { type: "reply_contains", value: "4" },
        ],
    },
    {
        name: "Greeting — no tools needed",
        prompt: "Hello!",
        assertions: [
            { type: "no_tool_call" },
        ],
    },
    {
        name: "File read — must use read_file tool",
        prompt: "Read the file README.md and tell me what it says.",
        assertions: [
            { type: "tool_called", tool: "read_file" },
        ],
    },
    {
        name: "File write — must use write_file tool",
        prompt: "Create a file called test.txt with the content 'Hello World'.",
        assertions: [
            { type: "tool_called", tool: "write_file" },
        ],
    },
    {
        name: "Web search — must use search_web tool",
        prompt: "Search the web for the latest World Cup results.",
        assertions: [
            { type: "tool_called", tool: "search_web" },
        ],
    },
    {
        name: "Memory management — must use manage_memory",
        prompt: "Remember that my favorite color is blue.",
        assertions: [
            { type: "tool_called", tool: "manage_memory" },
        ],
    },
];
