import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { buildConversationText } from "./conversation-extract";
import { createSummary } from "./summary-model";
import { appendSummaryDebugLog, ensureSummaryDirForCurrentSession, saveSummaryForCurrentSession } from "./summary-store";
import { showSummaryUi } from "./summary-ui";
import { parseSummarizeArgs } from "./summarize-args";

export function registerSummarizeCommand(pi: ExtensionAPI): void {
	pi.registerCommand("summarize", {
		description: "Summarize the current session. Default is one-line; use /summarize full for detailed summary",
		handler: async (args, ctx) => {
			try {
				await ctx.waitForIdle();

				const summaryDir = await ensureSummaryDirForCurrentSession(ctx);
				await appendSummaryDebugLog(ctx, "summarize_invoked", {
					summaryDir,
					sessionId: ctx.sessionManager.getSessionId(),
					sessionFile: ctx.sessionManager.getSessionFile(),
				});

				const { mode, customInstruction } = parseSummarizeArgs(args);
				const conversationText = buildConversationText(ctx.sessionManager.getBranch());
				await appendSummaryDebugLog(ctx, "conversation_extracted", {
					conversationChars: conversationText.length,
					customInstruction,
					mode,
				});

				if (!conversationText.trim()) {
					ctx.ui.notify("No conversation text found", "warning");
					return;
				}

				ctx.ui.notify("Creating session summary...", "info");

				const summary = await createSummary(conversationText, customInstruction, mode, ctx, (message, details) =>
					appendSummaryDebugLog(ctx, message, details),
				);
				if (!summary) {
					await showSummaryUi("Summarize Failed", "The model returned an empty summary. No file was saved.", ctx);
					return;
				}

				const savedPath = await saveSummaryForCurrentSession(ctx, summary, mode, customInstruction);
				if (savedPath) {
					await appendSummaryDebugLog(ctx, "summary_saved", { savedPath, summaryChars: summary.length });
					ctx.ui.notify(`Summary saved: ${savedPath}`, "success");
				} else {
					await appendSummaryDebugLog(ctx, "summary_not_saved_session_not_persisted");
					ctx.ui.notify("Summary created, but this session is not persisted", "warning");
				}

				await showSummaryUi("Session Summary", summary, ctx);
			} catch (error) {
				const message = error instanceof Error ? error.stack || error.message : String(error);
				await appendSummaryDebugLog(ctx, "summarize_failed", { error: message });
				ctx.ui.notify("Summarize failed", "error");
				await showSummaryUi("Summarize Failed", `\`\`\`\n${message}\n\`\`\``, ctx);
			}
		},
	});
}
