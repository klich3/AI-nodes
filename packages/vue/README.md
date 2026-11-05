# @node-editor/vue

Componente Vue 3 para el editor de nodos Three.js. Construido sobre `@node-editor/core`.

```bash
npm i @node-editor/vue @node-editor/core three
```

## Uso con `<NodeEditor>`

```vue
<script setup lang="ts">
import { ref } from "vue";
import { NodeEditor } from "@node-editor/vue";
import { defaultGraphConfig, type GraphExport, type NodeEditorOptions } from "@node-editor/core";

const options: NodeEditorOptions = {
	config: structuredClone(defaultGraphConfig),
	theme: "dark",
};
const graph = ref<Partial<GraphExport>>();
</script>

<template>
	<!-- el contenedor necesita altura explícita -->
	<NodeEditor v-model="graph" :options="options" style="height: 100vh" />
</template>
```

- **props**: `modelValue` (`GraphExport`, v-model), `options` (`NodeEditorOptions`, solo en el montaje).
- **events**: `update:modelValue`, `change`, `nodeDeleted(id)`, `ready(engine)`.
- Cambiar `modelValue` desde fuera reconstruye el grafo (comparación profunda normalizada, sin bucles).
- `ref` expone `getEngine()` para la API imperativa completa.

## Composable

```ts
import { useNodeEditor } from "@node-editor/vue";

const { host, engine, isReady } = useNodeEditor({ theme: "light" });
// <div ref="host" style="height:100%" /> — el engine se crea en onMounted
// y se destruye automáticamente en onBeforeUnmount.
```

## SSR (Nuxt)

Usa [`@node-editor/nuxt`](../nuxt) en vez de este paquete directamente; el motor
requiere WebGL y solo debe montarse en el cliente.
