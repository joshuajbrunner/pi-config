import type { AgentMessage } from "@earendil-works/pi-agent-core";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { appendAuditRecord, currentAuditPath, loadAuditRecords, type JevAuditRecord } from "./audit-store";
import { auditWithJev, DEFAULT_JEV_MODEL } from "./jev-client";
import { showAuditUi } from "./audit-ui";

const REWRITE_ENABLED = true;

export default function jevAudit(pi: ExtensionAPI): void {
	let enabled = false;
	let latestAssistant: AgentMessage | undefined;
	let auditInFlight = false;
	let rewriteAttempted = false;

	pi.registerCommand("jev-audit", {
		description: "Audit agent responses with Jev (on|off|view|status)",
		handler: async (args, ctx) => {
			const action = args.trim().toLowerCase() || "view";
			if (action === "on") {
				enabled = true;
				ctx.ui.notify("Jev auditing enabled for this session", "success");
				return;
			}
			if (action === "off") {
				enabled = false;
				ctx.ui.notify("Jev auditing disabled", "info");
				return;
			}
			if (action === "status") {
				ctx.ui.notify(`Jev auditing: ${enabled ? "on" : "off"}`, "info");
				return;
			}
			if (action !== "view") {
				ctx.ui.notify("Usage: /jev-audit [on|off|view|status]", "warning");
				return;
			}

			const filePath = currentAuditPath(ctx);
			if (!filePath) {
				ctx.ui.notify("This session is not persisted; there is no audit file", "warning");
				return;
			}
			await showAuditUi(await loadAuditRecords(filePath), ctx);
		},
	});

	pi.on("session_start", () => {
		enabled = false;
		latestAssistant = undefined;
		auditInFlight = false;
		rewriteAttempted = false;
	});

	pi.on("agent_start", () => {
		latestAssistant = undefined;
	});

	pi.on("input", (event) => {
		if (event.source !== "extension") rewriteAttempted = false;
	});

	pi.on("message_end", (event) => {
		if (event.message.role !== "assistant") return;
		const hasToolCall = event.message.content.some((block) => block.type === "toolCall");
		if (!hasToolCall) latestAssistant = event.message;
	});

	pi.on("agent_settled", async (_event, ctx) => {
		if (!enabled || !latestAssistant || auditInFlight) return;
		const response = latestAssistant.content
			.filter((block) => block.type === "text")
			.map((block) => block.text)
			.join("\n")
			.trim();
		if (!response) return;

		const filePath = currentAuditPath(ctx);
		if (!filePath) {
			ctx.ui.notify("Jev audit skipped: this session is not persisted", "warning");
			return;
		}

		auditInFlight = true;
		try {
			const result = await auditWithJev(response, ctx.signal);
			const record: JevAuditRecord = {
				id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
				timestamp: new Date().toISOString(),
				model: DEFAULT_JEV_MODEL,
				response,
				...result,
			};
			await appendAuditRecord(filePath, record);
			ctx.ui.notify(
				`Jev audit saved (${result.needsRewrite ? "rewrite recommended" : "readable"})`,
				"info",
			);

			if (REWRITE_ENABLED && result.needsRewrite && !rewriteAttempted) {
				rewriteAttempted = true;
				queueRewrite(pi);
			}
		} catch {
			ctx.ui.notify("Jev audit failed", "warning");
		} finally {
			auditInFlight = false;
		}
	});
}

function queueRewrite(pi: ExtensionAPI): void {
	pi.sendUserMessage(
		"Rewrite your immediately preceding response for a human reader. Preserve all factual content and important caveats, define unavoidable technical terms, remove unnecessary jargon, and be concise. Keep the primary objective first, separate necessary secondary concerns under clear headings, recommend one path before alternatives, and defer optional decisions. Return only the rewritten response.",
		{ deliverAs: "followUp" },
	);
}
