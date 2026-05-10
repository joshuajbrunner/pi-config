import { beforeEach, describe, expect, it, vi } from "vitest";

const list = vi.fn();
const listAll = vi.fn();
const loadLatestSummary = vi.fn();
const saveSummaryForSession = vi.fn();
const appendSummaryDebugLogForSession = vi.fn();
const buildConversationTextFromSessionFile = vi.fn();
const createSummary = vi.fn();
const loadSessionMetrics = vi.fn();

vi.mock("@earendil-works/pi-coding-agent", () => ({
	SessionManager: { list, listAll },
}));

vi.mock("./summary-store", () => ({
	loadLatestSummary,
	saveSummaryForSession,
	appendSummaryDebugLogForSession,
}));

vi.mock("./conversation-extract", () => ({
	buildConversationTextFromSessionFile,
}));

vi.mock("./summary-model", () => ({
	createSummary,
}));

vi.mock("./session-metrics", () => ({
	loadSessionMetrics,
}));

vi.mock("./summary-ui", () => ({
	showSummaryUi: vi.fn(),
}));

const { registerSessionBrowserCommand, summarizeBrowserSession } = await import("./session-browser-command");

describe("session-browser command", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("opens the browser as a centered overlay", async () => {
		const selectedSession = {
			id: "s1",
			name: "Session",
			path: "/tmp/session.jsonl",
			created: new Date("2026-01-01T00:00:00Z"),
			modified: new Date("2026-01-02T00:00:00Z"),
			firstMessage: "hello",
			messageCount: 1,
		};
		list.mockResolvedValue([selectedSession]);
		loadLatestSummary.mockResolvedValue(undefined);

		let handler: ((args: string, ctx: any) => Promise<void>) | undefined;
		registerSessionBrowserCommand({ registerCommand: (_name: string, command: any) => { handler = command.handler; } } as any);

		const custom = vi.fn(async (_factory, _options) => ({ session: selectedSession }));
		const switchSession = vi.fn(async () => ({ cancelled: false }));
		await handler!("", {
			cwd: "/tmp",
			sessionManager: { getSessionId: () => "s1", getSessionFile: () => "/tmp/session.jsonl" },
			waitForIdle: vi.fn(),
			ui: { notify: vi.fn(), custom },
			switchSession,
		});

		expect(custom).toHaveBeenCalledWith(expect.any(Function), {
			overlay: true,
			overlayOptions: { anchor: "center", width: 84, maxHeight: "80%" },
		});
		expect(switchSession).toHaveBeenCalledWith("/tmp/session.jsonl", expect.any(Object));
	});

	it("does not switch sessions when browser is cancelled", async () => {
		list.mockResolvedValue([
			{ id: "s1", name: "Session", path: "/tmp/session.jsonl", created: new Date(), modified: new Date(), firstMessage: "hello", messageCount: 1 },
		]);
		loadLatestSummary.mockResolvedValue(undefined);
		let handler: ((args: string, ctx: any) => Promise<void>) | undefined;
		registerSessionBrowserCommand({ registerCommand: (_name: string, command: any) => { handler = command.handler; } } as any);
		const switchSession = vi.fn();

		await handler!("", {
			cwd: "/tmp",
			sessionManager: { getSessionId: () => "current", getSessionFile: () => "/tmp/current.jsonl" },
			waitForIdle: vi.fn(),
			ui: { notify: vi.fn(), custom: vi.fn(async () => undefined) },
			switchSession,
		});

		expect(switchSession).not.toHaveBeenCalled();
	});

	it("passes a summarize callback to the browser component", async () => {
		const session = { id: "s1", name: "Session", path: "/tmp/session.jsonl", created: new Date(), modified: new Date(), firstMessage: "hello", messageCount: 1 };
		list.mockResolvedValue([session]);
		loadLatestSummary.mockResolvedValue(undefined);
		let handler: ((args: string, ctx: any) => Promise<void>) | undefined;
		registerSessionBrowserCommand({ registerCommand: (_name: string, command: any) => { handler = command.handler; } } as any);

		const custom = vi.fn(async (factory) => {
			const component = factory({ requestRender: vi.fn() }, { fg: (_color: string, text: string) => text }, undefined, vi.fn());
			expect((component as any).options.onSummarize).toEqual(expect.any(Function));
			return undefined;
		});
		await handler!("", { cwd: "/tmp", sessionManager: { getSessionId: () => "current", getSessionFile: () => "/tmp/current.jsonl" }, waitForIdle: vi.fn(), ui: { notify: vi.fn(), custom }, switchSession: vi.fn() });
	});

	it("summarizes a selected session from its session file and returns updated metadata", async () => {
		const session = { id: "s1", name: "Session", path: "/tmp/session.jsonl", created: new Date(), modified: new Date(), firstMessage: "hello", messageCount: 1 };
		buildConversationTextFromSessionFile.mockResolvedValue("User: latest work");
		createSummary.mockResolvedValue("## Short Summary\nLatest work");
		saveSummaryForSession.mockResolvedValue("/tmp/s1/summary.md");
		loadLatestSummary.mockResolvedValue({ path: "/tmp/s1/summary.md", content: "## Short Summary\nLatest work" });
		loadSessionMetrics.mockResolvedValue({ messages: 2, userMessages: 1, assistantMessages: 1, turns: 1, filesTouched: 0 });

		const updated = await summarizeBrowserSession(session as any, "short", {
			modelRegistry: { getApiKeyAndHeaders: vi.fn() },
			ui: { notify: vi.fn() },
		} as any);

		expect(buildConversationTextFromSessionFile).toHaveBeenCalledWith("/tmp/session.jsonl");
		expect(saveSummaryForSession).toHaveBeenCalledWith("/tmp/session.jsonl", "s1", "## Short Summary\nLatest work", "short");
		expect(updated.parsedSummary?.short).toBe("Latest work");
		expect(updated.metrics?.messages).toBe(2);
	});

	it("rejects selected-session summarization when conversation is empty", async () => {
		buildConversationTextFromSessionFile.mockResolvedValue(" ");
		await expect(summarizeBrowserSession({ id: "s1", path: "/tmp/session.jsonl" } as any, "short", {} as any)).rejects.toThrow("No conversation text");
	});

	it("uses listAll when args include all", async () => {
		listAll.mockResolvedValue([]);
		let handler: ((args: string, ctx: any) => Promise<void>) | undefined;
		registerSessionBrowserCommand({ registerCommand: (_name: string, command: any) => { handler = command.handler; } } as any);

		await handler!("all", { cwd: "/tmp", sessionManager: { getSessionId: () => "current", getSessionFile: () => "/tmp/current.jsonl" }, waitForIdle: vi.fn(), ui: { notify: vi.fn(), custom: vi.fn() }, switchSession: vi.fn() });

		expect(listAll).toHaveBeenCalled();
		expect(list).not.toHaveBeenCalled();
	});
});
