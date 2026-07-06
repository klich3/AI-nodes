import * as THREE from 'three';
import { roundedRectShape, labelSprite, previewThumb } from './shapes';
import { hexToInt, DEFAULT_PORT_COLOR, type PortKind } from './colors';
import type { GraphConfig, RowDef } from './types';

export interface PortUserData {
  node: NodeView;
  kind: PortKind;
  label: string;
  color: number;
}

export type PortObject = THREE.Group & { userData: { port: PortUserData } };

export interface NodeViewOptions {
  x: number;
  y: number;
  w?: number;
  title: string;
  color: number;
  rows?: RowDef[];
  withThumb?: boolean;
}

function resolvePortColor(config: GraphConfig, type: string | undefined, kind: PortKind): number {
  const entry = type ? config.portTypes[type] : undefined;
  return entry ? hexToInt(entry.color) : DEFAULT_PORT_COLOR[kind];
}

// Representa un nodo del editor: caja con cabecera de color, filas de puertos in/out.
// Recibe `scene`/`config` explícitamente (en vez de closures globales como en los
// prototipos HTML) para que la clase sea autocontenida y fácil de testear/reutilizar.
export class NodeView {
  readonly group: THREE.Group;
  readonly w: number;
  readonly h: number;
  vx = 0;
  vy = 0;
  readonly inPorts: PortObject[] = [];
  readonly outPorts: PortObject[] = [];
  readonly mainIn: PortObject | null;
  readonly mainOut: PortObject | null;

  constructor(scene: THREE.Scene, config: GraphConfig, opts: NodeViewOptions) {
    const { x, y, w = 200, title, color, rows = [], withThumb = false } = opts;
    const rowH = 30;
    const headerH = 34;
    const h = headerH + rows.length * rowH + 20;

    this.group = new THREE.Group();
    this.group.position.set(x, y, 0);
    scene.add(this.group);

    this.w = w;
    this.h = h;

    const body = new THREE.Mesh(
      new THREE.ShapeGeometry(roundedRectShape(w, h, 10), 24),
      new THREE.MeshBasicMaterial({ color: 0x2c2e33 })
    );
    this.group.add(body);

    const header = new THREE.Mesh(
      new THREE.ShapeGeometry(roundedRectShape(w, headerH, 10), 24),
      new THREE.MeshBasicMaterial({ color })
    );
    header.position.set(0, h / 2 - headerH / 2, 1);
    this.group.add(header);

    const titleSprite = labelSprite(title, { size: 54, weight: 800, color: '#14161a' });
    titleSprite.scale.set(195, 34, 1);
    titleSprite.position.set(-w / 2 + 14, h / 2 - headerH / 2, 2);
    this.group.add(titleSprite);

    if (withThumb) {
      const thumb = previewThumb(Math.random());
      thumb.position.set(w / 2 - 24, h / 2 - headerH / 2, 2);
      this.group.add(thumb);
    }

    let cursorY = h / 2 - headerH - 20;
    rows.forEach((row) => {
      if (row.label) {
        const sp = labelSprite(row.label, { size: 46, weight: 500, color: '#c7c9cf' });
        sp.scale.set(170, 26, 1);
        sp.position.set(-w / 2 + 26, cursorY, 2);
        this.group.add(sp);
      }
      if (row.side === 'in' || row.side === 'both') {
        this.inPorts.push(this.makePort(-w / 2, cursorY, resolvePortColor(config, row.type, 'in'), 'in', row.label || ''));
      }
      if (row.side === 'out' || row.side === 'both') {
        this.outPorts.push(this.makePort(w / 2, cursorY, resolvePortColor(config, row.type, 'out'), 'out', row.label || ''));
      }
      cursorY -= rowH;
    });

    this.mainOut = this.outPorts[0] ?? null;
    this.mainIn = this.inPorts[0] ?? null;
  }

  private makePort(x: number, y: number, color: number, kind: PortKind, label: string): PortObject {
    const g = new THREE.Group() as PortObject;
    g.position.set(x, y, 3);
    g.userData.port = { node: this, kind, label, color };
    const c1 = new THREE.Mesh(new THREE.CircleGeometry(6, 24), new THREE.MeshBasicMaterial({ color }));
    const c2 = new THREE.Mesh(new THREE.CircleGeometry(9, 24), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.25 }));
    g.add(c2, c1);
    this.group.add(g);
    return g;
  }

  getPort(label: string, kind: PortKind): PortObject | null {
    const list = kind === 'out' ? this.outPorts : this.inPorts;
    return list.find((p) => p.userData.port.label === label) ?? null;
  }
}
