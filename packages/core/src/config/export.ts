import type { GraphConfig } from "../core/types";
import graphJson from "./graph.json";

// El JSON infiere tuplas ["a","b"] como string[] genérico; el cast pasa por
// `unknown` porque la forma estructural real coincide con GraphConfig.
export const defaultGraphConfig = graphJson as unknown as GraphConfig;
