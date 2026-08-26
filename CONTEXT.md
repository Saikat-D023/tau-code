# taucode

A coding agent (writes/edits/runs code via local tools) whose headline differentiator is persistent, project-scoped memory. Distributed as a CLI + local dashboard that engineers run against their own model provider account — not a hosted product.

## Language

**Provider**:
A model backend behind the `ModelClient` interface (Claude, Codex/OpenAI). Each provider authenticates however fits it: OpenAI via a subscription OAuth handshake, Claude via a developer API key only — see docs/adr/0003 for why they're asymmetric.
_Avoid_: Model, backend, vendor

**ModelClient**:
The interface every provider implements (`complete(messages, tools)`). taucode is the single agent shell; providers are swapped-in implementations behind it, never a separate CLI taucode shells out to.
_Avoid_: LLM client, API wrapper

**Auth**:
The global, user-scoped credential (e.g. `~/.taucode/auth.json`) for a provider — either an OAuth token (OpenAI, via browser login) or a pasted/env-var API key (both providers). Shared across every project on the machine.
_Avoid_: Session, credentials (session already means something else — see below)

**Session**:
One project-scoped conversation thread, stored in `.tau/session.sqlite` with branching (each turn points at a parent turn). Scoped to the project directory, not the user — distinct from Auth.
_Avoid_: Chat, thread, conversation

**Operations**:
The local-execution interface (`readFile`/`writeFile`/`editFile`/`executeBash`) that tools run through. Runs directly on the user's machine — no sandbox, no isolation.
_Avoid_: Sandbox, adapter (there is only one implementation now; "adapter" implied a choice of backends that no longer exists)

**Permission Gate**:
The confirmation step in front of every non-read Operation (`writeFile`, `editFile`, `executeBash`, memory writes) — the user approves before it executes. `read` is exempt.
_Avoid_: Approval, guardrail

**Fact**:
A single semantic memory entry stored in `facts` (project-scoped), retrieved via full-text search when the Retrieval Gate decides a turn needs it.
_Avoid_: Memory (too broad — Fact is one of three memory kinds), note

**Episode**:
A one-sentence summary of a past turn, stored in `episodes`, generated after every turn and consolidated over time.
_Avoid_: History, log entry

**Skill**:
A procedural memory entry — a named instruction with trigger keywords, matched against the user's prompt and injected into context when relevant.
_Avoid_: Plugin, macro

**Retrieval Gate**:
The per-turn decision of whether to query Facts at all, and with what search query — avoids polluting context with irrelevant memory on every turn.
_Avoid_: RAG, memory search

**Soul**:
The project's standing persona/preferences, stored in `.tau/SOUL.md`, injected into every turn's system context.
_Avoid_: System prompt, persona file

**Triage Graph**:
The opt-in (`TAU_GRAPH_WORKFLOWS=1`) DAG that classifies a message before the main loop runs, routing greetings to a quick reply and everything else to the full agent loop. Falls open to the plain loop on any error.
_Avoid_: Workflow, pipeline (Graph Workflow is the general engine; Triage Graph is the one instance of it that ships)
