import * as THREE from 'three';
import { CARD_PALETTE, hexToCss } from './constants';

export function roundedRectShape(w: number, h: number, r: number): THREE.Shape {
  const x = -w / 2, y = -h / 2;
  const s = new THREE.Shape();
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

export function roundedRectMesh(
  w: number,
  h: number,
  r: number,
  color: number,
  opts: { opacity?: number } = {}
): THREE.Mesh {
  const mat = new THREE.MeshBasicMaterial({ color, transparent: !!opts.opacity, opacity: opts.opacity ?? 1 });
  return new THREE.Mesh(new THREE.ShapeGeometry(roundedRectShape(w, h, r), 24), mat);
}

export interface LabelSpriteOptions {
  size?: number;
  weight?: number;
  color?: string;
  scaleW?: number;
  scaleH?: number;
}

// Píxeles de canvas por unidad de mundo del sprite. Antes canvasW/canvasH y
// scaleW/scaleH se elegían por separado y casi nunca compartían proporción:
// THREE.Sprite estira ese canvas para llenar exactamente scaleW×scaleH, así que
// cualquier descuadre entre "proporción del canvas" y "proporción del sprite"
// deformaba el texto (normalmente aplastado en altura). Derivar el canvas a
// partir de scaleW/scaleH con un único factor de densidad hace que ambas
// proporciones coincidan siempre, sin más que elegir bien `size`.
const DENSITY = 3.5;

export function labelSprite(text: string, opts: LabelSpriteOptions = {}): THREE.Sprite {
  const { size = 30, weight = 700, color = '#e9e9ec' } = opts;
  const scaleW = opts.scaleW ?? 210;
  const scaleH = opts.scaleH ?? 40;
  const canvasW = Math.round(scaleW * DENSITY);
  const canvasH = Math.round(scaleH * DENSITY);
  const canvas = document.createElement('canvas');
  canvas.width = canvasW;
  canvas.height = canvasH;
  const ctx = canvas.getContext('2d')!;
  ctx.font = `${weight} ${size}px system-ui, Arial`;
  ctx.fillStyle = color;
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 6, canvasH / 2 + 1);
  const tex = new THREE.CanvasTexture(canvas);
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(scaleW, scaleH, 1);
  sprite.center.set(0, 0.5);
  return sprite;
}

export function previewThumb(hue = 0.55): THREE.Mesh {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createLinearGradient(0, 0, 64, 64);
  grad.addColorStop(0, `hsl(${hue * 360}, 70%, 55%)`);
  grad.addColorStop(1, `hsl(${(hue * 360 + 60) % 360}, 70%, 25%)`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 3;
  ctx.strokeRect(1.5, 1.5, 61, 61);
  const tex = new THREE.CanvasTexture(canvas);
  return new THREE.Mesh(
    new THREE.PlaneGeometry(34, 34),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true })
  );
}

// Sombra tipo "tarjeta flotante": rect redondeado con blur de canvas 2D, más grande
// que la tarjeta y ligeramente desplazado, pensado para ir detrás de todo (z negativa).
export function shadowMesh(w: number, h: number): THREE.Mesh {
  const pad = 40;
  const canvas = document.createElement('canvas');
  canvas.width = w + pad * 2;
  canvas.height = h + pad * 2;
  const ctx = canvas.getContext('2d')!;
  ctx.filter = 'blur(14px)';
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  const r = 14, x = pad, y = pad;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  ctx.fill();
  const tex = new THREE.CanvasTexture(canvas);
  return new THREE.Mesh(
    new THREE.PlaneGeometry(canvas.width, canvas.height),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true })
  );
}

