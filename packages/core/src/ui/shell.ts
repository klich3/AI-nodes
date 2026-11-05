/*
█▀ █▄█ █▀▀ █░█ █▀▀ █░█ ██▄ ▀▄▀
▄█ ░█░ █▄▄ █▀█ ██▄ ▀▄▀

Author: <Anton Sychev> (anton at sychev dot xyz)
ui/shell.ts (c) 2026
Desc: Construye el DOM de la UI autocontenida del editor (paleta, toolbar, papelera)
*/
import { injectStyles } from "../style";

export interface EditorShell {
	rootEl: HTMLElement;
	canvasHost: HTMLElement;
	paletteEl: HTMLElement;
	paletteListEl: HTMLElement;
	paletteCountEl: HTMLElement;
	typeEditorEl: HTMLElement | null;
	toolbarEl: HTMLElement | null;
	deleteZoneEl: HTMLElement;
}

const TRASH_SVG = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>`;

// Formulario del "Crear tipo de nodo": NodeEditorType busca sus campos por clases
// .ne-* dentro de este rootEl, así que aquí solo se construye el markup estático.
function buildTypeEditorForm(): HTMLElement {
	const details = document.createElement("details");
	details.className = "ne-type-editor";
	const summary = document.createElement("summary");
	summary.textContent = "+ Crear tipo de nodo";
	const body = document.createElement("div");
	body.className = "ne-type-editor-body";

	const titleLabel = document.createElement("label");
	titleLabel.textContent = "Título";
	const titleInput = document.createElement("input");
	titleInput.type = "text";
	titleInput.className = "ne-title";
	titleInput.placeholder = "Mi nodo";
	titleLabel.appendChild(titleInput);

	const colorLabel = document.createElement("label");
	colorLabel.textContent = "Color de cabecera";
	const colorInput = document.createElement("input");
	colorInput.type = "color";
	colorInput.className = "ne-color";
	colorInput.value = "#5b8def";
	colorLabel.appendChild(colorInput);

	const rowsEl = document.createElement("div");
	rowsEl.className = "ne-rows";

	const addRowBtn = document.createElement("button");
	addRowBtn.type = "button";
	addRowBtn.className = "ne-add-row";
	addRowBtn.textContent = "+ Añadir fila (puerto)";

	const createBtn = document.createElement("button");
	createBtn.type = "button";
	createBtn.className = "ne-create";
	createBtn.textContent = "Crear nodo";

	const jsonEl = document.createElement("pre");
	jsonEl.className = "ne-json";

	body.append(titleLabel, colorLabel, rowsEl, addRowBtn, createBtn, jsonEl);
	details.append(summary, body);
	return details;
}

// El markup es estático y lo controla el paquete; el SVG de la papelera no lleva
// datos del usuario, por eso innerHTML aquí es seguro.
export function buildEditorShell(
	opts: {
		palette: boolean;
		toolbar: boolean;
		deleteZone: boolean;
		typeEditor: boolean;
	},
): EditorShell {
	injectStyles();

	const rootEl = document.createElement("div");
	rootEl.className = "ne-root";
	rootEl.style.width = "100%";
	rootEl.style.height = "100%";

	const canvasHost = document.createElement("div");
	canvasHost.className = "ne-canvas";
	canvasHost.style.position = "absolute";
	canvasHost.style.inset = "0";
	rootEl.appendChild(canvasHost);

	let paletteEl: HTMLElement | null = null;
	let paletteListEl: HTMLElement | null = null;
	let paletteCountEl: HTMLElement | null = null;
	let typeEditorEl: HTMLElement | null = null;
	if (opts.palette) {
		paletteEl = document.createElement("div");
		paletteEl.className = "ne-palette";
		const title = document.createElement("strong");
		title.textContent = "Añadir nodo";
		paletteListEl = document.createElement("div");
		paletteListEl.className = "ne-palette-list";
		paletteCountEl = document.createElement("div");
		paletteCountEl.className = "ne-palette-count";

		if (opts.typeEditor) typeEditorEl = buildTypeEditorForm();
		paletteEl.append(
			title,
			paletteListEl,
			paletteCountEl,
			...(typeEditorEl ? [typeEditorEl] : []),
		);
		rootEl.appendChild(paletteEl);
	}

	let toolbarEl: HTMLElement | null = null;
	if (opts.toolbar) {
		toolbarEl = document.createElement("div");
		toolbarEl.className = "ne-toolbar";
		rootEl.appendChild(toolbarEl);
	}

	let deleteZoneEl: HTMLElement;
	if (opts.deleteZone) {
		deleteZoneEl = document.createElement("div");
		deleteZoneEl.className = "ne-delete-zone";
		deleteZoneEl.innerHTML = TRASH_SVG;
		const label = document.createElement("span");
		label.textContent = "Soltar aquí para eliminar";
		deleteZoneEl.appendChild(label);
	} else {
		// Elemento fuera del flujo y nunca visible: InputController siempre necesita
		// un rect contra el que medir el drop; con la papelera desactivada ese rect
		// vacío hace que isOverDeleteZone devuelva false en cualquier punto.
		deleteZoneEl = document.createElement("div");
		deleteZoneEl.style.display = "none";
	}
	rootEl.appendChild(deleteZoneEl);

	return {
		rootEl,
		canvasHost,
		paletteEl: paletteEl!,
		paletteListEl: paletteListEl!,
		paletteCountEl: paletteCountEl!,
		typeEditorEl,
		toolbarEl,
		deleteZoneEl,
	};
}

export { buildTypeEditorForm };
