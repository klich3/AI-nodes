import { useEffect, useRef, useState } from "react";
import {
	NodeEditorEngine,
	type GraphExport,
	type NodeEditorOptions,
} from "@node-editor/core";

// Hook para quien prefiera renderizar el host y gestionar el ciclo de vida en vez
// del componente <NodeEditor>. El engine se crea una vez por options (se ignora
// la identidad de los objetos posteriores para no re-montar).
export function useNodeEditor(options: NodeEditorOptions = {}) {
	const [engine, setEngine] = useState<NodeEditorEngine | null>(null);
	const hostRef = useRef<HTMLDivElement | null>(null);
	const optionsRef = useRef(options);
	optionsRef.current = options;

	useEffect(() => {
		if (!hostRef.current) return;
		const instance = new NodeEditorEngine(hostRef.current, optionsRef.current);
		setEngine(instance);
		return () => {
			instance.destroy();
			setEngine(null);
		};
	}, []);

	return { hostRef, engine };
}

export type { GraphExport };
