/*
█▀ █▄█ █▀▀ █░█ █▀▀ █░█
▄█ ░█░ █▄▄ █▀█ ██▄ ▀▄▀

Author: <Anton Sychev> (anton at sychev dot xyz)
ElevationSystem.ts (c) 2026
Created:  2026-07-07 04:41:04 
Desc: elevacion effecto
*/

import type { NodeView } from "../core/NodeView";

// Resorte subamortiguado (permite pasarse del objetivo y rebotar) para el
// "levantar"/"soltar" de un nodo. Se usa el mismo resorte en ambas direcciones:
// al coger el nodo sube con un pequeño impulso elástico, y al soltarlo cae y
// rebota como una gota antes de asentarse — controlado por NodeView.applyLift(),
// que traduce liftAmount en Z (recortada), escala y sombra.
const STIFFNESS = 0.34;
const DAMPING = 0.72;
const REST_EPSILON = 0.001;

export function setNodeLift(node: NodeView, lifted: boolean): void {
	node.liftTarget = lifted ? 1 : 0;
}

export function integrateNodeLift(nodes: NodeView[]): void {
	nodes.forEach((n) => {
		const atRest =
			Math.abs(n.liftAmount - n.liftTarget) < REST_EPSILON &&
			Math.abs(n.liftVel) < REST_EPSILON;
		if (atRest) {
			if (n.liftAmount !== n.liftTarget || n.liftVel !== 0) {
				n.liftAmount = n.liftTarget;
				n.liftVel = 0;
				n.applyLift();
			}
			return;
		}
		const force = (n.liftTarget - n.liftAmount) * STIFFNESS;
		n.liftVel = (n.liftVel + force) * DAMPING;
		n.liftAmount += n.liftVel;
		n.applyLift();
	});
}
