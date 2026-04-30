import { visibleWidth } from "@mariozechner/pi-tui";
import { describe, expect, it } from "vitest";
import { SessionBrowserComponent, type SessionBrowserResult } from "./session-browser-component";
import type { BrowserSession } from "./types";

const theme = {
	fg: (_color: string, text: string) => text,
	bold: (text: string) => text,
} as any;

function session(overrides: Partial<BrowserSession>): BrowserSession {
	return {
		id: overrides.id ?? "id",
		name: overrides.name ?? "Session",
		path: overrides.path ?? "/tmp/session.jsonl",
		created: overrides.created ?? new Date("2026-01-01T00:00:00Z"),
		modified: overrides.modified ?? new Date("2026-01-01T00:00:00Z"),
		firstMessage: overrides.firstMessage ?? "first message",
		messageCount: overrides.messageCount ?? 1,
		latestSummary: overrides.latestSummary,
		latestSummaryPath: overrides.latestSummaryPath,
		parsedSummary: overrides.parsedSummary,
	} as BrowserSession;
}

function createComponent(sessions: BrowserSession[]) {
	let renders = 0;
	let result: SessionBrowserResult | "unset" = "unset";
	const component = new SessionBrowserComponent({ requestRender: () => renders++ } as any, theme, sessions, (value) => {
		result = value;
	});
	return { component, get renders() { return renders; }, get result() { return result; } };
}

function expectWidths(lines: string[], width: number) {
	for (const line of lines) expect(visibleWidth(line)).toBeLessThanOrEqual(width);
}

describe("SessionBrowserComponent", () => {
	it("renders a bounded overlay list", () => {
		const { component } = createComponent([
			session({ parsedSummary: { short: "A".repeat(200) }, latestSummary: "summary" }),
		]);
		const lines = component.render(50);
		expect(lines[0]).toContain("Session Browser");
		expectWidths(lines, 50);
	});

	it("moves selection and returns selected session", () => {
		const second = session({ id: "second", parsedSummary: { short: "Second" } });
		const harness = createComponent([session({ id: "first", parsedSummary: { short: "First" } }), second]);
		harness.component.handleInput("j");
		harness.component.handleInput("\r");
		expect(harness.result).toEqual({ session: second });
	});

	it("filters sessions", () => {
		const { component } = createComponent([
			session({ parsedSummary: { short: "alpha work" } }),
			session({ parsedSummary: { short: "beta work" } }),
		]);
		component.handleInput("b");
		const lines = component.render(84).join("\n");
		expect(lines).toContain("beta work");
		expect(lines).not.toContain("alpha work");
	});

	it("renders detail mode within width", () => {
		const { component } = createComponent([
			session({ parsedSummary: { short: "Short", full: "Full ".repeat(100) }, latestSummaryPath: "/tmp/summary.md" }),
		]);
		component.handleInput("d");
		const lines = component.render(60);
		expect(lines.join("\n")).toContain("Session Detail");
		expect(lines.join("\n")).toContain("Full Summary");
		expectWidths(lines, 60);
	});

	it("cancels on escape", () => {
		const harness = createComponent([session({})]);
		harness.component.handleInput("\u001b");
		expect(harness.result).toBeUndefined();
	});
});
