import { onBeforeUnmount, onMounted, ref, shallowRef } from "vue";
import { NodeEditorEngine, type NodeEditorOptions } from "@node-editor/core";

// Composable para quien prefiera gestionar el contenedor y el ciclo de vida en vez
// de usar el componente <NodeEditor>. Devuelve el host donde montar y el engine.
export function useNodeEditor(
	options: NodeEditorOptions | (() => NodeEditorOptions) = {},
) {
	const host = shallowRef<HTMLDivElement | null>(null);
	const engine = shallowRef<NodeEditorEngine | null>(null);
	const isReady = ref(false);

	onMounted(() => {
		if (!host.value) return;
		const opts = typeof options === "function" ? options() : options;
		engine.value = new NodeEditorEngine(host.value, opts);
		isReady.value = true;
	});

	onBeforeUnmount(() => {
		engine.value?.destroy();
		engine.value = null;
		isReady.value = false;
	});

	return { host, engine, isReady };
}
