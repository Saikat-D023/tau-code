/**
 * auth/store.ts — Global, user-scoped credential store.
 *
 * Lives at ~/.taucode/auth.json, shared across every project on the machine.
 * Deliberately separate from .tau/ (project-scoped memory) — see CONTEXT.md: Auth vs Session.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

export type ProviderId = "openai" | "claude";

export interface OAuthCredential {
    type: "oauth";
    access_token: string;
    refresh_token?: string;
    expires_at?: number; // epoch ms
}

export interface ApiKeyCredential {
    type: "api_key";
    api_key: string;
}

export type Credential = OAuthCredential | ApiKeyCredential;

interface AuthFile {
    activeProvider?: ProviderId;
    providers: Partial<Record<ProviderId, Credential>>;
}

const AUTH_DIR = path.join(os.homedir(), ".taucode");
const AUTH_PATH = path.join(AUTH_DIR, "auth.json");

function readAuthFile(): AuthFile {
    if (!fs.existsSync(AUTH_PATH)) {
        return { providers: {} };
    }
    try {
        return JSON.parse(fs.readFileSync(AUTH_PATH, "utf-8"));
    } catch {
        return { providers: {} };
    }
}

function writeAuthFile(data: AuthFile): void {
    if (!fs.existsSync(AUTH_DIR)) {
        fs.mkdirSync(AUTH_DIR, { recursive: true });
    }
    fs.writeFileSync(AUTH_PATH, JSON.stringify(data, null, 2), "utf-8");
}

export function getCredential(provider: ProviderId): Credential | undefined {
    return readAuthFile().providers[provider];
}

export function setCredential(provider: ProviderId, credential: Credential): void {
    const data = readAuthFile();
    data.providers[provider] = credential;
    if (!data.activeProvider) data.activeProvider = provider;
    writeAuthFile(data);
}

export function getActiveProvider(): ProviderId | undefined {
    return readAuthFile().activeProvider;
}

export function setActiveProvider(provider: ProviderId): void {
    const data = readAuthFile();
    data.activeProvider = provider;
    writeAuthFile(data);
}

export function listAuthenticatedProviders(): ProviderId[] {
    const data = readAuthFile();
    return Object.keys(data.providers) as ProviderId[];
}
