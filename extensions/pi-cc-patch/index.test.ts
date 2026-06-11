/**
 * Tests for CC Prompt Patch billing header computation
 *
 * These tests verify that our version suffix computation matches
 * Claude Code's actual implementation, as reverse-engineered from
 * the Claude Code binary.
 *
 * Run with: npx tsx --test index.test.ts
 * Or with Node 22+: node --experimental-strip-types --test index.test.ts
 */

import { describe, it, beforeEach, vi } from "vitest";
import assert from "node:assert";
import { createHash } from "node:crypto";
import { lstat, mkdir, readFile, readlink, rm, symlink, writeFile } from "node:fs/promises";

vi.mock("node:fs/promises", async (importActual) => {
	const actual = await importActual<typeof import("node:fs/promises")>();
	return {
		...actual,
		lstat: vi.fn(),
		mkdir: vi.fn(),
		readFile: vi.fn(),
		readlink: vi.fn(),
		rm: vi.fn(),
		symlink: vi.fn(),
		writeFile: vi.fn(),
	};
});
import ccPatch, {
	VIRTUAL_PACKAGE_DIR,
	buildBillingHeader,
	buildSystemPromptSelection,
	computeVersionSuffix,
	ensureMetadata,
	ensureVirtualPackageDir,
	escapeRegExp,
	extractFirstUserMessage,
	extractPackageDirFromSystemPrompt,
	isAnthropicTarget,
	logSystemPrompt,
	patchProviderPayload,
	parseDisplayLimit,
	patchSystemPayload,
	readSystemPrompts,
	prepareVirtualPackageDir,
	resetVersionSuffixCache,
	sanitizeSystemPrompt,
	systemPromptToString,
	virtualizePackageDir,
} from "./index";

describe("computeVersionSuffix", () => {
	it("should compute correct suffix for 'What day is it?' (verified against Claude Code)", () => {
		// This test case was verified against an actual Claude Code debug log
		// First message: "What day is it?"
		// Expected suffix from log: 89d
		const suffix = computeVersionSuffix("What day is it?", "2.1.114");
		assert.strictEqual(suffix, "89d");
	});

	it("should sample characters at positions 4, 7, 20", () => {
		// Message: "Hello, how are you doing today!"
		// Position 4: 'o' (5th char, from "Hello")
		// Position 7: 'h' (8th char, from "how")
		// Position 20: 'o' (21st char, from "doing")
		const msg = "Hello, how are you doing today!";
		assert.strictEqual(msg[4], "o");
		assert.strictEqual(msg[7], "h");
		assert.strictEqual(msg[20], "o");

		// The suffix should be deterministic
		const suffix1 = computeVersionSuffix(msg, "2.1.114");
		const suffix2 = computeVersionSuffix(msg, "2.1.114");
		assert.strictEqual(suffix1, suffix2);
	});

	it("should use '0' for missing character positions", () => {
		// Short message - position 20 doesn't exist
		const shortMsg = "Hi";
		assert.strictEqual(shortMsg[4], undefined);
		assert.strictEqual(shortMsg[7], undefined);
		assert.strictEqual(shortMsg[20], undefined);

		// Should still compute a valid 3-char hex suffix
		const suffix = computeVersionSuffix(shortMsg, "2.1.114");
		assert.strictEqual(suffix.length, 3);
		assert.match(suffix, /^[0-9a-f]{3}$/);
	});

	it("should produce different suffixes for different messages", () => {
		const suffix1 = computeVersionSuffix("Hello world", "2.1.114");
		const suffix2 = computeVersionSuffix("Goodbye world", "2.1.114");
		assert.notStrictEqual(suffix1, suffix2);
	});

	it("should produce different suffixes for different versions", () => {
		const msg = "Hello world";
		const suffix1 = computeVersionSuffix(msg, "2.1.114");
		const suffix2 = computeVersionSuffix(msg, "2.1.115");
		assert.notStrictEqual(suffix1, suffix2);
	});

	it("should always return exactly 3 hex characters", () => {
		const testMessages = [
			"",
			"a",
			"ab",
			"abc",
			"abcd",
			"Hello, World!",
			"This is a much longer message that definitely has characters at all positions",
			"Special chars: !@#$%^&*()",
			"Unicode: 你好世界 🌍",
		];

		for (const msg of testMessages) {
			const suffix = computeVersionSuffix(msg, "2.1.114");
			assert.strictEqual(suffix.length, 3, `Failed for message: ${JSON.stringify(msg)}`);
			assert.match(suffix, /^[0-9a-f]{3}$/, `Invalid hex for message: ${JSON.stringify(msg)}`);
		}
	});
});

