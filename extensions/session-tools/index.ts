import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { registerSessionBrowserCommand } from "./session-browser-command";
import { registerSummarizeCommand } from "./summarize-command";

export default function sessionTools(pi: ExtensionAPI): void {
	registerSummarizeCommand(pi);
	registerSessionBrowserCommand(pi);
}
