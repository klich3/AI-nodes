import { defineConfig } from "tsup";

export default defineConfig({
	entry: {
		index: "src/index.ts",
		"config/export": "src/config/export.ts",
	},
	format: ["esm", "cjs"],
	dts: true,
	sourcemap: true,
	clean: true,
	treeshake: true,
	injectStyle: false,
	esbuildOptions(options) {
		options.external = ["three"];
	},
});
