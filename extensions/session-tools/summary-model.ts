import { complete, getModel } from "@mariozechner/pi-ai";
import type { ExtensionCommandContext } from "@mariozechner/pi-coding-agent";
import { SUMMARY_MODEL_CANDIDATES } from "./config";
import type { SummaryDebugLogger } from "./types";

function buildSummaryPrompt(conversationText: string, customInstruction?: string): string {
	return [
		"Summarize this pi coding-agent session so it can be resumed later.",
		"",
		"Include concise, structured sections for:",
		"- Goal / user intent",
		"- Key decisions and rationale",
		"- Files inspected or changed",
		"- Current progress",
		"- Open questions / risks",
		"- Concrete next steps",
		"",
		customInstruction?.trim() ? `Additional user instruction: ${customInstruction.trim()}` : undefined,
		"",
		"<conversation>",
		conversationText,
		"</conversation>",
	]
		.filter((line): line is string => line !== undefined)
		.join("\n");
}

function responseDiagnostics(response: Awaited<ReturnType<typeof complete>>): string {
	const contentTypes = response.content.map((content) => content.type).join(", ") || "none";
	return [
		`${response.provider}/${response.model}`,
		`stopReason=${response.stopReason}`,
		response.errorMessage ? `error=${response.errorMessage}` : undefined,
		`contentTypes=${contentTypes}`,
		`tokens=${response.usage.totalTokens}`,
	]
		.filter((line): line is string => line !== undefined)
		.join("; ");
}

function responseDebugDetails(response: Awaited<ReturnType<typeof complete>>) {
	return {
		provider: response.provider,
		model: response.model,
		stopReason: response.stopReason,
		errorMessage: response.errorMessage,
		usage: response.usage,
		content: response.content.map((content) => ({
			...content,
			text: content.type === "text" ? `${content.text.slice(0, 2000)}${content.text.length > 2000 ? "…" : ""}` : undefined,
			thinking:
				content.type === "thinking"
					? `${content.thinking.slice(0, 2000)}${content.thinking.length > 2000 ? "…" : ""}`
					: undefined,
		})),
	};
}

export async function createSummary(
	conversationText: string,
	customInstruction: string | undefined,
	ctx: ExtensionCommandContext,
	debugLog?: SummaryDebugLogger,
): Promise<string | undefined> {
	const failures: string[] = [];
	await debugLog?.("summary_model_start", {
		conversationChars: conversationText.length,
		customInstruction,
		candidates: SUMMARY_MODEL_CANDIDATES,
	});

	for (const candidate of SUMMARY_MODEL_CANDIDATES) {
		const model = getModel(candidate.provider, candidate.model);
		if (!model) {
			failures.push(`${candidate.provider}/${candidate.model}: model not found`);
			await debugLog?.("summary_model_candidate_missing", candidate);
			continue;
		}

		const auth = await ctx.modelRegistry.getApiKeyAndHeaders(model);
		if (!auth.ok) {
			failures.push(`${candidate.provider}/${candidate.model}: ${auth.error}`);
			await debugLog?.("summary_model_auth_failed", { candidate, error: auth.error });
			continue;
		}

		if (!auth.apiKey) {
			failures.push(`${candidate.provider}/${candidate.model}: no API key`);
			await debugLog?.("summary_model_auth_missing_api_key", candidate);
			continue;
		}

		ctx.ui.notify(`Summarizing with ${candidate.provider}/${candidate.model}...`, "info");
		await debugLog?.("summary_model_candidate_start", candidate);

		const response = await complete(
			model,
			{
				messages: [
					{
						role: "user" as const,
						content: [{ type: "text" as const, text: buildSummaryPrompt(conversationText, customInstruction) }],
						timestamp: Date.now(),
					},
				],
			},
			{
				apiKey: auth.apiKey,
				headers: auth.headers,
				reasoningEffort: "low",
			},
		);

		await debugLog?.("summary_model_candidate_response", responseDebugDetails(response));

		const summary = response.content
			.filter((content): content is { type: "text"; text: string } => content.type === "text")
			.map((content) => content.text)
			.join("\n")
			.trim();

		if (response.stopReason === "error") {
			failures.push(responseDiagnostics(response));
			await debugLog?.("summary_model_candidate_error", { candidate, diagnostics: responseDiagnostics(response) });
			continue;
		}

		if (!summary) {
			failures.push(`${responseDiagnostics(response)}; empty text response`);
			await debugLog?.("summary_model_candidate_empty", { candidate, diagnostics: responseDiagnostics(response) });
			continue;
		}

		await debugLog?.("summary_model_success", { candidate, summaryChars: summary.length });
		return summary;
	}

	throw new Error(`All summary models failed:\n- ${failures.join("\n- ")}`);
}
