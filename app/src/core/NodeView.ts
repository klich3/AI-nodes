/*
█▀ █▄█ █▀▀ █░█ █▀▀ █░█
▄█ ░█░ █▄▄ █▀█ ██▄ ▀▄▀

Author: <Anton Sychev> (anton at sychev dot xyz)
NodeView.ts (c) 2026
Created:  2026-07-07 04:39:50 
Desc: Vista de nodo con geometria mergeada y puertos interactivos
*/
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import {
	roundedRectShape,
	roundedRectMesh,
	labelSprite,
	shadowMesh,
	checkBadge,
	menuDots,
	linkIcon,
	thumbGeneric,
	thumbGrid,
	thumbBars,
	previewThumb,
} from "./shapes";
import { hexToInt, DEFAULT_PORT_COLOR, type PortKind } from "./colors";
import { CARD_PALETTE, hexToCss, NODE_Z_LIFTED } from "./constants";
import type { PortRegistry } from "./PortRegistry";
import type { GraphConfig, RowDef, PortRowDef, ThumbKind } from "./types";

export interface PortUserData {
	node: NodeView;
	kind: PortKind;
	label: string;
	color: number;
}

export type PortObject = THREE.Group & { userData: { port: PortUserData } };
export type CheckboxObject = THREE.Mesh & {
	userData: { checkbox: { toggle: () => void; readonly checked: boolean } };
};
export type SegButtonObject = THREE.Mesh & {
	userData: { segButton: { activate: () => void } };
};

export interface NodeViewOptions {
	id?: string;
	typeKey?: string;
	x: number;
	y: number;
	w?: number;
	title: string;
	color: number;
	rows?: RowDef[];
	thumb?: ThumbKind;
}

function resolvePortColor(
	config: GraphConfig,
	type: string | undefined,
	kind: PortKind,
): number {
	const entry = type ? config.portTypes[type] : undefined;
	return entry ? hexToInt(entry.color) : DEFAULT_PORT_COLOR[kind];
}

function blockHeight(b: RowDef): number {
	if (b.kind === "section") return 20;
	if (b.kind === "pair") return 44;
	if (b.kind === "checkbox") return 22;
	if (b.kind === "segmented") return 30;
	return 26; // port
}

function buildThumb(kind: ThumbKind | undefined, color: number): THREE.Mesh {
	if (kind === "grid") return thumbGrid(hexToCss(color));
	if (kind === "bars") return thumbBars();
	if (kind === "random") return previewThumb(Math.random());
	return thumbGeneric(color);
}

function withVertexColor(
	geometry: THREE.BufferGeometry,
	color: number,
): THREE.BufferGeometry {
	const count = geometry.attributes.position.count;
	const colors = new Float32Array(count * 3);
	const c = new THREE.Color(color);
	for (let i = 0; i < count; i++) {
		colors[i * 3] = c.r;
		colors[i * 3 + 1] = c.g;
		colors[i * 3 + 2] = c.b;
	}
	geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
	return geometry;
}

// El fondo, la cabecera, la máscara que tapa su redondeo inferior y la línea
// divisoria bajo la miniatura son 4 formas opacas de color fijo: en vez de 4
// mallas (4 draw calls) por nodo, se combinan en una única geometría con color
// por vértice (mergeGeometries) y un solo material — 1 draw call para todo el
// "chasis" de la tarjeta. Los elementos con textura propia (título, iconos,
// miniatura, filas) o color dinámico (icono de tipo) se quedan aparte.
function buildChromeMesh(
	w: number,
	h: number,
	headerH: number,
	thumbH: number,
): THREE.Mesh {
	const body = withVertexColor(
		new THREE.ShapeGeometry(roundedRectShape(w, h, 12), 24),
		CARD_PALETTE.bg,
	);
	const header = withVertexColor(
		new THREE.ShapeGeometry(roundedRectShape(w, headerH, 12), 24),
		CARD_PALETTE.header,
	);
	header.translate(0, h / 2 - headerH / 2, 1);
	const headerMask = withVertexColor(
		new THREE.PlaneGeometry(w, 14),
		CARD_PALETTE.header,
	);
	headerMask.translate(0, h / 2 - headerH + 6, 0.9);
	const divider = withVertexColor(
		new THREE.PlaneGeometry(w - 4, 1),
		CARD_PALETTE.border,
	);
	divider.translate(0, h / 2 - headerH - thumbH, 2);
	const merged = mergeGeometries([body, header, headerMask, divider], false);
	return new THREE.Mesh(
		merged,
		new THREE.MeshBasicMaterial({ vertexColors: true }),
	);
}

