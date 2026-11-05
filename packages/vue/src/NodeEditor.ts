import { defineComponent, h, onBeforeUnmount, onMounted, ref, watch, type PropType } from "vue";
import {
	NodeEditorEngine,
	type GraphExport,
	type NodeEditorOptions,
} from "@node-editor/core";

// Componente contenedor: monta el engine en su propio div (estilo autocontenido
// del paquete) y sincroniza v-model con el JSON exportado por el editor.
export const NodeEditor = defineComponent({
	name: "NodeEditor",
	inheritAttrs: false,
	props: {
		// GraphExport inicial para v-model. Cambiarlo desde fuera reconstruye el grafo.
		modelValue: { type: Object as PropType<Partial<GraphExport>>, default: undefined },
		options: { type: Object as PropType<NodeEditorOptions>, default: undefined },
	},
	emits: [
		"update:modelValue",
		"change",
		"nodeDeleted",
		"ready",
	],
	setup(props, { emit, expose }) {
		const hostEl = ref<HTMLDivElement | null>(null);
		let engine: NodeEditorEngine | null = null;
		let offChange: (() => void) | null = null;
		let offNodeDeleted: (() => void) | null = null;

		onMounted(() => {
			if (!hostEl.value) return;
			engine = new NodeEditorEngine(hostEl.value, props.options ?? {});
			offChange = engine.on("change", (payload) => {
				emit("update:modelValue", payload);
				emit("change", payload);
			});
			offNodeDeleted = engine.on("nodeDeleted", (id) => emit("nodeDeleted", id));
			// Estado inicial hacia el padre si el usuario lo pide via v-model.
			emit("update:modelValue", engine.exportJson());
			emit("ready", engine);
		});

		watch(
			() => props.modelValue,
			(value) => {
				if (!engine || !value) return;
				// Evitar bucle: solo reimportar cuando el cambio viene de fuera.
				// La comparación normaliza: el engine emite `w: undefined` en nodos
				// por defecto y structuredClone lo convierte en clave ausente, así
				// que un JSON.stringify directo daría falsos positivos de "cambio".
				const strip = (v: unknown): unknown =>
					typeof v === "object" && v !== null
						? Array.isArray(v)
							? v.map(strip)
							: Object.fromEntries(
									Object.entries(v as Record<string, unknown>)
										.filter(([, x]) => x !== undefined)
										.map(([k, x]) => [k, strip(x)]),
								)
						: v;
				if (JSON.stringify(strip(engine.exportJson())) !== JSON.stringify(strip(value))) {
					engine.importJson(value);
				}
			},
			{ deep: true },
		);

		onBeforeUnmount(() => {
			offChange?.();
			offNodeDeleted?.();
			engine?.destroy();
			engine = null;
		});

		expose({
			getEngine: () => engine,
		});

		return () =>
			h("div", {
				ref: hostEl,
				style: { width: "100%", height: "100%", position: "relative" },
			});
	},
});
