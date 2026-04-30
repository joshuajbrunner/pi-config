import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { appendSummaryDebugLog, appendSummaryDebugLogForSession, loadLatestSummary, saveSummaryForCurrentSession, saveSummaryForSession, summaryDirForSession } from "./summary-store";

let tempDirs: string[] = [];

async function tempDir(): Promise<string> {
	const dir = await mkdtemp(path.join(os.tmpdir(), "session-tools-"));
	tempDirs.push(dir);
	return dir;
}

afterEach(async () => {
	await Promise.all(tempDirs.map((dir) => rm(dir, { recursive: true, force: true })));
	tempDirs = [];
});

describe("summary store", () => {
	it("uses a sibling session-id directory", () => {
		expect(summaryDirForSession("/tmp/sessions/session.jsonl", "abc")).toBe("/tmp/sessions/abc");
	});

	it("returns undefined when no summary directory exists", async () => {
		expect(await loadLatestSummary("/tmp/does-not-exist/session.jsonl", "abc")).toBeUndefined();
	});

	it("loads the newest timestamped summary", async () => {
		const dir = await tempDir();
		const sessionFile = path.join(dir, "session.jsonl");
		const summaryDir = summaryDirForSession(sessionFile, "abc");
		await writeFile(path.join(dir, "placeholder"), "");
		await import("node:fs/promises").then((fs) => fs.mkdir(summaryDir, { recursive: true }));
		await writeFile(path.join(summaryDir, "summary-2026-01-01T00-00-00-000Z.md"), "old", "utf8");
		await writeFile(path.join(summaryDir, "summary-2026-01-02T00-00-00-000Z.md"), "new", "utf8");

		const latest = await loadLatestSummary(sessionFile, "abc");
		expect(latest?.content).toBe("new");
		expect(latest?.path.endsWith("summary-2026-01-02T00-00-00-000Z.md")).toBe(true);
	});

	it("saves summaries with frontmatter", async () => {
		const dir = await tempDir();
		const sessionFile = path.join(dir, "session.jsonl");
		const ctx = {
			sessionManager: {
				getSessionFile: () => sessionFile,
				getSessionId: () => "abc",
			},
		} as any;

		const savedPath = await saveSummaryForCurrentSession(ctx, "Summary body", "full", "focus");
		const content = await readFile(savedPath!, "utf8");
		expect(content).toContain("sessionId: abc");
		expect(content).toContain("mode: full");
		expect(content).toContain('customInstruction: "focus"');
		expect(content).toContain("Summary body");
	});

	it("does not overwrite existing summaries created in the same millisecond", async () => {
		const dir = await tempDir();
		const sessionFile = path.join(dir, "session.jsonl");
		const first = await saveSummaryForSession(sessionFile, "abc", "first", "short");
		const second = await saveSummaryForSession(sessionFile, "abc", "second", "short");

		expect(first).not.toBe(second);
		expect(await readFile(first, "utf8")).toContain("first");
		expect(await readFile(second, "utf8")).toContain("second");
	});

	it("appends debug JSONL", async () => {
		const dir = await tempDir();
		const sessionFile = path.join(dir, "session.jsonl");
		const ctx = {
			sessionManager: {
				getSessionFile: () => sessionFile,
				getSessionId: () => "abc",
			},
		} as any;

		await appendSummaryDebugLog(ctx, "message", { ok: true });
		await appendSummaryDebugLogForSession(sessionFile, "abc", "second", { selected: true });
		const content = await readFile(path.join(summaryDirForSession(sessionFile, "abc"), "debug.jsonl"), "utf8");
		const lines = content.trim().split("\n").map((line) => JSON.parse(line));
		expect(lines[0].message).toBe("message");
		expect(lines[0].details).toEqual({ ok: true });
		expect(lines[1].message).toBe("second");
		expect(lines[1].details).toEqual({ selected: true });
	});
});
