# taucode

A coding agent that remembers. taucode reads/writes/edits files and runs shell commands like a normal coding agent, but keeps persistent, project-scoped memory (facts, episode summaries, procedural skills) across sessions — inspired by [pi-code](https://github.com/badlogic/pi-mono) (the coding-agent tool layer) and [waku-agent](https://github.com/ShenSeanChen/waku-agent) (the memory/eval/harness pillars).

See [CONTEXT.md](./CONTEXT.md) for the project's glossary, and [docs/adr/](./docs/adr/) for the reasoning behind its bigger architectural calls.

## Install

```bash
bun install
```

## Log in

taucode is provider-agnostic — run `/auth` from inside the CLI (or `bun run src/cli/index.ts auth` before starting) and pick a provider:

- **OpenAI**: browser-based OAuth login against your ChatGPT/Codex account, same pattern as Codex CLI — no API key required. `OPENAI_API_KEY` also works as a secondary/dev path.
- **Claude**: paste a real Anthropic API key (from console.anthropic.com), or set `ANTHROPIC_API_KEY`. There's no "log in with your Claude Pro/Max subscription" option — see [docs/adr/0003](./docs/adr/0003-claude-api-key-not-oauth.md) for why (short version: making that work requires spoofing a different Anthropic product's identity, which gets real accounts banned).

If you'd rather use API keys directly, copy `.env.example` to `.env` and fill in the values — `.env` is gitignored so your keys stay local. OAuth credentials (if you use that path instead) are stored separately at `~/.taucode/auth.json`, outside the repo.

## Run

```bash
bun run src/cli/index.ts
```

First run prompts the provider picker automatically if you haven't logged in yet. This starts:
- a CLI chat loop in the terminal
- a local dashboard at http://localhost:7777 showing live reasoning, memory, tools, and the graph workflow

Every `write_file`, `edit_file`, `bash`, and memory-write tool call asks for confirmation before it runs — taucode has no sandbox, tools execute directly on your machine (see [docs/adr/0001](./docs/adr/0001-local-only-execution.md)).

## Evals

```bash
bun run eval        # deterministic assertions
bun run eval:judge  # LLM-as-judge scoring
```
