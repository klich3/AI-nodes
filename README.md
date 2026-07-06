# Node Editor

Editor visual de nodos construido con **Three.js**, **Vite** y **TypeScript**.

![Screenshot](assets/screen.webp)

## Características

- Tarjetas de nodo con sombra, miniatura, checkbox y campos enlazables
- Arrastra nodos desde la paleta al canvas
- Conecta puertos de salida a entrada (mismo color) arrastrando
- Creación de tipos de nodo personalizados desde la UI
- Zona de borrado: arrastra un nodo hasta la esquina inferior derecha para eliminarlo
- Pan del canvas (arrastrar fondo) y zoom (rueda del ratón)
- Elevación y animación física de nodos al interactuar

## Stack

- [Three.js](https://threejs.org/) — renderizado 3D / sprites
- [Vite](https://vitejs.dev/) — bundler y dev server
- [TypeScript](https://www.typescriptlang.org/) — tipado estático

## Uso

```bash
cd app
npm install
npm run dev
```

Abre `http://localhost:5173` en el navegador.

## Estructura

```
app/src/
├── config/        # Definición de nodos (graph.json)
├── core/          # Graph, NodeView, Cable, PortRegistry, shapes, viewport
├── systems/       # InputController, PhysicsSystem, ElevationSystem
├── ui/            # Palette, NodeTypeEditor
└── main.ts        # Entry point
```