// Tarjeta de nodo con cabecera (icono + título + insignia + menú), sombra, miniatura
// y un cuerpo de "bloques": filas de puerto normales más secciones, pares de campo
// enlazados, checkboxes y grupos segmentados (estos tres últimos son clicables de
// verdad vía raycasting, ver InputController). Estilo tomado de sample4.html.
// Desplazamiento/opacidad de la sombra en reposo vs. "levantada del todo" (liftAmount=1):
// una sombra más lejana y más oscura vende la sensación de que la tarjeta flota más alto,
// ya que la cámara ortográfica no puede mostrarlo con perspectiva real.
const SHADOW_REST = { x: 5, y: -12, opacity: 0.78 };
const SHADOW_LIFTED = { x: 13, y: -26, opacity: 1 };
const LIFT_SCALE = 0.045;

export class NodeView {
	readonly id: string;
	readonly typeKey: string;
	readonly group: THREE.Group;
	readonly w: number;
	readonly h: number;
	vx = 0;
	vy = 0;
	// Resorte 0↔1 que impulsa el "levantar" (grab) y el "caer con rebote" (drop);
	// ver systems/ElevationSystem.ts. Puede pasarse ligeramente de 1 o bajar de 0
	// durante el rebote: la posición Z se recorta a ese rango, pero la escala y la
	// sombra usan el valor sin recortar para que el rebote se note.
	liftAmount = 0;
	liftVel = 0;
	liftTarget = 0;
	readonly inPorts: PortObject[] = [];
	readonly outPorts: PortObject[] = [];

	private readonly scene: THREE.Scene;
	private readonly shadow: THREE.Mesh;

