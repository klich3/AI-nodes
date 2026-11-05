import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";
import { resolve } from "node:path";

// Lib build: ESM + CJS con .d.ts generado por vue-tsc (script "build").
export default defineConfig({
	plugins: [vue()],
	build: {
		lib: {
			entry: resolve(import.meta.dirname, "src/index.ts"),
			formats: ["es", "cjs"],
			fileName: (format) => (format === "es" ? "index.js" : "index.cjs"),
		},
		rollupOptions: {
			external: ["vue", "@node-editor/core"],
		},
		sourcemap: true,
		minify: false,
	},
});
