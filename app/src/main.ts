import * as THREE from "three";
import graphConfigJson from "./config/graph.json";
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
import {
	exportGraphToJson,
	downloadJson,
	loadJsonFile,
} from "./core/serializer";
import { Cable } from "./core/Cable";
import type { NodeView } from "./core/NodeView";
import { ThemeManager } from "./core/ThemeManager";
import { CARD_PALETTE } from "./core/constants";
import "./style.css";

// El JSON infiere tuplas ["a","b"] como string[] genérico; el cast pasa por
// `unknown` porque la forma estructural real coincide con GraphConfig.
const config = graphConfigJson as unknown as GraphConfig;

const app = document.getElementById("app")!;
const scene = new THREE.Scene();

const camera = new THREE.OrthographicCamera(
	-window.innerWidth / 2,
	window.innerWidth / 2,
	window.innerHeight / 2,
	-window.innerHeight / 2,
	0.1,
	3000,
);
camera.position.z = 1000;

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setClearColor(0x1a1b1e, 1);
app.appendChild(renderer.domElement);

scene.add(new THREE.AmbientLight(0xffffff, 2.6));
const light = new THREE.PointLight(0xffffff, 1.0, 3000);
light.position.set(-200, 200, 600);
scene.add(light);

const grid = new THREE.GridHelper(3000, 60, 0x2a2c31, 0x212226);
grid.rotation.x = Math.PI / 2;
grid.position.z = -80;
scene.add(grid);

// --- Theme manager ---
const themeManager = new ThemeManager();
themeManager.onChange((_name, colors) => {
	// Renderer background
	renderer.setClearColor(colors.clearColor, 1);
	// Grid
	(grid.material as THREE.Material).dispose();
	scene.remove(grid);
	const newGrid = new THREE.GridHelper(
		3000,
		60,
		colors.gridColor1,
		colors.gridColor2,
	);
	newGrid.rotation.x = Math.PI / 2;
	newGrid.position.z = -80;
	scene.add(newGrid);
	// Update grid reference in animate loop (no need, it's a new object in scene)
	// Card palette
	CARD_PALETTE.bg = colors.cardBg;
	CARD_PALETTE.header = colors.cardHeader;
	CARD_PALETTE.border = colors.cardBorder;
	CARD_PALETTE.accent = colors.cardAccent;
	CARD_PALETTE.text = colors.cardText;
	CARD_PALETTE.muted = colors.cardMuted;
	// CSS custom properties
	document.documentElement.setAttribute("data-theme", _name);
});

// Todos los círculos internos de los puertos comparten un único InstancedMesh
// (ver core/PortRegistry.ts): 1 draw call para ese elemento en vez de uno por
// puerto. updateAll() se llama una vez por frame para mantener sus posiciones
// al día sin tener que tocar este código cada vez que se arrastra/eleva un nodo.
const portRegistry = new PortRegistry(scene);

let { nodes, cables } = buildGraph(scene, config, portRegistry);

const input = new InputController({
	renderer,
	camera,
	scene,
	nodes,
	cables,
	deleteZoneEl: document.getElementById("delete-zone")!,
	onNodeDeleted: () => palette.updateCount(),
});

const palette = new Palette({
	scene,
	camera,
	config,
	portRegistry,
	nodes,
	input,
	listEl: document.getElementById("palette-list")!,
	countEl: document.getElementById("palette-count")!,
});

new NodeTypeEditor({
	config,
	rootEl: document.getElementById("node-type-editor")!,
	onCreate: (key, def) => palette.addItem(key, def),
});

// --- Toolbar actions ---

function relaxCables(): void {
	cables.forEach((c) => c.relax());
}

function tenseCables(): void {
	cables.forEach((c) => c.tense());
}

function toggleTheme(): void {
	themeManager.toggle();
}

function doReorderNodes(): void {
	reorderNodes(nodes);
}

function doExportJson(): void {
	const data = exportGraphToJson(nodes, cables);
	downloadJson(
		{ nodeTypes: config.nodeTypes, portTypes: config.portTypes, graph: data },
		"graph-export.json",
	);
}

async function doImportJson(): Promise<void> {
	try {
		const data = await loadJsonFile<{
			nodeTypes?: unknown;
			portTypes?: unknown;
			graph?: {
				nodes: Array<{
					id: string;
					type: string;
					x: number;
					y: number;
					w?: number;
				}>;
				edges: Array<{ from: [string, string]; to: [string, string] }>;
			};
		}>();
		if (!data.graph) return;

		// Limpia nodos y cables existentes
		nodes.forEach((n) => n.dispose());
		cables.forEach((c) => c.dispose());
		nodes.length = 0;
		cables.length = 0;
		portRegistry.clear();

		// Reconstruye nodos
		const nodeMap = new Map<string, NodeView>();
		data.graph.nodes.forEach((n) => {
			const view = instantiateNodeType(
				scene,
				config,
				portRegistry,
				n.type,
				n.x,
				n.y,
				n.w,
				n.id,
			);
			if (view) {
				nodes.push(view);
				nodeMap.set(n.id, view);
			}
		});

		// Reconstruye cables
		data.graph.edges.forEach((edge) => {
			const [fromId, fromLabel] = edge.from;
			const [toId, toLabel] = edge.to;
			const outPort = nodeMap.get(fromId)?.getPort(fromLabel, "out");
			const inPort = nodeMap.get(toId)?.getPort(toLabel, "in");
			if (outPort && inPort) {
				cables.push(new Cable({ scene, nodes }, outPort, inPort));
			}
		});

		// Actualiza referencias en input
		input.updateReferences(nodes, cables);
		palette.updateCount();
	} catch (err) {
		console.error("Error importing JSON:", err);
	}
}

new Toolbar(document.getElementById("toolbar")!, {
	onRelaxCables: relaxCables,
	onTenseCables: tenseCables,
	onReorderNodes: doReorderNodes,
	onToggleTheme: toggleTheme,
	onExportJson: doExportJson,
	onImportJson: doImportJson,
});

function animate(): void {
	requestAnimationFrame(animate);
	integrateNodeMotion(nodes);
	integrateNodeLift(nodes);
	portRegistry.updateAll();
	cables.forEach((c) => c.update());
	renderer.render(scene, camera);
}
animate();
