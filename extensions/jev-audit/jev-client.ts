export const DEFAULT_JEV_MODEL = "jev-latest";
export const DEFAULT_JEV_URL = "https://api.typesafe.ai/v1/systemone";

export interface JevAuditResult {
	tooVerbose: number;
	tooJargony: number;
	tooMixed: number;
	tooUnclear: number;
	tooMeta: number;
	needsRewrite: boolean;
}

export async function auditWithJev(
	response: string,
	signal?: AbortSignal,
): Promise<JevAuditResult> {
	const apiKey = process.env.TYPESAFE_API_KEY?.trim();
	if (!apiKey) throw new Error("TYPESAFE_API_KEY is not configured");

	const httpResponse = await fetch(DEFAULT_JEV_URL, {
		method: "POST",
		headers: {
		Authorization: `Bearer ${apiKey}`,
		"Content-Type": "application/json",
		},
		body: JSON.stringify({
			model: DEFAULT_JEV_MODEL,
			state: {
				response,
				reader: "a technically capable human who wants clear, comprehensible answers",
			},
			questions: {
				too_verbose: {
					type: "noul",
					instructions:
						"This response uses more words than its reader needs. Flag duplicated explanations, commentary about drafting or rewriting, defensive justification, and implementation detail disproportionate to the user's question. Judge necessary evidence, requested artifacts, and important caveats as useful, not verbose.",
				},
				too_jargony: {
					type: "noul",
					instructions:
						"This response uses unexplained jargon, acronyms, shorthand, labels, metaphors, or specialist language that makes the reader infer its meaning. Do not flag precise technical terms that the reader likely knows or that the response defines in context.",
				},
				too_mixed: {
					type: "noul",
					instructions:
						"This response mixes too many distinct concerns or complex decisions, forcing the reader to switch context before completing one coherent objective. Count necessary supporting details as part of the objective; flag only unrelated or independently difficult concerns.",
				},
				too_unclear: {
					type: "noul",
					instructions:
						"This response contains grammatical errors, malformed or incomplete sentences, ambiguous references, accidental word substitutions, or broken logical connections that force the reader to reconstruct the intended meaning. Do not flag prose merely because it is concise or technical.",
				},
				too_meta: {
					type: "noul",
					instructions:
						"This response discusses its own wording, drafting, rewriting, corrections, or response process instead of directly serving the reader. Do not flag process information the user explicitly requested or that materially affects the result.",
				},
			},
		}),
		signal,
	});

	if (!httpResponse.ok) {
		throw new Error(`Jev request failed (${httpResponse.status})`);
	}

	const payload: unknown = await httpResponse.json();
	const answers = readAnswers(payload);
	const tooVerbose = readNoul(answers.too_verbose, "too_verbose");
	const tooJargony = readNoul(answers.too_jargony, "too_jargony");
	const tooMixed = readNoul(answers.too_mixed, "too_mixed");
	const tooUnclear = readNoul(answers.too_unclear, "too_unclear");
	const tooMeta = readNoul(answers.too_meta, "too_meta");

	return {
		tooVerbose,
		tooJargony,
		tooMixed,
		tooUnclear,
		tooMeta,
		needsRewrite:
			tooVerbose >= 0.7 ||
			tooJargony >= 0.7 ||
			tooMixed >= 0.7 ||
			tooUnclear >= 0.6 ||
			tooMeta >= 0.6,
	};
}

function readAnswers(value: unknown): Record<string, unknown> {
	if (!value || typeof value !== "object" || Array.isArray(value)) {
		throw new Error("Jev response is missing answers");
	}
	const answers = (value as { answers?: unknown }).answers;
	if (!answers || typeof answers !== "object" || Array.isArray(answers)) {
		throw new Error("Jev response is missing answers");
	}
	return answers as Record<string, unknown>;
}

function readNoul(value: unknown, name: string): number {
	if (!value || typeof value !== "object" || Array.isArray(value)) {
		throw new Error(`Invalid Jev answer for ${name}`);
	}
	const noul = (value as { type?: unknown; noul?: unknown }).noul;
	if (
		(value as { type?: unknown }).type !== "noul" ||
		typeof noul !== "number" ||
		!Number.isFinite(noul) ||
		noul < 0 ||
		noul > 1
	) {
		throw new Error(`Invalid Jev answer for ${name}`);
	}
	return noul;
}
