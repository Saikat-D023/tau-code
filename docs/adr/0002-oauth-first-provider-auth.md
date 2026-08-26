# OAuth-first provider auth (OpenAI)

`ModelClient` has one implementation per provider (`OpenAIClient`, `ClaudeClient`), each provider free to authenticate however fits it best. For OpenAI, that's a browser-based OAuth login against ChatGPT/Codex's own login flow — not a custom-built auth server, and not shelling out to the provider's own CLI. Control always returns to the taucode CLI; taucode is the single agent shell, providers are swapped-in backends. A plain `OPENAI_API_KEY` env var is kept as a secondary/dev path.

We considered API-key-only auth (simpler, and every value is officially documented). We rejected it for OpenAI because "bring your own ChatGPT/Codex subscription" was the explicit pitch, and a Plus subscription doesn't grant a developer API key on its own.

The trade-off: the OAuth endpoint and client ID are not official public API — they're reverse-engineered from Codex CLI's own login flow. They can change without notice, and this has not been exercised end-to-end against a live ChatGPT subscription by the author. If OAuth login breaks or doesn't work as expected, `OPENAI_API_KEY` is the verified fallback.

Claude does **not** use this pattern — see [docs/adr/0003](./0003-claude-api-key-not-oauth.md) for why subscription OAuth was dropped for Claude specifically after the OpenAI-style approach was found to require spoofing a different Anthropic product's client identity.
