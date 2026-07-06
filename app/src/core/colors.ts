import type { PortSide } from './types';

export const DEFAULT_PORT_COLOR: Record<'in' | 'out', number> = {
  in: 0xe0545f,
  out: 0x8ee06a,
};

export function hexToInt(hex: string): number {
  return parseInt(hex.replace('#', ''), 16);
}

export type PortKind = Exclude<PortSide, 'both'>;
