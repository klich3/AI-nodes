/*
█▀ █▄█ █▀▀ █░█ █▀▀ █░█ ██▄ ▀▄▀
▄█ ░█░ █▄▄ █▀█ ██▄ ▀▄▀

Author: <Anton Sychev> (anton at sychev dot xyz)
style.ts (c) 2026
Desc: Estilos de la UI del editor, embebidos como string para inyeccion unica.
Todo va scoped bajo .ne-root (el contenedor del engine): el host solo necesita
montar el componente y no cargar CSS aparte.
*/

export const NODE_EDITOR_CSS = `
.ne-root {
  position: relative;
  overflow: hidden;
  font-family: system-ui, sans-serif;
  background: var(--ne-bg, #1a1b1e);
}
.ne-root canvas { display: block; }

.ne-delete-zone {
  position: absolute;
  right: 24px;
  bottom: 24px;
  z-index: 3;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 20px;
  border-radius: 14px;
  background: rgba(224, 84, 95, 0.12);
  border: 2px dashed rgba(224, 84, 95, 0.45);
  color: #ff9797;
  font-size: 13px;
  font-weight: 600;
  opacity: 0;
  transform: translateY(12px) scale(0.94);
  pointer-events: none;
  transition:
    opacity 0.18s ease,
    transform 0.18s ease,
    background 0.12s ease,
    border-color 0.12s ease;
}
.ne-delete-zone.visible { opacity: 1; transform: translateY(0) scale(1); }
.ne-delete-zone.active {
  background: rgba(224, 84, 95, 0.85);
  border-color: #e0545f;
  border-style: solid;
  color: #fff;
  transform: translateY(0) scale(1.06);
}

.ne-palette {
  position: absolute;
  right: 16px;
  top: 16px;
  z-index: 2;
  color: var(--ne-text, #e7edf9);
  background: var(--ne-panel-bg, rgba(30, 32, 36, 0.92));
  padding: 12px;
  border: 1px solid var(--ne-panel-border, rgba(255, 255, 255, 0.1));
  border-radius: 12px;
  width: 230px;
  backdrop-filter: blur(10px);
}
.ne-palette strong { display: block; margin-bottom: 8px; font-size: 14px; }
.ne-palette-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 60vh;
  overflow-y: auto;
}
.ne-palette-item {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--ne-btn-bg, rgba(255, 255, 255, 0.04));
  border: 1px solid var(--ne-btn-border, rgba(255, 255, 255, 0.08));
  border-radius: 8px;
  padding: 7px 9px;
  color: var(--ne-text, #e7edf9);
  font-size: 13px;
  text-align: left;
  cursor: pointer;
  font-family: inherit;
}
.ne-palette-item:hover {
  background: var(--ne-btn-hover-bg, rgba(255, 255, 255, 0.1));
  border-color: rgba(255, 255, 255, 0.2);
}
.ne-palette-item:active { transform: scale(0.98); }
.ne-palette-item .ne-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex: none;
  box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.25) inset;
}
.ne-palette-item .ne-key {
  margin-left: auto;
  color: var(--ne-text-muted, #8a8f98);
  font-size: 11px;
}
.ne-palette-count {
  margin-top: 8px;
  font-size: 12px;
  color: var(--ne-text-muted, #8a8f98);
}

.ne-type-editor {
  margin-top: 10px;
  border-top: 1px solid var(--ne-panel-border, rgba(255, 255, 255, 0.1));
  padding-top: 8px;
}
.ne-type-editor summary {
  cursor: pointer;
  font-size: 13px;
  color: var(--ne-text, #c7c9cf);
  user-select: none;
}
.ne-type-editor-body {
  margin-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.ne-type-editor-body label {
  display: flex;
  flex-direction: column;
  gap: 3px;
  font-size: 11px;
  color: var(--ne-text-muted, #8a8f98);
}
.ne-type-editor-body input[type="text"] {
  background: var(--ne-input-bg, rgba(255, 255, 255, 0.06));
  border: 1px solid var(--ne-input-border, rgba(255, 255, 255, 0.12));
  border-radius: 6px;
  color: var(--ne-text, #e7edf9);
  padding: 5px 7px;
  font-size: 12px;
  font-family: inherit;
}
.ne-type-editor-body input[type="color"] {
  width: 100%;
  height: 26px;
  border: none;
  background: none;
  padding: 0;
  cursor: pointer;
}
.ne-rows { display: flex; flex-direction: column; gap: 4px; }
.ne-row {
  display: grid;
  grid-template-columns: 1fr 54px 92px 18px;
  gap: 4px;
  align-items: center;
}
.ne-row input,
.ne-row select {
  background: var(--ne-input-bg, rgba(255, 255, 255, 0.06));
  border: 1px solid var(--ne-input-border, rgba(255, 255, 255, 0.12));
  border-radius: 5px;
  color: var(--ne-text, #e7edf9);
  padding: 4px 5px;
  font-size: 11px;
  font-family: inherit;
  width: 100%;
}
.ne-row-remove {
  background: none;
  border: none;
  color: #e07070;
  cursor: pointer;
  font-size: 13px;
  padding: 0;
}
.ne-add-row {
  align-self: flex-start;
  background: none;
  border: 1px dashed var(--ne-input-border, rgba(255, 255, 255, 0.25));
  color: var(--ne-text, #c7c9cf);
  border-radius: 6px;
  padding: 4px 8px;
  font-size: 11px;
  cursor: pointer;
  font-family: inherit;
}
.ne-create {
  background: #3d7bf0;
  border: none;
  color: #fff;
  border-radius: 6px;
  padding: 7px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
}
.ne-create:hover { background: #5b8def; }
.ne-json {
  margin: 0;
  background: var(--ne-json-bg, rgba(0, 0, 0, 0.35));
  border-radius: 6px;
  padding: 6px 8px;
  font-size: 10px;
  line-height: 1.4;
  color: var(--ne-json-text, #9fd15a);
  max-height: 120px;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-word;
}

.ne-toolbar {
  position: absolute;
  left: 50%;
  bottom: 24px;
  z-index: 4;
  transform: translateX(-50%);
  display: flex;
  gap: 6px;
  background: var(--ne-panel-bg, rgba(30, 32, 36, 0.92));
  border: 1px solid var(--ne-panel-border, rgba(255, 255, 255, 0.12));
  border-radius: 12px;
  padding: 8px 12px;
  backdrop-filter: blur(10px);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
}
.ne-toolbar-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  background: var(--ne-btn-bg, rgba(255, 255, 255, 0.06));
  border: 1px solid var(--ne-btn-border, rgba(255, 255, 255, 0.1));
  border-radius: 8px;
  padding: 8px 14px;
  color: var(--ne-text, #e7edf9);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  font-family: inherit;
  transition:
    background 0.15s ease,
    border-color 0.15s ease,
    transform 0.1s ease;
}
.ne-toolbar-btn:hover {
  background: var(--ne-btn-hover-bg, rgba(255, 255, 255, 0.12));
  border-color: rgba(255, 255, 255, 0.25);
}
.ne-toolbar-btn:active { transform: scale(0.96); }
.ne-toolbar-icon { font-size: 14px; }
.ne-toolbar-label { white-space: nowrap; }

.ne-root[data-ne-theme="light"] {
  --ne-bg: #f0f1f4;
  --ne-panel-bg: rgba(255, 255, 255, 0.92);
  --ne-panel-border: rgba(0, 0, 0, 0.1);
  --ne-text: #1a1b1e;
  --ne-text-muted: #6b7280;
  --ne-btn-bg: rgba(0, 0, 0, 0.04);
  --ne-btn-border: rgba(0, 0, 0, 0.1);
  --ne-btn-hover-bg: rgba(0, 0, 0, 0.08);
  --ne-input-bg: rgba(0, 0, 0, 0.04);
  --ne-input-border: rgba(0, 0, 0, 0.12);
  --ne-json-bg: rgba(0, 0, 0, 0.06);
  --ne-json-text: #2d6a2e;
}
`;

let injected = false;

// Inyecta los estilos una sola vez por documento (idempotente aunque haya varios
// engines o varias llamadas). Se inserta en <head> antes del primer nodo para que
// no bloquee el pintado del canvas.
export function injectStyles(): void {
	if (injected || typeof document === "undefined") return;
	if (document.getElementById("node-editor-styles")) {
		injected = true;
		return;
	}
	const style = document.createElement("style");
	style.id = "node-editor-styles";
	style.textContent = NODE_EDITOR_CSS;
	document.head.appendChild(style);
	injected = true;
}
