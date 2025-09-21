import { useEffect, useMemo, useState } from "react";
import { Button, Card, Flex, Select, Space, Table, Typography, message } from "antd";
import {
  PlusOutlined,
  SaveOutlined,
  EditOutlined,
  UndoOutlined,
  DeleteOutlined,
  DownloadOutlined,
} from "@ant-design/icons";
import debounce from "lodash.debounce";
import Plot from "react-plotly.js";
import { Responsive, WidthProvider, type Layout, type Layouts } from "react-grid-layout";
import { useParams } from "react-router-dom";
import { api } from "../api/client";
import { endpoints } from "../api/endpoints";

import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

const ResponsiveGridLayout = WidthProvider(Responsive);
const { Title, Text } = Typography;

type Matrix = Record<string, Record<string, number>>;
type LongRow = { gene_name: string; sample_id: string; expression_value: number };

type ChartType = "heatmap" | "box" | "violin" | "table" | "dist" | "pca";
type ChartItem = { i: string; type: ChartType; dataKey: string };

// ---- Layout persistence ----
const LAYOUT_KEY = "gv_layouts_v1";
const saveLayouts = (ls: Layouts) => localStorage.setItem(LAYOUT_KEY, JSON.stringify(ls));
const loadLayouts = (): Layouts | null => {
  try {
    const raw = localStorage.getItem(LAYOUT_KEY);
    return raw ? (JSON.parse(raw) as Layouts) : null;
  } catch {
    return null;
  }
};
const clearLayouts = () => localStorage.removeItem(LAYOUT_KEY);

// ---- Grid config ----
const GRID = {
  lg: { cols: 12, w: 4, h: 28 }, 
  md: { cols: 12, w: 4, h: 28 },
  sm: { cols: 8, w: 4, h: 28 },  
  xs: { cols: 6, w: 6, h: 28 },  
  xxs: { cols: 4, w: 4, h: 28 },
} as const;

const CARD_BODY: React.CSSProperties = {
    height: "100%",
    padding: 12,
    display: "flex",
    flexDirection: "column",
  };
  
const EMPTY_LAYOUTS: Layouts = { lg: [], md: [], sm: [], xs: [], xxs: [] };

