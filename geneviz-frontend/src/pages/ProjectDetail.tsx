import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button, Card, Space, Table, Typography, message } from "antd";
import { UploadOutlined, PlayCircleOutlined } from "@ant-design/icons";
import { api } from "../api/client";
import { endpoints } from "../api/endpoints";
import UploadDatasetModal from "../components/UploadDatasetModal";

type Dataset = { id: number; name: string; is_default: boolean; project: number };

export default function ProjectDetail() {
  const nav = useNavigate();
  const { projectId } = useParams();
  const pid = Number(projectId);
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get<Dataset[]>(`${endpoints.datasets}?project=${pid}`);
      setDatasets(data);
    } catch (e: any) {
      message.error(e?.message ?? "Failed to load datasets");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (pid) load();
  }, [pid]);

  return (
    <div className="container">
      <Space style={{ width: "100%", justifyContent: "space-between", marginBottom: 16 }}>
        <Typography.Title level={3} style={{ margin: 0 }}>
          Project {pid}
        </Typography.Title>
        <Button icon={<UploadOutlined />} onClick={() => setUploadOpen(true)}>
          Upload dataset
        </Button>
      </Space>

      <Card>
        <Table<Dataset>
          rowKey="id"
          loading={loading}
          dataSource={datasets}
          pagination={false}
          columns={[
            { title: "Dataset", dataIndex: "name" },
            {
              title: "Actions",
              render: (_, d) => (
                <Space>
                  <Button
                    type="primary"
                    icon={<PlayCircleOutlined />}
                    onClick={() => nav(`/projects/${pid}/datasets/${d.id}`)}
                  >
                    Open
                  </Button>
                </Space>
              ),
            },
          ]}
        />
      </Card>

      <UploadDatasetModal
        open={uploadOpen}
        project={{ id: pid, name: `Project ${pid}` }}
        onClose={() => setUploadOpen(false)}
        onUploaded={(id) => {
          setUploadOpen(false);
          load();
          // nav(`/projects/${pid}/datasets/${id}`);
        }}
        onOpenExisting={(id) => nav(`/projects/${pid}/datasets/${id}`)}
      />
    </div>
  );
}
