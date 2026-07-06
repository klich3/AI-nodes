import * as THREE from 'three';
import type { GraphConfig, NodeTypeDef } from '../core/types';
import type { NodeView } from '../core/NodeView';
import type { PortRegistry } from '../core/PortRegistry';
import { instantiateNodeType } from '../core/Graph';
import { screenToWorld } from '../core/viewport';
import type { InputController } from '../systems/InputController';

export interface PaletteDeps {
  scene: THREE.Scene;
  camera: THREE.OrthographicCamera;
  config: GraphConfig;
  portRegistry: PortRegistry;
  nodes: NodeView[];
  input: InputController;
  listEl: HTMLElement;
  countEl: HTMLElement;
}

// Listado de tipos de nodo disponibles. Cada item se puede arrastrar hasta el canvas:
// el nodo nace bajo el cursor en pointerdown y se entrega al InputController para que
// el propio arrastre general (el mismo que usan los nodos existentes) lo siga moviendo
// hasta que se suelte.
export class Palette {
  constructor(private readonly deps: PaletteDeps) {
    Object.entries(deps.config.nodeTypes).forEach(([key, def]) => this.addItem(key, def));
    this.updateCount();
  }

  addItem(key: string, def: NodeTypeDef): void {
    const item = document.createElement('button');
    item.className = 'palette-item';
    item.innerHTML = `<span class="dot" style="background:${def.color}"></span>${def.title}<span class="key">${key}</span>`;
    item.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this.beginDrag(key, e);
    });
    this.deps.listEl.appendChild(item);
  }

  updateCount(): void {
    const { nodes, countEl } = this.deps;
    countEl.textContent = `${nodes.length} nodo${nodes.length === 1 ? '' : 's'} en el canvas`;
  }

  private beginDrag(typeKey: string, e: PointerEvent): void {
    const { scene, camera, config, portRegistry, nodes, input } = this.deps;
    const p = screenToWorld(camera, e.clientX, e.clientY);
    const view = instantiateNodeType(scene, config, portRegistry, typeKey, p.x, p.y);
    if (!view) return;
    nodes.push(view);
    this.updateCount();
    input.beginDragNode(view);
  }
}