export default function Workstation() {
  const { projectId, datasetId } = useParams();
  const ds = Number(datasetId);

  // Genes
  const [genes, setGenes] = useState<string[]>([]);
  const [geneOptions, setGeneOptions] = useState<{ value: string; label: string }[]>([]);

  // Data caches
  const [matrix, setMatrix] = useState<Matrix | null>(null);
  const [longData, setLongData] = useState<LongRow[]>([]);

  // Charts + grid
  const [charts, setCharts] = useState<ChartItem[]>([]);
  const [layouts, setLayouts] = useState<Layouts>(() => loadLayouts() ?? EMPTY_LAYOUTS);
  const [edit, setEdit] = useState(false);
  const [picker, setPicker] = useState<ChartType>("heatmap");

  const dataKey = useMemo(() => {
    const sortedGenes = [...genes].sort().join(",");
    return `${ds}|${sortedGenes}`;
  }, [ds, genes]);

  // ---------- Gene search ----------
  const searchGenes = useMemo(
    () =>
      debounce(async (q: string) => {
        try {
          const { data } = await api.get<string[]>(endpoints.genes, { params: { dataset: ds } });
        const filtered = q ? data.filter((g) => g.toLowerCase().includes(q.toLowerCase())) : data;
          setGeneOptions(filtered.slice(0, 200).map((g) => ({ value: g, label: g })));
        } catch (e: any) {
          message.error(e?.message ?? "Failed to load genes");
        }
      }, 250),
    [ds],
  );

  useEffect(() => {
    if (ds) searchGenes("");
    return () => searchGenes.cancel();
  }, [ds, searchGenes]);

  // Reset when dataset changes
  useEffect(() => {
    setMatrix(null);
    setLongData([]);
    setGenes([]);
    setCharts([]);
    setLayouts(EMPTY_LAYOUTS);
  }, [ds]);

  // ---------- Data loaders ----------
  const loadHeatmapData = async () => {
    if (!genes.length) return;
    const { data } = await api.get<Matrix>(endpoints.matrix, {
      params: { dataset: ds, genes: genes.join(",") },
    });
    setMatrix(data);
  };

  const loadLongData = async () => {
    if (!genes.length) return;
    const { data } = await api.get<LongRow[]>(endpoints.expression, {
      params: { dataset: ds, genes: genes.join(",") },
    });
    setLongData(data);
  };

  async function ensureDataFor(chartType: ChartType) {
    if (!genes.length) {
      message.info("Pick genes first");
      return false;
    }
    if (chartType === "pca" && !matrix) await loadHeatmapData(); 
    if (chartType === "heatmap" && !matrix) await loadHeatmapData();
    if ((chartType === "box" || chartType === "violin" || chartType === "table" || chartType === "dist") && !longData.length) {
      await loadLongData();
    }
    return true;
  }

  // ---------- Chart picker / manager ----------
  const nextKey = () => Math.random().toString(36).slice(2, 8);

  function placeNewItem(prev: Layouts, id: string, type: ChartType): Layouts {
    const updated: Layouts = { lg: [], md: [], sm: [], xs: [], xxs: [] };
    (Object.keys(GRID) as (keyof typeof GRID)[]).forEach((bp) => {
      const cur = [...(prev[bp] ?? [])];
      const count = cur.length;
      const cfg = GRID[bp];
      const defaultW = cfg.w;
      const preferredW = type === "table" ? defaultW * 2 : defaultW; // table spans 2 cards
      const w = Math.min(cfg.cols, preferredW);
      const h = type === "table" ? cfg.h + 6 : cfg.h;               // a touch taller for table
      const x = (count * defaultW) % cfg.cols;
      const y = Math.floor((count * defaultW) / cfg.cols) * cfg.h;
      cur.push({ i: id, x, y, w, h, minW: Math.min(3, defaultW), minH: 24 });
      updated[bp] = cur;
    });
    return updated;
  }

  const hasChartForSelection = charts.some((c) => c.type === picker && c.dataKey === dataKey);

  async function handleAddChart() {
    if (hasChartForSelection) {
      message.info("That chart already exists for the current gene selection. Change genes to add another.");
      return;
    }
    const ok = await ensureDataFor(picker);
    if (!ok) return;
    const id = nextKey();
    setCharts((c) => [...c, { i: id, type: picker, dataKey }]);
    setLayouts((prev) => placeNewItem(prev ?? EMPTY_LAYOUTS, id, picker));
  }

  function removeChart(i: string) {
    setCharts((c) => c.filter((x) => x.i !== i));
    setLayouts((prev) => {
      const cleaned: Layouts = { lg: [], md: [], sm: [], xs: [], xxs: [] };
      (Object.keys(prev) as (keyof Layouts)[]).forEach((bp) => {
        cleaned[bp] = (prev[bp] ?? []).filter((l) => l.i !== i);
      });
      return cleaned;
    });
  }

  const handleLayoutChange = (_current: Layout[], all: Layouts) => setLayouts(all);
  const handleSaveLayout = () => {
    saveLayouts(layouts);
    message.success("Layout saved");
    setEdit(false);
  };
  const handleResetLayout = () => {
    clearLayouts();
    setLayouts(EMPTY_LAYOUTS);
    message.success("Layout reset");
  };

  // ---------- Derived plot transforms ----------
  const heatmapData = useMemo(() => {
    if (!matrix) return null;
    const g = Object.keys(matrix);
    const s = [...new Set(g.flatMap((k) => Object.keys(matrix[k])))];
    const z = g.map((row) => s.map((col) => matrix[row][col] ?? 0));
    return { x: s, y: g, z };
  }, [matrix]);

  const boxTraces = useMemo(() => {
    if (!longData.length) return [];
    const byGene: Record<string, number[]> = {};
    longData.forEach((r) => {
      byGene[r.gene_name] ??= [];
      byGene[r.gene_name].push(r.expression_value);
    });
    return Object.entries(byGene).map(([gene, y]) => ({ type: "box" as const, name: gene, y }));
  }, [longData]);

  // Downloads
  function downloadTableCSV() {
    const buildFromLong = () => {
      if (!longData.length) return null;
      const samples = Array.from(new Set(longData.map(r => r.sample_id)));
      const byGene: Record<string, Record<string, number>> = {};
      for (const r of longData) {
        (byGene[r.gene_name] ??= {});
        byGene[r.gene_name][r.sample_id] = r.expression_value ?? 0;
      }
      const header = ["gene-ID", ...samples].join(",");
      const rows = Object.keys(byGene).map(gene =>
        [gene, ...samples.map(s => byGene[gene][s] ?? 0)].join(","),
      );
      return `${header}\n${rows.join("\n")}`;
    };
  
    const buildFromMatrix = () => {
      if (!matrix) return null;
      const genes = Object.keys(matrix);
      const samples = Array.from(new Set(genes.flatMap(g => Object.keys(matrix[g]))));
      const header = ["gene-ID", ...samples].join(",");
      const rows = genes.map(g =>
        [g, ...samples.map(s => matrix[g][s] ?? 0)].join(","),
      );
      return `${header}\n${rows.join("\n")}`;
    };
  
    const csv = buildFromLong() ?? buildFromMatrix();
    if (!csv) {
      message.info("Load data first to export the table.");
      return;
    }
  
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "table.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }
  
  function downloadMatrixCSV() {
    if (!matrix) return;
    const genesList = Object.keys(matrix);
    const samples = [...new Set(genesList.flatMap((g) => Object.keys(matrix[g])))];
    const header = ["gene", ...samples].join(",");
    const rows = genesList.map((g) => [g, ...samples.map((s) => matrix[g][s] ?? 0)].join(",")).join("\n");
    const blob = new Blob([`${header}\n${rows}`], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "expression_matrix.csv";
    a.click();
  }
  async function downloadFASTA() {
    if (!genes.length) return message.info("Pick genes first");
    const params = new URLSearchParams({ dataset: String(ds), genes: genes.join(",") });
    const { data } = await api.get(`${endpoints.fasta}?${params.toString()}`, { responseType: "blob" });
    const blob = new Blob([data], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `genes_${ds}.fasta`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  // ---------- UI ----------
  return (
    <Space direction="vertical" size="large" style={{ width: "100%" }}>
      <Card>
        <Flex align="center" gap={12} wrap>
          <Title level={4} style={{ margin: 0 }}>
            Workstation — Project {projectId} / Dataset {datasetId}
          </Title>
          <div style={{ flex: 1 }} />
          <Space>
            <Button icon={<EditOutlined />} type={edit ? "primary" : "default"} onClick={() => setEdit((v) => !v)}>
              {edit ? "Editing…" : "Edit layout"}
            </Button>
            <Button icon={<SaveOutlined />} onClick={handleSaveLayout} disabled={!edit}>
              Save
            </Button>
            <Button icon={<UndoOutlined />} onClick={handleResetLayout}>
              Reset
            </Button>
          </Space>
        </Flex>

        {/* Toolbar */}
        <div style={{ marginTop: 12, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <Select
            mode="multiple"
            allowClear
            placeholder="Search or paste genes (comma/newline supported)"
            style={{ width: 720, maxWidth: "100%" }}
            onSearch={searchGenes}
            options={geneOptions}
            value={genes}
            onChange={setGenes}
            tokenSeparators={[",", "\n"]}
            showSearch
          />

          <Space.Compact>
            <Select<ChartType>
              value={picker}
              style={{ width: 200 }}
              onChange={setPicker}
              options={[
                { value: "heatmap", label: "Heatmap" },
                { value: "box", label: "Box plot" },
                { value: "violin", label: "Violin plot" },
                { value: "table", label: "Table (data)" },
                { value: "dist", label: "Distribution" },
                { value: "pca",  label: "PCA (samples)" }
              ]}
            />
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleAddChart}
              disabled={hasChartForSelection}
              title={hasChartForSelection ? "Chart already exists for current selection" : undefined}
            >
              Add chart
            </Button>
          </Space.Compact>

          <Space wrap>
          <Button icon={<DownloadOutlined />} onClick={downloadTableCSV} disabled={!longData.length && !matrix}>
                Download table CSV
            </Button>

            <Button icon={<DownloadOutlined />} onClick={downloadMatrixCSV} disabled={!matrix}>
              Matrix CSV
            </Button>
            <Button icon={<DownloadOutlined />} onClick={downloadFASTA} disabled={!genes.length}>
              FASTA
            </Button>
          </Space>
        </div>
      </Card>

      <ResponsiveGridLayout
        className="layout"
        rowHeight={8}
        breakpoints={{ lg: GRID.lg.cols * 100, md: 996, sm: 768, xs: 480, xxs: 0 }}
        cols={{ lg: GRID.lg.cols, md: GRID.md.cols, sm: GRID.sm.cols, xs: GRID.xs.cols, xxs: GRID.xxs.cols }}
        margin={[12, 12]}
        containerPadding={[6, 6]}
        preventCollision={false}
        compactType="vertical"
        isBounded
        isDraggable={edit}
        isResizable={edit}
        resizeHandles={["se", "e", "s"]}
        draggableHandle=".card-drag"
        layouts={layouts}
        onLayoutChange={handleLayoutChange}
      >
        {charts.map((c) => (
          <div key={c.i}>
            <Card
            title={<div className="card-drag" style={{ cursor: "move" }}>{titleFor(c.type)}</div>}
            extra={<Button size="small" type="text" icon={<DeleteOutlined />} onClick={() => removeChart(c.i)} />}
            styles={{ body: CARD_BODY }}
            >
            <div style={{ flex: 1, minHeight: 0 }}>
            {renderChart(c.type, { heatmapData, boxTraces, matrix, longData })}
            </div>
            </Card>
          </div>
        ))}
      </ResponsiveGridLayout>
    </Space>
  );
}

// ---- Renderers ----
function titleFor(t: ChartType) {
    if (t === "heatmap") return "Heatmap";
    if (t === "box") return "Box plot";
    if (t === "violin") return "Violin plot";
    if (t === "dist") return "Distribution";
    if (t === "pca") return "PCA (samples)";
    return "Table";
  }
  

function renderChart(
  type: ChartType,
  {
    heatmapData,
    boxTraces,
    matrix,
    longData,
  }: {
    heatmapData: { x: string[]; y: string[]; z: number[][] } | null;
    boxTraces: Array<{ type: "box"; name: string; y: number[] }>;
    matrix: Matrix | null;
    longData: LongRow[];
  },
) {
  if (type === "table") return <TableView matrix={matrix} longData={longData} />;
  if (type === "pca")  return <PCAScatter matrix={matrix} />; 

  if (type === "heatmap") {
    if (!heatmapData) return <EmptyState text="Add genes, then add Heatmap" />;
  
    return (
      <Plot
        data={[
          {
            type: "heatmap",
            x: heatmapData.x,
            y: heatmapData.y,
            z: heatmapData.z,
            // Better palette for light themes
            colorscale: "YlGnBu",
            // Make the colorbar easier to read
            colorbar: { thickness: 12, outlinewidth: 0, ticks: "outside" },
            zsmooth: "best",
          } as any,
        ]}
        layout={{ autosize: true, margin: { l: 80, r: 8, t: 16, b: 48 } }}
        style={{ width: "100%", height: "100%" }}
        useResizeHandler
      />
    );
  }
  

  if (type === "box") {
    if (!boxTraces.length) return <EmptyState text="Add genes, then add Box plot" />;
    return (
      <Plot
        data={boxTraces as any}
        layout={{ autosize: true, showlegend: true, margin: { l: 52, r: 8, t: 16, b: 48 } }}
        style={{ width: "100%", height: "100%" }}
        useResizeHandler
      />
    );
  }
  if (type === "dist") return <DistributionChart longData={longData} />;


  // Violin uses same longData
  if (!boxTraces.length) return <EmptyState text="Add genes, then add Violin plot" />;
  const violin = boxTraces.map((t) => ({ ...t, type: "violin" as const, points: "all", box: { visible: false } }));
  return (
    <Plot
      data={violin as any}
      layout={{ autosize: true, showlegend: true, margin: { l: 52, r: 8, t: 16, b: 48 } }}
      style={{ width: "100%", height: "100%" }}
      useResizeHandler
    />
  );
}

function EmptyState({ text = "No data yet" }: { text?: string }) {
  return (
    <div
      style={{
        height: "100%",
        width: "100%",
        display: "grid",
        placeItems: "center",
        color: "#8b92a7",
        background: "#0e1117",
        borderRadius: 8,
      }}
    >
      <Text type="secondary">{text}</Text>
    </div>
  );
}



function TableView({ matrix, longData }: { matrix: Matrix | null; longData: LongRow[] }) {
    // Prefer pivoting the long rows when available
    if (longData.length) {
      const samples = Array.from(new Set(longData.map(r => r.sample_id)));
      const byGene: Record<string, Record<string, number>> = {};
      for (const r of longData) {
        (byGene[r.gene_name] ??= {});
        byGene[r.gene_name][r.sample_id] = r.expression_value ?? 0;
      }
  
      const data = Object.keys(byGene).map(gene => {
        const row: Record<string, any> = { gene };
        for (const s of samples) row[s] = byGene[gene][s] ?? 0;
        return row;
      });
  
      const geneColWidth = 220;
      const sampleColWidth = 120;
      const totalX = Math.max(geneColWidth + samples.length * sampleColWidth, 900);
  
      const columns = [
        { title: "gene-ID", dataIndex: "gene", key: "gene", fixed: "left" as const, width: geneColWidth },
        ...samples.map(s => ({
          title: s,
          dataIndex: s,
          key: s,
          width: sampleColWidth,
          align: "right" as const,
        })),
      ];
  
      // No extra wrapper/overflow so pagination aligns with other cards
      return (
        <Table
          size="small"
          rowKey={(_, i) => `${_.gene}__${i}`}
          dataSource={data}
          columns={columns as any}
          pagination={{
            pageSize: 10,
            size: "small",
            position: ["bottomRight"],
            hideOnSinglePage: true,
            showSizeChanger: false,
          }}
          scroll={{ x: totalX }}
          tableLayout="fixed"
        />
      );
    }
  
    // Fallback: pivot from matrix
    if (matrix) {
      const genes = Object.keys(matrix);
      const samples = Array.from(new Set(genes.flatMap(g => Object.keys(matrix[g]))));
  
      const data = genes.map(g => {
        const row: Record<string, any> = { gene: g };
        for (const s of samples) row[s] = matrix[g][s] ?? 0;
        return row;
      });
  
      const geneColWidth = 220;
      const sampleColWidth = 120;
      const totalX = Math.max(geneColWidth + samples.length * sampleColWidth, 900);
  
      const columns = [
        { title: "gene-ID", dataIndex: "gene", key: "gene", fixed: "left" as const, width: geneColWidth },
        ...samples.map(s => ({
          title: s,
          dataIndex: s,
          key: s,
          width: sampleColWidth,
          align: "right" as const,
        })),
      ];
  
      return (
        <Table
          size="small"
          rowKey="gene"
          dataSource={data}
          columns={columns as any}
          pagination={{
            pageSize: 10,
            size: "small",
            position: ["bottomRight"],
            hideOnSinglePage: true,
            showSizeChanger: false,
          }}
          scroll={{ x: totalX }}
          tableLayout="fixed"
        />
      );
    }
  
    return <EmptyState text="Load data to see a table" />;
  }
  

  function DistributionChart({ longData }: { longData: LongRow[] }) {
    if (!longData.length) return <EmptyState text="Add genes, then add Distribution" />;
  
    // group expression values by gene
    const byGene: Record<string, number[]> = {};
    for (const r of longData) {
      (byGene[r.gene_name] ??= []).push(r.expression_value ?? 0);
    }
  
    // --- simple Gaussian KDE helpers (Silverman's rule of thumb) ---
    const mean = (xs: number[]) => xs.reduce((s, v) => s + v, 0) / Math.max(xs.length, 1);
    const std = (xs: number[]) => {
      if (xs.length < 2) return 1;
      const m = mean(xs);
      const v = xs.reduce((s, x) => s + (x - m) * (x - m), 0) / (xs.length - 1);
      return Math.sqrt(Math.max(v, 1e-12));
    };
    const gaussian = (u: number) => Math.exp(-0.5 * u * u) / Math.sqrt(2 * Math.PI);
  
    function kde(values: number[], gridCount = 120) {
      const n = values.length;
      if (!n) return { x: [], y: [] };
      const s = std(values);
      const h = 1.06 * s * Math.pow(n, -1 / 5); // bandwidth
      const lo = Math.min(...values);
      const hi = Math.max(...values);
      const pad = (hi - lo || 1) * 0.05;
      const x0 = lo - pad;
      const x1 = hi + pad;
  
      const xs: number[] = [];
      const ys: number[] = [];
  
      for (let i = 0; i < gridCount; i++) {
        const x = x0 + (i / (gridCount - 1)) * (x1 - x0);
        xs.push(x);
        let sum = 0;
        for (const v of values) sum += gaussian((x - v) / (h || 1));
        ys.push(sum / (n * (h || 1))); // probability density
      }
      return { x: xs, y: ys };
    }
  
    // Build traces: histogram (density) + KDE line per gene
    const traces: any[] = [];
    Object.entries(byGene).forEach(([gene, vals]) => {
      // histogram normalized to probability density so scales match KDE
      traces.push({
        type: "histogram",
        name: gene,
        x: vals,
        histnorm: "probability density",
        opacity: 0.35,
        nbinsx: Math.min(50, Math.max(10, Math.ceil(Math.sqrt(vals.length || 1)))),
        hovertemplate: `${gene}<br>bin: %{x}<br>density: %{y:.3f}<extra></extra>`,
      });
  
      const { x, y } = kde(vals);
      traces.push({
        type: "scatter",
        mode: "lines",
        name: `${gene} (KDE)`,
        x,
        y,
        line: { width: 2 },
        hovertemplate: `${gene} (KDE)<br>x: %{x}<br>density: %{y:.3f}<extra></extra>`,
      });
    });
  
    return (
      <Plot
        data={traces}
        layout={{
          autosize: true,
          barmode: "overlay",
          showlegend: true,
          margin: { l: 52, r: 8, t: 16, b: 48 },
          xaxis: { title: "Expression value", zeroline: false },
          yaxis: { title: "Probability density", rangemode: "tozero" },
        }}
        style={{ width: "100%", height: "100%" }}
        useResizeHandler
      />
    );
  }

  function PCAScatter({ matrix }: { matrix: Matrix | null }) {
    if (!matrix) return <EmptyState text="Add genes, then add PCA" />;
  
    // Collect genes & samples
    const genes = Object.keys(matrix);
    if (!genes.length) return <EmptyState text="No matrix data" />;
    const samples = Array.from(new Set(genes.flatMap(g => Object.keys(matrix[g]))));
    const m = samples.length;
    const n = genes.length;
  
    // Build X: samples × genes (log1p)
    const X: number[][] = samples.map(s =>
      genes.map(g => Math.log1p(matrix[g][s] ?? 0))
    );
  
    // Standardize each gene (column z-score)
    for (let j = 0; j < n; j++) {
      let sum = 0, sum2 = 0;
      for (let i = 0; i < m; i++) { const v = X[i][j]; sum += v; sum2 += v * v; }
      const mean = sum / m;
      const varj = Math.max(1e-12, (sum2 - m * mean * mean) / (m - 1));
      const sd = Math.sqrt(varj);
      for (let i = 0; i < m; i++) X[i][j] = (X[i][j] - mean) / sd;
    }
  
    // Covariance in sample-space: C = X * X^T / (n - 1)  => (m × m)
    const C: number[][] = Array.from({ length: m }, () => Array(m).fill(0));
    for (let i = 0; i < m; i++) {
      for (let k = i; k < m; k++) {
        let dot = 0;
        for (let j = 0; j < n; j++) dot += X[i][j] * X[k][j];
        const v = dot / Math.max(1, n - 1);
        C[i][k] = v; C[k][i] = v;
      }
    }
  
    // --- Power iteration for top eigenvector ---
    function powerIter(A: number[][], iters = 200, tol = 1e-6): { vec: number[]; val: number } {
      const dim = A.length;
      let v = Array.from({ length: dim }, () => Math.random());
      const normalize = (u: number[]) => {
        const nrm = Math.sqrt(u.reduce((a, b) => a + b * b, 0)) || 1;
        for (let i = 0; i < u.length; i++) u[i] /= nrm;
      };
      normalize(v);
  
      let val = 0;
      for (let t = 0; t < iters; t++) {
        // w = A v
        const w = new Array(dim).fill(0);
        for (let i = 0; i < dim; i++) {
          let s = 0; const Ai = A[i];
          for (let j = 0; j < dim; j++) s += Ai[j] * v[j];
          w[i] = s;
        }
        const newVal = v.reduce((a, vi, i) => a + vi * w[i], 0);
        normalize(w);
        // convergence
        let diff = 0; for (let i = 0; i < dim; i++) diff += Math.abs(w[i] - v[i]);
        v = w; val = newVal;
        if (diff < tol) break;
      }
      return { vec: v, val: Math.max(val, 0) };
    }
  
    // Top-1 eigenpair
    const e1 = powerIter(C);
    // Deflate and get top-2
    const C2: number[][] = Array.from({ length: m }, (_, i) =>
      Array.from({ length: m }, (_, j) => C[i][j] - e1.val * e1.vec[i] * e1.vec[j])
    );
    const e2 = powerIter(C2);
  
    // Scores for samples on PC1/PC2 (U * sqrt(lambda))
    const pc1 = e1.vec.map(v => v * Math.sqrt(Math.max(e1.val, 0)));
    const pc2 = e2.vec.map(v => v * Math.sqrt(Math.max(e2.val, 0)));
  
    // Explained variance ratio
    const totalVar = C.reduce((acc, row, i) => acc + row[i], 0) || 1;
    const r1 = Math.max(0, Math.min(1, e1.val / totalVar));
    const r2 = Math.max(0, Math.min(1, e2.val / totalVar));
  
    return (
      <Plot
        data={[
          {
            type: "scattergl",
            mode: "markers",
            x: pc1,
            y: pc2,
            text: samples,
            hovertemplate: "<b>%{text}</b><br>PC1=%{x:.3f}<br>PC2=%{y:.3f}<extra></extra>",
            marker: { size: 9 },
            name: "Samples",
          } as any,
        ]}
        layout={{
          autosize: true,
          showlegend: false,
          margin: { l: 52, r: 8, t: 16, b: 48 },
          xaxis: { title: `PC1 (${(r1 * 100).toFixed(1)}%)` },
          yaxis: { title: `PC2 (${(r2 * 100).toFixed(1)}%)` },
        }}
        style={{ width: "100%", height: "100%" }}
        useResizeHandler
      />
    );
  }
  