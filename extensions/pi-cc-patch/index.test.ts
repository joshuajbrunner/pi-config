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

import { describe, it, beforeEach } from "node:test";
import assert from "node:assert";
import {
	computeVersionSuffix,
	extractFirstUserMessage,
	buildBillingHeader,
	resetVersionSuffixCache,
} from "./index.js";

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
			"x-anthropic-billing-header: cc_version=2.1.114.89d; cc_entrypoint=cli; cch=00000;"
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

		assert.match(header, /cc_version=2\.1\.114\.000/);
	});

	it("should include all required header components", () => {
		const messages = [{ role: "user", content: "Hello" }];
		const header = buildBillingHeader(messages);

		assert.match(header, /x-anthropic-billing-header:/);
		assert.match(header, /cc_version=2\.1\.114\.[0-9a-f]{3}/);
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
		// Verified from /tmp/claude-debug-3.log:
		// attribution header x-anthropic-billing-header: cc_version=2.1.114.89d; cc_entrypoint=cli; cch=00000;
		// First user message: "What day is it?"

		const messages = [{ role: "user", content: "What day is it?" }];
		const header = buildBillingHeader(messages);

		assert.strictEqual(
			header,
			"x-anthropic-billing-header: cc_version=2.1.114.89d; cc_entrypoint=cli; cch=00000;"
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

		const { createHash } = require("node:crypto");
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
