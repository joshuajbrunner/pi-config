import type { Theme } from "@mariozechner/pi-coding-agent";
import type { Component, TUI } from "@mariozechner/pi-tui";
import { matchesKey, truncateToWidth, wrapTextWithAnsi } from "@mariozechner/pi-tui";
import path from "node:path";
import { stripFrontmatter } from "./summary-parse";
import type { BrowserSession, SummaryMode } from "./types";
import { formatPath, formatScrollInfo, pad, renderFooter, renderHeader, row } from "./render-helpers";

export type SessionBrowserResult = { session: BrowserSession } | undefined;

export type SessionBrowserOptions = {
	onSummarize?: (session: BrowserSession, mode: SummaryMode) => Promise<BrowserSession>;
};

type BrowserScreen = "list" | "detail";

const MAX_WIDTH = 84;
const LIST_VIEWPORT_HEIGHT = 10;
const DETAIL_VIEWPORT_HEIGHT = 14;

function sessionTitle(session: BrowserSession): string {
	return session.parsedSummary?.short || session.name || session.firstMessage || path.basename(session.path);
}

function searchableText(session: BrowserSession): string {
	return [
		session.name,
		session.firstMessage,
		session.path,
		session.latestSummaryPath,
		session.parsedSummary?.short,
		session.parsedSummary?.full,
	]
		.filter(Boolean)
		.join("\n")
		.toLowerCase();
}

