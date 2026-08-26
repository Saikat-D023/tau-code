/**
 * search-web.ts — Web search tool using DuckDuckGo HTML (no API key required).
 * 
 * Parses search result snippets from DDG's HTML lite endpoint.
 * Falls back gracefully if the request fails.
 */

import { Type } from "typebox";
import type { Tool } from "../model-client.ts";

export const searchWebToolDefinition: Tool = {
    name: "search_web",
    description: "Search the web using DuckDuckGo. Returns a list of result snippets. Use this for current events, factual lookups, or anything the agent doesn't know.",
    parameters: Type.Object({
        query: Type.String({ description: "The search query" }),
        max_results: Type.Optional(Type.Number({ description: "Maximum number of results to return (default: 5)" })),
    }),
};

interface SearchResult {
    title: string;
    url: string;
    snippet: string;
}

export async function searchWebToolHandler(args: Record<string, any>): Promise<string> {
    const { query, max_results = 5 } = args;

    try {
        // Use DuckDuckGo HTML lite endpoint
        const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
        const response = await fetch(url, {
            headers: {
                "User-Agent": "Mozilla/5.0 (compatible; TauAgent/1.0)",
            },
        });

        if (!response.ok) {
            return `Search failed with status ${response.status}`;
        }

        const html = await response.text();
        const results = parseResults(html, max_results);

        if (results.length === 0) {
            return `No results found for "${query}".`;
        }

        const formatted = results.map((r, i) =>
            `${i + 1}. **${r.title}**\n   ${r.url}\n   ${r.snippet}`
        ).join("\n\n");

        return `Search results for "${query}":\n\n${formatted}`;
    } catch (err: any) {
        return `Search error: ${err.message}`;
    }
}

/**
 * Parse search results from DuckDuckGo HTML lite page.
 */
function parseResults(html: string, maxResults: number): SearchResult[] {
    const results: SearchResult[] = [];

    // Match result links — DDG HTML lite uses <a class="result__a" href="...">title</a>
    const linkRegex = /<a\s+[^>]*class="result__a"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
    // Match snippets — <a class="result__snippet" ...>snippet</a>
    const snippetRegex = /<a\s+[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi;

    const links: { url: string; title: string }[] = [];
    const snippets: string[] = [];

    let match;
    while ((match = linkRegex.exec(html)) !== null && links.length < maxResults) {
        const url = match[1]!.replace(/&amp;/g, "&");
        const title = match[2]!.replace(/<[^>]*>/g, "").trim();
        if (title && url) {
            links.push({ url, title });
        }
    }

    while ((match = snippetRegex.exec(html)) !== null && snippets.length < maxResults) {
        const snippet = match[1]!.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
        snippets.push(snippet);
    }

    for (let i = 0; i < links.length; i++) {
        results.push({
            title: links[i]!.title,
            url: links[i]!.url,
            snippet: snippets[i] || "",
        });
    }

    return results;
}
