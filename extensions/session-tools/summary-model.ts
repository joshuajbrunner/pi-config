import { complete, getModel } from "@mariozechner/pi-ai";
import type { ExtensionCommandContext } from "@mariozechner/pi-coding-agent";
import { SUMMARY_MODEL_CANDIDATES } from "./config";

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

export async function createSummary(
	conversationText: string,
	customInstruction: string | undefined,
	ctx: ExtensionCommandContext,
): Promise<string | undefined> {
	const failures: string[] = [];

	for (const candidate of SUMMARY_MODEL_CANDIDATES) {
		const model = getModel(candidate.provider, candidate.model);
		if (!model) {
			failures.push(`${candidate.provider}/${candidate.model}: model not found`);
			continue;
		}

		const auth = await ctx.modelRegistry.getApiKeyAndHeaders(model);
		if (!auth.ok) {
			failures.push(`${candidate.provider}/${candidate.model}: ${auth.error}`);
			continue;
		}

		if (!auth.apiKey) {
			failures.push(`${candidate.provider}/${candidate.model}: no API key`);
			continue;
		}

		ctx.ui.notify(`Summarizing with ${candidate.provider}/${candidate.model}...`, "info");

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

		const summary = response.content
			.filter((content): content is { type: "text"; text: string } => content.type === "text")
			.map((content) => content.text)
			.join("\n")
			.trim();

		if (response.stopReason === "error") {
			failures.push(responseDiagnostics(response));
			continue;
		}

		if (!summary) {
			failures.push(`${responseDiagnostics(response)}; empty text response`);
			continue;
		}

		return summary;
	}

	throw new Error(`All summary models failed:\n- ${failures.join("\n- ")}`);
}