describe("extractFirstUserMessage", () => {
	it("should extract string content from first user message", () => {
		const messages = [
			{ role: "user", content: "Hello Claude" },
			{ role: "assistant", content: "Hi there!" },
		];
		assert.strictEqual(extractFirstUserMessage(messages), "Hello Claude");
	});

	it("should extract text from content array", () => {
		const messages = [
			{
				role: "user",
				content: [
					{ type: "text", text: "What is this image?" },
					{ type: "image", source: { type: "base64", data: "..." } },
				],
			},
		];
		assert.strictEqual(extractFirstUserMessage(messages), "What is this image?");
	});

	it("should skip non-user messages", () => {
		const messages = [
			{ role: "assistant", content: "Hello!" },
			{ role: "user", content: "Hi there" },
		];
		assert.strictEqual(extractFirstUserMessage(messages), "Hi there");
	});

	it("should return null for empty messages array", () => {
		assert.strictEqual(extractFirstUserMessage([]), null);
	});

	it("should return null when no user messages exist", () => {
		const messages = [
			{ role: "assistant", content: "Hello!" },
			{ role: "system", content: "You are helpful" },
		];
		assert.strictEqual(extractFirstUserMessage(messages), null);
	});

	it("should handle content array with no text blocks", () => {
		const messages = [
			{
				role: "user",
				content: [{ type: "image", source: { type: "base64", data: "..." } }],
			},
		];
		assert.strictEqual(extractFirstUserMessage(messages), null);
	});
});

describe("buildBillingHeader", () => {
	beforeEach(() => {
		resetVersionSuffixCache();
	});

	it("should build header with computed suffix", () => {
		const messages = [{ role: "user", content: "What day is it?" }];
		const header = buildBillingHeader(messages);

		assert.strictEqual(
			header,
			"x-anthropic-billing-header: cc_version=2.1.173.845; cc_entrypoint=cli; cch=00000;"
		);
	});

	it("should cache suffix across multiple calls", () => {
		const messages1 = [{ role: "user", content: "First message" }];
		const header1 = buildBillingHeader(messages1);

		// Second call with different messages should use cached suffix
		const messages2 = [{ role: "user", content: "Different message" }];
		const header2 = buildBillingHeader(messages2);

		// Headers should be identical (cached)
		assert.strictEqual(header1, header2);
	});

	it("should use fallback suffix when no user message exists", () => {
		const messages = [{ role: "assistant", content: "Hello" }];
		const header = buildBillingHeader(messages);

		assert.match(header, /cc_version=2\.1\.173\.000/);
	});

	it("should include all required header components", () => {
		const messages = [{ role: "user", content: "Hello" }];
		const header = buildBillingHeader(messages);

		assert.match(header, /x-anthropic-billing-header:/);
		assert.match(header, /cc_version=2\.1\.173\.[0-9a-f]{3}/);
		assert.match(header, /cc_entrypoint=cli/);
		assert.match(header, /cch=00000/);
	});
});

describe("resetVersionSuffixCache", () => {
	it("should allow recomputation after reset", () => {
		const messages1 = [{ role: "user", content: "First message" }];
		const header1 = buildBillingHeader(messages1);

		resetVersionSuffixCache();

		const messages2 = [{ role: "user", content: "Second message" }];
		const header2 = buildBillingHeader(messages2);

		// Headers should be different after reset
		assert.notStrictEqual(header1, header2);
	});
});

