/*
█▀ █▄█ █▀▀ █░█ █▀▀ █░█ ██▄ ▀▄▀
▄█ ░█░ █▄▄ █▀█ ██▄ ▀▄▀

Author: <Anton Sychev> (anton at sychev dot xyz)
engine.ts (c) 2026
Desc: NodeEditorEngine — bootstrap autocontenido del editor de nodos Three.js,
independiente de framework y de IDs globales del documento
*/

import * as THREE from "three";
import type { GraphConfig } from "./core/types";
import { buildGraph, instantiateNodeType } from "./core/Graph";
import { PortRegistry } from "./core/PortRegistry";
import { InputController } from "./systems/InputController";
import { integrateNodeMotion } from "./systems/PhysicsSystem";
import { integrateNodeLift } from "./systems/ElevationSystem";
import { reorderNodes } from "./systems/LayoutSystem";
import { Palette } from "./ui/Palette";
import { NodeTypeEditor } from "./ui/NodeTypeEditor";
import { Toolbar } from "./ui/Toolbar";
import { buildEditorShell } from "./ui/shell";
import { exportGraphToJson, downloadJson, loadJsonFile } from "./core/serializer";
import { Cable } from "./core/Cable";
import type { NodeView } from "./core/NodeView";
import { ThemeManager, type ThemeName, type ThemeColors } from "./core/ThemeManager";
import { CARD_PALETTE } from "./core/constants";
import { setViewSize } from "./core/viewport";

export interface NodeEditorOptions {
	// Grafo inicial + catálogo de tipos. Si se omite, el editor arranca vacío pero
	// con los tipos por defecto del paquete (para poder añadir nodos igualmente).
	config?: GraphConfig;
	theme?: ThemeName;
	ui?: {
		palette?: boolean;
		toolbar?: boolean;
		typeEditor?: boolean;
		deleteZone?: boolean;
	};
	// Aviso de validación del editor de tipos (por defecto window.alert).
	onNotify?: (message: string) => void;
}

export interface GraphExport {
	nodeTypes: GraphConfig["nodeTypes"];
	portTypes: GraphConfig["portTypes"];
	graph: ReturnType<typeof exportGraphToJson>;
}

type EngineEventMap = {
	change: [GraphExport];
	nodeDeleted: [string];
};

interface LiveState {
	id: string;
	typeKey: string;
	x: number;
	y: number;
	w: number;
}
interface LiveCableState {
	fromId: string;
	fromLabel: string;
	toId: string;
	toLabel: string;
}

const DEFAULT_CONFIG: GraphConfig = {
	portTypes: {},
	nodeTypes: {},
	graph: { nodes: [], edges: [] },
};

// Motor del editor: escena Three.js + UI autocontenida dentro del contenedor que
// le pases. Sustituye al main.ts de la demo (que dependía de IDs fijos del HTML):
// aquí todo el DOM de la UI lo construye el propio engine bajo clases .ne-*, el
// tamaño se mide en el contenedor (ResizeObserver) en vez de window, y destroy()
// libera listeners, geometrias, texturas y el InstancedMesh para poder montar y
// desmontar el editor sin fugas (imprescindible para SPA tipo Vue/React/Nuxt).
export class NodeEditorEngine {
	private readonly scene = new THREE.Scene();
	private readonly camera: THREE.OrthographicCamera;
	private readonly renderer: THREE.WebGLRenderer;
	private readonly grid: THREE.GridHelper;
	private readonly themeManager = new ThemeManager();
	private readonly portRegistry: PortRegistry;
	private readonly shell: ReturnType<typeof buildEditorShell>;
	private readonly resizeObserver: ResizeObserver;
	private readonly listeners: {
		[K in keyof EngineEventMap]: Set<(...args: EngineEventMap[K]) => void>;
	};

	private input!: InputController;
	private palette!: Palette;
	private nodes: NodeView[] = [];
	private cables: Cable[] = [];
	private rafId = 0;
	private destroyed = false;

	readonly config: GraphConfig;

