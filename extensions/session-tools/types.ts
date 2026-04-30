import type { SessionInfo } from "@mariozechner/pi-coding-agent";

export type ContentBlock = {
	type?: string;
	text?: string;
	name?: string;
	arguments?: Record<string, unknown>;
};

export type BrowserSession = SessionInfo & {
	latestSummary?: string;
	latestSummaryPath?: string;
};

export type SavedSummary = {
	path: string;
	content: string;
};
