/*
█▀ █▄█ █▀▀ █░█ █▀▀ █░█
▄█ ░█░ █▄▄ █▀█ ██▄ ▀▄▀

Author: <Anton Sychev> (anton at sychev dot xyz)
serializer.ts (c) 2026
Created:  2026-07-07 04:39:53 
Desc: Exportacion e importacion de grafos como JSON
*/
import type { Cable } from "./Cable";
import type { NodeView } from "./NodeView";
import type { GraphNodeDef, GraphEdgeDef } from "./types";

// Exporta el estado actual del grafo (nodos y cables) como un objeto JSON
// compatible con GraphConfig.graph (nodes + edges).
export function exportGraphToJson(
	nodes: NodeView[],
	cables: Cable[],
): { nodes: GraphNodeDef[]; edges: GraphEdgeDef[] } {
	const graphNodes: GraphNodeDef[] = nodes.map((n) => ({
		id: n.id,
		type: n.typeKey,
		x: Math.round(n.group.position.x),
		y: Math.round(n.group.position.y),
		w: n.w !== 236 ? n.w : undefined,
	}));

	const graphEdges: GraphEdgeDef[] = [];
	cables.forEach((cable) => {
		const fromNode = cable.startPort.userData.port.node;
		const fromLabel = cable.startPort.userData.port.label;
		if (!cable.endPort) return; // solo cables conectados
		const toNode = cable.endPort.userData.port.node;
		const toLabel = cable.endPort.userData.port.label;
		graphEdges.push({
			from: [fromNode.id, fromLabel],
			to: [toNode.id, toLabel],
		});
	});

	return { nodes: graphNodes, edges: graphEdges };
}

// Descarga el JSON como archivo para que el usuario pueda guardarlo.
export function downloadJson(data: unknown, filename = "graph.json"): void {
	const json = JSON.stringify(data, null, 2);
	const blob = new Blob([json], { type: "application/json" });
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = filename;
	a.click();
	URL.revokeObjectURL(url);
}

// Abre un diálogo para seleccionar un archivo JSON y lo parsea.
// Devuelve una promesa que se resuelve con el contenido parseado.
export function loadJsonFile<T>(): Promise<T> {
	return new Promise((resolve, reject) => {
		const input = document.createElement("input");
		input.type = "file";
		input.accept = ".json,application/json";
		input.addEventListener("change", () => {
			const file = input.files?.[0];
			if (!file) {
				reject(new Error("No file selected"));
				return;
			}
			const reader = new FileReader();
			reader.onload = () => {
				try {
					const data = JSON.parse(reader.result as string) as T;
					resolve(data);
				} catch (err) {
					reject(err);
				}
			};
			reader.onerror = () => reject(reader.error);
			reader.readAsText(file);
		});
		input.click();
	});
}
