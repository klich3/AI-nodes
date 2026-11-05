# @node-editor/react

Componente React para el editor de nodos Three.js. Construido sobre `@node-editor/core`.

```bash
npm i @node-editor/react @node-editor/core three
```

## Uso con `<NodeEditor>`

```tsx
import { NodeEditor, type GraphExport } from "@node-editor/react";
import { defaultGraphConfig } from "@node-editor/core";

export function App() {
	return (
		<div style={{ height: "100vh" }}>
			<NodeEditor
				config={defaultGraphConfig}
				theme="dark"
				onChange={(g: GraphExport) => console.log(g.graph.nodes.length)}
				onNodeDeleted={(id) => console.log(id)}
				onReady={(engine) => console.log(engine)}
			/>
		</div>
	);
}
```

- **props**: cualquier `NodeEditorOptions` del core (`config`, `theme`, `ui.*`, `onNotify`) + `className`, `style`, `onChange`, `onNodeDeleted`, `onReady`.
- Los callbacks pueden ser inline: no provocan re-montaje del engine.
- `ref` expone `getEngine()`, `exportJson()` e `importJson(data)`.
- Compatible con StrictMode (doble montaje en dev crea/destruye limpio).

## Hook

```tsx
import { useNodeEditor } from "@node-editor/react";

function App() {
	const { hostRef, engine } = useNodeEditor({ theme: "light" });
	return <div ref={hostRef} style={{ height: "100vh" }} />;
}
```

El div host queda vacío desde el punto de vista de React: el engine gestiona su
propio DOM interno, así que no hay colisión de reconciliación.
