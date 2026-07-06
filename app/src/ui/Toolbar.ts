/*
█▀ █▄█ █▀▀ █░█ █▀▀ █░█
▄█ ░█░ █▄▄ █▀█ ██▄ ▀▄▀

Author: <Anton Sychev> (anton at sychev dot xyz)
Toolbar.ts (c) 2026
Created:  2026-07-07 04:39:56 
Desc:  Barra de herramientas flotante con acciones: relajar cables, tensar cables, reordenar nodos,  exportar e importar JSON.
*/

export interface ToolbarDeps {
	onRelaxCables: () => void;
	onTenseCables: () => void;
	onReorderNodes: () => void;
	onExportJson: () => void;
	onImportJson: () => void;
	onToggleTheme: () => void;
}

export class Toolbar {
	private readonly el: HTMLElement;

	constructor(rootEl: HTMLElement, deps: ToolbarDeps) {
		this.el = rootEl;
		this.build(deps);
	}

	private build(deps: ToolbarDeps): void {
		const buttons = [
			{ icon: "〰️", label: "Relajar cables", action: deps.onRelaxCables },
			{ icon: "─", label: "Tensar cables", action: deps.onTenseCables },
			{ icon: "⊞", label: "Reordenar nodos", action: deps.onReorderNodes },
			{ icon: "◐", label: "Cambiar tema", action: deps.onToggleTheme },
			{ icon: "↓", label: "Exportar JSON", action: deps.onExportJson },
			{ icon: "↑", label: "Importar JSON", action: deps.onImportJson },
		];

		buttons.forEach(({ icon, label, action }) => {
			const btn = document.createElement("button");
			btn.className = "toolbar-btn";
			btn.title = label;
			btn.innerHTML = `<span class="toolbar-icon">${icon}</span><span class="toolbar-label">${label}</span>`;
			btn.addEventListener("click", action);
			this.el.appendChild(btn);
		});
	}
}
