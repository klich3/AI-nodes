import * as THREE from 'three';
import { NodeView } from './NodeView';
import { Cable, type CableContext } from './Cable';
import { hexToInt } from './colors';
import type { GraphConfig } from './types';

// Instancia un NodeView a partir de un tipo del catálogo (config.nodeTypes). La usan
// tanto la carga inicial del grafo (buildGraph) como el listado lateral para añadir
// nodos nuevos en caliente: un único punto de verdad para "qué es un nodo".
export function instantiateNodeType(
  scene: THREE.Scene,
  config: GraphConfig,
  typeKey: string,
  x: number,
  y: number,
  w?: number
): NodeView | null {
  const def = config.nodeTypes[typeKey];
  if (!def) {
    console.warn(`Tipo de nodo desconocido: ${typeKey}`);
    return null;
  }
  return new NodeView(scene, config, {
    x,
    y,
    w: w ?? 210,
    title: def.title,
    color: hexToInt(def.color),
    rows: def.rows,
    withThumb: !!def.withThumb,
  });
}

export interface BuiltGraph {
  nodes: NodeView[];
  cables: Cable[];
}

export function buildGraph(scene: THREE.Scene, config: GraphConfig): BuiltGraph {
  const nodeMap = new Map<string, NodeView>();

  config.graph.nodes.forEach((n) => {
    const view = instantiateNodeType(scene, config, n.type, n.x, n.y, n.w);
    if (view) nodeMap.set(n.id, view);
  });

  const nodes = Array.from(nodeMap.values());
  const cables: Cable[] = [];
  const ctx: CableContext = { scene, nodes };

  config.graph.edges.forEach((edge) => {
    const [fromId, fromLabel] = edge.from;
    const [toId, toLabel] = edge.to;
    const outPort = nodeMap.get(fromId)?.getPort(fromLabel, 'out');
    const inPort = nodeMap.get(toId)?.getPort(toLabel, 'in');
    if (outPort && inPort) cables.push(new Cable(ctx, outPort, inPort));
    else console.warn('Edge no resuelta:', edge);
  });

  return { nodes, cables };
}