// Insignia circular con check, para la cabecera del nodo (decorativa).
export function checkBadge(): THREE.Mesh {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = 'rgba(126,224,138,0.18)';
  ctx.beginPath();
  ctx.arc(32, 32, 30, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#7ee08a';
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(18, 33);
  ctx.lineTo(27, 42);
  ctx.lineTo(46, 20);
  ctx.stroke();
  const tex = new THREE.CanvasTexture(canvas);
  return new THREE.Mesh(new THREE.PlaneGeometry(16, 16), new THREE.MeshBasicMaterial({ map: tex, transparent: true }));
}

// Tres puntos de menú, para la cabecera del nodo (decorativo).
export function menuDots(): THREE.Mesh {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 24;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = CARD_PALETTE.muted;
  [12, 32, 52].forEach((cx) => {
    ctx.beginPath();
    ctx.arc(cx, 12, 3.4, 0, Math.PI * 2);
    ctx.fill();
  });
  const tex = new THREE.CanvasTexture(canvas);
  return new THREE.Mesh(new THREE.PlaneGeometry(20, 8), new THREE.MeshBasicMaterial({ map: tex, transparent: true }));
}

// Icono de cadena entre los dos campos de un PairBlockDef.
export function linkIcon(): THREE.Mesh {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  ctx.strokeStyle = CARD_PALETTE.muted;
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.strokeRect(8, 20, 22, 24);
  ctx.strokeRect(34, 20, 22, 24);
  ctx.beginPath();
  ctx.moveTo(24, 32);
  ctx.lineTo(40, 32);
  ctx.stroke();
  const tex = new THREE.CanvasTexture(canvas);
  return new THREE.Mesh(new THREE.PlaneGeometry(16, 16), new THREE.MeshBasicMaterial({ map: tex, transparent: true }));
}

function thumbCanvasMesh(w: number, h: number, draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void): THREE.Mesh {
  const canvas = document.createElement('canvas');
  canvas.width = w * 4;
  canvas.height = h * 4;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(4, 4);
  draw(ctx, w, h);
  const tex = new THREE.CanvasTexture(canvas);
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true }));
}

// Swatch genérico (rect redondeado en degradado del color de cabecera): thumbnail
// por defecto para cualquier tipo de nodo que no defina uno propio.
export function thumbGeneric(headerColor: number): THREE.Mesh {
  const base = new THREE.Color(headerColor);
  const dark = base.clone().multiplyScalar(0.55);
  return thumbCanvasMesh(40, 40, (ctx, w, h) => {
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, hexToCss(base.getHex()));
    grad.addColorStop(1, hexToCss(dark.getHex()));
    ctx.fillStyle = grad;
    const r = 7, x = w / 2 - 17, y = h / 2 - 17, s = 34;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + s, y, x + s, y + s, r);
    ctx.arcTo(x + s, y + s, x, y + s, r);
    ctx.arcTo(x, y + s, x, y, r);
    ctx.arcTo(x, y, x + s, y, r);
    ctx.closePath();
    ctx.fill();
  });
}

export function thumbGrid(color: string): THREE.Mesh {
  return thumbCanvasMesh(60, 46, (ctx, w, h) => {
    ctx.fillStyle = color;
    const cols = 4, rows = 2, cw = 9, ch = 16, gap = 4;
    const startX = (w - (cols * cw + (cols - 1) * gap)) / 2;
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        const yOff = c % 2 === 0 ? 0 : 6;
        const x = startX + c * (cw + gap);
        const y = (h - ch) / 2 + yOff - 3;
        ctx.beginPath();
        ctx.roundRect(x, y, cw, ch, 2);
        ctx.fill();
      }
    }
  });
}

export function thumbBars(): THREE.Mesh {
  return thumbCanvasMesh(58, 40, (ctx, w) => {
    const colors: [string, string][] = [['#e0545f', '#8ee06a'], ['#e0545f', '#8ee06a'], ['#e0545f', '#8ee06a']];
    const barH = 7, gap = 6;
    const totalH = barH * 3 + gap * 2;
    let y = (40 - totalH) / 2;
    colors.forEach(([c1, c2]) => {
      const grad = ctx.createLinearGradient(0, 0, w, 0);
      grad.addColorStop(0, c1);
      grad.addColorStop(1, c2);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(2, y, w - 4, barH, 3);
      ctx.fill();
      y += barH + gap;
    });
  });
}
