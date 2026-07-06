// Gestor de temas light/dark. Controla los colores del renderer, el CSS del UI
// y la paleta de las tarjetas de nodo.
export type ThemeName = "dark" | "light";

export interface ThemeColors {
	// Renderer
	clearColor: number;
	// CSS UI
	cssBg: string;
	cssPanelBg: string;
	cssPanelBorder: string;
	cssText: string;
	cssTextMuted: string;
	cssBtnBg: string;
	cssBtnBorder: string;
	cssBtnHoverBg: string;
	cssInputBg: string;
	cssInputBorder: string;
	cssJsonBg: string;
	cssJsonText: string;
	// Card palette (Three.js)
	cardBg: number;
	cardHeader: number;
	cardBorder: number;
	cardAccent: number;
	cardText: string;
	cardMuted: string;
	// Grid
	gridColor1: number;
	gridColor2: number;
}

export const DARK_THEME: ThemeColors = {
	clearColor: 0x1a1b1e,
	cssBg: "#1a1b1e",
	cssPanelBg: "rgba(30, 32, 36, 0.92)",
	cssPanelBorder: "rgba(255, 255, 255, 0.1)",
	cssText: "#e7edf9",
	cssTextMuted: "#8a8f98",
	cssBtnBg: "rgba(255, 255, 255, 0.06)",
	cssBtnBorder: "rgba(255, 255, 255, 0.1)",
	cssBtnHoverBg: "rgba(255, 255, 255, 0.12)",
	cssInputBg: "rgba(255, 255, 255, 0.06)",
	cssInputBorder: "rgba(255, 255, 255, 0.12)",
	cssJsonBg: "rgba(0, 0, 0, 0.35)",
	cssJsonText: "#9fd15a",
	cardBg: 0x24262b,
	cardHeader: 0x2b2d33,
	cardBorder: 0x3a3d44,
	cardAccent: 0x5b8def,
	cardText: "#e7edf9",
	cardMuted: "#9aa0ab",
	gridColor1: 0x2a2c31,
	gridColor2: 0x212226,
};

export const LIGHT_THEME: ThemeColors = {
	clearColor: 0xf0f1f4,
	cssBg: "#f0f1f4",
	cssPanelBg: "rgba(255, 255, 255, 0.92)",
	cssPanelBorder: "rgba(0, 0, 0, 0.1)",
	cssText: "#1a1b1e",
	cssTextMuted: "#6b7280",
	cssBtnBg: "rgba(0, 0, 0, 0.04)",
	cssBtnBorder: "rgba(0, 0, 0, 0.1)",
	cssBtnHoverBg: "rgba(0, 0, 0, 0.08)",
	cssInputBg: "rgba(0, 0, 0, 0.04)",
	cssInputBorder: "rgba(0, 0, 0, 0.12)",
	cssJsonBg: "rgba(0, 0, 0, 0.06)",
	cssJsonText: "#2d6a2e",
	cardBg: 0xffffff,
	cardHeader: 0xf3f4f6,
	cardBorder: 0xd1d5db,
	cardAccent: 0x3d7bf0,
	cardText: "#1a1b1e",
	cardMuted: "#6b7280",
	gridColor1: 0xd8dae0,
	gridColor2: 0xe5e7eb,
};

export type ThemeChangeListener = (
	theme: ThemeName,
	colors: ThemeColors,
) => void;

export class ThemeManager {
	private current: ThemeName = "dark";
	private listeners: ThemeChangeListener[] = [];

	get name(): ThemeName {
		return this.current;
	}

	get colors(): ThemeColors {
		return this.current === "dark" ? DARK_THEME : LIGHT_THEME;
	}

	toggle(): ThemeName {
		this.current = this.current === "dark" ? "light" : "dark";
		this.notify();
		return this.current;
	}

	set(theme: ThemeName): void {
		this.current = theme;
		this.notify();
	}

	onChange(listener: ThemeChangeListener): void {
		this.listeners.push(listener);
	}

	private notify(): void {
		const colors = this.colors;
		this.listeners.forEach((fn) => fn(this.current, colors));
	}
}
