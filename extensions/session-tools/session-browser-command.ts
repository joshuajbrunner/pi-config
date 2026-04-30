import { SessionManager, type ExtensionAPI, type SessionInfo } from "@mariozechner/pi-coding-agent";
import { parseSummary } from "./summary-parse";
import { loadLatestSummary } from "./summary-store";
import { showSummaryUi } from "./summary-ui";
import { SessionBrowserComponent, type SessionBrowserResult } from "./session-browser-component";
import type { BrowserSession } from "./types";

async function withSummaries(sessions: SessionInfo[]): Promise<BrowserSession[]> {
	return Promise.all(
		sessions.map(async (session) => {
			const savedSummary = await loadLatestSummary(session.path, session.id);
			return {
				...session,
				latestSummary: savedSummary?.content,
				latestSummaryPath: savedSummary?.path,
				parsedSummary: savedSummary ? parseSummary(savedSummary.content) : undefined,
			};
		}),
	);
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

				const sessions = (await withSummaries(sessionInfos)).sort(
					(a, b) => b.modified.getTime() - a.modified.getTime(),
				);

				const selected = await ctx.ui.custom<SessionBrowserResult>(
					(tui, theme, _kb, done) => new SessionBrowserComponent(tui, theme, sessions, done),
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
