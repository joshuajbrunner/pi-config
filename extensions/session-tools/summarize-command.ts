import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { buildConversationText } from "./conversation-extract";
import { createSummary } from "./summary-model";
import { saveSummaryForCurrentSession } from "./summary-store";
import { showSummaryUi } from "./summary-ui";

export function registerSummarizeCommand(pi: ExtensionAPI): void {
	pi.registerCommand("summarize", {
		description: "Summarize the current session and save the summary beside the session file",
		handler: async (args, ctx) => {
			await ctx.waitForIdle();

			const customInstruction = args.trim() || undefined;
			const conversationText = buildConversationText(ctx.sessionManager.getBranch());

			if (!conversationText.trim()) {
				ctx.ui.notify("No conversation text found", "warning");
				return;
			}

			ctx.ui.notify("Creating session summary...", "info");

			const summary = await createSummary(conversationText, customInstruction, ctx);
			if (!summary) return;

			const savedPath = await saveSummaryForCurrentSession(ctx, summary, customInstruction);
			if (savedPath) {
				ctx.ui.notify(`Summary saved: ${savedPath}`, "success");
			} else {
				ctx.ui.notify("Summary created, but this session is not persisted", "warning");
			}

			await showSummaryUi("Session Summary", summary, ctx);
		},
	});
}
