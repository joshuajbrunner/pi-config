import { visibleWidth } from "@earendil-works/pi-tui";
import { describe, expect, it } from "vitest";
import { formatPath, formatScrollInfo, row, safeLine } from "./render-helpers";

const theme = {
	fg: (_color: string, text: string) => text,
} as any;

describe("render helpers", () => {
	it("renders rows at exactly the requested visible width", () => {
		expect(visibleWidth(row("hello", 20, theme))).toBe(20);
	});

	it("truncates long content", () => {
		const rendered = row("x".repeat(200), 20, theme);
		expect(visibleWidth(rendered)).toBe(20);
	});

	it("measures ANSI colored content correctly", () => {
		const rendered = row("\u001b[31mred\u001b[39m", 12, theme);
		expect(visibleWidth(rendered)).toBe(12);
	});

	it("normalizes newlines and tabs before rendering", () => {
		expect(safeLine("a\nb\tc", 20)).toBe("a b  c");
	});

	it("formats path and scroll info", () => {
		expect(formatPath(`${process.env.HOME}/file`)).toBe("~/file");
		expect(formatScrollInfo(1, 2)).toBe("↑ 1 more  ↓ 2 more");
	});
});
