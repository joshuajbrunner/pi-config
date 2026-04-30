import { readFile } from "node:fs/promises";
import type { ContentBlock } from "./types";

export type SessionMetrics = {
	messages: number;
	userMessages: number;
	assistantMessages: number;
	turns: number;
	filesTouched: number;
};

const FILE_ARG_KEYS = ["path", "file", "filePath", "input_path", "output_path"];
const FILE_TOOL_NAMES = new Set(["read", "edit", "write", "multi_edit"]);

function messageFromPersistedLine(value: unknown): { role?: unknown; content?: unknown } | undefined {
	if (!value || typeof value !== "object") return undefined;
	const record = value as Record<string, unknown>;
	const candidate = record.message && typeof record.message === "object" ? record.message : record;
	if (!candidate || typeof candidate !== "object") return undefined;
	return candidate as { role?: unknown; content?: unknown };
}

function collectFileArgs(value: unknown, files: Set<string>): void {
	if (!value || typeof value !== "object") return;
	const record = value as Record<string, unknown>;
	for (const key of FILE_ARG_KEYS) {
		const candidate = record[key];
		if (typeof candidate === "string" && candidate.trim()) files.add(candidate.trim());
	}
}

function collectToolFiles(content: unknown, files: Set<string>): void {
	if (!Array.isArray(content)) return;
	for (const part of content) {
		if (!part || typeof part !== "object") continue;
		const block = part as ContentBlock;
		if (block.type !== "toolCall" || typeof block.name !== "string") continue;
		if (!FILE_TOOL_NAMES.has(block.name)) continue;
		collectFileArgs(block.arguments, files);
	}
}

export async function loadSessionMetrics(sessionFile: string): Promise<SessionMetrics | undefined> {
	let raw: string;
	try {
		raw = await readFile(sessionFile, "utf8");
	} catch {
		return undefined;
	}

	let userMessages = 0;
	let assistantMessages = 0;
	const files = new Set<string>();

	for (const line of raw.split("\n")) {
		const trimmed = line.trim();
		if (!trimmed) continue;
		try {
			const message = messageFromPersistedLine(JSON.parse(trimmed));
			if (!message) continue;
			if (message.role === "user") userMessages++;
			if (message.role === "assistant") {
				assistantMessages++;
				collectToolFiles(message.content, files);
			}
		} catch {
			continue;
		}
	}

	return {
		messages: userMessages + assistantMessages,
		userMessages,
		assistantMessages,
		turns: userMessages,
		filesTouched: files.size,
	};
}
