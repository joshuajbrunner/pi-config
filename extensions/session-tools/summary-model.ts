import { complete, getModel } from "@mariozechner/pi-ai";
import type { ExtensionCommandContext } from "@mariozechner/pi-coding-agent";
import { SUMMARY_MODEL, SUMMARY_PROVIDER } from "./config";

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

export async function createSummary(
	conversationText: string,
	customInstruction: string | undefined,
	ctx: ExtensionCommandContext,
): Promise<string | undefined> {
	const model = getModel(SUMMARY_PROVIDER, SUMMARY_MODEL);
	if (!model) {
		ctx.ui.notify(`Model ${SUMMARY_PROVIDER}/${SUMMARY_MODEL} not found`, "warning");
		return undefined;
	}

	const auth = await ctx.modelRegistry.getApiKeyAndHeaders(model);
	if (!auth.ok) {
		ctx.ui.notify(auth.error, "warning");
		return undefined;
	}

	if (!auth.apiKey) {
		ctx.ui.notify(`No API key for ${SUMMARY_PROVIDER}/${SUMMARY_MODEL}`, "warning");
		return undefined;
	}

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
			reasoningEffort: "medium",
		},
	);

	return response.content
		.filter((content): content is { type: "text"; text: string } => content.type === "text")
		.map((content) => content.text)
		.join("\n")
		.trim();
}
