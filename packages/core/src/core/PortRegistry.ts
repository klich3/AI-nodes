/*
█▀ █▄█ █▀▀ █░█ █▀▀ █░█
▄█ ░█░ █▄▄ █▀█ ██▄ ▀▄▀

Author: <Anton Sychev> (anton at sychev dot xyz)
PortRegistry.ts (c) 2026
Created:  2026-07-07 04:39:52 
Desc: Registro optimizado de puertos con InstancedMesh para draw calls minimos
*/
import * as THREE from "three";

const CAPACITY = 4096; // margen amplio: nodos añadidos en caliente desde la paleta

const _matrix = new THREE.Matrix4();
const _color = new THREE.Color();
const _pos = new THREE.Vector3();

// El círculo "sólido" de cada puerto (el relleno interior) es el elemento más
// numeroso y más uniforme de toda la escena (misma geometría, solo cambian
// posición y color), así que es el candidato natural a instancing: en vez de un
// Mesh por puerto, todos comparten un único InstancedMesh (1 draw call en vez de
// N). El halo translúcido (c2) se queda como mesh individual porque además de ser
// barato ya es la superficie que usa el raycaster para detectar clics en el
// puerto — instanciarlo complicaría el hit-test sin ahorro real.
//
// La posición de cada instancia se resincroniza entera cada frame (updateAll),
// leyendo la posición de mundo real del puerto: así no hay que acordarse de
// tocar el registro cuando un nodo se arrastra, se eleva de capa o se reordena;
// simplemente siempre está al día.
export class PortRegistry {
	private readonly mesh: THREE.InstancedMesh;
	private readonly ports: THREE.Object3D[] = [];
	private nextIndex = 0;

	constructor(scene: THREE.Scene) {
		const geometry = new THREE.CircleGeometry(6, 24);
		const material = new THREE.MeshBasicMaterial();
		this.mesh = new THREE.InstancedMesh(geometry, material, CAPACITY);
		this.mesh.count = 0;
		// Las instancias cubren todo el grafo (que puede paneards/zoomear libremente);
		// recortar por un bounding volume fijo no ahorraría nada aquí.
		this.mesh.frustumCulled = false;
		scene.add(this.mesh);
	}

	// Reserva una instancia para este puerto y fija su color. Devuelve el índice
	// (no hace falta guardarlo fuera: updateAll() recorre this.ports en orden).
	register(portObject: THREE.Object3D, color: number): void {
		if (this.nextIndex >= CAPACITY) {
			console.warn(
				"PortRegistry: capacidad agotada, este puerto no se instanciará visualmente (el halo sigue funcionando).",
			);
			return;
		}
		const i = this.nextIndex++;
		this.ports[i] = portObject;
		this.mesh.setColorAt(i, _color.setHex(color));
		this.mesh.count = this.nextIndex;
		if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
	}

	updateAll(): void {
		for (let i = 0; i < this.nextIndex; i++) {
			const port = this.ports[i];
			if (!port) continue;
			port.getWorldPosition(_pos);
			_matrix.makeTranslation(_pos.x, _pos.y, _pos.z);
			this.mesh.setMatrixAt(i, _matrix);
		}
		this.mesh.instanceMatrix.needsUpdate = true;
	}

	// Libera la instancia de un puerto eliminado (nodo borrado): mueve la última
	// instancia activa al hueco que deja y reduce el conteo, en vez de dejar un
	// "punto fantasma" congelado en su última posición.
	unregister(portObject: THREE.Object3D): void {
		const idx = this.ports.indexOf(portObject);
		if (idx === -1) return;
		const last = this.nextIndex - 1;
		if (idx !== last) {
			this.ports[idx] = this.ports[last];
			this.mesh.getMatrixAt(last, _matrix);
			this.mesh.setMatrixAt(idx, _matrix);
			this.mesh.getColorAt(last, _color);
			this.mesh.setColorAt(idx, _color);
		}
		this.ports.pop();
		this.nextIndex--;
		this.mesh.count = this.nextIndex;
		this.mesh.instanceMatrix.needsUpdate = true;
		if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
	}

	// Limpia todos los puertos registrados (para importar un grafo nuevo).
	clear(): void {
		this.ports.length = 0;
		this.nextIndex = 0;
		this.mesh.count = 0;
		this.mesh.instanceMatrix.needsUpdate = true;
		if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
	}
}
