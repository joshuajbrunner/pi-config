import os from "node:os";
import path from "node:path";
import { defineConfig } from "vitest/config";

const nodeRoot = path.join(os.homedir(), ".nvm/versions/node/v24.13.0/lib/node_modules");
const piRoot = path.join(nodeRoot, "@mariozechner/pi-coding-agent");
const piNodeModules = path.join(piRoot, "node_modules");

export default defineConfig({
	test: {
		include: ["extensions/session-tools/**/*.test.ts"],
	},
	resolve: {
		alias: {
			"@mariozechner/pi-tui": path.join(piNodeModules, "@mariozechner/pi-tui/dist/index.js"),
			"@mariozechner/pi-coding-agent": path.join(piRoot, "dist/index.js"),
			"@mariozechner/pi-ai": path.join(piNodeModules, "@mariozechner/pi-ai/dist/index.js"),
		},
	},
});
