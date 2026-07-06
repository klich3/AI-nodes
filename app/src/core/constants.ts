// El cuerpo/cabecera de los nodos vive en z=0..3; el cordón de los cables se apoya
// por detrás (z negativa) para que pase "por debajo" de los nodos, y el enchufe se
// queda por delante de todo, como una pieza siempre visible en el puerto. Los valores
// "_LIFTED" son la profundidad mientras se arrastra un nodo (sobrepone a todo lo demás).
export const NODE_Z = 0;
export const NODE_Z_LIFTED = 60;
export const CABLE_Z = -2;
export const CABLE_Z_LIFTED = 64;
export const PLUG_Z = 7;
export const PLUG_Z_LIFTED = 65;

// Hueco mínimo entre cajas de nodos que la física de repulsión intenta mantener.
export const NODE_GAP = 26;

// Decaimiento de velocidad por frame para el deslizamiento tipo "gota de agua"
// al reacomodar nodos que se solapan.
export const MOTION_DAMPING = 0.86;
