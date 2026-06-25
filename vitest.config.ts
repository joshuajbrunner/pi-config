import path from "node:path";
import { defineConfig } from "vitest/config";

const nodeRoot = path.resolve(process.execPath, "../../lib/node_modules");
const piRoot = path.join(nodeRoot, "@earendil-works/pi-coding-agent");
const piNodeModules = path.join(piRoot, "node_modules");

export default defineConfig({
	test: {
		include: ["extensions/session-tools/**/*.test.ts", "extensions/pi-cc-patch/**/*.test.ts"],
		coverage: {
			reporter: ["text"],
		},
	},
	resolve: {
		alias: {
			"@earendil-works/pi-tui": path.join(piNodeModules, "@earendil-works/pi-tui/dist/index.js"),
			"@earendil-works/pi-coding-agent": path.join(piRoot, "dist/index.js"),
			"@earendil-works/pi-ai": path.join(piNodeModules, "@earendil-works/pi-ai/dist/index.js"),
		},
	},
});
