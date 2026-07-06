import * as THREE from 'three';
import graphConfigJson from './config/graph.json';
import type { GraphConfig } from './core/types';
import { buildGraph } from './core/Graph';
import { InputController } from './systems/InputController';
import { integrateNodeMotion } from './systems/PhysicsSystem';
import { Palette } from './ui/Palette';
import { NodeTypeEditor } from './ui/NodeTypeEditor';
import './style.css';

// El JSON infiere tuplas ["a","b"] como string[] genérico; el cast pasa por
// `unknown` porque la forma estructural real coincide con GraphConfig.
const config = graphConfigJson as unknown as GraphConfig;

const app = document.getElementById('app')!;
const scene = new THREE.Scene();

const camera = new THREE.OrthographicCamera(
  -window.innerWidth / 2, window.innerWidth / 2,
  window.innerHeight / 2, -window.innerHeight / 2,
  0.1, 3000
);
camera.position.z = 1000;

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setClearColor(0x24262b, 1);
app.appendChild(renderer.domElement);

scene.add(new THREE.AmbientLight(0xffffff, 2.6));
const light = new THREE.PointLight(0xffffff, 1.0, 3000);
light.position.set(-200, 200, 600);
scene.add(light);

const grid = new THREE.GridHelper(3000, 60, 0x3a3d44, 0x2c2e33);
grid.rotation.x = Math.PI / 2;
grid.position.z = -60;
scene.add(grid);

const { nodes, cables } = buildGraph(scene, config);

const input = new InputController({ renderer, camera, scene, nodes, cables });

const palette = new Palette({
  scene,
  camera,
  config,
  nodes,
  input,
  listEl: document.getElementById('palette-list')!,
  countEl: document.getElementById('palette-count')!,
});

new NodeTypeEditor({
  config,
  rootEl: document.getElementById('node-type-editor')!,
  onCreate: (key, def) => palette.addItem(key, def),
});

function animate(): void {
  requestAnimationFrame(animate);
  integrateNodeMotion(nodes);
  cables.forEach((c) => c.update());
  renderer.render(scene, camera);
}
animate();
