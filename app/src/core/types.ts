export type PortSide = 'in' | 'out' | 'both';

export interface RowDef {
  label: string;
  side: PortSide;
  type?: string;
}

export interface NodeTypeDef {
  title: string;
  color: string;
  rows: RowDef[];
  withThumb?: boolean;
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
