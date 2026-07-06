import type { GraphConfig, NodeTypeDef, PortSide, RowDef } from '../core/types';

export interface NodeTypeEditorDeps {
  config: GraphConfig;
  rootEl: HTMLElement;
  onCreate: (key: string, def: NodeTypeDef) => void;
}

const SIDES: PortSide[] = ['in', 'out', 'both'];

// Formulario para dar de alta un tipo de nodo nuevo: título, color y filas (cada una
// con su lado in/out/both y, opcionalmente, un tipo de dato de config.portTypes para
// heredar su color). "Crear nodo" genera el mismo objeto JSON que un NodeTypeDef del
// catálogo y lo añade en caliente a config.nodeTypes + al listado (via onCreate).
export class NodeTypeEditor {
  private readonly rowsEl: HTMLElement;
  private readonly jsonEl: HTMLElement;
  private readonly titleInput: HTMLInputElement;
  private readonly colorInput: HTMLInputElement;

  constructor(private readonly deps: NodeTypeEditorDeps) {
    this.rowsEl = this.query('#ne-rows');
    this.jsonEl = this.query('#ne-json');
    this.titleInput = this.query<HTMLInputElement>('#ne-title');
    this.colorInput = this.query<HTMLInputElement>('#ne-color');

    this.query('#ne-add-row').addEventListener('click', () => this.addRow());
    this.query('#ne-create').addEventListener('click', () => this.create());

    this.addRow();
  }

  private query<T extends HTMLElement = HTMLElement>(selector: string): T {
    const el = this.deps.rootEl.querySelector<T>(selector);
    if (!el) throw new Error(`NodeTypeEditor: no se encontró ${selector}`);
    return el;
  }

  private addRow(initial: Partial<RowDef> = {}): void {
    const row = document.createElement('div');
    row.className = 'ne-row';

    const labelInput = document.createElement('input');
    labelInput.type = 'text';
    labelInput.className = 'ne-row-label';
    labelInput.placeholder = 'Nombre del puerto';
    labelInput.value = initial.label ?? '';

    const sideSelect = document.createElement('select');
    sideSelect.className = 'ne-row-side';
    SIDES.forEach((s) => {
      const o = document.createElement('option');
      o.value = s;
      o.textContent = s;
      sideSelect.appendChild(o);
    });
    sideSelect.value = initial.side ?? 'in';

    const typeSelect = document.createElement('select');
    typeSelect.className = 'ne-row-type';
    const noneOpt = document.createElement('option');
    noneOpt.value = '';
    noneOpt.textContent = '(color por defecto)';
    typeSelect.appendChild(noneOpt);
    Object.keys(this.deps.config.portTypes).forEach((t) => {
      const o = document.createElement('option');
      o.value = t;
      o.textContent = t;
      typeSelect.appendChild(o);
    });
    typeSelect.value = initial.type ?? '';

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'ne-row-remove';
    removeBtn.textContent = '✕';
    removeBtn.addEventListener('click', () => {
      row.remove();
      this.updateJsonPreview();
    });

    [labelInput, sideSelect, typeSelect].forEach((el) =>
      el.addEventListener('input', () => this.updateJsonPreview())
    );
    row.append(labelInput, sideSelect, typeSelect, removeBtn);
    this.rowsEl.appendChild(row);
    this.updateJsonPreview();
  }

  private readForm(): NodeTypeDef {
    const title = this.titleInput.value.trim() || 'Nodo';
    const color = this.colorInput.value;
    const rows: RowDef[] = Array.from(this.rowsEl.querySelectorAll<HTMLDivElement>('.ne-row'))
      .map((row) => {
        const label = row.querySelector<HTMLInputElement>('.ne-row-label')!.value.trim();
        const side = row.querySelector<HTMLSelectElement>('.ne-row-side')!.value as PortSide;
        const type = row.querySelector<HTMLSelectElement>('.ne-row-type')!.value;
        const def: RowDef = { label, side };
        if (type) def.type = type;
        return def;
      })
      .filter((r) => r.label);
    return { title, color, rows };
  }

  private updateJsonPreview(): void {
    this.jsonEl.textContent = JSON.stringify(this.readForm(), null, 2);
  }

  // Genera un identificador único (clave de config.nodeTypes) a partir del título,
  // en minúsculas y camelCase, evitando choques con tipos ya existentes.
  private slugify(title: string): string {
    const words = title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim()
      .split(' ')
      .filter(Boolean);
    const base = words.map((w, i) => (i === 0 ? w : w[0].toUpperCase() + w.slice(1))).join('') || 'nodo';
    let key = base;
    let n = 2;
    while (this.deps.config.nodeTypes[key]) key = base + n++;
    return key;
  }

  private create(): void {
    const def = this.readForm();
    if (!def.rows.length) {
      window.alert('Añade al menos una fila con nombre de puerto.');
      return;
    }
    const key = this.slugify(def.title);
    this.deps.config.nodeTypes[key] = def;
    this.deps.onCreate(key, def);

    this.titleInput.value = '';
    this.rowsEl.innerHTML = '';
    this.addRow();
  }
}