	constructor(container: HTMLElement, options: NodeEditorOptions = {}) {
		this.config = options.config ?? structuredClone(DEFAULT_CONFIG);
		this.listeners = {
			change: new Set(),
			nodeDeleted: new Set(),
		};

		const ui = {
			palette: true,
			toolbar: true,
			typeEditor: true,
			deleteZone: true,
			...options.ui,
		};

		this.shell = buildEditorShell(ui);
		container.appendChild(this.shell.rootEl);

		const rect = this.measure();
		this.camera = new THREE.OrthographicCamera(
			-rect.width / 2,
			rect.width / 2,
			rect.height / 2,
			-rect.height / 2,
			0.1,
			3000,
		);
		this.camera.position.z = 1000;

		this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
		this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
		this.shell.canvasHost.appendChild(this.renderer.domElement);

		this.scene.add(new THREE.AmbientLight(0xffffff, 2.6));
		const light = new THREE.PointLight(0xffffff, 1.0, 3000);
		light.position.set(-200, 200, 600);
		this.scene.add(light);

		this.grid = new THREE.GridHelper(3000, 60, 0x2a2c31, 0x212226);
		this.grid.rotation.x = Math.PI / 2;
		this.grid.position.z = -80;
		this.scene.add(this.grid);

		this.themeManager.onChange((_name, colors) => this.applyThemeColors(colors));
		if (options.theme) this.themeManager.set(options.theme);
		else this.applyThemeColors(this.themeManager.colors);

		this.portRegistry = new PortRegistry(this.scene);
		const built = buildGraph(this.scene, this.config, this.portRegistry);
		this.nodes = built.nodes;
		this.cables = built.cables;

		this.input = new InputController({
			renderer: this.renderer,
			camera: this.camera,
			scene: this.scene,
			nodes: this.nodes,
			cables: this.cables,
			deleteZoneEl: this.shell.deleteZoneEl,
			onNodeDeleted: () => {
				this.palette.updateCount();
				this.emitChange();
			},
		});
		this.input.attach();

		if (this.shell.paletteEl && this.shell.paletteListEl && this.shell.paletteCountEl) {
			this.palette = new Palette({
				scene: this.scene,
				camera: this.camera,
				config: this.config,
				portRegistry: this.portRegistry,
				nodes: this.nodes,
				input: this.input,
				listEl: this.shell.paletteListEl,
				countEl: this.shell.paletteCountEl,
				onNodeAdded: () => this.emitChange(),
			});
		}

		if (this.shell.typeEditorEl) {
			new NodeTypeEditor({
				config: this.config,
				rootEl: this.shell.typeEditorEl,
				onCreate: (key, def) => this.palette?.addItem(key, def),
				onNotify: options.onNotify,
			});
		}

		if (this.shell.toolbarEl) {
			new Toolbar(this.shell.toolbarEl, {
				onRelaxCables: () => this.relaxCables(),
				onTenseCables: () => this.tenseCables(),
				onReorderNodes: () => this.reorderNodes(),
				onToggleTheme: () => this.toggleTheme(),
				onExportJson: () => this.downloadJson(),
				onImportJson: async () => {
					const data = await loadJsonFile<GraphExport>();
					this.importJson(data);
				},
			});
		}

		this.resizeObserver = new ResizeObserver(() => this.handleResize());
		this.resizeObserver.observe(this.shell.rootEl);
		this.handleResize();

		this.animate();
	}

	get theme(): ThemeName {
		return this.themeManager.name;
	}

	// --- API pública ---

	setTheme(theme: ThemeName): void {
		if (this.themeManager.name === theme) return;
		this.themeManager.set(theme);
		this.rebuildFromLiveState();
	}

	toggleTheme(): void {
		this.themeManager.toggle();
		this.rebuildFromLiveState();
	}

	relaxCables(): void {
		this.cables.forEach((c) => c.relax());
	}

	tenseCables(): void {
		this.cables.forEach((c) => c.tense());
	}

	reorderNodes(): void {
		reorderNodes(this.nodes);
		this.emitChange();
	}

	exportJson(): GraphExport {
		return {
			nodeTypes: this.config.nodeTypes,
			portTypes: this.config.portTypes,
			graph: exportGraphToJson(this.nodes, this.cables),
		};
	}

	downloadJson(filename = "graph-export.json"): void {
		downloadJson(this.exportJson(), filename);
	}

	// Reconstruye toda la escena desde un GraphExport (nodos + edges + catálogos).
	importJson(data: Partial<GraphExport>): void {
		if (!data.graph) return;
		if (data.nodeTypes) this.config.nodeTypes = data.nodeTypes;
		if (data.portTypes) this.config.portTypes = data.portTypes;
		this.disposeGraph();
		const nodeMap = new Map<string, NodeView>();
		data.graph.nodes.forEach((n) => {
			const view = instantiateNodeType(
				this.scene,
				this.config,
				this.portRegistry,
				n.type,
				n.x,
				n.y,
				n.w,
				n.id,
			);
			if (view) {
				this.nodes.push(view);
				nodeMap.set(n.id, view);
			}
		});
		this.connectEdges(data.graph.edges, nodeMap);
		this.afterGraphMutation();
	}

	addNodeType(key: string, def: GraphConfig["nodeTypes"][string]): void {
		this.config.nodeTypes[key] = def;
		this.palette?.addItem(key, def);
	}

	on<K extends keyof EngineEventMap>(
		event: K,
		cb: (...args: EngineEventMap[K]) => void,
	): () => void {
		this.listeners[event].add(cb);
		return () => this.listeners[event].delete(cb);
	}

	destroy(): void {
		if (this.destroyed) return;
		this.destroyed = true;
		cancelAnimationFrame(this.rafId);
		this.resizeObserver.disconnect();
		this.input.detach();
		this.disposeGraph();
		this.portRegistry.clear();
		this.renderer.dispose();
		this.shell.rootEl.remove();
	}

