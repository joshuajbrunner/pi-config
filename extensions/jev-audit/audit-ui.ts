import type { ExtensionContext } from "@earendil-works/pi-coding-agent";
import { DynamicBorder, getMarkdownTheme } from "@earendil-works/pi-coding-agent";
import { Container, Markdown, matchesKey, Text } from "@earendil-works/pi-tui";
import type { JevAuditRecord } from "./audit-store";

export async function showAuditUi(
	records: readonly JevAuditRecord[],
	ctx: ExtensionContext,
): Promise<void> {
	if (!ctx.hasUI) return;
	if (records.length === 0) {
		ctx.ui.notify("No Jev audit records for this session", "info");
		return;
	}

	await ctx.ui.custom((_tui, theme, _kb, done) => {
		const container = new Container();
		const border = new DynamicBorder((value: string) => theme.fg("accent", value));
		const markdownTheme = getMarkdownTheme();
		let index = records.length - 1;

		const renderRecord = (): void => {
			container.clear();
			const record = records[index];
			if (!record) return;
			const verdict = record.needsRewrite ? "rewrite recommended" : "readable";
			const content = [
				`**Record ${index + 1} of ${records.length}** · ${verdict}`,
				"",
				`- **Audited:** ${record.timestamp}`,
				`- **Too verbose:** ${record.tooVerbose.toFixed(3)}`,
				`- **Too jargony:** ${record.tooJargony.toFixed(3)}`,
				`- **Too mixed:** ${record.tooMixed.toFixed(3)}`,
				`- **Too unclear:** ${record.tooUnclear.toFixed(3)}`,
				`- **Model:** ${record.model}`,
				"",
				"---",
				"",
				record.response,
			].join("\n");

			container.addChild(border);
			container.addChild(new Text(theme.fg("accent", theme.bold("Jev Audit")), 1, 0));
			container.addChild(new Markdown(content, 1, 1, markdownTheme));
			container.addChild(
				new Text(
					theme.fg("dim", "↑/↓ older or newer · Enter/Esc close"),
					1,
					0,
				),
			);
			container.addChild(border);
		};

		renderRecord();
		return {
			render: (width: number) => container.render(width),
			invalidate: () => container.invalidate(),
			handleInput: (data: string) => {
				if (matchesKey(data, "escape") || matchesKey(data, "enter")) {
					done(undefined);
					return;
				}
				if (matchesKey(data, "up")) {
					index = Math.max(0, index - 1);
					renderRecord();
					_tui.requestRender();
					return;
				}
				if (matchesKey(data, "down")) {
					index = Math.min(records.length - 1, index + 1);
					renderRecord();
					_tui.requestRender();
				}
			},
		};
	});
}
