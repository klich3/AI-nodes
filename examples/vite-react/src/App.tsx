import { useState } from "react";
import { NodeEditor, type GraphExport } from "@node-editor/react";
import { defaultGraphConfig } from "@node-editor/core";

export default function App() {
	const [count, setCount] = useState(defaultGraphConfig.graph.nodes.length);

	return (
		<div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
			<header
				style={{
					padding: "8px 16px",
					font: "14px system-ui",
					background: "#1b1c1f",
					color: "#eee",
				}}
			>
				React + @node-editor/react — nodos: {count}
			</header>
			<NodeEditor
				style={{ flex: 1 }}
				config={defaultGraphConfig}
				onChange={(g: GraphExport) => setCount(g.graph.nodes.length)}
			/>
		</div>
	);
}
