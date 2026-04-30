import { describe, expect, it } from "vitest";
import { parseSummarizeArgs } from "./summarize-args";

describe("parseSummarizeArgs", () => {
	it("defaults to short mode", () => {
		expect(parseSummarizeArgs("")).toEqual({ mode: "short" });
	});

	it("supports full mode", () => {
		expect(parseSummarizeArgs("full")).toEqual({ mode: "full" });
	});

	it("supports full mode with custom instruction", () => {
		expect(parseSummarizeArgs("full focus on files")).toEqual({ mode: "full", customInstruction: "focus on files" });
	});

	it("treats non-full args as short custom instruction", () => {
		expect(parseSummarizeArgs("focus on files")).toEqual({ mode: "short", customInstruction: "focus on files" });
	});
});
