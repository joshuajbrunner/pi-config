export const SUMMARY_MODEL_CANDIDATES = [
	{ provider: "openai-codex", model: "gpt-5.5" },
	{ provider: "anthropic", model: "claude-sonnet-4-5" },
] as const;

export const SUMMARY_FILE_PREFIX = "summary-";
export const SUMMARY_FILE_EXTENSION = ".md";
export const EXTENSION_NAME = "session-tools";
