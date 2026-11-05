/*
█▀ █▄█ █▀▀ █░█ █▀▀ █░█
▄█ ░█░ █▄▄ █▀█ ██▄ ▀▄▀

Author: <Anton Sychev> (anton at sychev dot xyz)
Palette.ts (c) 2026
Created:  2026-07-07 04:40:11 
Desc: paletas
*/

import * as THREE from "three";
import type { GraphConfig, NodeTypeDef } from "../core/types";
import type { NodeView } from "../core/NodeView";
import type { PortRegistry } from "../core/PortRegistry";
import { instantiateNodeType } from "../core/Graph";
import { screenToWorld } from "../core/viewport";
import type { InputController } from "../systems/InputController";

export interface PaletteDeps {
	scene: THREE.Scene;
	camera: THREE.OrthographicCamera;
	config: GraphConfig;
	portRegistry: PortRegistry;
	nodes: NodeView[];
	input: InputController;
	listEl: HTMLElement;
	countEl: HTMLElement;
	// El engine lo usa para emitir 'change' cuando nace un nodo desde la paleta
	// (el drop en InputController solo settlea, no notifica).
	onNodeAdded?: () => void;
}

// Listado de tipos de nodo disponibles. Cada item se puede arrastrar hasta el canvas:
// el nodo nace bajo el cursor en pointerdown y se entrega al InputController para que
// el propio arrastre general (el mismo que usan los nodos existentes) lo siga moviendo
// hasta que se suelte.
export class Palette {
	constructor(private readonly deps: PaletteDeps) {
		Object.entries(deps.config.nodeTypes).forEach(([key, def]) =>
			this.addItem(key, def),
		);
		this.updateCount();
	}

	addItem(key: string, def: NodeTypeDef): void {
		const item = document.createElement("button");
		item.className = "ne-palette-item";
		// def.title viene de config (JSON del host): se inserta como texto, no como
		// markup, para que un título con "<" o similar no rompa el DOM.
		const dot = document.createElement("span");
		dot.className = "ne-dot";
		dot.style.background = def.color;
		const label = document.createElement("span");
		label.textContent = def.title;
		const keyEl = document.createElement("span");
		keyEl.className = "ne-key";
		keyEl.textContent = key;
		item.append(dot, label, keyEl);
		item.addEventListener("pointerdown", (e) => {
			e.preventDefault();
			this.beginDrag(key, e);
		});
		this.deps.listEl.appendChild(item);
	}

	updateCount(): void {
		const { nodes, countEl } = this.deps;
		countEl.textContent = `${nodes.length} nodo${nodes.length === 1 ? "" : "s"} en el canvas`;
	}

	private beginDrag(typeKey: string, e: PointerEvent): void {
		const { scene, camera, config, portRegistry, nodes, input } = this.deps;
		const p = screenToWorld(camera, e.clientX, e.clientY);
		const view = instantiateNodeType(
			scene,
			config,
			portRegistry,
			typeKey,
			p.x,
			p.y,
		);
		if (!view) return;
		nodes.push(view);
		this.updateCount();
		this.deps.onNodeAdded?.();
		input.beginDragNode(view);
	}
}
