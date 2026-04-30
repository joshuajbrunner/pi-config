import { describe, expect, it } from "vitest";
import { parseSummary, stripFrontmatter } from "./summary-parse";

describe("parseSummary", () => {
	it("parses short-only summaries", () => {
		expect(parseSummary("## Short Summary\nBuilt the browser")).toEqual({ short: "Built the browser", full: undefined });
	});

	it("parses short and full summaries", () => {
		const parsed = parseSummary("## Short Summary\nBuilt the browser\n\n## Full Summary\n- Added overlay\n- Added tests");
		expect(parsed.short).toBe("Built the browser");
		expect(parsed.full).toBe("- Added overlay\n- Added tests");
	});

	it("strips YAML frontmatter", () => {
		expect(stripFrontmatter("---\nmode: full\n---\n\nBody")).toBe("Body");
	});

	it("falls back to the first content line", () => {
		expect(parseSummary("# Session Summary\n\nBuilt session tools").short).toBe("Built session tools");
	});

	it("handles lowercase inline headings", () => {
		expect(parseSummary("short summary: fixed width bugs").short).toBe("fixed width bugs");
	});
});
