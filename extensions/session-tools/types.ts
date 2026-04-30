import type { SessionInfo } from "@mariozechner/pi-coding-agent";
import type { ParsedSummary } from "./summary-parse";

export type ContentBlock = {
	type?: string;
	text?: string;
	name?: string;
	arguments?: Record<string, unknown>;
};

export type SummaryMode = "short" | "full";

export type BrowserSession = SessionInfo & {
	latestSummary?: string;
	latestSummaryPath?: string;
	parsedSummary?: ParsedSummary;
};

export type SavedSummary = {
	path: string;
	content: string;
};

export type SummaryDebugLogger = (message: string, details?: unknown) => Promise<void>;
