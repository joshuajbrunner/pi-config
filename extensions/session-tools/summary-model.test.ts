import { describe, expect, it, vi } from "vitest";

const complete = vi.fn();
const getModel = vi.fn(() => ({ provider: "openai-codex", id: "gpt-5.5" }));

vi.mock("@mariozechner/pi-ai", () => ({ complete, getModel }));

const { createSummary } = await import("./summary-model");

describe("createSummary", () => {
	it("instructs the model to focus on recent work and current end state", async () => {
		complete.mockResolvedValue({
			provider: "openai-codex",
			model: "gpt-5.5",
			stopReason: "stop",
			errorMessage: undefined,
			usage: { totalTokens: 10 },
			content: [{ type: "text", text: "## Short Summary\nRecent work" }],
		});

		await createSummary("old topic\nrecent topic", undefined, "short", {
			modelRegistry: { getApiKeyAndHeaders: vi.fn(async () => ({ ok: true, apiKey: "key", headers: {} })) },
			ui: { notify: vi.fn() },
		} as any);

		const prompt = complete.mock.calls[0][1].messages[0].content[0].text;
		expect(prompt).toContain("Focus primarily on the most recent work and the current end state");
		expect(prompt).toContain("If the session changed topics, emphasize what we were doing last");
	});
});
