import type { SessionInfo } from "@earendil-works/pi-coding-agent";
import type { ParsedSummary } from "./summary-parse";
import type { SessionMetrics } from "./session-metrics";

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
	summarizedAt?: Date;
	parsedSummary?: ParsedSummary;
	metrics?: SessionMetrics;
	isCurrent?: boolean;
};

export type SavedSummary = {
	path: string;
	content: string;
};

export type SummaryDebugLogger = (message: string, details?: unknown) => Promise<void>;
