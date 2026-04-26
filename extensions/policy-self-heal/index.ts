import type { ExtensionAPI, ExtensionContext } from "@mariozechner/pi-coding-agent";
import type { AssistantMessage, AssistantMessageEvent, TextContent, ThinkingContent, ToolCall } from "@mariozechner/pi-ai";

const EXTENSION_NAME = "policy-self-heal";
const CUSTOM_ENTRY_TYPE = "policy-self-heal-event";
const MAX_ERROR_TEXT_CHARS = 2_000;

export type PolicyProvider = "openai" | "anthropic" | "generic";

export interface PolicyDetection {
	provider: PolicyProvider;
	code?: string;
	reason: string;
	matchedPattern?: string;
}

export interface RecoveryRecord {
	timestamp: string;
	provider: string;
	model: string;
	detection: PolicyDetection;
	errorText: string;
	recoveryPrompt: string;
}

interface ExtensionState {
	enabled: boolean;
	autoRecover: boolean;
	recoveriesThisAgent: number;
	lastFingerprint: string | undefined;
	lastRecord: RecoveryRecord | undefined;
	lastProviderStatus: number | undefined;
	suppressNextAgentRecovery: boolean;
	skipRecoveryForCurrentAgent: boolean;
}

const state: ExtensionState = {
	enabled: true,
	autoRecover: true,
	recoveriesThisAgent: 0,
	lastFingerprint: undefined,
	lastRecord: undefined,
	lastProviderStatus: undefined,
	suppressNextAgentRecovery: false,
	skipRecoveryForCurrentAgent: false,
};

function truncate(text: string, max = MAX_ERROR_TEXT_CHARS): string {
	return text.length <= max ? text : `${text.slice(0, max)}…`;
}

function safeJson(value: unknown): string {
	try {
		return JSON.stringify(value);
	} catch {
		return String(value);
	}
}

function contentToText(content: AssistantMessage["content"] | undefined): string {
	if (!Array.isArray(content)) return "";
	return content
		.map((block: TextContent | ThinkingContent | ToolCall) => {
			if (block.type === "text") return block.text;
			if (block.type === "thinking") return block.thinking;
			if (block.type === "toolCall") return `${block.name} ${safeJson(block.arguments)}`;
			return "";
		})
		.filter(Boolean)
		.join("\n");
}

export function extractErrorText(value: unknown): string {
	if (value === undefined || value === null) return "";
	if (typeof value === "string") return truncate(value);
	if (value instanceof Error) return truncate(`${value.name}: ${value.message}`);

	const maybeEvent = value as Partial<AssistantMessageEvent>;
	if (maybeEvent.type === "error" && "error" in maybeEvent) {
		const message = maybeEvent.error as AssistantMessage;
		return truncate([message.errorMessage, contentToText(message.content)].filter(Boolean).join("\n"));
	}

	const maybeMessage = value as Partial<AssistantMessage>;
	if (maybeMessage.role === "assistant") {
		return truncate([maybeMessage.errorMessage, contentToText(maybeMessage.content as AssistantMessage["content"])].filter(Boolean).join("\n"));
	}

	return truncate(safeJson(value));
}

function extractCode(text: string): string | undefined {
	const codeMatch = text.match(/"code"\s*:\s*"([^"]+)"/i) ?? text.match(/\bcode[=:]\s*([a-z0-9_\-.]+)/i);
	return codeMatch?.[1];
}

function normalizeProviderHint(providerHint: string | undefined): PolicyProvider | undefined {
	const normalized = providerHint?.toLowerCase() ?? "";
	if (normalized.includes("openai") || normalized.includes("codex")) return "openai";
	if (normalized.includes("anthropic") || normalized.includes("claude")) return "anthropic";
	return undefined;
}

function hasAny(normalized: string, patterns: readonly string[]): string | undefined {
	return patterns.find((pattern) => normalized.includes(pattern));
}

