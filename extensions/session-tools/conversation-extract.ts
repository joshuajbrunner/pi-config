import type { SessionEntry } from "@mariozechner/pi-coding-agent";
import { readFile } from "node:fs/promises";
import type { ContentBlock } from "./types";

export function extractTextParts(content: unknown): string[] {
	if (typeof content === "string") return [content];
	if (!Array.isArray(content)) return [];

	const textParts: string[] = [];
	for (const part of content) {
		if (!part || typeof part !== "object") continue;

		const block = part as ContentBlock;
		if (block.type === "text" && typeof block.text === "string") {
			textParts.push(block.text);
		}
	}

	return textParts;
}

export function extractToolCallLines(content: unknown): string[] {
	if (!Array.isArray(content)) return [];

	const toolCalls: string[] = [];
	for (const part of content) {
		if (!part || typeof part !== "object") continue;

		const block = part as ContentBlock;
		if (block.type !== "toolCall" || typeof block.name !== "string") continue;

		toolCalls.push(`Tool ${block.name} was called with args ${JSON.stringify(block.arguments ?? {})}`);
	}

	return toolCalls;
}

function extractMessageSection(message: { role?: unknown; content?: unknown }): string | undefined {
	const role = message.role;
	const isUser = role === "user";
	const isAssistant = role === "assistant";
	if (!isUser && !isAssistant) return undefined;

	const entryLines: string[] = [];
	const text = extractTextParts(message.content).join("\n").trim();
	if (text.length > 0) {
		entryLines.push(`${isUser ? "User" : "Assistant"}: ${text}`);
	}

	if (isAssistant) {
		entryLines.push(...extractToolCallLines(message.content));
	}

	return entryLines.length > 0 ? entryLines.join("\n") : undefined;
}

export function buildConversationText(entries: SessionEntry[]): string {
	const sections: string[] = [];

	for (const entry of entries) {
		if (entry.type !== "message") continue;
		const section = extractMessageSection(entry.message);
		if (section) sections.push(section);
	}

	return sections.join("\n\n");
}

function messageFromPersistedLine(value: unknown): { role?: unknown; content?: unknown } | undefined {
	if (!value || typeof value !== "object") return undefined;
	const record = value as Record<string, unknown>;
	const candidate = record.message && typeof record.message === "object" ? record.message : record;
	if (!candidate || typeof candidate !== "object") return undefined;
	return candidate as { role?: unknown; content?: unknown };
}

export async function buildConversationTextFromSessionFile(sessionFile: string): Promise<string> {
	let raw: string;
	try {
		raw = await readFile(sessionFile, "utf8");
	} catch {
		return "";
	}

	const sections: string[] = [];
	for (const line of raw.split("\n")) {
		const trimmed = line.trim();
		if (!trimmed) continue;

		try {
			const parsed = JSON.parse(trimmed) as unknown;
			const message = messageFromPersistedLine(parsed);
			if (!message) continue;
			const section = extractMessageSection(message);
			if (section) sections.push(section);
		} catch {
			continue;
		}
	}

	return sections.join("\n\n");
}
