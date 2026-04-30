import { matchesKey } from "@mariozechner/pi-tui";
import type { ExtensionCommandContext } from "@mariozechner/pi-coding-agent";
import path from "node:path";
import { stripFrontmatter } from "./summary-parse";
import type { BrowserSession } from "./types";

const VISIBLE_ROWS = 16;
const PREVIEW_ROWS = 20;

type PreviewMode = "short" | "full";

function truncate(value: string, width: number): string {
	if (width <= 1) return "";
	return value.length > width ? `${value.slice(0, Math.max(0, width - 1))}…` : value;
}

function wrapText(text: string, width: number, maxLines: number): string[] {
	const lines: string[] = [];
	for (const rawLine of text.split("\n")) {
		let line = rawLine.trimEnd();
		if (line.length === 0) {
			lines.push("");
			continue;
		}

		while (line.length > width) {
			lines.push(line.slice(0, width));
			line = line.slice(width);
			if (lines.length >= maxLines) return lines;
		}
		lines.push(line);
		if (lines.length >= maxLines) return lines;
	}
	return lines;
}

function sessionTitle(session: BrowserSession): string {
	return session.name || session.firstMessage || path.basename(session.path);
}

function formatDate(date: Date): string {
	return date.toLocaleString(undefined, {
		month: "short",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
	});
}

function renderBrowser(
	sessions: BrowserSession[],
	selected: number,
	previewScroll: number,
	previewMode: PreviewMode,
	width: number,
	theme: any,
): string[] {
	const leftWidth = Math.max(30, Math.min(58, Math.floor(width * 0.38)));
	const rightWidth = Math.max(30, width - leftWidth - 3);
	const selectedSession = sessions[selected];
	const top = Math.max(0, Math.min(selected - Math.floor(VISIBLE_ROWS / 2), Math.max(0, sessions.length - VISIBLE_ROWS)));
	const visible = sessions.slice(top, top + VISIBLE_ROWS);

	const parsed = selectedSession.parsedSummary;
	const previewSource = parsed
		? previewMode === "full" && parsed.full
			? `## Short Summary\n${parsed.short}\n\n## Full Summary\n${parsed.full}`
			: parsed.short
		: selectedSession.latestSummary
			? stripFrontmatter(selectedSession.latestSummary)
			: `No saved summary found.\n\nFirst message:\n${selectedSession.firstMessage || "(empty session)"}`;
	const preview = wrapText(previewSource, rightWidth, 500).slice(previewScroll, previewScroll + PREVIEW_ROWS);

	const lines: string[] = [];
	lines.push(theme.fg("accent", theme.bold("Session Browser")));
	lines.push(theme.fg("dim", truncate("j/k move | ctrl+u/d or fn+up/down scroll | t toggle | enter resume | esc cancel", width)));
	lines.push("");
	lines.push(`${theme.bold("Sessions").padEnd(leftWidth)} │ ${theme.bold(`Latest Summary (${previewMode})`)}`);
	lines.push(`${"─".repeat(leftWidth)} │ ${"─".repeat(rightWidth)}`);

	const rowCount = Math.max(VISIBLE_ROWS, preview.length);
	for (let row = 0; row < rowCount; row++) {
		const session = visible[row];
		let left = "";
		if (session) {
			const actualIndex = top + row;
			const marker = actualIndex === selected ? "›" : " ";
			const summaryMarker = session.latestSummary ? "✓" : " ";
			const labelSource = session.parsedSummary?.short || sessionTitle(session);
			const label = truncate(labelSource.replaceAll("\n", " "), leftWidth - 16);
			left = `${marker} ${summaryMarker} ${formatDate(session.modified)} ${label}`;
		}

		if (top > 0 && row === 0) left = "  … newer sessions above";
		if (top + VISIBLE_ROWS < sessions.length && row === VISIBLE_ROWS - 1) left = "  … older sessions below";

		lines.push(`${truncate(left, leftWidth).padEnd(leftWidth)} │ ${preview[row] ?? ""}`);
	}

	lines.push("");
	lines.push(theme.fg("dim", truncate(`Selected: ${selectedSession.path}`, width)));
	if (selectedSession.latestSummaryPath) {
		lines.push(theme.fg("dim", truncate(`Summary:  ${selectedSession.latestSummaryPath}`, width)));
	}
	return lines;
}

export async function chooseSession(
	sessions: BrowserSession[],
	ctx: ExtensionCommandContext,
): Promise<BrowserSession | undefined> {
	let selected = 0;
	let previewScroll = 0;
	let previewMode: PreviewMode = "short";
	let chosen: BrowserSession | undefined;

	await ctx.ui.custom((tui, theme, _kb, done) => ({
		render: (width: number) => renderBrowser(sessions, selected, previewScroll, previewMode, width, theme),
		invalidate: () => {},
		handleInput: (data: string) => {
			const oldSelected = selected;

			if (matchesKey(data, "up") || data === "k") selected = Math.max(0, selected - 1);
			if (matchesKey(data, "down") || data === "j") selected = Math.min(sessions.length - 1, selected + 1);
			if (matchesKey(data, "pageup") || data === "\u0015") previewScroll = Math.max(0, previewScroll - PREVIEW_ROWS);
			if (matchesKey(data, "pagedown") || data === "\u0004") previewScroll += PREVIEW_ROWS;
			if (data.toLowerCase() === "t") {
				previewMode = previewMode === "short" ? "full" : "short";
				previewScroll = 0;
			}

			if (selected !== oldSelected) previewScroll = 0;

			if (matchesKey(data, "enter")) {
				chosen = sessions[selected];
				done(undefined);
				return;
			}

			if (matchesKey(data, "escape")) {
				done(undefined);
				return;
			}

			tui.requestRender();
		},
	}));

	return chosen;
}
