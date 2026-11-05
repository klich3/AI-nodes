# @node-editor/nuxt

Módulo Nuxt 3 para el editor de nodos Three.js. Auto-importa `<NodeEditor>` (solo
cliente, nunca corre en SSR) y el composable `useNodeEditor`.

```bash
npm i @node-editor/nuxt @node-editor/core three
```

```ts
// nuxt.config.ts
export default defineNuxtConfig({
	modules: ["@node-editor/nuxt"],
});
```

```vue
<script setup lang="ts">
import { defaultGraphConfig, type GraphExport } from "@node-editor/core";

// options en shallowRef: la reactividad profunda de Nuxt serializaría los Sets
// del config en objetos vacíos y la paleta saldría sin tipos.
const options = shallowRef();
const graph = ref<Partial<GraphExport>>();

onMounted(() => {
	options.value = { config: structuredClone(defaultGraphConfig), theme: "dark" };
});
</script>

<template>
	<NodeEditor v-if="options" v-model="graph" :options="options" style="flex: 1" />
</template>
```

`<NodeEditor>` es el componente de [`@node-editor/vue`](../vue) envuelto en carga
client-side; misma API (props `modelValue`/`options`, eventos `change`,
`nodeDeleted`, `ready`, método `getEngine()`).

También disponible `useNodeEditor()` auto-importado como composable de Vue.
