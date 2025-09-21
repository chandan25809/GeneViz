import Plot from "react-plotly.js";

export default function HeatmapChart({
  x,
  y,
  z,
}: {
  x: string[];
  y: string[];
  z: number[][];
}) {
  return (
    <Plot
      data={[
        {
          type: "heatmap",
          x,
          y,
          z,
          zsmooth: "best",
          colorscale: "Blues",
        } as any,
      ]}
      layout={{ autosize: true, margin: { l: 90, r: 10, t: 20, b: 60 } }}
      style={{ width: "100%", height: "100%" }}
      useResizeHandler
    />
  );
}
