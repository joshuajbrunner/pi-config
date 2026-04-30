import type { Theme } from "@mariozechner/pi-coding-agent";
import { truncateToWidth, visibleWidth } from "@mariozechner/pi-tui";

export function pad(text: string, width: number): string {
	const visible = visibleWidth(text);
	return text + " ".repeat(Math.max(0, width - visible));
}

export function safeLine(content: string, width: number): string {
	const singleLine = content.replace(/[\r\n]+/g, " ").replace(/\t/g, "  ");
	return truncateToWidth(singleLine, Math.max(0, width));
}

export function row(content: string, width: number, theme: Theme): string {
	const innerWidth = Math.max(0, width - 2);
	const clipped = safeLine(content, innerWidth);
	return theme.fg("border", "│") + pad(clipped, innerWidth) + theme.fg("border", "│");
}

export function renderHeader(title: string, width: number, theme: Theme): string {
	const innerWidth = Math.max(0, width - 2);
	const text = safeLine(title, innerWidth);
	const padding = Math.max(0, innerWidth - visibleWidth(text));
	const left = Math.floor(padding / 2);
	const right = padding - left;
	return theme.fg("border", "╭" + "─".repeat(left)) + theme.fg("accent", text) + theme.fg("border", "─".repeat(right) + "╮");
}

export function renderFooter(text: string, width: number, theme: Theme): string {
	const innerWidth = Math.max(0, width - 2);
	const clipped = safeLine(text, innerWidth);
	const padding = Math.max(0, innerWidth - visibleWidth(clipped));
	const left = Math.floor(padding / 2);
	const right = padding - left;
	return theme.fg("border", "╰" + "─".repeat(left)) + theme.fg("dim", clipped) + theme.fg("border", "─".repeat(right) + "╯");
}

export function formatPath(filePath: string): string {
	const home = process.env.HOME;
	return home && filePath.startsWith(home) ? `~${filePath.slice(home.length)}` : filePath;
}

export function formatScrollInfo(above: number, below: number): string {
	const parts: string[] = [];
	if (above > 0) parts.push(`↑ ${above} more`);
	if (below > 0) parts.push(`↓ ${below} more`);
	return parts.join("  ");
}
