/*
█▀ █▄█ █▀▀ █░█ █▀▀ █░█
▄█ ░█░ █▄▄ █▀█ ██▄ ▀▄▀

Author: <Anton Sychev> (anton at sychev dot xyz)
LayoutSystem.ts (c) 2026
Created:  2026-07-07 04:40:44 
Desc: layout system
*/

import { NODE_GAP, MOTION_DAMPING } from "../core/constants";
import type { NodeView } from "../core/NodeView";

// Reordena los nodos en un layout de cuadrícula (grid), calculando posiciones
// para que no se solapen y queden distribuidos de forma organizada.
// Después aplica repulsión para asegurar que ningún nodo quede solapado.
export function reorderNodes(nodes: NodeView[]): void {
	if (nodes.length === 0) return;

	const COLS = Math.ceil(Math.sqrt(nodes.length));
	const GAP_X = 280; // espaciado horizontal entre nodos
	const GAP_Y = 200; // espaciado vertical entre nodos
	const START_X = -((COLS - 1) * GAP_X) / 2;
	const START_Y = 200; // margen superior

	// Ordena los nodos por posición actual (izquierda a derecha, arriba a abajo)
	// para mantener una distribución lógica
	const sorted = [...nodes].sort((a, b) => {
		const dy = a.group.position.y - b.group.position.y;
		if (Math.abs(dy) > 100) return -dy; // arriba primero
		return a.group.position.x - b.group.position.x;
	});

	// Calcula posiciones target del grid
	const targets = new Map<NodeView, { x: number; y: number }>();
	sorted.forEach((node, i) => {
		const col = i % COLS;
		const row = Math.floor(i / COLS);
		targets.set(node, {
			x: START_X + col * GAP_X,
			y: START_Y - row * GAP_Y,
		});
	});

	// Aplica repulsión iterativa sobre las posiciones target para separar nodos
	// que pudieran quedar solapados (si los nodos tienen tamaños muy diferentes)
	for (let iter = 0; iter < 6; iter++) {
		for (let i = 0; i < sorted.length; i++) {
			for (let j = i + 1; j < sorted.length; j++) {
				const a = sorted[i],
					b = sorted[j];
				const pa = targets.get(a)!,
					pb = targets.get(b)!;
				const dx = pb.x - pa.x,
					dy = pb.y - pa.y;
				const minX = (a.w + b.w) / 2 + NODE_GAP;
				const minY = (a.h + b.h) / 2 + NODE_GAP;
				const overlapX = minX - Math.abs(dx);
				const overlapY = minY - Math.abs(dy);
				if (overlapX <= 0 || overlapY <= 0) continue;
				if (overlapX < overlapY) {
					const push = overlapX * Math.sign(dx || 1);
					pa.x -= push / 2;
					pb.x += push / 2;
				} else {
					const push = overlapY * Math.sign(dy || 1);
					pa.y -= push / 2;
					pb.y += push / 2;
				}
			}
		}
	}

	// Aplica las posiciones finales como velocidad para animación suave
	nodes.forEach((node) => {
		const target = targets.get(node)!;
		node.vx += (target.x - node.group.position.x) * (1 - MOTION_DAMPING);
		node.vy += (target.y - node.group.position.y) * (1 - MOTION_DAMPING);
	});
}
