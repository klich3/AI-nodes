import { defineNuxtModule, addComponent, addImports, createResolver } from "@nuxt/kit";

// Módulo Nuxt 3: registra <NodeEditor> (auto-importado y envuelto en ClientOnly por
// el SSR-only de Three.js) y el composable useNodeEditor.
export default defineNuxtModule({
	meta: {
		name: "@node-editor/nuxt",
		configKey: "nodeEditor",
	},
	async setup(_options, nuxt) {
		const { resolve } = createResolver(import.meta.url);

		// El runtime usa @node-editor/vue + core; transpilarlos para que funcionen
		// dentro del build de Nuxt sin configuración extra del usuario.
		nuxt.options.build.transpile.push(
			resolve("./runtime"),
			"@node-editor/vue",
			"@node-editor/core",
		);

		addComponent({
			name: "NodeEditor",
			filePath: resolve("./runtime/components/NodeEditor.client.vue"),
			global: true,
		});

		addImports({
			name: "useNodeEditor",
			from: resolve("./runtime/composables/useNodeEditor"),
		});
	},
});
