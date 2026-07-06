import * as THREE from 'three';
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js';

// Icono de enchufe: cuerpo redondeado + dos clavijas. El borde de contacto
// (23.196, 16.15 -donde arrancan las clavijas-) es el origen local: coincide
// justo con el puerto. Las clavijas solo se muestran mientras el cable está
// suelto/arrastrando; en cuanto queda enchufado se ocultan (quedan "dentro").
const PLUG_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 35 33">
  <path d="M23.196,11.1838 H31.4802" fill="none" stroke="#970000" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M31.4802,21.1249 H23.196" fill="none" stroke="#970000" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M11.0533,25.2671 L23.196,25.2671 V7.04165 L11.0533,7.04165 C9.81063,7.04178 8.61885,7.5355 7.74013,8.41423 C6.8614,9.29296 6.36767,10.4847 6.36754,11.7274 L6.36754,20.5813 C6.36767,21.824 6.8614,23.0157 7.74012,23.8945 C8.61885,24.7732 9.81062,25.2669 11.0533,25.2671 Z" fill="#ff0000" stroke="#970000" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

export const PLUG_ANCHOR = { x: 23.196, y: 16.15435 };
const PLUG_BACK_X = 6.36754;
export const PLUG_SCALE = 0.9;

// El cuerpo ya queda horizontal (borde de contacto a la derecha), enchufado no
// hace falta ningún giro adicional: el ángulo de "entrada" es 0.
export const PLUG_INTO_ANGLE = 0;

// Distancia (en unidades de mundo) entre el borde de contacto y el extremo trasero
// del cuerpo: la cuerda se para ahí, no en el borde, para "engancharse" al culo del enchufe.
export const PLUG_BODY_LENGTH = (PLUG_ANCHOR.x - PLUG_BACK_X) * PLUG_SCALE;

export const SNAP_RADIUS = 55;

interface PlugGeometries {
  fills: THREE.BufferGeometry[];
  bodyStrokes: THREE.BufferGeometry[];
  prongStrokes: THREE.BufferGeometry[];
}

function buildPlugGeometries(): PlugGeometries {
  const data = new SVGLoader().parse(PLUG_SVG);
  const fills: THREE.BufferGeometry[] = [];
  const bodyStrokes: THREE.BufferGeometry[] = [];
  const prongStrokes: THREE.BufferGeometry[] = [];

  data.paths.forEach((path) => {
    const style = (path.userData as { style: any }).style;
    const isBody = style.fill !== undefined && style.fill !== 'none';
    if (isBody) {
      SVGLoader.createShapes(path).forEach((shape) => {
        const geometry = new THREE.ShapeGeometry(shape);
        geometry.translate(-PLUG_ANCHOR.x, -PLUG_ANCHOR.y, 0);
        fills.push(geometry);
      });
    }
    if (style.stroke !== undefined && style.stroke !== 'none') {
      path.subPaths.forEach((subPath) => {
        const geometry = SVGLoader.pointsToStroke(subPath.getPoints(), style);
        if (geometry) {
          geometry.translate(-PLUG_ANCHOR.x, -PLUG_ANCHOR.y, 0);
          (isBody ? bodyStrokes : prongStrokes).push(geometry);
        }
      });
    }
  });

  return { fills, bodyStrokes, prongStrokes };
}

const PLUG_GEOMETRIES = buildPlugGeometries();

export type PlugMesh = THREE.Group & { userData: { prongs: THREE.Group } };

export function makePlugMesh(color: number | THREE.Color = 0xffffff): PlugMesh {
  const g = new THREE.Group() as PlugMesh;
  const fillColor = new THREE.Color(color);
  const strokeColor = fillColor.clone().multiplyScalar(0.55);
  const fillMat = new THREE.MeshBasicMaterial({ color: fillColor });
  const strokeMat = new THREE.MeshBasicMaterial({ color: strokeColor });

  PLUG_GEOMETRIES.fills.forEach((geo) => g.add(new THREE.Mesh(geo, fillMat)));
  PLUG_GEOMETRIES.bodyStrokes.forEach((geo) => {
    const mesh = new THREE.Mesh(geo, strokeMat);
    mesh.position.z = 0.1;
    g.add(mesh);
  });

  const prongs = new THREE.Group();
  PLUG_GEOMETRIES.prongStrokes.forEach((geo) => {
    const mesh = new THREE.Mesh(geo, strokeMat);
    mesh.position.z = 0.1;
    prongs.add(mesh);
  });
  g.add(prongs);
  g.userData.prongs = prongs;
  g.scale.set(PLUG_SCALE, -PLUG_SCALE, PLUG_SCALE);
  return g;
}
