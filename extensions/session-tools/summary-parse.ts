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
		.find((line) => line.length > 0 && !line.startsWith("#")) ?? "No summary available";
}

export function parseSummary(markdown: string): ParsedSummary {
	const body = stripFrontmatter(markdown);
	const shortMatch = body.match(/## Short Summary\s*\n+([\s\S]*?)(?=\n## |$)/i);
	const fullMatch = body.match(/## Full Summary\s*\n+([\s\S]*?)(?=\n## |$)/i);

	const short = shortMatch?.[1]?.trim().split("\n")[0]?.trim() || firstContentLine(body);
	const full = fullMatch?.[1]?.trim();

	return { short, full };
}
