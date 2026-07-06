import * as THREE from "three";
import {
	makePlugMesh,
	PLUG_BODY_LENGTH,
	PLUG_INTO_ANGLE,
	SNAP_RADIUS,
	type PlugMesh,
} from "./plug";
import { CABLE_Z, PLUG_Z } from "./constants";
import type { NodeView, PortObject } from "./NodeView";

export interface CableContext {
	scene: THREE.Scene;
	nodes: NodeView[];
}

const ROPE_POINTS = 20;

// Cuerda física (verlet + relajación de distancias) entre dos puertos, con un enchufe
// (SVG) en la punta que se enseña "plantado" cuando hay endPort, o siguiendo el cursor
// -con un tirón magnético hacia el puerto compatible más cercano- mientras se arrastra.
export class Cable {
	startPort: PortObject;
	endPort: PortObject | null;
	liveTarget: THREE.Vector3 | null = null;
	snapPort: PortObject | null = null;
	readonly color: number;
	readonly line: THREE.Line;
	readonly plug: PlugMesh;
	readonly geo: THREE.BufferGeometry;

	private readonly ctx: CableContext;
	private readonly points: THREE.Vector3[];
	private readonly prev: THREE.Vector3[];
	private readonly rest: number[];

	constructor(
		ctx: CableContext,
		startPort: PortObject,
		endPort: PortObject | null = null,
	) {
		this.ctx = ctx;
		this.startPort = startPort;
		this.endPort = endPort;
		this.points = Array.from(
			{ length: ROPE_POINTS },
			() => new THREE.Vector3(),
		);
		this.prev = Array.from({ length: ROPE_POINTS }, () => new THREE.Vector3());
		this.rest = new Array(ROPE_POINTS - 1).fill(1);
		this.color = startPort.userData.port.color ?? 0xf0c24a;

		this.geo = new THREE.BufferGeometry();
		this.line = new THREE.Line(
			this.geo,
			new THREE.LineBasicMaterial({
				color: this.color,
				transparent: true,
				opacity: 0.95,
			}),
		);
		this.line.position.z = CABLE_Z;
		ctx.scene.add(this.line);

		this.plug = makePlugMesh(this.color);
		this.plug.position.z = PLUG_Z;
		ctx.scene.add(this.plug);

		this.seed();
	}

	// Puerto de entrada del color de este cable más cercano al cursor, dentro del radio
	// de imán (busca en todos los nodos: nada hardcodeado a un puerto concreto).
	findSnapTarget(): PortObject | null {
		if (!this.liveTarget) return null;
		let best: PortObject | null = null;
		let bestDist = SNAP_RADIUS;
		this.ctx.nodes.forEach((node) => {
			node.inPorts.forEach((port) => {
				if (port.userData.port.color !== this.color) return;
				const wp = port.getWorldPosition(new THREE.Vector3());
				const d = wp.distanceTo(this.liveTarget!);
				if (d < bestDist) {
					bestDist = d;
					best = port;
				}
			});
		});
		return best;
	}

	// Punto real del puerto (contacto): donde debe quedar el borde del enchufe.
	contactPos(): THREE.Vector3 | null {
		if (this.endPort) return this.endPort.getWorldPosition(new THREE.Vector3());
		return this.liveTarget ? this.liveTarget.clone() : null;
	}

	private seed(): void {
		const a = this.startPort.getWorldPosition(new THREE.Vector3());
		const b =
			this.contactPos() ?? a.clone().add(new THREE.Vector3(120, -20, 0));
		const ropeEnd = this.endPort
			? b.clone().add(new THREE.Vector3(-PLUG_BODY_LENGTH, 0, 0))
			: b;
		const n = this.points.length;
		for (let i = 0; i < n; i++) {
			const t = i / (n - 1);
			const p = new THREE.Vector3().lerpVectors(a, ropeEnd, t);
			p.y -= Math.sin(t * Math.PI) * 30;
			this.points[i].copy(p);
			this.prev[i].copy(p);
			if (i > 0) this.rest[i - 1] = a.distanceTo(ropeEnd) / (n - 1);
		}
	}

	setLive(v: THREE.Vector3): void {
		this.liveTarget = v;
	}

	attach(port: PortObject): void {
		this.endPort = port;
		this.snapPort = null;
	}

