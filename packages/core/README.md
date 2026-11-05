# @node-editor/core

Motor del editor de nodos 2D sobre Three.js, sin dependencia de framework. Renderiza
la escena WebGL y se construye su propia UI (paleta, toolbar, papelera, editor de
tipos) dentro del contenedor que le pases, con estilos aislados bajo clases `.ne-*`.

```bash
npm i @node-editor/core three
```

```ts
import { NodeEditorEngine, defaultGraphConfig } from "@node-editor/core";

const engine = new NodeEditorEngine(document.getElementById("app")!, {
	config: structuredClone(defaultGraphConfig), // opcional: arranca vacío si se omite
	theme: "dark",
	ui: { palette: true, toolbar: true, typeEditor: true, deleteZone: true },
});

// API
engine.exportJson(); // GraphExport (nodeTypes + portTypes + graph)
engine.importJson(data);
engine.downloadJson();
engine.setTheme("light");
engine.toggleTheme();
engine.relaxCables();
engine.tenseCables();
engine.reorderNodes();
engine.addNodeType(key, def);
const off = engine.on("change", (payload) => {}); // 'change' | 'nodeDeleted'
off();
engine.destroy(); // limpia listeners, rAF, geometrias, texturas y el DOM
```

## Opciones

| opción | tipo | por defecto | descripción |
| --- | --- | --- | --- |
| `config` | `GraphConfig` | grafo vacío | catálogo de tipos + grafo inicial |
| `theme` | `"dark" \| "light"` | `"dark"` | tema inicial |
| `ui.palette` | `boolean` | `true` | paleta de nodos arrastrables |
| `ui.toolbar` | `boolean` | `true` | barra de acciones (export/import/tema…) |
| `ui.typeEditor` | `boolean` | `true` | formulario "crear tipo de nodo" |
| `ui.deleteZone` | `boolean` | `true` | papelera para eliminar arrastrando |
| `onNotify` | `(msg: string) => void` | `window.alert` | avisos de validación |

El tamaño se mide en el contenedor (`ResizeObserver`), así que funciona en cualquier
layout. SSR: importable en Node; todo el acceso a DOM/WebGL ocurre en el constructor.

Wrappers listos: [`@node-editor/vue`](../vue), [`@node-editor/nuxt`](../nuxt), [`@node-editor/react`](../react).
