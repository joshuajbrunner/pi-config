import type { SessionEntry } from "@mariozechner/pi-coding-agent";
import type { ContentBlock } from "./types";

function extractTextParts(content: unknown): string[] {
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

function extractToolCallLines(content: unknown): string[] {
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

export function buildConversationText(entries: SessionEntry[]): string {
	const sections: string[] = [];

	for (const entry of entries) {
		if (entry.type !== "message") continue;

		const role = entry.message.role;
		const isUser = role === "user";
		const isAssistant = role === "assistant";
		if (!isUser && !isAssistant) continue;

		const entryLines: string[] = [];
		const text = extractTextParts(entry.message.content).join("\n").trim();
		if (text.length > 0) {
			entryLines.push(`${isUser ? "User" : "Assistant"}: ${text}`);
		}

		if (isAssistant) {
			entryLines.push(...extractToolCallLines(entry.message.content));
		}

		if (entryLines.length > 0) {
			sections.push(entryLines.join("\n"));
		}
	}

	return sections.join("\n\n");
}