describe("integration: verified against Claude Code", () => {
	beforeEach(() => {
		resetVersionSuffixCache();
	});

	it("should match Claude Code billing header for 'What day is it?'", () => {
		// Verified from Claude Code CLI 2.1.173 audit:
		// attribution header x-anthropic-billing-header: cc_version=2.1.173.845; cc_entrypoint=cli; cch=00000;
		// First user message: "What day is it?"

		const messages = [{ role: "user", content: "What day is it?" }];
		const header = buildBillingHeader(messages);

		assert.strictEqual(
			header,
			"x-anthropic-billing-header: cc_version=2.1.173.845; cc_entrypoint=cli; cch=00000;"
		);
	});

	it("should match algorithm: sha256(SALT + chars[4,7,20] + VERSION).slice(0,3)", () => {
		// Manual verification of the algorithm
		// Message: "What day is it?"
		// chars[4] = ' ' (space)
		// chars[7] = 'y'
		// chars[20] = '0' (fallback, message is only 15 chars)
		// SALT = "59cf53e54c78"
		// VERSION = "2.1.114"
		// Hash input: "59cf53e54c78 y02.1.114"

		const SALT = "59cf53e54c78";
		const VERSION = "2.1.114";
		const msg = "What day is it?";

		const sampledChars = [4, 7, 20].map((i) => msg[i] || "0").join("");
		assert.strictEqual(sampledChars, " y0");

		const hashInput = `${SALT}${sampledChars}${VERSION}`;
		assert.strictEqual(hashInput, "59cf53e54c78 y02.1.114");

		const hash = createHash("sha256").update(hashInput).digest("hex");
		const suffix = hash.slice(0, 3);
		assert.strictEqual(suffix, "89d");

		// Our function should match
		assert.strictEqual(computeVersionSuffix(msg, VERSION), "89d");
	});
});


describe("system prompt sanitization", () => {
	const mockedLstat = vi.mocked(lstat);
	const mockedReadlink = vi.mocked(readlink);
	const mockedRm = vi.mocked(rm);
	const mockedSymlink = vi.mocked(symlink);
	const realPackageDir = "/Users/joshuabrunner/.nvm/versions/node/v24.13.0/lib/node_modules/@earendil-works/pi-coding-agent";
	const rawPrompt = `You are an expert coding assistant operating inside pi, a coding agent harness. You help users by reading files.

Pi documentation (read only when the user asks about pi itself, its SDK, extensions, themes, skills, or TUI):
- Main documentation: ${realPackageDir}/README.md
- Additional docs: ${realPackageDir}/docs
- Examples: ${realPackageDir}/examples (extensions, custom tools, SDK)
- When asked about: extensions (docs/extensions.md), pi packages (docs/packages.md)
- When working on pi topics, read the docs and examples
- Always read pi .md files completely`;

	beforeEach(() => {
		mockedLstat.mockReset();
		mockedReadlink.mockReset();
		mockedRm.mockReset();
		mockedSymlink.mockReset();
		mockedLstat.mockRejectedValue(Object.assign(new Error("missing"), { code: "ENOENT" }));
		mockedRm.mockResolvedValue(undefined);
		mockedSymlink.mockResolvedValue(undefined);
	});

	it("extracts the package dir from docs paths", () => {
		assert.strictEqual(extractPackageDirFromSystemPrompt(rawPrompt), realPackageDir);
	});

	it("replaces the real package dir with /tmp/coding-agent", async () => {
		await prepareVirtualPackageDir(rawPrompt);

		const sanitized = sanitizeSystemPrompt(rawPrompt);

		assert.ok(!sanitized.includes(realPackageDir));
		assert.ok(sanitized.includes(`${VIRTUAL_PACKAGE_DIR}/README.md`));
		assert.ok(sanitized.includes(`${VIRTUAL_PACKAGE_DIR}/docs`));
		assert.ok(sanitized.includes(`${VIRTUAL_PACKAGE_DIR}/examples`));
	});

	it("sanitizes pi trigger phrases", async () => {
		await prepareVirtualPackageDir(rawPrompt);

		const sanitized = sanitizeSystemPrompt(rawPrompt);

		assert.ok(sanitized.includes("operating inside a minimal coding agent harness."));
		assert.ok(sanitized.includes("Coding agent documentation (read only when the user asks about the coding agent framework itself"));
		assert.ok(sanitized.includes("coding agent packages (docs/packages.md)"));
		assert.ok(!sanitized.includes("operating inside pi, a coding agent harness"));
		assert.ok(!sanitized.includes("Pi documentation"));
	});

	it("creates the virtual package dir symlink", async () => {
		await prepareVirtualPackageDir(rawPrompt);

		assert.strictEqual(mockedLstat.mock.calls.length, 1);
		assert.strictEqual(mockedRm.mock.calls.length, 0);
		assert.deepStrictEqual(mockedSymlink.mock.calls[0], [realPackageDir, VIRTUAL_PACKAGE_DIR, "dir"]);
	});

	it("replaces an existing wrong symlink", async () => {
		mockedLstat.mockResolvedValue({ isSymbolicLink: () => true } as any);
		mockedReadlink.mockResolvedValue("/tmp/old-coding-agent");

		await prepareVirtualPackageDir(rawPrompt);

		assert.deepStrictEqual(mockedRm.mock.calls[0], [VIRTUAL_PACKAGE_DIR, { recursive: true, force: true }]);
		assert.deepStrictEqual(mockedSymlink.mock.calls[0], [realPackageDir, VIRTUAL_PACKAGE_DIR, "dir"]);
	});

	it("does not recreate the symlink when it already points to the package dir", async () => {
		mockedLstat.mockResolvedValue({ isSymbolicLink: () => true } as any);
		mockedReadlink.mockResolvedValue(realPackageDir);

		await prepareVirtualPackageDir(rawPrompt);

		assert.strictEqual(mockedRm.mock.calls.length, 0);
		assert.strictEqual(mockedSymlink.mock.calls.length, 0);
	});
});


