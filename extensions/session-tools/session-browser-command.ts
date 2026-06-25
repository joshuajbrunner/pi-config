import { SessionManager, type ExtensionAPI, type ExtensionCommandContext, type SessionInfo } from "@earendil-works/pi-coding-agent";
import path from "node:path";
import { SUMMARY_FILE_EXTENSION, SUMMARY_FILE_PREFIX } from "./config";
import { buildConversationTextFromSessionFile } from "./conversation-extract";
import { createSummary } from "./summary-model";
import { loadSessionMetrics } from "./session-metrics";
import { parseSummary } from "./summary-parse";
import { appendSummaryDebugLogForSession, loadLatestSummary, saveSummaryForSession } from "./summary-store";
import { showSummaryUi } from "./summary-ui";
import { SessionBrowserComponent, type SessionBrowserResult } from "./session-browser-component";
import type { BrowserSession, SummaryMode } from "./types";

function summarizedAtFromPath(summaryPath: string | undefined): Date | undefined {
	if (!summaryPath) return undefined;

	const fileName = path.basename(summaryPath);
	if (!fileName.startsWith(SUMMARY_FILE_PREFIX) || !fileName.endsWith(SUMMARY_FILE_EXTENSION)) return undefined;

	const stamp = fileName.slice(SUMMARY_FILE_PREFIX.length, -SUMMARY_FILE_EXTENSION.length).replace(/-\d+$/, "");
	const match = stamp.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2})-(\d{2})-(\d{2})-(\d{3})Z$/);
	if (!match) return undefined;

	const [, year, month, day, hour, minute, second, millisecond] = match;
	return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second), Number(millisecond)));
}

function sortSessionsForBrowser(a: BrowserSession, b: BrowserSession): number {
	const aSummarized = a.summarizedAt?.getTime();
	const bSummarized = b.summarizedAt?.getTime();
	if (aSummarized !== undefined && bSummarized !== undefined) return bSummarized - aSummarized;
	if (aSummarized !== undefined) return -1;
	if (bSummarized !== undefined) return 1;
	return b.modified.getTime() - a.modified.getTime();
}

async function withSummaries(sessions: SessionInfo[], currentSessionId?: string, currentSessionFile?: string): Promise<BrowserSession[]> {
	return Promise.all(
		sessions.map(async (session) => {
			const [savedSummary, metrics] = await Promise.all([
				loadLatestSummary(session.path, session.id),
				loadSessionMetrics(session.path),
			]);
			return {
				...session,
				latestSummary: savedSummary?.content,
				latestSummaryPath: savedSummary?.path,
				summarizedAt: summarizedAtFromPath(savedSummary?.path),
				parsedSummary: savedSummary ? parseSummary(savedSummary.content) : undefined,
				metrics,
				isCurrent: session.id === currentSessionId || session.path === currentSessionFile,
			};
		}),
	);
}

export async function summarizeBrowserSession(
	session: BrowserSession,
	mode: SummaryMode,
	ctx: ExtensionCommandContext,
): Promise<BrowserSession> {
	await appendSummaryDebugLogForSession(session.path, session.id, "browser_summarize_invoked", { mode });
	const conversationText = await buildConversationTextFromSessionFile(session.path);
	await appendSummaryDebugLogForSession(session.path, session.id, "browser_conversation_extracted", {
		mode,
		conversationChars: conversationText.length,
	});

	if (!conversationText.trim()) {
		throw new Error("No conversation text found in selected session");
	}

	const summary = await createSummary(conversationText, undefined, mode, ctx, (message, details) =>
		appendSummaryDebugLogForSession(session.path, session.id, message, details),
	);
	if (!summary) throw new Error("The model returned an empty summary");

	const savedPath = await saveSummaryForSession(session.path, session.id, summary, mode);
	await appendSummaryDebugLogForSession(session.path, session.id, "browser_summary_saved", { savedPath, summaryChars: summary.length });

	const [savedSummary, metrics] = await Promise.all([
		loadLatestSummary(session.path, session.id),
		loadSessionMetrics(session.path),
	]);
	return {
		...session,
		latestSummary: savedSummary?.content,
		latestSummaryPath: savedSummary?.path,
		summarizedAt: summarizedAtFromPath(savedSummary?.path),
		parsedSummary: savedSummary ? parseSummary(savedSummary.content) : undefined,
		metrics,
	};
}

function shouldListAll(args: string): boolean {
	return args
		.split(/\s+/)
		.map((arg) => arg.trim().toLowerCase())
		.includes("all");
}

export function registerSessionBrowserCommand(pi: ExtensionAPI): void {
	pi.registerCommand("session-browser", {
		description: "Browse sessions with saved summary previews and resume the selected session",
		handler: async (args, ctx) => {
			try {
				await ctx.waitForIdle();

				ctx.ui.notify("Loading sessions...", "info");

				const listAll = shouldListAll(args);
				const sessionInfos = listAll ? await SessionManager.listAll() : await SessionManager.list(ctx.cwd);
				if (sessionInfos.length === 0) {
					ctx.ui.notify("No sessions found", "warning");
					return;
				}

				const sessions = (await withSummaries(
					sessionInfos,
					ctx.sessionManager.getSessionId(),
					ctx.sessionManager.getSessionFile(),
				)).sort(sortSessionsForBrowser);

				const selected = await ctx.ui.custom<SessionBrowserResult>(
					(tui, theme, _kb, done) =>
						new SessionBrowserComponent(tui, theme, sessions, done, {
							onSummarize: (session, mode) => summarizeBrowserSession(session, mode, ctx),
						}),
					{ overlay: true, overlayOptions: { anchor: "center", width: 84, maxHeight: "80%" } },
				);
				if (!selected) return;

				const result = await ctx.switchSession(selected.session.path, {
					withSession: async (newCtx) => {
						newCtx.ui.notify("Session restored", "success");

						const savedSummary = await loadLatestSummary(selected.session.path, selected.session.id);
						if (savedSummary) {
							await showSummaryUi("Latest Session Summary", savedSummary.content, newCtx);
						}
					},
				});

				if (result.cancelled) {
					ctx.ui.notify("Session switch cancelled", "warning");
				}
			} catch (error) {
				const message = error instanceof Error ? error.stack || error.message : String(error);
				ctx.ui.notify("Session browser failed", "error");
				await showSummaryUi("Session Browser Failed", `\`\`\`\n${message}\n\`\`\``, ctx);
			}
		},
	});
}
