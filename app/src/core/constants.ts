/*
█▀ █▄█ █▀▀ █░█ █▀▀ █░█
▄█ ░█░ █▄▄ █▀█ ██▄ ▀▄▀

Author: <Anton Sychev> (anton at sychev dot xyz)
constants.ts (c) 2026
Created:  2026-07-07 04:39:48 
Desc: Constantes globales y paleta de la tarjeta de nodo
*/
// El cuerpo/cabecera de los nodos vive en z=0..3; el cordón de los cables se apoya
// por detrás (z negativa) para que pase "por debajo" de los nodos, y el enchufe se
// queda por delante de todo, como una pieza siempre visible en el puerto. Los valores
// "_LIFTED" son la profundidad mientras se arrastra un nodo (sobrepone a todo lo demás).
export const NODE_Z = 0;
export const NODE_Z_LIFTED = 60;
export const CABLE_Z = -2;
export const CABLE_Z_LIFTED = 64;
export const PLUG_Z = 7;
export const PLUG_Z_LIFTED = 65;

// Hueco mínimo entre cajas de nodos que la física de repulsión intenta mantener.
export const NODE_GAP = 26;

// Decaimiento de velocidad por frame para el deslizamiento tipo "gota de agua"
// al reacomodar nodos que se solapan.
export const MOTION_DAMPING = 0.86;

// Paleta de la tarjeta de nodo (sample4.html): fondo, cabecera, borde y acento,
// como colores THREE (hex int) y su equivalente CSS para dibujar en canvas 2D.
// Mutable para soportar cambio de tema (ver ThemeManager).
export const CARD_PALETTE: {
	bg: number;
	header: number;
	border: number;
	accent: number;
	text: string;
	muted: string;
	chipBg: number;
	checkboxOff: number;
	dropdownOff: number;
	labelSecondary: string;
} = {
	bg: 0x24262b,
	header: 0x2b2d33,
	border: 0x3a3d44,
	accent: 0x5b8def,
	text: "#e7edf9",
	muted: "#9aa0ab",
	chipBg: 0x33353c,
	checkboxOff: 0x33353c,
	dropdownOff: 0x2f3138,
	labelSecondary: "#c7c9cf",
};

export function hexToCss(hex: number): string {
	return "#" + hex.toString(16).padStart(6, "0");
}
