/**
 * create-skill.ts — Tool for creating repeatable workflow skills.
 * 
 * When the user teaches the agent a repeatable process, the agent
 * calls this tool to persist it as a .tau/skills/<name>/SKILL.md.
 */

import { Type } from "typebox";
import type { Tool } from "../model-client.ts";
import { SkillRegistry } from "../memory/skills.ts";

// Shared registry instance — the dispatcher will set this
let registry: SkillRegistry | null = null;

export function setSkillRegistry(reg: SkillRegistry): void {
    registry = reg;
}

export const createSkillToolDefinition: Tool = {
    name: "create_skill",
    description: "Save a repeatable workflow as a new skill. The skill will be automatically loaded when the user's message matches the trigger keywords.",
    parameters: Type.Object({
        name: Type.String({ description: "Short kebab-case name for the skill (e.g., 'calendar-scheduling')" }),
        description: Type.String({ description: "One-line description of what the skill does" }),
        triggers: Type.Array(Type.String(), { description: "Keywords that should activate this skill (e.g., ['schedule', 'calendar', 'meeting'])" }),
        body: Type.String({ description: "The full markdown instructions for the skill" }),
    }),
};

export async function createSkillToolHandler(args: Record<string, any>): Promise<string> {
    if (!registry) {
        return "Error: SkillRegistry not initialized.";
    }

    const { name, description, triggers, body } = args;

    try {
        const skill = registry.create(name, description, triggers || [], body);
        return `Created skill "${skill.name}" at ${skill.filePath}`;
    } catch (err: any) {
        return `Error creating skill: ${err.message}`;
    }
}
