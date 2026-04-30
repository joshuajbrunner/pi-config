import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { buildConversationTextFromSessionFile } from "./conversation-extract";

let dirs: string[] = [];

async function tempFile(content: string): Promise<string> {
	const dir = await mkdtemp(path.join(os.tmpdir(), "session-jsonl-"));
	dirs.push(dir);
	const file = path.join(dir, "session.jsonl");
	await writeFile(file, content, "utf8");
	return file;
}

afterEach(async () => {
	await Promise.all(dirs.map((dir) => rm(dir, { recursive: true, force: true })));
	dirs = [];
});

describe("buildConversationTextFromSessionFile", () => {
	it("extracts user and assistant text from persisted message entries", async () => {
		const file = await tempFile([
			JSON.stringify({ type: "message", message: { role: "user", content: "Hello" } }),
			JSON.stringify({ type: "message", message: { role: "assistant", content: [{ type: "text", text: "Hi" }] } }),
		].join("\n"));

		expect(await buildConversationTextFromSessionFile(file)).toBe("User: Hello\n\nAssistant: Hi");
	});

	it("extracts tool call lines for assistant entries", async () => {
		const file = await tempFile(JSON.stringify({ role: "assistant", content: [{ type: "toolCall", name: "read", arguments: { path: "a.ts" } }] }));

		expect(await buildConversationTextFromSessionFile(file)).toContain('Tool read was called with args {"path":"a.ts"}');
	});

	it("skips malformed and non-message lines", async () => {
		const file = await tempFile(['not json', JSON.stringify({ role: "system", content: "ignore" }), JSON.stringify({ role: "user", content: [{ type: "text", text: "Keep" }] })].join("\n"));

		expect(await buildConversationTextFromSessionFile(file)).toBe("User: Keep");
	});

	it("returns empty string for missing files", async () => {
		expect(await buildConversationTextFromSessionFile("/tmp/no-such-session-file.jsonl")).toBe("");
	});
});
