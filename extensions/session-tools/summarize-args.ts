import type { SummaryMode } from "./types";

export function parseSummarizeArgs(args: string): { mode: SummaryMode; customInstruction?: string } {
	const trimmed = args.trim();
	if (!trimmed) return { mode: "short" };

	const [first, ...rest] = trimmed.split(/\s+/);
	if (first?.toLowerCase() === "full") {
		return { mode: "full", customInstruction: rest.join(" ").trim() || undefined };
	}

	return { mode: "short", customInstruction: trimmed };
}
