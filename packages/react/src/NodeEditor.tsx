import {
	forwardRef,
	useCallback,
	useEffect,
	useImperativeHandle,
	useRef,
	type CSSProperties,
} from "react";
import {
	NodeEditorEngine,
	type GraphExport,
	type NodeEditorOptions,
} from "@node-editor/core";

export interface NodeEditorHandle {
	getEngine(): NodeEditorEngine | null;
	exportJson(): GraphExport | null;
	importJson(data: Partial<GraphExport>): void;
}

export interface NodeEditorProps extends NodeEditorOptions {
	className?: string;
	style?: CSSProperties;
	onChange?(payload: GraphExport): void;
	onNodeDeleted?(id: string): void;
	onReady?(engine: NodeEditorEngine): void;
}

// El engine muta el DOM dentro del host y nunca toca el árbol React: el div queda
// vacío y React no puede colisionar con él. StrictMode (doble montaje en dev) se
// resuelve creando y destruyendo el engine en cada pasada de useEffect.
export const NodeEditor = forwardRef<NodeEditorHandle, NodeEditorProps>(
	function NodeEditor(
		{ className, style, onChange, onNodeDeleted, onReady, ...options },
		ref,
	) {
		const hostRef = useRef<HTMLDivElement | null>(null);
		const engineRef = useRef<NodeEditorEngine | null>(null);
		// Callbacks en refs para no re-montar el engine cuando el padre pasa
		// funciones inline nuevas en cada render.
		const onChangeRef = useRef(onChange);
		const onNodeDeletedRef = useRef(onNodeDeleted);
		const onReadyRef = useRef(onReady);
		onChangeRef.current = onChange;
		onNodeDeletedRef.current = onNodeDeleted;
		onReadyRef.current = onReady;

		const optionsRef = useRef(options);
		optionsRef.current = options;

		useEffect(() => {
			if (!hostRef.current) return;
			const engine = new NodeEditorEngine(hostRef.current, optionsRef.current);
			engineRef.current = engine;
			const offChange = engine.on("change", (payload) =>
				onChangeRef.current?.(payload),
			);
			const offDeleted = engine.on("nodeDeleted", (id) =>
				onNodeDeletedRef.current?.(id),
			);
			onReadyRef.current?.(engine);
			return () => {
				offChange();
				offDeleted();
				engine.destroy();
				engineRef.current = null;
			};
		}, []);

		useImperativeHandle(
			ref,
			() => ({
				getEngine: () => engineRef.current,
				exportJson: () => engineRef.current?.exportJson() ?? null,
				importJson: (data) => engineRef.current?.importJson(data),
			}),
			[],
		);

		const mergeStyle = useCallback(
			(s?: CSSProperties): CSSProperties => ({ width: "100%", height: "100%", position: "relative", ...s }),
			[],
		);

		return <div ref={hostRef} className={className} style={mergeStyle(style)} />;
	},
);
