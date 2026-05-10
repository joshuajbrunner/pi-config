import { visibleWidth } from "@earendil-works/pi-tui";
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
		metrics: overrides.metrics,
		latestSummary: overrides.latestSummary,
		latestSummaryPath: overrides.latestSummaryPath,
		parsedSummary: overrides.parsedSummary,
		isCurrent: overrides.isCurrent,
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
		component.handleInput("/");
		component.handleInput("b");
		const lines = component.render(84).join("\n");
		expect(lines).toContain("beta work");
		expect(lines).not.toContain("alpha work");
	});

	it("renders detail mode within width", () => {
		const { component } = createComponent([
			session({
				firstMessage: "Initial user request",
				created: new Date("2026-01-01T00:00:00Z"),
				modified: new Date("2026-01-01T01:30:00Z"),
				parsedSummary: { short: "Short", full: "Full summary" },
				latestSummaryPath: "/tmp/summary.md",
				metrics: { messages: 5, userMessages: 2, assistantMessages: 3, turns: 2, filesTouched: 4 },
			}),
		]);
		component.handleInput("d");
		const lines = component.render(60);
		expect(lines.join("\n")).toContain("Session Detail");
		expect(lines.join("\n")).toContain("Full Summary");
		expect(lines.join("\n")).toContain("First Message");
		expect(lines.join("\n")).toContain("Initial user request");
		expect(lines.join("\n")).toContain("Metrics");
		expect(lines.join("\n")).toContain("Turns: 2");
		expect(lines.join("\n")).toContain("Messages: 5 total, 2 user, 3 assistant");
		expect(lines.join("\n")).toContain("Status: inactive");
		expect(lines.join("\n")).toContain("Summary: full");
		component.handleInput("\u0004");
		const scrolledLines = component.render(60);
		expect(scrolledLines.join("\n")).toContain("Files touched: 4");
		expectWidths(lines, 60);
		expectWidths(scrolledLines, 60);
	});

	it("marks current sessions in list and detail", () => {
		const { component } = createComponent([
			session({ isCurrent: true, parsedSummary: { short: "Current session" }, metrics: { messages: 1, userMessages: 1, assistantMessages: 0, turns: 1, filesTouched: 0 } }),
		]);
		expect(component.render(84).join("\n")).toContain("●");
		component.handleInput("d");
		expect(component.render(84).join("\n")).toContain("Status: current session");
	});

	it("does not repeat short-only summaries under full summary", () => {
		const { component } = createComponent([
			session({ latestSummary: "## Short Summary\nOnly short", parsedSummary: { short: "Only short" } }),
		]);
		component.handleInput("d");
		const text = component.render(84).join("\n");
		expect(text).toContain("No full summary saved for this session.");
	});

	it("summarizes the selected session with short and updates the row", async () => {
		const updated = session({ id: "first", parsedSummary: { short: "Updated short" }, latestSummary: "summary" });
		let mode: string | undefined;
		const component = new SessionBrowserComponent({ requestRender: () => {} } as any, theme, [session({ id: "first", parsedSummary: { short: "Old" } })], () => {}, {
			onSummarize: async (_session, requestedMode) => {
				mode = requestedMode;
				return updated;
			},
		});

		component.handleInput("s");
		await Promise.resolve();
		await Promise.resolve();

		expect(mode).toBe("short");
		expect(component.render(84).join("\n")).toContain("Updated short");
	});

	it("summarizes the selected session with full on uppercase S", async () => {
		let mode: string | undefined;
		const component = new SessionBrowserComponent({ requestRender: () => {} } as any, theme, [session({})], () => {}, {
			onSummarize: async (selected, requestedMode) => {
				mode = requestedMode;
				return selected;
			},
		});

		component.handleInput("S");
		await Promise.resolve();
		await Promise.resolve();

		expect(mode).toBe("full");
	});

	it("shows summarize errors without closing", async () => {
		let result: SessionBrowserResult | "unset" = "unset";
		const component = new SessionBrowserComponent({ requestRender: () => {} } as any, theme, [session({})], (value) => { result = value; }, {
			onSummarize: async () => { throw new Error("boom"); },
		});

		component.handleInput("s");
		await Promise.resolve();
		await Promise.resolve();

		expect(result).toBe("unset");
		expect(component.render(84).join("\n")).toContain("Summary failed: boom");
	});

	it("cancels on escape", () => {
		const harness = createComponent([session({})]);
		harness.component.handleInput("\u001b");
		expect(harness.result).toBeUndefined();
	});
});
