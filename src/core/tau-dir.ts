/**
 * tau-dir.ts — Centralized path constants for the .tau/ local data directory.
 * 
 * Every module that needs to read/write .tau/ files imports paths from here.
 * The directory lives at process.cwd()/.tau/ so each project has its own brain.
 */

import * as path from "node:path";
import * as fs from "node:fs";

/** Root of the project-local .tau/ directory */
export const TAU_DIR = path.join(process.cwd(), ".tau");

/** Persona / standing preferences */
export const SOUL_PATH = path.join(TAU_DIR, "SOUL.md");

/** Human-readable mirror of state.db, regenerated after every turn */
export const MEMORY_MD_PATH = path.join(TAU_DIR, "MEMORY.md");

/** SQLite database for semantic facts + episodic memory */
export const STATE_DB_PATH = path.join(TAU_DIR, "state.db");

/** SQLite database for session branching */
export const SESSION_DB_PATH = path.join(TAU_DIR, "session.sqlite");

/** Directory for procedural memory skill files */
export const SKILLS_DIR = path.join(TAU_DIR, "skills");

/** Directory for per-day JSONL trace files */
export const TRACES_DIR = path.join(TAU_DIR, "traces");

/** Append-only cost ledger */
export const USAGE_PATH = path.join(TAU_DIR, "usage.jsonl");

/** Per-model rate card for cost estimation */
export const RATES_PATH = path.join(TAU_DIR, "rates.json");

/** Version marker bumped by the eval gate */
export const VERSION_PATH = path.join(TAU_DIR, "version");

const DEFAULT_SOUL = `# Soul

You are taucode, a coding agent running locally in the user's terminal.

You have real tools, scoped to the project directory the user launched you from (not a sandbox, not a demo):
- read_file / write_file / edit_file — read and modify files in this project
- bash — run shell commands in this project directory
- manage_memory / update_soul / create_skill — manage your own persistent memory
- search_web — look things up online

When the user asks whether you can access a file, folder, or run a command, the answer is yes within this
project directory — use the tool to check, don't just say you lack file system access. Never claim you're
"just a text-based AI" or similar; that's inaccurate for this deployment.
`;

/**
 * Ensure the .tau/ directory and all subdirectories exist.
 * Call once at startup.
 */
export function ensureTauDir(): void {
    const dirs = [TAU_DIR, SKILLS_DIR, TRACES_DIR];
    for (const dir of dirs) {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    }

    // Seed SOUL.md if it doesn't exist
    if (!fs.existsSync(SOUL_PATH)) {
        fs.writeFileSync(SOUL_PATH, DEFAULT_SOUL, "utf-8");
    }

    // Seed default rates.json if it doesn't exist
    if (!fs.existsSync(RATES_PATH)) {
        const defaultRates: Record<string, { prompt: number; completion: number }> = {
            "gpt-4o":        { prompt: 2.50,  completion: 10.00 },
            "gpt-4o-mini":   { prompt: 0.15,  completion: 0.60  },
            "gpt-4.1":      { prompt: 2.00,  completion: 8.00  },
            "gpt-4.1-mini": { prompt: 0.40,  completion: 1.60  },
            "gpt-4.1-nano": { prompt: 0.10,  completion: 0.40  },
            "o3":            { prompt: 2.00,  completion: 8.00  },
            "o3-mini":       { prompt: 1.10,  completion: 4.40  },
            "o4-mini":       { prompt: 1.10,  completion: 4.40  },
        };
        fs.writeFileSync(RATES_PATH, JSON.stringify(defaultRates, null, 2), "utf-8");
    }
}