const OPENAI_POLICY_PATTERNS = [
	"cyber_policy",
	"possible cybersecurity risk",
	"trusted access for cyber",
	"cyber-abuse risk",
	"potentially high-risk cyber activity",
	"request was re-routed to reduce cyber-abuse risk",
] as const;

const ANTHROPIC_CYBER_POLICY_PATTERNS = [
	"violative cyber content",
	"cyber verification program",
	"claude.com/form/cyber-use-case",
	"cyber-use-case",
	"request an adjustment pursuant to our cyber verification program",
] as const;

const ANTHROPIC_USAGE_POLICY_PATTERNS = [
	"claude code is unable to respond to this request",
	"appears to violate our usage policy",
	"blocked under anthropic's usage policy",
	"anthropic.com/legal/aup",
	"double press esc to edit your last message",
	"start a new session for claude code",
	"request an exemption based on how you use claude",
	"support.claude.com/en/articles/8241253-safeguards-warnings-and-appeals",
] as const;

const GENERIC_POLICY_PATTERNS = [
	"content policy",
	"safety policy",
	"usage policy",
	"policy violation",
] as const;

export function detectOpenAIPolicyError(input: unknown): PolicyDetection | undefined {
	const text = extractErrorText(input);
	const normalized = text.toLowerCase();
	const code = extractCode(text);
	const matchedPattern = code === "cyber_policy" ? "code:cyber_policy" : hasAny(normalized, OPENAI_POLICY_PATTERNS);
	if (!matchedPattern) return undefined;

	return {
		provider: "openai",
		code: code ?? "cyber_policy",
		reason: "OpenAI cyber-safety classifier rejected or rerouted the request",
		matchedPattern,
	};
}

export function detectAnthropicPolicyError(input: unknown): PolicyDetection | undefined {
	const text = extractErrorText(input);
	const normalized = text.toLowerCase();
	const code = extractCode(text);

	const cyberPattern = hasAny(normalized, ANTHROPIC_CYBER_POLICY_PATTERNS);
	if (cyberPattern || (normalized.includes("anthropic") && normalized.includes("usage policy") && normalized.includes("cyber")) || (normalized.includes("aup") && normalized.includes("cyber"))) {
		return {
			provider: "anthropic",
			code,
			reason: "Anthropic cyber/usage-policy classifier rejected the request",
			matchedPattern: cyberPattern ?? "anthropic/aup + cyber",
		};
	}

	const usagePattern = hasAny(normalized, ANTHROPIC_USAGE_POLICY_PATTERNS);
	if (usagePattern) {
		return {
			provider: "anthropic",
			code,
			reason: "Anthropic usage-policy classifier rejected the request",
			matchedPattern: usagePattern,
		};
	}

	return undefined;
}

export function detectGenericPolicyError(input: unknown): PolicyDetection | undefined {
	const text = extractErrorText(input);
	const normalized = text.toLowerCase();
	const code = extractCode(text);
	const matchedPattern = hasAny(normalized, GENERIC_POLICY_PATTERNS);
	if (!matchedPattern) return undefined;

	return {
		provider: "generic",
		code,
		reason: "Provider policy classifier rejected the request",
		matchedPattern,
	};
}

export function detectPolicyError(input: unknown, providerHint?: string): PolicyDetection | undefined {
	const text = extractErrorText(input);
	if (!text.trim()) return undefined;

	const normalizedHint = normalizeProviderHint(providerHint);
	if (normalizedHint === "openai") {
		return detectOpenAIPolicyError(input) ?? detectAnthropicPolicyError(input) ?? detectGenericPolicyError(input);
	}
	if (normalizedHint === "anthropic") {
		return detectAnthropicPolicyError(input) ?? detectOpenAIPolicyError(input) ?? detectGenericPolicyError(input);
	}

	return detectOpenAIPolicyError(input) ?? detectAnthropicPolicyError(input) ?? detectGenericPolicyError(input);
}

