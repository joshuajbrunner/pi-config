import { describe, it } from "node:test";
import assert from "node:assert";
import {
	buildRecoveryPrompt,
	detectAnthropicPolicyError,
	detectGenericPolicyError,
	detectOpenAIPolicyError,
	detectPolicyError,
	extractErrorText,
} from "./index.js";

describe("detectPolicyError", () => {
	it("detects OpenAI cyber_policy JSON errors", () => {
		const error = `Codex error: {"type":"error","error":{"type":"invalid_request","code":"cyber_policy","message":"This content was flagged for possible cybersecurity risk. If this seems wrong, try rephrasing your request. To get authorized for security work, join the Trusted Access for Cyber program: https://chatgpt.com/cyber","param":null},"sequence_number":1823}`;
		const detection = detectPolicyError(error);
		assert.strictEqual(detection?.provider, "openai");
		assert.strictEqual(detection?.code, "cyber_policy");
		assert.strictEqual(detection?.reason, "OpenAI cyber-safety classifier rejected or rerouted the request");
	});

	it("detects OpenAI reroute warnings", () => {
		const detection = detectPolicyError("Your account was flagged for potentially high-risk cyber activity and this request was routed to gpt-5.2 as a fallback.");
		assert.strictEqual(detection?.provider, "openai");
		assert.strictEqual(detection?.code, "cyber_policy");
	});

	it("detects Anthropic cyber usage policy errors", () => {
		const detection = detectPolicyError("This request triggered restrictions on violative cyber content and was blocked under Anthropic's Usage Policy. To request an adjustment pursuant to our Cyber Verification Program...");
		assert.strictEqual(detection?.provider, "anthropic");
		assert.strictEqual(detection?.reason, "Anthropic cyber/usage-policy classifier rejected the request");
	});

	it("detects Anthropic generic Claude Code usage policy errors", () => {
		const detection = detectPolicyError("API Error: Claude Code is unable to respond to this request, which appears to violate our Usage Policy (https://www.anthropic.com/legal/aup). Please double press esc to edit your last message or start a new session for Claude Code to assist with a different task.");
		assert.strictEqual(detection?.provider, "anthropic");
		assert.strictEqual(detection?.reason, "Anthropic usage-policy classifier rejected the request");
	});

	it("detects Anthropic cyber use case form errors", () => {
		const detection = detectPolicyError("To request an adjustment pursuant to our Cyber Verification Program based on how you use Claude, fill out https://claude.com/form/cyber-use-case?token=redacted");
		assert.strictEqual(detection?.provider, "anthropic");
		assert.strictEqual(detection?.matchedPattern, "cyber verification program");
	});

	it("detects generic provider policy errors", () => {
		const detection = detectPolicyError("Request blocked by content policy.");
		assert.strictEqual(detection?.provider, "generic");
	});

	it("uses provider hint to classify ambiguous usage-policy text", () => {
		const detection = detectPolicyError("Request appears to violate our Usage Policy.", "anthropic");
		assert.strictEqual(detection?.provider, "anthropic");
	});

	it("exposes provider-specific detectors", () => {
		assert.strictEqual(detectOpenAIPolicyError("cyber_policy")?.provider, "openai");
		assert.strictEqual(detectAnthropicPolicyError("Claude Code is unable to respond to this request")?.provider, "anthropic");
		assert.strictEqual(detectGenericPolicyError("blocked by content policy")?.provider, "generic");
	});

	it("ignores ordinary errors", () => {
		assert.strictEqual(detectPolicyError("ECONNRESET: socket hang up"), undefined);
		assert.strictEqual(detectPolicyError("Rate limit exceeded"), undefined);
	});
});

describe("extractErrorText", () => {
	it("extracts text from assistant error stream events", () => {
		const text = extractErrorText({
			type: "error",
			reason: "error",
			error: {
				role: "assistant",
				content: [{ type: "text", text: "blocked by content policy" }],
				errorMessage: "provider error",
				stopReason: "error",
			},
		});
		assert.match(text, /provider error/);
		assert.match(text, /blocked by content policy/);
	});

	it("extracts text from assistant messages", () => {
		const text = extractErrorText({
			role: "assistant",
			content: [{ type: "text", text: "This content was flagged for possible cybersecurity risk" }],
			errorMessage: "cyber_policy",
		});
		assert.match(text, /cyber_policy/);
		assert.match(text, /possible cybersecurity risk/);
	});
});

describe("buildRecoveryPrompt", () => {
	it("keeps recovery safety-preserving rather than evasive", () => {
		const prompt = buildRecoveryPrompt({
			provider: "openai",
			code: "cyber_policy",
			reason: "OpenAI cyber-safety classifier rejected or rerouted the request",
		});
		assert.match(prompt, /Do not bypass, evade, or weaken any safety policy/);
		assert.match(prompt, /authorized defensive\/security research/);
		assert.match(prompt, /ask one concise clarification question/);
		assert.match(prompt, /Refuse or redirect requests for credential theft/);
	});
});