describe("provider payload patching", () => {
	beforeEach(() => {
		resetVersionSuffixCache();
		vi.mocked(lstat).mockReset();
		vi.mocked(readlink).mockReset();
		vi.mocked(rm).mockReset();
		vi.mocked(symlink).mockReset();
		vi.mocked(lstat).mockRejectedValue(Object.assign(new Error("missing"), { code: "ENOENT" }));
		vi.mocked(symlink).mockResolvedValue(undefined);
	});

	it("detects Anthropic targets from provider, model id, or payload model", () => {
		assert.strictEqual(isAnthropicTarget({}, { provider: "anthropic" }), true);
		assert.strictEqual(isAnthropicTarget({}, { id: "claude-3-5-sonnet" }), true);
		assert.strictEqual(isAnthropicTarget({ model: "claude-opus" }, undefined), true);
		assert.strictEqual(isAnthropicTarget({ model: "gpt-4" }, { provider: "openai", id: "gpt-4" }), false);
	});

	it("escapes regexp metacharacters before virtualizing package dirs", async () => {
		const packageDir = "/tmp/a+b(c)[d].v1?/@earendil-works/pi-coding-agent";
		const prompt = `- Main documentation: ${packageDir}/README.md`;
		await prepareVirtualPackageDir(prompt);

		assert.strictEqual(escapeRegExp("a+b(c)[d].v1?"), "a\\+b\\(c\\)\\[d\\]\\.v1\\?");
		assert.strictEqual(
			virtualizePackageDir(`${packageDir}/README.md ${packageDir}/docs`),
			`${VIRTUAL_PACKAGE_DIR}/README.md ${VIRTUAL_PACKAGE_DIR}/docs`,
		);
	});

	it("patches string system prompts for Anthropic requests", async () => {
		const payload: Record<string, any> = {
			model: "claude-sonnet",
			messages: [{ role: "user", content: "What day is it?" }],
			system: "You are operating inside pi, a coding agent harness.",
		};

		const result = await patchProviderPayload(payload, { provider: "anthropic" });

		assert.strictEqual(result, payload);
		assert.strictEqual(payload.system.length, 2);
		assert.match(payload.system[0].text, /^x-anthropic-billing-header: cc_version=2\.1\.173\.845/);
		assert.strictEqual(payload.system[1].text, "You are operating inside a minimal coding agent harness.");
		assert.deepStrictEqual(JSON.parse(payload.metadata.user_id), { device_id: "0", account_uuid: "", session_id: "0" });
	});

	it("patches array system prompts and removes duplicate billing and identity blocks", async () => {
		const imageBlock = { type: "image", source: "data" };
		const payload: Record<string, any> = {
			model: "claude-sonnet",
			messages: [{ role: "user", content: "Hello world" }],
			system: [
				{ type: "text", text: "x-anthropic-billing-header: old" },
				{ type: "text", text: "You are the official CLI for Claude Code" },
				{ type: "text", text: "Pi documentation about pi topics" },
				imageBlock,
			],
			metadata: { keep: true },
		};

		await patchProviderPayload(payload, { id: "claude-sonnet" });

		assert.strictEqual(payload.system.length, 3);
		assert.match(payload.system[0].text, /^x-anthropic-billing-header:/);
		assert.strictEqual(payload.system[1].text, "Coding agent documentation about coding agent topics");
		assert.strictEqual(payload.system[2], imageBlock);
		assert.deepStrictEqual(payload.metadata, { keep: true });
	});

	it("does not patch non-Anthropic or malformed payloads", async () => {
		assert.strictEqual(await patchProviderPayload(null as any, { provider: "anthropic" }), undefined);
		assert.strictEqual(await patchProviderPayload({ messages: [] }, { provider: "openai", id: "gpt" }), undefined);
		assert.strictEqual(await patchProviderPayload({ model: "claude", messages: "nope" }, undefined), undefined);
	});

	it("patchSystemPayload leaves unknown system shapes unchanged", async () => {
		const payload = { system: { type: "not-supported" } };
		await patchSystemPayload(payload, "billing");
		assert.deepStrictEqual(payload, { system: { type: "not-supported" } });
	});

	it("ensureMetadata preserves existing metadata", () => {
		const payload = { metadata: { existing: true } };
		ensureMetadata(payload);
		assert.deepStrictEqual(payload.metadata, { existing: true });
	});

	it("ensureVirtualPackageDir replaces non-symlink paths", async () => {
		vi.mocked(lstat).mockResolvedValue({ isSymbolicLink: () => false } as any);
		vi.mocked(rm).mockResolvedValue(undefined);
		vi.mocked(symlink).mockResolvedValue(undefined);

		await ensureVirtualPackageDir("/real/package");

		assert.deepStrictEqual(vi.mocked(rm).mock.calls[0], [VIRTUAL_PACKAGE_DIR, { recursive: true, force: true }]);
		assert.deepStrictEqual(vi.mocked(symlink).mock.calls[0], ["/real/package", VIRTUAL_PACKAGE_DIR, "dir"]);
	});
});


