import * as THREE from 'three';
import { NodeView } from '../core/NodeView';
import { Cable, type CableContext } from '../core/Cable';
import { screenToWorld } from '../core/viewport';
import { CABLE_Z, CABLE_Z_LIFTED, PLUG_Z, PLUG_Z_LIFTED } from '../core/constants';
import { settleOverlaps } from './PhysicsSystem';
import { setNodeLift } from './ElevationSystem';

export interface InputControllerDeps {
  renderer: THREE.WebGLRenderer;
  camera: THREE.OrthographicCamera;
  scene: THREE.Scene;
  nodes: NodeView[];
  cables: Cable[];
  deleteZoneEl: HTMLElement;
  onNodeDeleted?: () => void;
}

// Reúne toda la interacción de puntero: pan de canvas, zoom, arrastre de nodos,
// creación/reconexión de cables con imán, elevación (con rebote) mientras se
// arrastra, y soltar sobre la papelera para borrar. También expone
// beginDragNode() para que el listado de nodos le entregue un nodo recién
// creado y el usuario lo siga arrastrando sin soltar el ratón.
export class InputController {
  private readonly raycaster = new THREE.Raycaster();
  private readonly pointer = new THREE.Vector2();
  private dragNode: NodeView | null = null;
  private readonly dragOffset = new THREE.Vector3();
  private liveCable: Cable | null = null;
  private panning = false;
  private readonly panStart = { x: 0, y: 0 };
  private readonly camStart = new THREE.Vector3();
  private overDeleteZone = false;

  constructor(private readonly deps: InputControllerDeps) {
    deps.renderer.domElement.style.cursor = 'grab';
    deps.renderer.domElement.addEventListener('pointerdown', this.onPointerDown);
    window.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('pointerup', this.onPointerUp);
    deps.renderer.domElement.addEventListener('wheel', this.onWheel, { passive: false });
    window.addEventListener('resize', this.onResize);
  }

  private get cableContext(): CableContext {
    return { scene: this.deps.scene, nodes: this.deps.nodes };
  }

  // Punto de entrada para el listado de nodos: el nodo ya existe (recién instanciado
  // bajo el cursor) y simplemente se entrega al mismo mecanismo de arrastre que usan
  // los nodos existentes, con offset cero para que quede pegado al puntero.
  beginDragNode(node: NodeView): void {
    this.dragNode = node;
    node.vx = 0;
    node.vy = 0;
    this.dragOffset.set(0, 0, 0);
    this.setNodeElevated(node, true);
    this.showDeleteZone();
  }

