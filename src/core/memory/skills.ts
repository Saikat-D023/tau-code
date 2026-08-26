/**
 * skills.ts — Procedural memory / Skills System.
 * 
 * Skills are markdown instruction files stored in .tau/skills/<name>/SKILL.md.
 * Each has YAML frontmatter with name, description, and trigger keywords.
 * The SkillRegistry scans the directory, matches skills by keyword relevance,
 * and returns the top-K contents for injection into working memory.
 */

import { SKILLS_DIR } from "../tau-dir.ts";
import * as fs from "node:fs";
import * as path from "node:path";

export interface SkillMetadata {
    name: string;
    description: string;
    triggers: string[];
    filePath: string;
    body: string;
}

/**
 * Parse YAML frontmatter from a markdown string.
 * Returns { metadata, body } where metadata is the parsed YAML and body is the remaining markdown.
 */
function parseFrontmatter(content: string): { metadata: Record<string, any>; body: string } {
    const match = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);
    if (!match) {
        return { metadata: {}, body: content };
    }

    const yamlBlock = match[1]!;
    const body = match[2]!;

    // Simple YAML parser (handles name, description, triggers)
    const metadata: Record<string, any> = {};
    for (const line of yamlBlock.split("\n")) {
        const kvMatch = line.match(/^(\w+):\s*(.+)$/);
        if (kvMatch) {
            const key = kvMatch[1]!;
            let value: any = kvMatch[2]!.trim();

            // Parse JSON arrays like ["schedule", "calendar"]
            if (value.startsWith("[")) {
                try { value = JSON.parse(value); }
                catch { /* leave as string */ }
            }

            // Strip quotes
            if (typeof value === "string" && value.startsWith('"') && value.endsWith('"')) {
                value = value.slice(1, -1);
            }

            metadata[key] = value;
        }
    }

    return { metadata, body };
}

export class SkillRegistry {
    private skills: SkillMetadata[] = [];
    private scanned = false;

    /**
     * Scan .tau/skills/ for SKILL.md files. Called on startup or after new skill creation.
     */
    scan(): SkillMetadata[] {
        this.skills = [];

        if (!fs.existsSync(SKILLS_DIR)) {
            this.scanned = true;
            return this.skills;
        }

        const entries = fs.readdirSync(SKILLS_DIR, { withFileTypes: true });
        for (const entry of entries) {
            if (!entry.isDirectory()) continue;

            const skillPath = path.join(SKILLS_DIR, entry.name, "SKILL.md");
            if (!fs.existsSync(skillPath)) continue;

            try {
                const raw = fs.readFileSync(skillPath, "utf-8");
                const { metadata, body } = parseFrontmatter(raw);

                this.skills.push({
                    name: metadata.name || entry.name,
                    description: metadata.description || "",
                    triggers: Array.isArray(metadata.triggers) ? metadata.triggers : [],
                    filePath: skillPath,
                    body: body.trim(),
                });
            } catch (err) {
                console.warn(`[Skills] Failed to parse ${skillPath}:`, err);
            }
        }

        this.scanned = true;
        return this.skills;
    }

    /**
     * Match skills against a user prompt using keyword overlap.
     * Returns the top-K skill contents sorted by relevance.
     */
    match(prompt: string, topK = 3): SkillMetadata[] {
        if (!this.scanned) this.scan();

        const words = prompt.toLowerCase().split(/\s+/);

        const scored = this.skills.map(skill => {
            let score = 0;
            for (const trigger of skill.triggers) {
                const triggerLower = trigger.toLowerCase();
                // Check if any word in the prompt matches a trigger
                for (const word of words) {
                    if (word.includes(triggerLower) || triggerLower.includes(word)) {
                        score += 1;
                    }
                }
                // Also check if the trigger phrase appears in the prompt
                if (prompt.toLowerCase().includes(triggerLower)) {
                    score += 2;
                }
            }

            // Also check description keywords
            if (skill.description) {
                const descWords = skill.description.toLowerCase().split(/\s+/);
                for (const word of words) {
                    if (descWords.includes(word) && word.length > 3) {
                        score += 0.5;
                    }
                }
            }

            return { skill, score };
        });

        return scored
            .filter(s => s.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, topK)
            .map(s => s.skill);
    }

    /**
     * Create a new skill. Writes SKILL.md to .tau/skills/<name>/.
     */
    create(name: string, description: string, triggers: string[], body: string): SkillMetadata {
        const safeName = name.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-");
        const skillDir = path.join(SKILLS_DIR, safeName);
        
        if (!fs.existsSync(skillDir)) {
            fs.mkdirSync(skillDir, { recursive: true });
        }

        const content = `---
name: ${safeName}
description: ${description}
triggers: ${JSON.stringify(triggers)}
---

${body}
`;
        const skillPath = path.join(skillDir, "SKILL.md");
        fs.writeFileSync(skillPath, content, "utf-8");

        // Re-scan to pick up the new skill
        this.scan();

        return {
            name: safeName,
            description,
            triggers,
            filePath: skillPath,
            body,
        };
    }

    /**
     * List all known skills (for dashboard).
     */
    list(): SkillMetadata[] {
        if (!this.scanned) this.scan();
        return [...this.skills];
    }

    /**
     * Get a specific skill by name.
     */
    get(name: string): SkillMetadata | undefined {
        if (!this.scanned) this.scan();
        return this.skills.find(s => s.name === name);
    }
}