describe("system prompt log helpers", () => {
	it("converts string and text-block system prompts to loggable text", () => {
		assert.strictEqual(systemPromptToString("plain"), "plain");
		assert.strictEqual(
			systemPromptToString([
				{ type: "text", text: "first" },
				{ type: "image", source: "ignored" },
				{ type: "text", text: "second" },
				{ type: "text", text: "" },
			]),
			"first\n\nsecond",
		);
		assert.strictEqual(systemPromptToString({ nope: true }), null);
	});

	it("parses display limits with safe defaults", () => {
		assert.strictEqual(parseDisplayLimit(""), 10);
		assert.strictEqual(parseDisplayLimit(" 3 "), 3);
		assert.strictEqual(parseDisplayLimit("0"), 10);
		assert.strictEqual(parseDisplayLimit("-2"), 10);
		assert.strictEqual(parseDisplayLimit("abc"), 10);
	});

	it("builds newest-first selection state", () => {
		const entries = [
			{ timestamp: "2026-01-01T00:00:00.000Z", model: "a", systemPrompt: "A" },
			{ timestamp: "2026-01-02T00:00:00.000Z", model: "b", systemPrompt: "B" },
			{ timestamp: "2026-01-03T00:00:00.000Z", model: "c", systemPrompt: "C" },
		];

		const limited = buildSystemPromptSelection(entries, 2);
		assert.deepStrictEqual(limited.reversedEntries.map((e) => e.model), ["c", "b"]);
		assert.strictEqual(limited.items.length, 2);
		assert.strictEqual(limited.title, "System Prompts (2 of 3, newest first)");

		const all = buildSystemPromptSelection(entries, 10);
		assert.deepStrictEqual(all.reversedEntries.map((e) => e.model), ["c", "b", "a"]);
		assert.strictEqual(all.title, "System Prompts (3 total, newest first)");
	});
});


