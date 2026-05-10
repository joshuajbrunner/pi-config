import type { ExtensionContext } from "@earendil-works/pi-coding-agent";
import { appendFile, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { SUMMARY_FILE_EXTENSION, SUMMARY_FILE_PREFIX } from "./config";
import type { SavedSummary, SummaryMode } from "./types";

export function summaryDirForSession(sessionFile: string, sessionId: string): string {
	return path.join(path.dirname(sessionFile), sessionId);
}

export function currentSessionSummaryDir(ctx: ExtensionContext): string | undefined {
	const sessionFile = ctx.sessionManager.getSessionFile();
	if (!sessionFile) return undefined;

	return summaryDirForSession(sessionFile, ctx.sessionManager.getSessionId());
}

function timestampForFile(date = new Date()): string {
	return date.toISOString().replaceAll(":", "-").replaceAll(".", "-");
}

function summaryFileName(timestamp: string, attempt: number): string {
	const suffix = attempt === 0 ? "" : `-${attempt}`;
	return `${SUMMARY_FILE_PREFIX}${timestamp}${suffix}${SUMMARY_FILE_EXTENSION}`;
}

export async function ensureSummaryDirForCurrentSession(ctx: ExtensionContext): Promise<string | undefined> {
	const dir = currentSessionSummaryDir(ctx);
	if (!dir) return undefined;

	await mkdir(dir, { recursive: true });
	return dir;
}

export async function appendSummaryDebugLogForSession(
	sessionFile: string,
	sessionId: string,
	message: string,
	details?: unknown,
): Promise<void> {
	const dir = summaryDirForSession(sessionFile, sessionId);
	await mkdir(dir, { recursive: true });

	const line = JSON.stringify({
		timestamp: new Date().toISOString(),
		message,
		details,
	}) + "\n";

	await appendFile(path.join(dir, "debug.jsonl"), line, "utf8");
}

export async function appendSummaryDebugLog(ctx: ExtensionContext, message: string, details?: unknown): Promise<void> {
	const sessionFile = ctx.sessionManager.getSessionFile();
	if (!sessionFile) return;
	await appendSummaryDebugLogForSession(sessionFile, ctx.sessionManager.getSessionId(), message, details);
}

export async function saveSummaryForSession(
	sessionFile: string,
	sessionId: string,
	summary: string,
	mode: SummaryMode,
	customInstruction?: string,
): Promise<string> {
	const dir = summaryDirForSession(sessionFile, sessionId);
	await mkdir(dir, { recursive: true });

	const timestamp = timestampForFile();
	const content = [
		"---",
		`sessionId: ${sessionId}`,
		`sessionFile: ${JSON.stringify(sessionFile)}`,
		`createdAt: ${new Date().toISOString()}`,
		`mode: ${mode}`,
		customInstruction?.trim() ? `customInstruction: ${JSON.stringify(customInstruction.trim())}` : undefined,
		"---",
		"",
		summary.trim(),
		"",
	]
		.filter((line): line is string => line !== undefined)
		.join("\n");

	for (let attempt = 0; attempt < 1000; attempt++) {
		const filePath = path.join(dir, summaryFileName(timestamp, attempt));
		try {
			await writeFile(filePath, content, { encoding: "utf8", flag: "wx" });
			return filePath;
		} catch (error) {
			if (typeof error === "object" && error && "code" in error && error.code === "EEXIST") continue;
			throw error;
		}
	}

	throw new Error("Unable to create unique summary file");
}

export async function saveSummaryForCurrentSession(
	ctx: ExtensionContext,
	summary: string,
	mode: SummaryMode,
	customInstruction?: string,
): Promise<string | undefined> {
	const sessionFile = ctx.sessionManager.getSessionFile();
	if (!sessionFile) return undefined;
	return saveSummaryForSession(sessionFile, ctx.sessionManager.getSessionId(), summary, mode, customInstruction);
}

export async function loadLatestSummary(sessionFile: string, sessionId: string): Promise<SavedSummary | undefined> {
	const dir = summaryDirForSession(sessionFile, sessionId);

	try {
		const files = await readdir(dir);
		const latest = files
			.filter((file) => file.startsWith(SUMMARY_FILE_PREFIX) && file.endsWith(SUMMARY_FILE_EXTENSION))
			.sort()
			.at(-1);

		if (!latest) return undefined;

		const summaryPath = path.join(dir, latest);
		return {
			path: summaryPath,
			content: await readFile(summaryPath, "utf8"),
		};
	} catch {
		return undefined;
	}
}

export async function loadLatestSummaryForCurrentSession(ctx: ExtensionContext): Promise<SavedSummary | undefined> {
	const sessionFile = ctx.sessionManager.getSessionFile();
	if (!sessionFile) return undefined;
	return loadLatestSummary(sessionFile, ctx.sessionManager.getSessionId());
}
