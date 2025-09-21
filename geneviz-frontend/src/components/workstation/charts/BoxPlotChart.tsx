import Plot from "react-plotly.js";

type BoxTrace = { type: "box"; name: string; y: number[] };

export default function BoxPlotChart({ traces }: { traces: BoxTrace[] }) {
  return (
    <Plot
      data={traces as any}
      layout={{ autosize: true, showlegend: true, margin: { l: 60, r: 10, t: 20, b: 60 } }}
      style={{ width: "100%", height: "100%" }}
      useResizeHandler
    />
  );
}