describe("system prompt log persistence", () => {
	const sessionFile = "/tmp/session/test-session.jsonl";
	const logFile = "/tmp/session/test-session/system-prompts.jsonl";

	beforeEach(() => {
		vi.mocked(readFile).mockReset();
		vi.mocked(mkdir).mockReset();
		vi.mocked(writeFile).mockReset();
		vi.mocked(mkdir).mockResolvedValue(undefined as any);
		vi.mocked(writeFile).mockResolvedValue(undefined);
	});

	it("logs string system prompts and appends to existing entries", async () => {
		vi.mocked(readFile).mockResolvedValue(JSON.stringify({ timestamp: "old", model: "old", systemPrompt: "old" }) + "\n");

		await logSystemPrompt(sessionFile, "claude", "new prompt");

		assert.deepStrictEqual(vi.mocked(mkdir).mock.calls[0], ["/tmp/session/test-session", { recursive: true }]);
		assert.strictEqual(vi.mocked(writeFile).mock.calls[0][0], logFile);
		const written = String(vi.mocked(writeFile).mock.calls[0][1]).trim().split("\n");
		assert.strictEqual(written.length, 2);
		assert.deepStrictEqual(JSON.parse(written[1]).model, "claude");
		assert.deepStrictEqual(JSON.parse(written[1]).systemPrompt, "new prompt");
	});

	it("logs only text blocks from array system prompts", async () => {
		vi.mocked(readFile).mockRejectedValue(Object.assign(new Error("missing"), { code: "ENOENT" }));

		await logSystemPrompt(sessionFile, "claude", [
			{ type: "text", text: "one" },
			{ type: "image", source: "ignored" },
			{ type: "text", text: "two" },
		]);

		const written = String(vi.mocked(writeFile).mock.calls[0][1]).trim();
		assert.strictEqual(JSON.parse(written).systemPrompt, "one\n\ntwo");
	});

	it("does not log unsupported system prompt shapes", async () => {
		await logSystemPrompt(sessionFile, "claude", { nope: true });
		assert.strictEqual(vi.mocked(writeFile).mock.calls.length, 0);
	});

	it("keeps only the last 50 log entries", async () => {
		const oldEntries = Array.from({ length: 55 }, (_, i) => JSON.stringify({ timestamp: String(i), model: "m", systemPrompt: "p" })).join("\n");
		vi.mocked(readFile).mockResolvedValue(oldEntries);

		await logSystemPrompt(sessionFile, "new", "new prompt");

		const written = String(vi.mocked(writeFile).mock.calls[0][1]).trim().split("\n");
		assert.strictEqual(written.length, 50);
		assert.strictEqual(JSON.parse(written[0]).timestamp, "6");
		assert.strictEqual(JSON.parse(written[49]).model, "new");
	});

	it("reads logged prompts and returns an empty array when unavailable", async () => {
		vi.mocked(readFile).mockResolvedValue('{"timestamp":"t","model":"m","systemPrompt":"p"}\n');
		assert.deepStrictEqual(await readSystemPrompts(sessionFile), [{ timestamp: "t", model: "m", systemPrompt: "p" }]);

		vi.mocked(readFile).mockRejectedValue(new Error("missing"));
		assert.deepStrictEqual(await readSystemPrompts(sessionFile), []);
	});
});


