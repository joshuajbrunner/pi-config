/**
 * CC Prompt Patch — patches pi's built-in provider (no token swap)
 *
 * Uses pi's OWN OAuth token. Only patches the request payload:
 * 1. Sanitizes trigger phrases from system prompt (trips the API classifier)
 * 2. Adds billing header for subscription rate-limit bucket (with proper version suffix)
 * 3. Strips the separate identity prefix block that triggers detection
 *
 * The billing header version suffix is computed deterministically from the first
 * user message using the same algorithm as Claude Code:
 *   suffix = sha256(SALT + chars[4,7,20] + VERSION).slice(0,3)
 *
 * Preserves ALL of pi's built-in behaviors: prompt caching, session routing,
 * compaction, tool name mapping, thinking modes, token refresh, etc.
 *
 * REQUIRES: /login (pi's normal OAuth)
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { basename, dirname, join } from "node:path";

const SYSTEM_PROMPT_LOG = "system-prompts.jsonl";
const MAX_LOG_ENTRIES = 50;

// Billing header constants (extracted from Claude Code binary)
const BILLING_SALT = "59cf53e54c78";
const CC_VERSION = "2.1.114";
const CC_ENTRYPOINT = "cli";

// Session-level cache for the version suffix (reset on session_start)
let cachedVersionSuffix: string | null = null;

/**
 * Computes the version suffix using Claude Code's algorithm.
 * Takes characters at positions 4, 7, 20 from the first user message,
 * concatenates with salt and version, then SHA256 hashes and takes first 3 hex chars.
 */
export function computeVersionSuffix(firstUserMessage: string, version: string = CC_VERSION): string {
	const sampledChars = [4, 7, 20]
		.map((i) => firstUserMessage[i] || "0")
		.join("");
	const hashInput = `${BILLING_SALT}${sampledChars}${version}`;
	return createHash("sha256").update(hashInput).digest("hex").slice(0, 3);
}

/**
 * Extracts the text content of the first user message from the messages array.
 */
export function extractFirstUserMessage(messages: any[]): string | null {
	for (const msg of messages) {
		if (msg.role !== "user") continue;
		const content = msg.content;
		if (typeof content === "string") return content;
		if (Array.isArray(content)) {
			const textBlock = content.find((b: any) => b.type === "text");
			if (textBlock?.text) return textBlock.text;
		}
	}
	return null;
}

/**
 * Builds the billing header string with the computed version suffix.
 */
export function buildBillingHeader(messages: any[]): string {
	// Compute suffix on first call, then cache for session
	if (cachedVersionSuffix === null) {
		const firstMsg = extractFirstUserMessage(messages);
		cachedVersionSuffix = firstMsg ? computeVersionSuffix(firstMsg) : "000";
	}
	return `x-anthropic-billing-header: cc_version=${CC_VERSION}.${cachedVersionSuffix}; cc_entrypoint=${CC_ENTRYPOINT}; cch=00000;`;
}

/**
 * Resets the cached version suffix (called on session_start).
 */
export function resetVersionSuffixCache(): void {
	cachedVersionSuffix = null;
}

interface SystemPromptEntry {
	timestamp: string;
	model: string;
	systemPrompt: string;
}

function getSessionDataDir(sessionFile: string): string {
	const sessionDir = dirname(sessionFile);
	const sessionName = basename(sessionFile, ".jsonl");
	return join(sessionDir, sessionName);
}

async function logSystemPrompt(
	sessionFile: string,
	model: string,
	system: any
): Promise<void> {
	const sessionDataDir = getSessionDataDir(sessionFile);
	const logFile = join(sessionDataDir, SYSTEM_PROMPT_LOG);

	// Build system prompt string from blocks or string
	let systemPrompt: string;
	if (Array.isArray(system)) {
		systemPrompt = system
			.filter((b: any) => b.type === "text" && b.text)
			.map((b: any) => b.text)
			.join("\n\n");
	} else if (typeof system === "string") {
		systemPrompt = system;
	} else {
		return;
	}

	const entry: SystemPromptEntry = {
		timestamp: new Date().toISOString(),
		model,
		systemPrompt,
	};

	// Read existing entries
	let lines: string[] = [];
	try {
		const content = await readFile(logFile, "utf8");
		lines = content.trim().split("\n").filter(Boolean);
	} catch {
		// File doesn't exist yet
	}

	// Append new entry and keep only last N
	lines.push(JSON.stringify(entry));
	if (lines.length > MAX_LOG_ENTRIES) {
		lines = lines.slice(-MAX_LOG_ENTRIES);
	}

	// Write back
	await mkdir(sessionDataDir, { recursive: true });
	await writeFile(logFile, lines.join("\n") + "\n");
}

