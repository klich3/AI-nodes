import { NODE_GAP, MOTION_DAMPING } from '../core/constants';
import type { NodeView } from '../core/NodeView';

// Resuelve solapes sobre una copia de posiciones (varias pasadas relajando pares,
// igual que el solver del cable) hasta dejar el hueco NODE_GAP entre cajas. `moved`
// actúa como ancla y no se desplaza en el cálculo: solo se llama al soltar un nodo o
// al añadir uno nuevo (no mientras arrastras/pasas por encima), así que los vecinos
// ceden un hueco justo en ese momento, no según te acercas.
function resolvePositions(nodes: NodeView[], moved: NodeView): Map<NodeView, { x: number; y: number }> {
  const pos = new Map(nodes.map((n) => [n, { x: n.group.position.x, y: n.group.position.y }]));
  for (let iter = 0; iter < 4; iter++) {
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i], b = nodes[j];
        const pa = pos.get(a)!, pb = pos.get(b)!;
        const dx = pb.x - pa.x, dy = pb.y - pa.y;
        const minX = (a.w + b.w) / 2 + NODE_GAP;
        const minY = (a.h + b.h) / 2 + NODE_GAP;
        const overlapX = minX - Math.abs(dx);
        const overlapY = minY - Math.abs(dy);
        if (overlapX <= 0 || overlapY <= 0) continue;
        if (overlapX < overlapY) {
          const push = overlapX * Math.sign(dx || 1);
          if (a === moved) pb.x += push;
          else if (b === moved) pa.x -= push;
          else { pa.x -= push / 2; pb.x += push / 2; }
        } else {
          const push = overlapY * Math.sign(dy || 1);
          if (a === moved) pb.y += push;
          else if (b === moved) pa.y -= push;
          else { pa.y -= push / 2; pb.y += push / 2; }
        }
      }
    }
  }
  return pos;
}

// Convierte el desplazamiento resuelto en un impulso de velocidad amortiguado: con
// decaimiento geométrico (1 - MOTION_DAMPING), la integración en el loop de animación
// recorre aprox. esa misma distancia total, pero deslizándose como una gota de agua en
// vez de saltar de golpe a la posición final.
export function settleOverlaps(nodes: NodeView[], moved: NodeView): void {
  const resolved = resolvePositions(nodes, moved);
  nodes.forEach((n) => {
    if (n === moved) return;
    const target = resolved.get(n)!;
    n.vx += (target.x - n.group.position.x) * (1 - MOTION_DAMPING);
    n.vy += (target.y - n.group.position.y) * (1 - MOTION_DAMPING);
  });
}

export function integrateNodeMotion(nodes: NodeView[]): void {
  nodes.forEach((n) => {
    if (Math.abs(n.vx) < 0.01 && Math.abs(n.vy) < 0.01) {
      n.vx = 0;
      n.vy = 0;
      return;
    }
    n.group.position.x += n.vx;
    n.group.position.y += n.vy;
    n.vx *= MOTION_DAMPING;
    n.vy *= MOTION_DAMPING;
  });
}
