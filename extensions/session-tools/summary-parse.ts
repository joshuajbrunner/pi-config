export type ParsedSummary = {
	short: string;
	full?: string;
};

export function stripFrontmatter(markdown: string): string {
	if (!markdown.startsWith("---\n")) return markdown.trim();
	const end = markdown.indexOf("\n---\n", 4);
	return end === -1 ? markdown.trim() : markdown.slice(end + 5).trim();
}

function firstContentLine(markdown: string): string {
	return markdown
		.split("\n")
		.map((line) => line.trim())
		.find((line) => line.length > 0 && !line.startsWith("#") && !/^short summary\s*:?$/i.test(line) && !/^full summary\s*:?$/i.test(line)) ?? "No summary available";
}

function section(markdown: string, heading: string): string | undefined {
	const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	const pattern = new RegExp(`(?:^|\\n)(?:#{1,6}\\s*)?${escaped}\\s*:?\\s*\\n+([\\s\\S]*?)(?=\\n(?:#{1,6}\\s*)?(?:Short Summary|Full Summary)\\s*:?\\s*(?:\\n|$)|$)`, "i");
	return markdown.match(pattern)?.[1]?.trim();
}

export function parseSummary(markdown: string): ParsedSummary {
	const body = stripFrontmatter(markdown);
	const inlineShort = body.match(/(?:^|\n)short summary\s*:\s*(.+)/i)?.[1]?.trim();
	const shortSection = section(body, "Short Summary");
	const full = section(body, "Full Summary");
	const short = inlineShort || shortSection?.split("\n").find((line) => line.trim())?.trim() || firstContentLine(body);

	return { short, full };
}
