# Local-only tool execution, no sandbox

taucode's `bash`/`write_file`/`edit_file` tools run directly on the user's machine via `LocalOperations`, with no sandboxing layer. An earlier version used E2B (a paid cloud sandbox) as the execution backend; that adapter has been removed along with the dependency.

We decided against sandboxing because taucode targets engineers running it locally against their own project, and a second paid cloud dependency contradicts the "minimal, bring your own subscription" pitch — every run would cost E2B credits on top of the model. The trade-off is real: there is no isolation between the agent and the user's filesystem. We mitigate that with a [permission gate](../../CONTEXT.md) that confirms before any write, edit, or shell command executes, rather than with sandboxing.

If untrusted-code isolation becomes a real need later, reintroducing a pluggable `Operations` backend (E2B or otherwise) is the natural path back — the interface was deliberately kept backend-agnostic.
