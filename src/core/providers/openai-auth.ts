/**
 * providers/openai-auth.ts — OpenAI/ChatGPT subscription login.
 *
 * Standard OAuth-with-local-redirect (PKCE) against OpenAI's own login flow —
 * no custom-built auth server, we just point the user's browser at OpenAI.
 *
 * CAVEAT (see docs/adr/0002): the authorize/token endpoint + client id below
 * match the publicly reverse-engineered flow used by Codex CLI-style tools.
 * They are NOT official public API and can change without notice. This has
 * not been exercised end-to-end against a real ChatGPT subscription — if
 * login or the resulting token fails, fall back to OPENAI_API_KEY, which is
 * the verified path.
 */

import * as crypto from "node:crypto";
import * as http from "node:http";
import { exec } from "node:child_process";
import { getCredential, setCredential, type OAuthCredential } from "../auth/store.ts";

const AUTHORIZE_URL = "https://auth.openai.com/oauth/authorize";
const TOKEN_URL = "https://auth.openai.com/oauth/token";
const CLIENT_ID = "app_EMoamEEZ73f0CkXaXp7hrann";
const REDIRECT_PORT = 1455;
const REDIRECT_URI = `http://localhost:${REDIRECT_PORT}/auth/callback`;
const SCOPE = "openid profile email offline_access";

function base64url(input: Buffer): string {
    return input.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function openBrowser(url: string): void {
    const cmd = process.platform === "win32" ? `start "" "${url}"`
        : process.platform === "darwin" ? `open "${url}"`
        : `xdg-open "${url}"`;
    exec(cmd, () => { /* best effort — print the URL regardless */ });
}

function waitForCallback(): Promise<string> {
    return new Promise((resolve, reject) => {
        const server = http.createServer((req, res) => {
            const url = new URL(req.url ?? "/", REDIRECT_URI);
            const code = url.searchParams.get("code");
            const error = url.searchParams.get("error");

            res.writeHead(200, { "Content-Type": "text/html" });
            res.end(error
                ? `<h1>taucode login failed</h1><p>${error}</p>You can close this tab.`
                : `<h1>taucode is logged in</h1>You can close this tab and return to the terminal.`);

            server.close();
            if (error) reject(new Error(`OAuth error: ${error}`));
            else if (code) resolve(code);
            else reject(new Error("No authorization code returned"));
        });
        server.listen(REDIRECT_PORT);
        server.on("error", reject);
    });
}

/**
 * Opens the user's browser to OpenAI's real login page, captures the redirect
 * locally, exchanges the code for tokens, and stores them in the global auth store.
 */
export async function loginOpenAI(): Promise<void> {
    const verifier = base64url(crypto.randomBytes(32));
    const challenge = base64url(crypto.createHash("sha256").update(verifier).digest());
    const state = base64url(crypto.randomBytes(16));

    const authorizeUrl = new URL(AUTHORIZE_URL);
    authorizeUrl.searchParams.set("client_id", CLIENT_ID);
    authorizeUrl.searchParams.set("redirect_uri", REDIRECT_URI);
    authorizeUrl.searchParams.set("response_type", "code");
    authorizeUrl.searchParams.set("scope", SCOPE);
    authorizeUrl.searchParams.set("code_challenge", challenge);
    authorizeUrl.searchParams.set("code_challenge_method", "S256");
    authorizeUrl.searchParams.set("state", state);

    console.log("\nOpening your browser to log in to OpenAI...");
    console.log(`If it doesn't open automatically, visit:\n  ${authorizeUrl.toString()}\n`);
    openBrowser(authorizeUrl.toString());

    const code = await waitForCallback();

    const tokenRes = await fetch(TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            grant_type: "authorization_code",
            client_id: CLIENT_ID,
            code,
            redirect_uri: REDIRECT_URI,
            code_verifier: verifier,
        }),
    });

    if (!tokenRes.ok) {
        throw new Error(`Token exchange failed (${tokenRes.status}): ${await tokenRes.text()}`);
    }

    const data = await tokenRes.json() as { access_token: string; refresh_token?: string; expires_in?: number };
    const credential: OAuthCredential = {
        type: "oauth",
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_at: data.expires_in ? Date.now() + data.expires_in * 1000 : undefined,
    };
    setCredential("openai", credential);
    console.log("Logged in to OpenAI.");
}

/**
 * Resolves the API key/token to use for OpenAI calls: an OAuth access token
 * from a subscription login if present, otherwise the OPENAI_API_KEY env var
 * (the secondary/dev path — see CONTEXT.md: Auth).
 */
export function resolveOpenAIApiKey(): string {
    const cred = getCredential("openai");
    if (cred?.type === "oauth" && (!cred.expires_at || cred.expires_at > Date.now())) {
        return cred.access_token;
    }

    const envKey = (globalThis as any).process?.env?.OPENAI_API_KEY;
    if (envKey) return envKey;

    if (cred?.type === "oauth") {
        throw new Error("OpenAI login has expired. Run `taucode auth` to log in again.");
    }
    throw new Error("No OpenAI credentials found. Run `taucode auth` to log in, or set OPENAI_API_KEY.");
}
