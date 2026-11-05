<script setup lang="ts">
import { defaultGraphConfig, type GraphExport, type NodeEditorOptions } from "@node-editor/core";

// <NodeEditor> se auto-importa desde el módulo @node-editor/nuxt (ya envuelto en
// ClientOnly por su nombre .client.vue, así que nada de Three.js toca el SSR).
// options en shallowRef: la serialización reactiva profunda de Nuxt convertiría
// los Sets del config en objetos vacíos y la paleta saldría sin tipos.
const options = shallowRef<NodeEditorOptions>();
const graph = ref<Partial<GraphExport>>();

onMounted(() => {
	options.value = { config: structuredClone(defaultGraphConfig), theme: "dark" };
});
</script>

<template>
	<div style="display: flex; flex-direction: column; height: 100vh">
		<header style="padding: 8px 16px; font: 14px system-ui; background: #1b1c1f; color: #eee">
			Nuxt 3 + @node-editor/nuxt — nodos: {{ graph?.graph?.nodes.length ?? 0 }}
		</header>
		<NodeEditor v-if="options" v-model="graph" :options="options" style="flex: 1" />
	</div>
</template>