	update(): void {
		const a = this.startPort.getWorldPosition(new THREE.Vector3());

		// Enchufado: el borde de contacto queda fijo en el puerto; la cuerda se engancha
		// un poco antes, en el culo del enchufe. Arrastrando: si hay un puerto compatible
		// cerca (imán), la cuerda se estira hacia su posición de enchufado en vez de
		// seguir el cursor a pelo.
		let contact: THREE.Vector3;
		let ropeEnd: THREE.Vector3;
		let snapPull = 0;

		if (this.endPort) {
			contact = this.contactPos()!;
			ropeEnd = contact.clone().add(new THREE.Vector3(-PLUG_BODY_LENGTH, 0, 0));
		} else {
			const c = this.contactPos();
			if (!c) return;
			contact = c;
			this.snapPort = this.findSnapTarget();
			ropeEnd = contact;
			if (this.snapPort) {
				const portPos = this.snapPort.getWorldPosition(new THREE.Vector3());
				const dist = portPos.distanceTo(contact);
				snapPull = Math.pow(
					THREE.MathUtils.clamp(1 - dist / SNAP_RADIUS, 0, 1),
					2,
				);
				ropeEnd = contact.clone().lerp(portPos, snapPull);
			}
		}

		const n = this.points.length;
		this.points[0].copy(a);
		this.points[n - 1].copy(ropeEnd);

		for (let i = 1; i < n - 1; i++) {
			const c = this.points[i],
				p = this.prev[i];
			const vel = c.clone().sub(p).multiplyScalar(0.92);
			p.copy(c);
			c.add(vel).add(new THREE.Vector3(0, -0.55, 0));
		}

		for (let iter = 0; iter < 6; iter++) {
			this.points[0].copy(a);
			this.points[n - 1].copy(ropeEnd);
			for (let i = 0; i < n - 1; i++) {
				const p1 = this.points[i],
					p2 = this.points[i + 1];
				const d = p1.distanceTo(p2) || 1e-6;
				const diff = (d - this.rest[i]) / d;
				const off = p2
					.clone()
					.sub(p1)
					.multiplyScalar(0.5 * diff);
				if (i !== 0) p1.add(off);
				if (i + 1 !== n - 1) p2.sub(off);
			}
		}

		const curve = new THREE.CatmullRomCurve3(
			this.points,
			false,
			"catmullrom",
			0.5,
		);
		const pts = curve.getPoints(50);
		this.geo.setFromPoints(pts);

		// Las clavijas solo se ven mientras el enchufe está suelto (colgando o
		// arrastrando); en cuanto queda plantado en un puerto, se ocultan.
		this.plug.userData.prongs.visible = !this.endPort;

		if (this.endPort) {
			// Ya enchufado: pose fija alineada al puerto (no sigue el temblor de la cuerda).
			this.plug.position.set(contact.x, contact.y, this.plug.position.z);
			this.plug.rotation.z = -PLUG_INTO_ANGLE;
		} else if (snapPull > 0.001 && this.snapPort) {
			// Imán tirando: interpola posición y giro hacia la pose "enchufada" del candidato.
			const portPos = this.snapPort.getWorldPosition(new THREE.Vector3());
			const free = pts[pts.length - 1];
			const prevPt =
				pts[pts.length - 2] ?? free.clone().add(new THREE.Vector3(-1, 0, 0));
			const dir = free.clone().sub(prevPt).normalize();
			const freeAngle = Math.atan2(dir.y, dir.x) - PLUG_INTO_ANGLE;
			this.plug.position
				.set(free.x, free.y, this.plug.position.z)
				.lerp(
					new THREE.Vector3(portPos.x, portPos.y, this.plug.position.z),
					snapPull,
				);
			this.plug.rotation.z =
				freeAngle + (-PLUG_INTO_ANGLE - freeAngle) * snapPull;
		} else {
			// Arrastrando libre: el enchufe sigue la punta libre del cable.
			const end = pts[pts.length - 1];
			const prev =
				pts[pts.length - 2] ?? end.clone().add(new THREE.Vector3(-1, 0, 0));
			const dir = end.clone().sub(prev).normalize();
			this.plug.position.set(end.x, end.y, this.plug.position.z);
			this.plug.rotation.z = Math.atan2(dir.y, dir.x) - PLUG_INTO_ANGLE;
		}
	}

	// Relaja el cable: aumenta la distancia de reposo entre puntos para que
	// la curva se vea más relajada/suelta (menos tensión). También da un
	// pequeño impulso hacia abajo para simular el "colgar".
	relax(): void {
		const n = this.points.length;
		// Aumenta las distancias de reposo un 40% para aflojar la tensión
		for (let i = 0; i < this.rest.length; i++) {
			this.rest[i] *= 1.4;
		}
		// Da un impulso hacia abajo en los puntos medios para simular el "colgar"
		for (let i = 1; i < n - 1; i++) {
			const t = i / (n - 1);
			const sag = Math.sin(t * Math.PI) * 25;
			this.prev[i].y += sag; // impulso hacia abajo (prev más alto = caída)
		}
	}

	// Tensa el cable: disminuye la distancia de reposo entre puntos para que
	// la curva se vea más tensa/recta (más tensión).
	tense(): void {
		for (let i = 0; i < this.rest.length; i++) {
			this.rest[i] *= 0.7; // reduce las distancias de reposo un 30%
		}
	}

	dispose(): void {
		this.ctx.scene.remove(this.line);
		this.ctx.scene.remove(this.plug);
		this.geo.dispose();
		(this.line.material as THREE.Material).dispose();
	}
}