	constructor(
		scene: THREE.Scene,
		config: GraphConfig,
		portRegistry: PortRegistry,
		opts: NodeViewOptions,
	) {
		const { id, typeKey, x, y, w = 236, title, color, rows = [], thumb } = opts;
		const headerH = 42,
			thumbH = 76,
			padTop = 14,
			padBottom = 16,
			rowGap = 6;

		const heights = rows.map(blockHeight);
		const contentH = heights.reduce((s, v) => s + v + rowGap, 0);
		const h = headerH + thumbH + padTop + contentH + padBottom;

		this.id =
			id ?? `node_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
		this.typeKey = typeKey ?? "unknown";
		this.w = w;
		this.h = h;
		this.scene = scene;
		this.portRegistry = portRegistry;

		this.group = new THREE.Group();
		this.group.position.set(x, y, 0);
		scene.add(this.group);

		this.shadow = shadowMesh(w, h);
		this.shadow.position.set(SHADOW_REST.x, SHADOW_REST.y, -6);
		this.group.add(this.shadow);

		this.group.add(buildChromeMesh(w, h, headerH, thumbH));

		const icon = roundedRectMesh(14, 14, 4, color);
		icon.position.set(-w / 2 + 22, h / 2 - headerH / 2, 2);
		this.group.add(icon);

		const titleSprite = labelSprite(title, {
			size: 53,
			weight: 700,
			scaleW: 150,
			scaleH: 26,
		});
		titleSprite.position.set(-w / 2 + 34, h / 2 - headerH / 2, 2);
		this.group.add(titleSprite);

		const badge = checkBadge();
		badge.position.set(w / 2 - 34, h / 2 - headerH / 2, 2);
		this.group.add(badge);

		const menu = menuDots();
		menu.position.set(w / 2 - 14, h / 2 - headerH / 2, 2);
		this.group.add(menu);

		const thumbMesh = buildThumb(thumb, color);
		thumbMesh.scale.set(1.35, 1.35, 1);
		thumbMesh.position.set(0, h / 2 - headerH - thumbH / 2, 2);
		this.group.add(thumbMesh);

		let cursorY = h / 2 - headerH - thumbH - padTop;
		rows.forEach((row, i) => {
			const rh = heights[i];
			this.buildBlock(config, row, cursorY - rh / 2, w);
			cursorY -= rh + rowGap;
		});
	}

	private readonly portRegistry: PortRegistry;

	private buildBlock(
		config: GraphConfig,
		block: RowDef,
		midY: number,
		w: number,
	): void {
		if (block.kind === "section") {
			const sp = labelSprite(block.label.toUpperCase(), {
				size: 28,
				weight: 700,
				color: CARD_PALETTE.muted,
				scaleW: 150,
				scaleH: 16,
			});
			sp.position.set(-w / 2 + 22, midY, 2);
			this.group.add(sp);
			return;
		}
		if (block.kind === "pair") {
			this.buildPair(config, block, midY, w);
			return;
		}
		if (block.kind === "checkbox") {
			this.buildCheckbox(block, midY, w);
			return;
		}
		if (block.kind === "segmented") {
			this.buildSegmented(block, midY, w);
			return;
		}
		this.buildPortRow(config, block, midY, w);
	}

	private buildPortRow(
		config: GraphConfig,
		row: PortRowDef,
		midY: number,
		w: number,
	): void {
		if (row.label) {
			const sp = labelSprite(row.label, {
				size: 46,
				weight: 500,
				color: CARD_PALETTE.labelSecondary,
				scaleW: 150,
				scaleH: 22,
			});
			sp.position.set(-w / 2 + 22, midY, 2);
			this.group.add(sp);
		}
		if (row.side === "in" || row.side === "both") {
			this.inPorts.push(
				this.makePort(
					-w / 2,
					midY,
					resolvePortColor(config, row.type, "in"),
					"in",
					row.label || "",
				),
			);
		}
		if (row.side === "out" || row.side === "both") {
			this.outPorts.push(
				this.makePort(
					w / 2,
					midY,
					resolvePortColor(config, row.type, "out"),
					"out",
					row.label || "",
				),
			);
		}
	}

	private buildPair(
		config: GraphConfig,
		block: Extract<RowDef, { kind: "pair" }>,
		midY: number,
		w: number,
	): void {
		const chipW = (w - 44 - 24) / 2;
		const mk = (field: typeof block.a, cx: number) => {
			const g = new THREE.Group();
			g.position.set(cx, midY, 2);
			const lbl = labelSprite(field.label, {
				size: 23,
				weight: 500,
				color: CARD_PALETTE.muted,
				scaleW: chipW,
				scaleH: 12,
			});
			lbl.center.set(0, 0.5);
			lbl.position.set(-chipW / 2, 12, 0);
			g.add(lbl);
			const chip = roundedRectMesh(chipW, 20, 5, CARD_PALETTE.chipBg);
			chip.position.set(0, -4, 0);
			g.add(chip);
			const val = labelSprite(String(field.value), {
				size: 30,
				weight: 600,
				color: CARD_PALETTE.text,
				scaleW: chipW - 10,
				scaleH: 14,
			});
			val.center.set(0, 0.5);
			val.position.set(-chipW / 2 + 8, -4, 0.1);
			g.add(val);
			this.group.add(g);

			if (field.side === "in" || field.side === "both") {
				this.inPorts.push(
					this.makePort(
						cx - chipW / 2 - 10,
						midY,
						resolvePortColor(config, field.type, "in"),
						"in",
						field.label,
					),
				);
			}
			if (field.side === "out" || field.side === "both") {
				this.outPorts.push(
					this.makePort(
						cx + chipW / 2 + 10,
						midY,
						resolvePortColor(config, field.type, "out"),
						"out",
						field.label,
					),
				);
			}
		};
		mk(block.a, -w / 2 + 22 + chipW / 2);
		mk(block.b, w / 2 - 22 - chipW / 2);
		const link = linkIcon();
		link.position.set(0, midY + 4, 2);
		this.group.add(link);
	}

	private buildCheckbox(
		block: Extract<RowDef, { kind: "checkbox" }>,
		midY: number,
		w: number,
	): void {
		const size = 15;
		const canvas = document.createElement("canvas");
		canvas.width = 64;
		canvas.height = 64;
		const ctx = canvas.getContext("2d")!;
		const state = { checked: !!block.checked };
		const tex = new THREE.CanvasTexture(canvas);
		const redraw = () => {
			ctx.clearRect(0, 0, 64, 64);
			const r = 12;
			ctx.fillStyle = state.checked
				? hexToCss(CARD_PALETTE.accent)
				: hexToCss(CARD_PALETTE.checkboxOff);
			ctx.strokeStyle = state.checked
				? hexToCss(CARD_PALETTE.accent)
				: hexToCss(CARD_PALETTE.border);
			ctx.lineWidth = 4;
			ctx.beginPath();
			ctx.moveTo(8 + r, 8);
			ctx.arcTo(56, 8, 56, 56, r);
			ctx.arcTo(56, 56, 8, 56, r);
			ctx.arcTo(8, 56, 8, 8, r);
			ctx.arcTo(8, 8, 56, 8, r);
			ctx.closePath();
			ctx.fill();
			ctx.stroke();
			if (state.checked) {
				ctx.strokeStyle = "#fff";
				ctx.lineWidth = 6;
				ctx.lineCap = "round";
				ctx.lineJoin = "round";
				ctx.beginPath();
				ctx.moveTo(18, 33);
				ctx.lineTo(27, 42);
				ctx.lineTo(48, 20);
				ctx.stroke();
			}
			tex.needsUpdate = true;
		};
		const mesh = new THREE.Mesh(
			new THREE.PlaneGeometry(size, size),
			new THREE.MeshBasicMaterial({ map: tex, transparent: true }),
		);
		mesh.position.set(-w / 2 + 22 + size / 2, midY, 2);
		mesh.userData.checkbox = {
			toggle: () => {
				state.checked = !state.checked;
				redraw();
			},
			get checked() {
				return state.checked;
			},
		};
		this.group.add(mesh);
		redraw();

		const lbl = labelSprite(block.label, {
			size: 46,
			weight: 500,
			color: CARD_PALETTE.labelSecondary,
			scaleW: 150,
			scaleH: 22,
		});
		lbl.position.set(-w / 2 + 22 + size + 8, midY, 2);
		this.group.add(lbl);
	}

	private buildSegmented(
		block: Extract<RowDef, { kind: "segmented" }>,
		midY: number,
		w: number,
	): void {
		const n = block.options.length;
		const gap = 3;
		const segW = (w - 44 - gap * (n - 1)) / n;
		const state = { active: block.active ?? 0 };
		const redraws: Array<() => void> = [];
		block.options.forEach((label, i) => {
			const cx = -w / 2 + 22 + segW / 2 + i * (segW + gap);
			const canvas = document.createElement("canvas");
			canvas.width = 128;
			canvas.height = 64;
			const ctx = canvas.getContext("2d")!;
			const tex = new THREE.CanvasTexture(canvas);
			const redraw = () => {
				const active = state.active === i;
				ctx.clearRect(0, 0, 128, 64);
				ctx.fillStyle = active
					? hexToCss(CARD_PALETTE.accent)
					: hexToCss(CARD_PALETTE.dropdownOff);
				ctx.beginPath();
				ctx.roundRect(2, 8, 124, 48, 8);
				ctx.fill();
				ctx.fillStyle = active ? "#ffffff" : CARD_PALETTE.muted;
				ctx.font = "600 30px system-ui, Arial";
				ctx.textAlign = "center";
				ctx.textBaseline = "middle";
				ctx.fillText(label, 64, 34);
				tex.needsUpdate = true;
			};
			const mesh = new THREE.Mesh(
				new THREE.PlaneGeometry(segW, 24),
				new THREE.MeshBasicMaterial({ map: tex, transparent: true }),
			);
			mesh.position.set(cx, midY, 2);
			mesh.userData.segButton = {
				activate: () => {
					state.active = i;
					redraws.forEach((fn) => fn());
				},
			};
			this.group.add(mesh);
			redraws.push(redraw);
			redraw();
		});
	}

	private makePort(
		x: number,
		y: number,
		color: number,
		kind: PortKind,
		label: string,
	): PortObject {
		const g = new THREE.Group() as PortObject;
		g.position.set(x, y, 3);
		g.userData.port = { node: this, kind, label, color };
		// El halo (c2) es el mesh individual que detecta el raycaster: barato y ya
		// cubre el área clicable. El disco sólido interior vive en el InstancedMesh
		// compartido (PortRegistry) — mismo área visual, sin coste de otro draw call.
		const c2 = new THREE.Mesh(
			new THREE.CircleGeometry(9, 24),
			new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.22 }),
		);
		g.add(c2);
		this.group.add(g);
		this.portRegistry.register(g, color);
		return g;
	}

	getPort(label: string, kind: PortKind): PortObject | null {
		const list = kind === "out" ? this.outPorts : this.inPorts;
		return list.find((p) => p.userData.port.label === label) ?? null;
	}

	// Traduce liftAmount (el resorte 0↔1, ver ElevationSystem) a los tres efectos
	// visuales de "levantar"/"soltar con rebote": la Z real (recortada a [0,1] para
	// no cruzarse nunca con los cables, que viven en z negativa), un ligero aumento
	// de escala, y una sombra más lejana/oscura — el truco clásico para simular
	// profundidad en una cámara ortográfica que no tiene perspectiva real.
	applyLift(): void {
		const t = this.liftAmount;
		this.group.position.z = THREE.MathUtils.clamp(t, 0, 1) * NODE_Z_LIFTED;
		this.group.scale.setScalar(1 + t * LIFT_SCALE);
		this.shadow.position.set(
			SHADOW_REST.x + (SHADOW_LIFTED.x - SHADOW_REST.x) * t,
			SHADOW_REST.y + (SHADOW_LIFTED.y - SHADOW_REST.y) * t,
			-6,
		);
		const mat = this.shadow.material as THREE.MeshBasicMaterial;
		mat.opacity = THREE.MathUtils.clamp(
			SHADOW_REST.opacity + (SHADOW_LIFTED.opacity - SHADOW_REST.opacity) * t,
			0,
			1,
		);
	}

	// Saca el nodo de la escena y libera geometrías/texturas. Desregistra también
	// sus puertos del InstancedMesh compartido (si no, quedarían "puntos fantasma"
	// congelados en su última posición).
	dispose(): void {
		[...this.inPorts, ...this.outPorts].forEach((p) =>
			this.portRegistry.unregister(p),
		);
		this.group.traverse((obj) => {
			const mesh = obj as THREE.Mesh;
			if (!mesh.isMesh) return;
			mesh.geometry?.dispose();
			const materials = Array.isArray(mesh.material)
				? mesh.material
				: [mesh.material];
			materials.forEach((m) => {
				const withMap = m as THREE.MeshBasicMaterial;
				withMap.map?.dispose();
				m.dispose();
			});
		});
		this.scene.remove(this.group);
	}
}
