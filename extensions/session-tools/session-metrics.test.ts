import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { loadSessionMetrics } from "./session-metrics";

let dirs: string[] = [];

async function tempFile(content: string): Promise<string> {
	const dir = await mkdtemp(path.join(os.tmpdir(), "session-metrics-"));
	dirs.push(dir);
	const file = path.join(dir, "session.jsonl");
	await writeFile(file, content, "utf8");
	return file;
}

afterEach(async () => {
	await Promise.all(dirs.map((dir) => rm(dir, { recursive: true, force: true })));
	dirs = [];
});

describe("loadSessionMetrics", () => {
	it("counts messages, turns, and files touched", async () => {
		const file = await tempFile([
			JSON.stringify({ type: "message", message: { role: "user", content: "hello" } }),
			JSON.stringify({ type: "message", message: { role: "assistant", content: [{ type: "toolCall", name: "read", arguments: { path: "a.ts" } }] } }),
			JSON.stringify({ role: "assistant", content: [{ type: "toolCall", name: "write", arguments: { path: "b.ts" } }] }),
			"not json",
		].join("\n"));

		expect(await loadSessionMetrics(file)).toEqual({
			messages: 3,
			userMessages: 1,
			assistantMessages: 2,
			turns: 1,
			filesTouched: 2,
		});
	});

	it("returns undefined for missing files", async () => {
		expect(await loadSessionMetrics("/tmp/missing-session-metrics.jsonl")).toBeUndefined();
	});
});