	// --- Internos ---

	private measure(): { width: number; height: number } {
		const rect = this.shell.rootEl.getBoundingClientRect();
		return {
			width: Math.max(1, rect.width),
			height: Math.max(1, rect.height),
		};
	}

	private handleResize(): void {
		const { width, height } = this.measure();
		setViewSize(width, height);
		this.input.resize(width, height);
	}

	private applyThemeColors(colors: ThemeColors): void {
		this.renderer.setClearColor(colors.clearColor, 1);
		(this.grid.material as THREE.Material).dispose();
		this.scene.remove(this.grid);
		const newGrid = new THREE.GridHelper(
			3000,
			60,
			colors.gridColor1,
			colors.gridColor2,
		);
		newGrid.rotation.x = Math.PI / 2;
		newGrid.position.z = -80;
		this.scene.add(newGrid);
		CARD_PALETTE.bg = colors.cardBg;
		CARD_PALETTE.header = colors.cardHeader;
		CARD_PALETTE.border = colors.cardBorder;
		CARD_PALETTE.accent = colors.cardAccent;
		CARD_PALETTE.text = colors.cardText;
		CARD_PALETTE.muted = colors.cardMuted;
		CARD_PALETTE.chipBg = colors.cardChipBg;
		CARD_PALETTE.checkboxOff = colors.cardCheckboxOff;
		CARD_PALETTE.dropdownOff = colors.cardDropdownOff;
		CARD_PALETTE.labelSecondary = colors.cardLabelSecondary;
		this.shell.rootEl.setAttribute("data-ne-theme", this.themeManager.name);
	}

	// toggleTheme reconstruye las tarjetas para regenerar sus texturas de canvas
	// con la paleta nueva; guarda primero el estado vivo (posiciones/conexiones)
	// para restarlo después.
	private captureLiveState(): {
		nodeState: LiveState[];
		cableState: LiveCableState[];
	} {
		const nodeState = this.nodes.map((n) => ({
			id: n.id,
			typeKey: n.typeKey,
			x: n.group.position.x,
			y: n.group.position.y,
			w: n.w,
		}));
		const cableState: LiveCableState[] = [];
		this.cables.forEach((c) => {
			if (!c.endPort) return;
			cableState.push({
				fromId: c.startPort.userData.port.node.id,
				fromLabel: c.startPort.userData.port.label,
				toId: c.endPort.userData.port.node.id,
				toLabel: c.endPort.userData.port.label,
			});
		});
		return { nodeState, cableState };
	}

	private rebuildFromLiveState(): void {
		const { nodeState, cableState } = this.captureLiveState();
		this.disposeGraph();
		const nodeMap = new Map<string, NodeView>();
		nodeState.forEach((ns) => {
			const view = instantiateNodeType(
				this.scene,
				this.config,
				this.portRegistry,
				ns.typeKey,
				ns.x,
				ns.y,
				ns.w,
				ns.id,
			);
			if (view) {
				this.nodes.push(view);
				nodeMap.set(ns.id, view);
			}
		});
		this.connectEdges(
			cableState.map((cs) => ({
				from: [cs.fromId, cs.fromLabel] as [string, string],
				to: [cs.toId, cs.toLabel] as [string, string],
			})),
			nodeMap,
		);
		this.afterGraphMutation();
	}

	private connectEdges(
		edges: Array<{ from: [string, string]; to: [string, string] }>,
		nodeMap: Map<string, NodeView>,
	): void {
		edges.forEach((edge) => {
			const [fromId, fromLabel] = edge.from;
			const [toId, toLabel] = edge.to;
			const outPort = nodeMap.get(fromId)?.getPort(fromLabel, "out");
			const inPort = nodeMap.get(toId)?.getPort(toLabel, "in");
			if (outPort && inPort) {
				this.cables.push(
					new Cable({ scene: this.scene, nodes: this.nodes }, outPort, inPort),
				);
			} else console.warn("Edge no resuelta:", edge);
		});
	}

	private disposeGraph(): void {
		this.nodes.forEach((n) => n.dispose());
		this.cables.forEach((c) => c.dispose());
		this.nodes.length = 0;
		this.cables.length = 0;
		this.portRegistry.clear();
	}

	private afterGraphMutation(): void {
		this.input.updateReferences(this.nodes, this.cables);
		this.palette?.updateCount();
		this.emitChange();
	}

	private emitChange(): void {
		const payload = this.exportJson();
		this.listeners.change.forEach((cb) => cb(payload));
	}

	private animate(): void {
		if (this.destroyed) return;
		this.rafId = requestAnimationFrame(() => this.animate());
		integrateNodeMotion(this.nodes);
		integrateNodeLift(this.nodes);
		this.portRegistry.updateAll();
		this.cables.forEach((c) => c.update());
		this.renderer.render(this.scene, this.camera);
	}
}
