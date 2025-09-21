import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Table, Button, Typography, Upload, Space, message } from "antd";
import { UploadOutlined } from "@ant-design/icons";
import { api } from "../api/client";
import { endpoints } from "../api/endpoints";

type Dataset = { id: number; name: string; is_default: boolean; project?: number };

export default function Datasets() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [rows, setRows] = useState<Dataset[]>([]);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get<Dataset[]>(endpoints.datasets, { params: { project: projectId } });
      setRows(data);
    } catch (e: any) {
      message.error(e?.message ?? "Failed to load datasets");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (projectId) load();
  }, [projectId]);

  const cols = [
    { title: "Name", dataIndex: "name" },
    { title: "Default", dataIndex: "is_default", render: (v: boolean) => (v ? "Yes" : "No") },
    {
      title: "Actions",
      render: (_: unknown, r: Dataset) => (
        <Space>
          <Button type="primary" onClick={() => navigate(`/projects/${projectId}/datasets/${r.id}`)}>
            Open
          </Button>
        </Space>
      ),
    },
  ];

  const uploadProps = (kind: "fasta" | "tsv") => ({
    name: "file",
    multiple: false,
    customRequest: async (opt: any) => {
      const fd = new FormData();
      fd.append("project_id", String(projectId));
      fd.append("dataset_name", (opt.file as File).name.replace(/\.(tsv|fa|fasta|faa|txt)$/i, ""));
      fd.append("file", opt.file as File);
      const url = kind === "fasta" ? endpoints.uploadFasta : endpoints.uploadTsv;
      try {
        await api.post(url, fd, { headers: { "Content-Type": "multipart/form-data" } });
        message.success(`${kind.toUpperCase()} uploaded`);
        opt.onSuccess?.({}, opt.file);
        load();
      } catch (e) {
        message.error("Upload failed");
        opt.onError?.(e);
      }
    },
  });

  return (
    <div className="container">
      <Typography.Title level={3} style={{ marginBottom: 16 }}>
        Datasets — Project {projectId}
      </Typography.Title>

      <Space style={{ marginBottom: 16 }}>
        <Upload {...uploadProps("fasta")} showUploadList={false}>
          <Button icon={<UploadOutlined />}>Upload FASTA</Button>
        </Upload>
        <Upload {...uploadProps("tsv")} showUploadList={false}>
          <Button icon={<UploadOutlined />}>Upload TSV</Button>
        </Upload>
      </Space>

      <Table rowKey="id" columns={cols as any} dataSource={rows} loading={loading} pagination={false} />
    </div>
  );
}