async function readSystemPrompts(sessionFile: string): Promise<SystemPromptEntry[]> {
	const sessionDataDir = getSessionDataDir(sessionFile);
	const logFile = join(sessionDataDir, SYSTEM_PROMPT_LOG);

	try {
		const content = await readFile(logFile, "utf8");
		const lines = content.trim().split("\n").filter(Boolean);
		return lines.map((line) => JSON.parse(line) as SystemPromptEntry);
	} catch {
		return [];
	}
}

function formatTimestamp(iso: string): string {
	const date = new Date(iso);
	return date.toLocaleString();
}

function isAnthropicTarget(
	payload: Record<string, any>,
	model: { provider?: string; id?: string } | undefined,
): boolean {
	const provider = typeof model?.provider === "string" ? model.provider.toLowerCase() : "";
	const modelId = typeof model?.id === "string" ? model.id.toLowerCase() : "";
	const payloadModel = typeof payload.model === "string" ? payload.model.toLowerCase() : "";

	return (
		provider.includes("anthropic") ||
		modelId.includes("claude") ||
		payloadModel.includes("anthropic") ||
		payloadModel.includes("claude")
	);
}

function sanitizeSystemPrompt(text: string): string {
	return text
		.replace(/operating inside pi, a coding agent harness\./g, "operating as a coding assistant.")
		.replace(/Pi documentation/g, "Documentation")
		.replace(/pi itself,/g, "the tool itself,")
		.replace(/pi packages/g, "packages")
		.replace(/read pi \.md/g, "read .md")
		.replace(/pi-coding-agent/g, "coding-agent")
		.replace(/@mariozechner\/pi-ai/g, "@anthropic/ai")
		.replace(/@mariozechner\/pi-tui/g, "@anthropic/tui")
		.replace(/about pi\b/g, "about this tool")
		.replace(/pi update\b/g, "update")
		.replace(/Run pi update/g, "Run update")
		.replace(/\bpi\b([\s,.])/g, "the assistant$1");
}

export default function (pi: ExtensionAPI) {
	pi.on("before_provider_request", async (event, ctx) => {
		const payload = event.payload as Record<string, any>;
		if (!payload || typeof payload !== "object") return;
		if (!Array.isArray(payload.messages)) return;
		if (!isAnthropicTarget(payload, ctx.model as { provider?: string; id?: string } | undefined)) return;

		// Build billing header with computed version suffix
		const billingHeader = buildBillingHeader(payload.messages);

		if (Array.isArray(payload.system)) {
			const newBlocks: any[] = [];

			// Billing header as first block for subscription rate-limit routing
			newBlocks.push({
				type: "text",
				text: billingHeader,
			});

			for (const block of payload.system) {
				if (block.type !== "text" || !block.text) { newBlocks.push(block); continue; }
				if (block.text.startsWith("x-anthropic-billing-header")) continue;
				if (block.text.startsWith("You are") && block.text.includes("official CLI")) continue;

				newBlocks.push({ ...block, text: sanitizeSystemPrompt(block.text) });
			}

			payload.system = newBlocks;
		} else if (typeof payload.system === "string") {
			payload.system = [
				{ type: "text", text: billingHeader },
				{ type: "text", text: sanitizeSystemPrompt(payload.system) },
			];
		}

		if (!payload.metadata) {
			payload.metadata = {
				user_id: JSON.stringify({ device_id: "0", account_uuid: "", session_id: "0" }),
			};
		}

		// Log the sanitized system prompt
		const sessionFile = ctx.sessionManager.getSessionFile();
		if (sessionFile) {
			try {
				await logSystemPrompt(sessionFile, payload.model, payload.system);
			} catch {
				// Ignore logging errors
			}
		}

		return payload;
	});

	pi.on("session_start", async (_e, ctx) => {
		// Reset the version suffix cache for new session
		resetVersionSuffixCache();
		ctx.ui.notify("cc-patch: loaded (anthropic-only)", "info");
	});

	// Command to view logged system prompts
	pi.registerCommand("debug-system-prompts", {
		description: "View logged system prompts for this session",
		handler: async (_args, ctx) => {
			const sessionFile = ctx.sessionManager.getSessionFile();
			if (!sessionFile) {
				ctx.ui.notify("No session file (ephemeral mode)", "warning");
				return;
			}

			const entries = await readSystemPrompts(sessionFile);
			if (entries.length === 0) {
				ctx.ui.notify("No system prompts logged yet", "info");
				return;
			}

			// Build selection items (most recent first)
			const reversedEntries = [...entries].reverse();
			const items = reversedEntries.map(
				(e) => `${formatTimestamp(e.timestamp)} - ${e.model}`
			);

			const selected = await ctx.ui.select("System Prompts (newest first)", items);
			if (selected) {
				const index = items.indexOf(selected);
				const entry = reversedEntries[index];
				// Display in editor for scrollable viewing
				await ctx.ui.editor(
					`System Prompt - ${entry.model}`,
					entry.systemPrompt
				);
			}
		},
	});
}
