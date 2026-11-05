<script setup lang="ts">
import { ref } from "vue";
import { NodeEditor } from "@node-editor/vue";
import { defaultGraphConfig, type GraphExport, type NodeEditorOptions } from "@node-editor/core";

// El grafo inicial va en options.config (una copia: el engine muta el catálogo en
// caliente al crear tipos). v-model solo refleja el estado hacia fuera.
const options: NodeEditorOptions = {
	config: structuredClone(defaultGraphConfig),
	theme: "dark",
};

const graph = ref<Partial<GraphExport>>();
</script>

<template>
	<div style="display: flex; flex-direction: column; height: 100%">
		<header style="padding: 8px 16px; font: 14px system-ui; background: #1b1c1f; color: #eee">
			Vue 3 + @node-editor/vue — nodos: {{ graph?.graph?.nodes.length ?? 0 }}
		</header>
		<NodeEditor v-model="graph" :options="options" style="flex: 1" />
	</div>
</template>