  private hitTest(x: number, y: number): THREE.Intersection[] {
    const { camera, nodes } = this.deps;
    this.pointer.x = (x / window.innerWidth) * 2 - 1;
    this.pointer.y = -(y / window.innerHeight) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, camera);
    return this.raycaster.intersectObjects(nodes.map((n) => n.group), true);
  }

  private cableTouchesNode(cable: Cable, node: NodeView): boolean {
    return (
      cable.startPort.userData.port.node === node ||
      (!!cable.endPort && cable.endPort.userData.port.node === node)
    );
  }

  private setNodeElevated(node: NodeView, on: boolean): void {
    setNodeLift(node, on);
    this.deps.cables.forEach((c) => {
      if (!this.cableTouchesNode(c, node)) return;
      c.line.position.z = on ? CABLE_Z_LIFTED : CABLE_Z;
      c.plug.position.z = on ? PLUG_Z_LIFTED : PLUG_Z;
    });
  }

  private detachCable(cable: Cable): void {
    const { cables } = this.deps;
    const idx = cables.indexOf(cable);
    if (idx !== -1) {
      cable.dispose();
      cables.splice(idx, 1);
    }
  }

  // Borra un nodo: primero sus cables (los desconecta y libera), luego el propio
  // nodo (fuera del array + fuera de escena + geometrías/texturas liberadas).
  private deleteNode(node: NodeView): void {
    const { nodes, cables } = this.deps;
    [...cables].forEach((c) => {
      if (this.cableTouchesNode(c, node)) this.detachCable(c);
    });
    const idx = nodes.indexOf(node);
    if (idx !== -1) nodes.splice(idx, 1);
    node.dispose();
    this.deps.onNodeDeleted?.();
  }

  private isOverDeleteZone(x: number, y: number): boolean {
    const rect = this.deps.deleteZoneEl.getBoundingClientRect();
    return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
  }

  private showDeleteZone(): void {
    this.deps.deleteZoneEl.classList.add('visible');
  }

  private hideDeleteZone(): void {
    this.deps.deleteZoneEl.classList.remove('visible', 'active');
    this.overDeleteZone = false;
  }

  private readonly onPointerDown = (e: PointerEvent): void => {
    const { camera, nodes, cables } = this.deps;
    const h = this.hitTest(e.clientX, e.clientY)[0]?.object ?? null;
    if (!h) {
      this.panning = true;
      this.panStart.x = e.clientX;
      this.panStart.y = e.clientY;
      this.camStart.copy(camera.position);
      this.deps.renderer.domElement.style.cursor = 'grabbing';
      return;
    }

    let cur: THREE.Object3D | null = h;
    while (
      cur &&
      !cur.userData.port &&
      !cur.userData.checkbox &&
      !cur.userData.segButton &&
      !nodes.find((n) => n.group === cur)
    ) cur = cur.parent;

    if (cur?.userData?.checkbox) { cur.userData.checkbox.toggle(); return; }
    if (cur?.userData?.segButton) { cur.userData.segButton.activate(); return; }

    const port = cur?.userData?.port;

    if (port?.kind === 'out') {
      const cable = new Cable(this.cableContext, cur as any, null);
      cable.setLive(screenToWorld(camera, e.clientX, e.clientY));
      cables.push(cable);
      this.liveCable = cable;
      return;
    }

    if (port?.kind === 'in') {
      // Desenchufar: si ese puerto ya tiene un cable puesto, lo "sacamos" y seguimos
      // arrastrando el mismo cable (misma cuerda/enchufe) hasta soltarlo en otro sitio.
      const occupant = cables.find((c) => c.endPort === cur);
      if (occupant) {
        occupant.endPort = null;
        occupant.setLive(screenToWorld(camera, e.clientX, e.clientY));
        this.liveCable = occupant;
      }
      return;
    }

    const node = nodes.find((n) => n.group === cur);
    if (node) {
      this.dragNode = node;
      node.vx = 0;
      node.vy = 0;
      this.dragOffset.copy(node.group.position).sub(screenToWorld(camera, e.clientX, e.clientY));
      this.setNodeElevated(node, true);
      this.showDeleteZone();
    }
  };

  private readonly onPointerMove = (e: PointerEvent): void => {
    const { camera } = this.deps;
    if (this.panning) {
      const worldPerPixelX = (camera.right - camera.left) / window.innerWidth / camera.zoom;
      const worldPerPixelY = (camera.top - camera.bottom) / window.innerHeight / camera.zoom;
      camera.position.x = this.camStart.x - (e.clientX - this.panStart.x) * worldPerPixelX;
      camera.position.y = this.camStart.y + (e.clientY - this.panStart.y) * worldPerPixelY;
      return;
    }
    if (this.dragNode) {
      this.overDeleteZone = this.isOverDeleteZone(e.clientX, e.clientY);
      this.deps.deleteZoneEl.classList.toggle('active', this.overDeleteZone);
      const p = screenToWorld(camera, e.clientX, e.clientY);
      this.dragNode.group.position.x = p.x + this.dragOffset.x;
      this.dragNode.group.position.y = p.y + this.dragOffset.y;
      return;
    }
    if (this.liveCable) this.liveCable.setLive(screenToWorld(camera, e.clientX, e.clientY));
  };

  private readonly onPointerUp = (): void => {
    if (this.panning) {
      this.panning = false;
      this.deps.renderer.domElement.style.cursor = 'grab';
    }
    if (this.liveCable) {
      // El imán ya solo propone puertos de entrada del mismo color dentro de su
      // radio, así que soltar simplemente confirma (o no) ese candidato.
      const target = this.liveCable.snapPort;
      if (target) {
        const occupant = this.deps.cables.find((c) => c !== this.liveCable && c.endPort === target);
        if (occupant) this.detachCable(occupant);
        this.liveCable.attach(target);
      } else {
        this.detachCable(this.liveCable);
      }
    }
    this.liveCable = null;
    if (this.dragNode) {
      const node = this.dragNode;
      const dropInDeleteZone = this.overDeleteZone;
      this.hideDeleteZone();
      this.dragNode = null;
      if (dropInDeleteZone) {
        this.deleteNode(node);
      } else {
        this.setNodeElevated(node, false);
        settleOverlaps(this.deps.nodes, node);
      }
    }
  };

  private readonly onWheel = (e: WheelEvent): void => {
    e.preventDefault();
    const { camera } = this.deps;
    const zoomSpeed = 0.0015;
    camera.zoom = THREE.MathUtils.clamp(camera.zoom * (1 - e.deltaY * zoomSpeed), 0.4, 2.5);
    camera.updateProjectionMatrix();
  };

  private readonly onResize = (): void => {
    const { camera, renderer } = this.deps;
    camera.left = -window.innerWidth / 2;
    camera.right = window.innerWidth / 2;
    camera.top = window.innerHeight / 2;
    camera.bottom = -window.innerHeight / 2;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  };
}
