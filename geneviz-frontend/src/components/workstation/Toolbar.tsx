import { Button, Space } from "antd";

export default function Toolbar({
  onLoadHeatmap,
  onLoadBox,
  onDownloadLong,
  onDownloadMatrix,
  onDownloadFasta,
  disabled: { longCSV, matrixCSV, fasta },
}: {
  onLoadHeatmap: () => void;
  onLoadBox: () => void;
  onDownloadLong: () => void;
  onDownloadMatrix: () => void;
  onDownloadFasta: () => void;
  disabled: { longCSV: boolean; matrixCSV: boolean; fasta: boolean };
}) {
  return (
    <Space wrap>
      <Button onClick={onLoadHeatmap} type="primary">Load heatmap</Button>
      <Button onClick={onLoadBox}>Load box</Button>
      <Button onClick={onDownloadLong} disabled={longCSV}>Download Long CSV</Button>
      <Button onClick={onDownloadMatrix} disabled={matrixCSV}>Download Matrix CSV</Button>
      <Button onClick={onDownloadFasta} disabled={fasta}>Download FASTA</Button>
    </Space>
  );
}
