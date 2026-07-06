/*
█▀ █▄█ █▀▀ █░█ █▀▀ █░█
▄█ ░█░ █▄▄ █▀█ ██▄ ▀▄▀

Author: <Anton Sychev> (anton at sychev dot xyz)
viewport.ts (c) 2026
Created:  2026-07-07 04:39:57 
Desc: Utilidades de viewport y conversion coordenadas pantalla-mundo
*/
import * as THREE from "three";

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
const hitPt = new THREE.Vector3();

// Proyecta una coordenada de pantalla (clientX/clientY) sobre el plano z=0 del mundo.
// Único punto de conversión, usado tanto por el control de puntero (pan/drag/cable)
// como por el listado de nodos (arrastrar un item hasta el canvas).
export function screenToWorld(
	camera: THREE.OrthographicCamera,
	x: number,
	y: number,
): THREE.Vector3 {
	pointer.x = (x / window.innerWidth) * 2 - 1;
	pointer.y = -(y / window.innerHeight) * 2 + 1;
	raycaster.setFromCamera(pointer, camera);
	raycaster.ray.intersectPlane(plane, hitPt);
	return hitPt.clone();
}
