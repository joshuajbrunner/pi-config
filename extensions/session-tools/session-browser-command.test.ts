import { beforeEach, describe, expect, it, vi } from "vitest";

const list = vi.fn();
const listAll = vi.fn();
const loadLatestSummary = vi.fn();

vi.mock("@mariozechner/pi-coding-agent", () => ({
	SessionManager: { list, listAll },
}));

vi.mock("./summary-store", () => ({
	loadLatestSummary,
}));

vi.mock("./summary-ui", () => ({
	showSummaryUi: vi.fn(),
}));

const { registerSessionBrowserCommand } = await import("./session-browser-command");

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
			waitForIdle: vi.fn(),
			ui: { notify: vi.fn(), custom: vi.fn(async () => undefined) },
			switchSession,
		});

		expect(switchSession).not.toHaveBeenCalled();
	});

	it("uses listAll when args include all", async () => {
		listAll.mockResolvedValue([]);
		let handler: ((args: string, ctx: any) => Promise<void>) | undefined;
		registerSessionBrowserCommand({ registerCommand: (_name: string, command: any) => { handler = command.handler; } } as any);

		await handler!("all", { cwd: "/tmp", waitForIdle: vi.fn(), ui: { notify: vi.fn(), custom: vi.fn() }, switchSession: vi.fn() });

		expect(listAll).toHaveBeenCalled();
		expect(list).not.toHaveBeenCalled();
	});
});