function formatDate(date: Date): string {
	return date.toLocaleString(undefined, { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function previewText(session: BrowserSession): string {
	if (session.parsedSummary?.short) return session.parsedSummary.short;
	if (session.latestSummary) return stripFrontmatter(session.latestSummary).split("\n").find((line) => line.trim())?.trim() ?? "No summary available";
	return session.firstMessage ? `No saved summary. First message: ${session.firstMessage}` : "No saved summary found.";
}

function formatDuration(start: Date, end: Date): string {
	const ms = Math.max(0, end.getTime() - start.getTime());
	const minutes = Math.floor(ms / 60000);
	if (minutes < 1) return "<1m";
	const hours = Math.floor(minutes / 60);
	const remainingMinutes = minutes % 60;
	return hours > 0 ? `${hours}h ${remainingMinutes}m` : `${minutes}m`;
}

function summaryStatus(session: BrowserSession): string {
	if (session.parsedSummary?.full) return "full";
	if (session.parsedSummary?.short || session.latestSummary) return "short";
	return "none";
}

function metricsText(session: BrowserSession): string[] {
	const metrics = session.metrics;
	return [
		"Metrics",
		metrics ? `Turns: ${metrics.turns}` : `Turns: ${session.messageCount ?? "unknown"}`,
		metrics ? `Messages: ${metrics.messages} total, ${metrics.userMessages} user, ${metrics.assistantMessages} assistant` : `Messages: ${session.messageCount ?? "unknown"}`,
		`Summary: ${summaryStatus(session)}`,
		`Duration: ${formatDuration(session.created, session.modified)}`,
		`Files touched: ${metrics?.filesTouched ?? "unknown"}`,
		`Last activity: ${session.modified.toLocaleString()}`,
	];
}

function fullDetailText(session: BrowserSession): string {
	const parts: string[] = [];
	parts.push("Short Summary");
	parts.push(session.parsedSummary?.short || "No short summary saved.");
	parts.push("");
	parts.push("Full Summary");
	parts.push(session.parsedSummary?.full || "No full summary saved for this session.");
	parts.push("");
	parts.push("First Message");
	parts.push(session.firstMessage || "No first message recorded.");
	parts.push("");
	parts.push(...metricsText(session));
	parts.push("");
	parts.push("Metadata");
	parts.push(`Modified: ${session.modified.toLocaleString()}`);
	parts.push(`Session: ${formatPath(session.path)}`);
	if (session.latestSummaryPath) parts.push(`Summary: ${formatPath(session.latestSummaryPath)}`);
	return parts.join("\n");
}

function filteredSessions(sessions: BrowserSession[], query: string): BrowserSession[] {
	const q = query.trim().toLowerCase();
	if (!q) return sessions;
	return sessions.filter((session) => searchableText(session).includes(q));
}

export class SessionBrowserComponent implements Component {
	private screen: BrowserScreen = "list";
	private cursor = 0;
	private scrollOffset = 0;
	private detailScrollOffset = 0;
	private filterQuery = "";
	private width = MAX_WIDTH;
	private busy = false;
	private statusMessage: { type: "info" | "success" | "error"; text: string } | undefined;
	private sessions: BrowserSession[];

	constructor(
		private readonly tui: TUI,
		private readonly theme: Theme,
		sessions: BrowserSession[],
		private readonly done: (result: SessionBrowserResult) => void,
		private readonly options: SessionBrowserOptions = {},
	) {
		this.sessions = [...sessions];
	}

	private visibleSessions(): BrowserSession[] {
		return filteredSessions(this.sessions, this.filterQuery);
	}

	private clamp(): BrowserSession[] {
		const visible = this.visibleSessions();
		if (visible.length === 0) {
			this.cursor = 0;
			this.scrollOffset = 0;
			return visible;
		}
		this.cursor = Math.max(0, Math.min(this.cursor, visible.length - 1));
		const maxOffset = Math.max(0, visible.length - LIST_VIEWPORT_HEIGHT);
		this.scrollOffset = Math.max(0, Math.min(this.scrollOffset, maxOffset));
		if (this.cursor < this.scrollOffset) this.scrollOffset = this.cursor;
		if (this.cursor >= this.scrollOffset + LIST_VIEWPORT_HEIGHT) this.scrollOffset = this.cursor - LIST_VIEWPORT_HEIGHT + 1;
		return visible;
	}

	render(width: number): string[] {
		this.width = Math.min(MAX_WIDTH, Math.max(40, width));
		return this.screen === "detail" ? this.renderDetail() : this.renderList();
	}

	private renderList(): string[] {
		const theme = this.theme;
		const width = this.width;
		const lines: string[] = [];
		const visible = this.clamp();
		const title = ` Session Browser [${visible.length}/${this.sessions.length}] `;
		lines.push(renderHeader(title, width, theme));
		lines.push(row("", width, theme));

		const cursor = theme.fg("accent", "│");
		const placeholder = theme.fg("dim", "type to filter...");
		const query = this.filterQuery ? `${this.filterQuery}${cursor}` : `${cursor}${placeholder}`;
		lines.push(row(` Search: ${query}`, width, theme));
		lines.push(row("", width, theme));

		if (visible.length === 0) {
			lines.push(row(` ${theme.fg("dim", "No matching sessions")}`, width, theme));
			for (let i = 1; i < LIST_VIEWPORT_HEIGHT; i++) lines.push(row("", width, theme));
		} else {
			const slice = visible.slice(this.scrollOffset, this.scrollOffset + LIST_VIEWPORT_HEIGHT);
			const innerWidth = width - 2;
			for (let i = 0; i < slice.length; i++) {
				const session = slice[i]!;
				const index = this.scrollOffset + i;
				const selected = index === this.cursor;
				const marker = selected ? theme.fg("accent", ">") : " ";
				const summaryMark = session.latestSummary ? theme.fg("success", "✓") : " ";
				const date = theme.fg("dim", formatDate(session.modified));
				const titleWidth = Math.max(0, innerWidth - 18);
				const title = selected ? theme.fg("accent", sessionTitle(session)) : sessionTitle(session);
				lines.push(row(` ${marker} ${summaryMark} ${date} ${truncateToWidth(title.replace(/[\r\n]+/g, " "), titleWidth)}`, width, theme));
			}
			for (let i = slice.length; i < LIST_VIEWPORT_HEIGHT; i++) lines.push(row("", width, theme));
		}

		lines.push(row("", width, theme));
		const selected = visible[this.cursor];
		const fallbackInfo = selected ? previewText(selected) : formatScrollInfo(this.scrollOffset, Math.max(0, visible.length - (this.scrollOffset + LIST_VIEWPORT_HEIGHT)));
		const statusColor = this.statusMessage?.type === "error" ? "error" : this.statusMessage?.type === "success" ? "success" : "dim";
		const info = this.statusMessage?.text || fallbackInfo;
		lines.push(row(` ${theme.fg(statusColor, truncateToWidth(info.replace(/[\r\n]+/g, " "), width - 4))}`, width, theme));
		lines.push(row("", width, theme));
		lines.push(renderFooter(" [enter] resume  [d] detail  [s] summarize  [S] full  [esc] close ", width, theme));
		return lines;
	}

	private renderDetail(): string[] {
		const visible = this.clamp();
		const session = visible[this.cursor];
		const width = this.width;
		const theme = this.theme;
		if (!session) return this.renderList();
		const lines: string[] = [renderHeader(" Session Detail ", width, theme), row("", width, theme)];
		const wrapped = wrapTextWithAnsi(fullDetailText(session), width - 4);
		const maxOffset = Math.max(0, wrapped.length - DETAIL_VIEWPORT_HEIGHT);
		this.detailScrollOffset = Math.max(0, Math.min(this.detailScrollOffset, maxOffset));
		const slice = wrapped.slice(this.detailScrollOffset, this.detailScrollOffset + DETAIL_VIEWPORT_HEIGHT);
		for (const line of slice) lines.push(row(` ${line}`, width, theme));
		for (let i = slice.length; i < DETAIL_VIEWPORT_HEIGHT; i++) lines.push(row("", width, theme));
		lines.push(row("", width, theme));
		const scrollInfo = formatScrollInfo(this.detailScrollOffset, maxOffset - this.detailScrollOffset);
		const statusColor = this.statusMessage?.type === "error" ? "error" : this.statusMessage?.type === "success" ? "success" : "dim";
		lines.push(row(` ${theme.fg(statusColor, this.statusMessage?.text || scrollInfo)}`, width, theme));
		lines.push(renderFooter(" [enter] resume  [s] summarize  [S] full  [b] back  [esc] close ", width, theme));
		return lines;
	}

	private async summarizeSelected(mode: SummaryMode): Promise<void> {
		if (!this.options.onSummarize || this.busy) return;
		const visible = this.clamp();
		const session = visible[this.cursor];
		if (!session) return;

		this.busy = true;
		this.statusMessage = { type: "info", text: mode === "full" ? "Creating full summary..." : "Creating short summary..." };
		this.tui.requestRender();

		try {
			const updated = await this.options.onSummarize(session, mode);
			const index = this.sessions.findIndex((candidate) => candidate.id === updated.id && candidate.path === updated.path);
			if (index >= 0) this.sessions[index] = updated;
			this.statusMessage = { type: "success", text: mode === "full" ? "Full summary saved" : "Summary saved" };
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			this.statusMessage = { type: "error", text: `Summary failed: ${message}` };
		} finally {
			this.busy = false;
			this.tui.requestRender();
		}
	}

	handleInput(data: string): void {
		const visible = this.clamp();
		if (this.busy) return;
		if (matchesKey(data, "escape") || matchesKey(data, "ctrl+c")) {
			this.done(undefined);
			return;
		}
		if (matchesKey(data, "return")) {
			const session = visible[this.cursor];
			this.done(session ? { session } : undefined);
			return;
		}
		if (data === "s" || data === "S") {
			void this.summarizeSelected(data === "S" ? "full" : "short");
			return;
		}

		if (this.screen === "detail") {
			if (data === "b" || matchesKey(data, "left")) {
				this.screen = "list";
			} else if (matchesKey(data, "up") || data === "k" || matchesKey(data, "pageUp") || data === "\u0015") {
				this.detailScrollOffset = Math.max(0, this.detailScrollOffset - (matchesKey(data, "up") || data === "k" ? 1 : DETAIL_VIEWPORT_HEIGHT));
			} else if (matchesKey(data, "down") || data === "j" || matchesKey(data, "pageDown") || data === "\u0004") {
				this.detailScrollOffset += matchesKey(data, "down") || data === "j" ? 1 : DETAIL_VIEWPORT_HEIGHT;
			}
			this.tui.requestRender();
			return;
		}

		if (matchesKey(data, "up") || data === "k") this.cursor = Math.max(0, this.cursor - 1);
		else if (matchesKey(data, "down") || data === "j") this.cursor = Math.min(Math.max(0, visible.length - 1), this.cursor + 1);
		else if (matchesKey(data, "pageUp") || data === "\u0015") this.cursor = Math.max(0, this.cursor - LIST_VIEWPORT_HEIGHT);
		else if (matchesKey(data, "pageDown") || data === "\u0004") this.cursor = Math.min(Math.max(0, visible.length - 1), this.cursor + LIST_VIEWPORT_HEIGHT);
		else if (data === "d" || matchesKey(data, "right")) {
			this.screen = "detail";
			this.detailScrollOffset = 0;
		} else if (matchesKey(data, "backspace")) {
			this.filterQuery = this.filterQuery.slice(0, -1);
			this.cursor = 0;
			this.scrollOffset = 0;
		} else if (data.length === 1 && data.charCodeAt(0) >= 32 && data !== "d") {
			this.filterQuery += data;
			this.cursor = 0;
			this.scrollOffset = 0;
		}
		this.clamp();
		this.tui.requestRender();
	}

	invalidate(): void {}
	dispose(): void {}
}