describe("extension registration", () => {
	function createPiHarness() {
		const handlers = new Map<string, Function>();
		const commands = new Map<string, any>();
		const pi = {
			on: vi.fn((event: string, handler: Function) => handlers.set(event, handler)),
			registerCommand: vi.fn((name: string, command: any) => commands.set(name, command)),
		};
		ccPatch(pi as any);
		return { handlers, commands, pi };
	}

	beforeEach(() => {
		resetVersionSuffixCache();
		vi.mocked(lstat).mockReset();
		vi.mocked(symlink).mockReset();
		vi.mocked(readFile).mockReset();
		vi.mocked(mkdir).mockReset();
		vi.mocked(writeFile).mockReset();
		vi.mocked(lstat).mockRejectedValue(new Error("missing"));
		vi.mocked(symlink).mockResolvedValue(undefined);
		vi.mocked(mkdir).mockResolvedValue(undefined as any);
		vi.mocked(writeFile).mockResolvedValue(undefined);
	});

	it("registers expected handlers and command", () => {
		const { handlers, commands } = createPiHarness();
		assert.deepStrictEqual([...handlers.keys()], ["before_agent_start", "before_provider_request", "session_start"]);
		assert.strictEqual(commands.has("debug-system-prompts"), true);
	});

	it("prepares virtual docs dir before agent start", async () => {
		const { handlers } = createPiHarness();
		await handlers.get("before_agent_start")!({ systemPrompt: "- Main documentation: /real/pkg/README.md" });
		assert.deepStrictEqual(vi.mocked(symlink).mock.calls[0], ["/real/pkg", VIRTUAL_PACKAGE_DIR, "dir"]);
	});

	it("patches provider requests and logs sanitized prompts", async () => {
		vi.mocked(readFile).mockRejectedValue(new Error("missing"));
		const { handlers } = createPiHarness();
		const payload = {
			model: "claude",
			messages: [{ role: "user", content: "What day is it?" }],
			system: "Pi documentation",
		};
		const ctx = {
			model: { provider: "anthropic" },
			sessionManager: { getSessionFile: () => "/tmp/session/test.jsonl" },
		};

		const result = await handlers.get("before_provider_request")!({ payload }, ctx);

		assert.strictEqual(result, payload);
		assert.strictEqual(payload.system[1].text, "Coding agent documentation");
		assert.strictEqual(vi.mocked(writeFile).mock.calls.length, 1);
	});

	it("ignores provider request logging failures", async () => {
		vi.mocked(readFile).mockRejectedValue(new Error("missing"));
		vi.mocked(writeFile).mockRejectedValue(new Error("nope"));
		const { handlers } = createPiHarness();
		const payload = { model: "claude", messages: [{ role: "user", content: "Hi" }], system: "Pi documentation" };
		const ctx = { model: { provider: "anthropic" }, sessionManager: { getSessionFile: () => "/tmp/session/test.jsonl" } };

		assert.strictEqual(await handlers.get("before_provider_request")!({ payload }, ctx), payload);
	});

	it("resets cache and notifies on session start", async () => {
		buildBillingHeader([{ role: "user", content: "First message" }]);
		const { handlers } = createPiHarness();
		const ui = { notify: vi.fn() };

		await handlers.get("session_start")!({}, { ui });

		assert.deepStrictEqual(ui.notify.mock.calls[0], ["cc-patch: loaded (anthropic-only)", "info"]);
		const header = buildBillingHeader([{ role: "user", content: "Second message" }]);
		assert.match(header, new RegExp(`cc_version=2\\.1\\.173\\.${computeVersionSuffix("Second message")}`));
	});

	it("debug command handles no session file and no entries", async () => {
		const { commands } = createPiHarness();
		const command = commands.get("debug-system-prompts");
		const ui = { notify: vi.fn(), select: vi.fn(), editor: vi.fn() };

		await command.handler("", { sessionManager: { getSessionFile: () => null }, ui });
		assert.deepStrictEqual(ui.notify.mock.calls[0], ["No session file (ephemeral mode)", "warning"]);

		vi.mocked(readFile).mockRejectedValue(new Error("missing"));
		await command.handler("", { sessionManager: { getSessionFile: () => "/tmp/session/test.jsonl" }, ui });
		assert.deepStrictEqual(ui.notify.mock.calls[1], ["No system prompts logged yet", "info"]);
	});

	it("debug command opens selected prompt in editor", async () => {
		const { commands } = createPiHarness();
		const command = commands.get("debug-system-prompts");
		const entries = [
			{ timestamp: "2026-01-01T00:00:00.000Z", model: "old", systemPrompt: "old prompt" },
			{ timestamp: "2026-01-02T00:00:00.000Z", model: "new", systemPrompt: "new prompt" },
		];
		vi.mocked(readFile).mockResolvedValue(entries.map((entry) => JSON.stringify(entry)).join("\n"));
		const ui = {
			notify: vi.fn(),
			select: vi.fn(async (_title: string, items: string[]) => items[0]),
			editor: vi.fn(),
		};

		await command.handler("1", { sessionManager: { getSessionFile: () => "/tmp/session/test.jsonl" }, ui });

		assert.match(ui.select.mock.calls[0][0], /System Prompts \(1 of 2/);
		assert.deepStrictEqual(ui.editor.mock.calls[0], ["System Prompt - new", "new prompt"]);
	});
});
