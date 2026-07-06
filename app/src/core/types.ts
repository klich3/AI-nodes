export type PortSide = 'in' | 'out' | 'both';

// Fila de puerto "clásica": conecta con un cable. `kind` es opcional (por defecto
// 'port') para no romper el JSON ya existente que no lo especifica.
export interface PortRowDef {
  kind?: 'port';
  label: string;
  side: PortSide;
  type?: string;
}

export interface SectionBlockDef {
  kind: 'section';
  label: string;
}

// Par de campos enlazados (p.ej. Width/Height) con icono de cadena entre medias.
// Cada lado puede llevar su propio puerto conectable (side/type), igual que un
// PortRowDef normal.
export interface PairFieldDef {
  label: string;
  value: number | string;
  side?: PortSide;
  type?: string;
}
export interface PairBlockDef {
  kind: 'pair';
  a: PairFieldDef;
  b: PairFieldDef;
}

export interface CheckboxBlockDef {
  kind: 'checkbox';
  label: string;
  checked?: boolean;
}

export interface SegmentedBlockDef {
  kind: 'segmented';
  options: string[];
  active?: number;
}

export type RowDef = PortRowDef | SectionBlockDef | PairBlockDef | CheckboxBlockDef | SegmentedBlockDef;

// Claves de los generadores de miniatura definidos en core/thumbnails.ts. `random`
// reproduce el preview con tono aleatorio que ya tenía "Noise"; si no se indica,
// NodeView usa un swatch genérico con el color de cabecera del tipo.
export type ThumbKind = 'box' | 'grid' | 'bars' | 'random';

export interface NodeTypeDef {
  title: string;
  color: string;
  rows: RowDef[];
  thumb?: ThumbKind;
}

export interface PortTypeDef {
  color: string;
}

export interface GraphNodeDef {
  id: string;
  type: string;
  x: number;
  y: number;
  w?: number;
}

export interface GraphEdgeDef {
  from: [string, string];
  to: [string, string];
}

export interface GraphConfig {
  portTypes: Record<string, PortTypeDef>;
  nodeTypes: Record<string, NodeTypeDef>;
  graph: {
    nodes: GraphNodeDef[];
    edges: GraphEdgeDef[];
  };
}