export function buildRecoveryPrompt(detection: PolicyDetection): string {
	return [
		"Local policy-self-heal recovery instruction:",
		`The previous provider response failed with a policy-classifier error (${detection.reason}${detection.code ? `, code: ${detection.code}` : ""}).`,
		"Do not bypass, evade, or weaken any safety policy. Re-read the user's actual request and the conversation under the normal rules.",
		"If the task is ordinary software engineering, documentation, education, or clearly authorized defensive/security research, continue safely and explicitly keep the work scoped to that benign/authorized context.",
		"If ownership, authorization, target scope, or benign intent is missing or ambiguous, ask one concise clarification question before proceeding.",
		"Refuse or redirect requests for credential theft, malware, persistence, evasion, exfiltration, unauthorized access, or real-world exploitation of third-party systems.",
		"Prefer safe help such as code review, hardening, detection logic, threat modeling, defensive triage, documentation, or toy/sandbox examples.",
	].join("\n");
}

function fingerprintFor(detection: PolicyDetection, errorText: string, provider: string, model: string): string {
	return [provider, model, detection.provider, detection.code ?? "", detection.reason, errorText.slice(0, 300)].join("|");
}

function getModelLabel(ctx: ExtensionContext): { provider: string; model: string } {
	return {
		provider: ctx.model?.provider ?? "unknown-provider",
		model: ctx.model?.id ?? "unknown-model",
	};
}

function sendRecoveryPrompt(pi: ExtensionAPI, ctx: ExtensionContext, prompt: string): void {
	// If the recovery prompt itself triggers another provider policy error, do not
	// recursively queue another recovery prompt. That would create a noisy loop.
	state.suppressNextAgentRecovery = true;
	if (ctx.isIdle()) {
		pi.sendUserMessage(prompt);
		return;
	}
	pi.sendUserMessage(prompt, { deliverAs: "followUp" });
}

function scheduleRecovery(pi: ExtensionAPI, ctx: ExtensionContext, detection: PolicyDetection, rawError: unknown): void {
	if (!state.enabled) return;
	if (state.skipRecoveryForCurrentAgent) {
		ctx.ui.notify(`${EXTENSION_NAME}: recovery prompt also hit a policy error; not retrying again`, "warning");
		return;
	}
	if (state.recoveriesThisAgent >= 1) return;

	const errorText = extractErrorText(rawError);
	const { provider, model } = getModelLabel(ctx);
	const fingerprint = fingerprintFor(detection, errorText, provider, model);
	if (fingerprint === state.lastFingerprint) return;

	const recoveryPrompt = buildRecoveryPrompt(detection);
	const record: RecoveryRecord = {
		timestamp: new Date().toISOString(),
		provider,
		model,
		detection,
		errorText,
		recoveryPrompt,
	};

	state.recoveriesThisAgent += 1;
	state.lastFingerprint = fingerprint;
	state.lastRecord = record;

	pi.appendEntry(CUSTOM_ENTRY_TYPE, record);

	const notice = `${EXTENSION_NAME}: detected ${detection.provider} policy error on ${provider}/${model}`;
	ctx.ui.notify(
		state.autoRecover
			? `${notice}; queued safe recovery prompt`
			: `${notice}; auto recovery disabled`,
		"warning",
	);

	if (!state.autoRecover) return;
	sendRecoveryPrompt(pi, ctx, recoveryPrompt);
}

function parseBooleanArg(arg: string): boolean | undefined {
	const normalized = arg.trim().toLowerCase();
	if (["on", "true", "yes", "1", "enable", "enabled"].includes(normalized)) return true;
	if (["off", "false", "no", "0", "disable", "disabled"].includes(normalized)) return false;
	return undefined;
}

function formatLastRecord(record: RecoveryRecord | undefined): string {
	if (!record) return "No policy self-heal events recorded in this extension runtime.";
	return [
		`Time: ${record.timestamp}`,
		`Model: ${record.provider}/${record.model}`,
		`Detection: ${record.detection.provider}${record.detection.code ? ` (${record.detection.code})` : ""}`,
		`Reason: ${record.detection.reason}`,
		"",
		"Error text:",
		record.errorText || "(empty)",
		"",
		"Recovery prompt:",
		record.recoveryPrompt,
	].join("\n");
}

