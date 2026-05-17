import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

function buildPrompt(args: string, sessionFile: string, sessionId: string): string {
  const userMessage = args.trim();

  return [
    userMessage || "Inspect the current pi session file.",
    "",
    "Current pi session metadata:",
    `- sessionFile: ${sessionFile}`,
    `- sessionId: ${sessionId}`,
    "",
    "The session file contents have NOT been included in context. If you need to inspect the session, read the file from sessionFile using the available file-reading tools.",
    "Do not read the full session file by default because it may be quite large. Instead, consider the user's question or prompt and choose an efficient way to audit the session file in order to respond.",
  ].join("\n");
}

export default function (pi: ExtensionAPI) {
  pi.registerCommand("get-session-file", {
    description: "Send a prompt augmented with the current session file path and session id",
    handler: async (args, ctx) => {
      const sessionFile = ctx.sessionManager.getSessionFile();
      const sessionId = ctx.sessionManager.getSessionId();

      if (!sessionFile) {
        ctx.ui.notify("This session does not have a session file yet.", "warning");
        return;
      }

      await ctx.waitForIdle();
      pi.sendUserMessage(buildPrompt(args, sessionFile, sessionId));
    },
  });
}
