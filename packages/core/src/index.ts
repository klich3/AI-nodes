/*
█▀ █▄█ █▀▀ █░█ █▀▀ █░█ ██▄ ▀▄▀
▄█ ░█░ █▄▄ █▀█ ██▄ ▀▄▀

Author: <Anton Sychev> (anton at sychev dot xyz)
index.ts (c) 2026
Desc: Punto de entrada publico de @node-editor/core
*/

export { NodeEditorEngine } from "./engine";
export type {
	NodeEditorOptions,
	GraphExport,
} from "./engine";
export { NODE_EDITOR_CSS, injectStyles } from "./style";
export { defaultGraphConfig } from "./config/export";
export * from "./core/types";
export { ThemeManager, DARK_THEME, LIGHT_THEME } from "./core/ThemeManager";
export type { ThemeName, ThemeColors } from "./core/ThemeManager";
export { Cable } from "./core/Cable";
export { NodeView } from "./core/NodeView";
export { exportGraphToJson } from "./core/serializer";