export default function (pi: ExtensionAPI) {
	pi.registerFlag("policy-self-heal", {
		description: "Enable policy error self-healing prompts (default: true)",
		type: "boolean",
		default: true,
	});

	pi.registerFlag("policy-self-heal-auto", {
		description: "Automatically queue a safe recovery prompt when policy errors are detected (default: true)",
		type: "boolean",
		default: true,
	});

	pi.on("session_start", async (_event, ctx) => {
		state.enabled = pi.getFlag("policy-self-heal") !== false;
		state.autoRecover = pi.getFlag("policy-self-heal-auto") !== false;
		state.recoveriesThisAgent = 0;
		state.lastProviderStatus = undefined;
		ctx.ui.setStatus(EXTENSION_NAME, state.enabled ? (state.autoRecover ? "heal:auto" : "heal:watch") : undefined);
		if (state.enabled) ctx.ui.notify(`${EXTENSION_NAME}: loaded (${state.autoRecover ? "auto" : "watch"})`, "info");
	});

	pi.on("session_shutdown", async (_event, ctx) => {
		ctx.ui.setStatus(EXTENSION_NAME, undefined);
	});

	pi.on("agent_start", async () => {
		state.recoveriesThisAgent = 0;
		state.lastFingerprint = undefined;
		state.lastProviderStatus = undefined;
		state.skipRecoveryForCurrentAgent = state.suppressNextAgentRecovery;
		state.suppressNextAgentRecovery = false;
	});

	pi.on("after_provider_response", async (event) => {
		state.lastProviderStatus = event.status;
	});

	pi.on("message_update", async (event, ctx) => {
		const streamEvent = event.assistantMessageEvent;
		if (streamEvent.type !== "error") return;
		const detection = detectPolicyError(streamEvent, ctx.model?.provider);
		if (!detection) return;
		scheduleRecovery(pi, ctx, detection, streamEvent);
	});

	pi.on("message_end", async (event, ctx) => {
		const message = event.message as Partial<AssistantMessage>;
		if (message.role !== "assistant") return;
		if (message.stopReason !== "error") return;
		const detection = detectPolicyError(message, ctx.model?.provider);
		if (!detection) return;
		scheduleRecovery(pi, ctx, detection, message);
	});

	pi.registerCommand("policy-self-heal", {
		description: "Manage policy error self-healing. Usage: /policy-self-heal [on|off|auto-on|auto-off|status|last]",
		handler: async (args, ctx) => {
			const arg = args.trim().toLowerCase();

			if (!arg || arg === "status") {
				ctx.ui.notify(
					`${EXTENSION_NAME}: enabled=${state.enabled}, autoRecover=${state.autoRecover}, lastProviderStatus=${state.lastProviderStatus ?? "none"}`,
					"info",
				);
				return;
			}

			if (arg === "last") {
				await ctx.ui.editor(`${EXTENSION_NAME}: last event`, formatLastRecord(state.lastRecord));
				return;
			}

			if (arg === "auto-on" || arg === "auto-off") {
				state.autoRecover = arg === "auto-on";
				ctx.ui.setStatus(EXTENSION_NAME, state.enabled ? (state.autoRecover ? "heal:auto" : "heal:watch") : undefined);
				ctx.ui.notify(`${EXTENSION_NAME}: autoRecover=${state.autoRecover}`, "info");
				return;
			}

			const enabled = parseBooleanArg(arg);
			if (enabled !== undefined) {
				state.enabled = enabled;
				ctx.ui.setStatus(EXTENSION_NAME, state.enabled ? (state.autoRecover ? "heal:auto" : "heal:watch") : undefined);
				ctx.ui.notify(`${EXTENSION_NAME}: enabled=${state.enabled}`, "info");
				return;
			}

			ctx.ui.notify(`Unknown ${EXTENSION_NAME} command: ${args}`, "warning");
		},
	});
}
