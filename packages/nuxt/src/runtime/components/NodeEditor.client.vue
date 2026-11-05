<script setup lang="ts">
import { NodeEditor as NodeEditorBase } from "@node-editor/vue";
import type { GraphExport, NodeEditorOptions } from "@node-editor/core";

// Wrapper .client.vue: Nuxt solo carga este archivo en el cliente, así que el
// engine Three.js nunca se ejecuta durante SSR. Reexporta la misma API que
// @node-editor/vue (props modelValue/options, eventos change/nodeDeleted/ready).
defineProps<{
	modelValue?: Partial<GraphExport>;
	options?: NodeEditorOptions;
}>();

const emit = defineEmits<{
	(e: "update:modelValue", value: GraphExport): void;
	(e: "change", value: GraphExport): void;
	(e: "nodeDeleted", id: string): void;
	(e: "ready", engine: unknown): void;
}>();

const innerRef = ref<InstanceType<typeof NodeEditorBase> | null>(null);

defineExpose({
	getEngine: () => innerRef.value?.getEngine(),
});
</script>

<template>
	<NodeEditorBase
		ref="innerRef"
		v-bind="$attrs"
		:model-value="modelValue"
		:options="options"
		@update:model-value="(v: GraphExport) => emit('update:modelValue', v)"
		@change="(v: GraphExport) => emit('change', v)"
		@node-deleted="(id: string) => emit('nodeDeleted', id)"
		@ready="(e: unknown) => emit('ready', e)"
	/>
</template>
