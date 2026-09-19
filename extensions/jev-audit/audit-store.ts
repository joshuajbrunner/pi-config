import type { ExtensionContext } from "@earendil-works/pi-coding-agent";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export interface JevAuditRecord {
	id: string;
	timestamp: string;
	model: string;
	response: string;
	tooVerbose: number;
	tooJargony: number;
	tooMixed: number;
	needsRewrite: boolean;
}

export function auditPathForSession(sessionFile: string, sessionId: string): string {
	return path.join(path.dirname(sessionFile), sessionId, "jev-audit.json");
}

export function currentAuditPath(ctx: ExtensionContext): string | undefined {
	const sessionFile = ctx.sessionManager.getSessionFile();
	if (!sessionFile) return undefined;
	return auditPathForSession(sessionFile, ctx.sessionManager.getSessionId());
}

export async function loadAuditRecords(filePath: string): Promise<JevAuditRecord[]> {
	try {
		const parsed: unknown = JSON.parse(await readFile(filePath, "utf8"));
		if (!Array.isArray(parsed)) return [];
		return parsed.filter(isAuditRecord).map((record) => ({
			...record,
			tooMixed: record.tooMixed ?? 0,
		}));
	} catch {
		return [];
	}
}

export async function appendAuditRecord(
	filePath: string,
	record: JevAuditRecord,
): Promise<void> {
	await mkdir(path.dirname(filePath), { recursive: true });
	const records = await loadAuditRecords(filePath);
	records.push(record);
	await writeFile(filePath, `${JSON.stringify(records, null, 2)}\n`, "utf8");
}

function isAuditRecord(value: unknown): value is JevAuditRecord {
	if (!value || typeof value !== "object") return false;
	const record = value as Partial<JevAuditRecord>;
	return (
		typeof record.id === "string" &&
		typeof record.timestamp === "string" &&
		typeof record.model === "string" &&
		typeof record.response === "string" &&
		typeof record.tooVerbose === "number" &&
		typeof record.tooJargony === "number" &&
		(record.tooMixed === undefined || typeof record.tooMixed === "number") &&
		typeof record.needsRewrite === "boolean"
	);
}
