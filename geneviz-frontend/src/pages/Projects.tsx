import { useEffect, useMemo, useState } from "react";
import { Button, Card, Flex, Input, Space, Table, Typography, message } from "antd";
import { PlusOutlined, UploadOutlined, PlayCircleOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { endpoints } from "../api/endpoints";
import UploadDatasetModal from "../components/UploadDatasetModal";

type Project = { id: number; name: string };

export default function Projects() {
  const nav = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [uploadOpen, setUploadOpen] = useState<{ open: boolean; project?: Project }>({ open: false });

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const { data } = await api.get<Project[]>(endpoints.projects);
      setProjects(data);
    } catch (e: any) {
      message.error(e?.message ?? "Failed to load projects");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProjects(); }, []);

  const createProject = async () => {
    if (!newName.trim()) return message.warning("Enter project name");
    setCreating(true);
    try {
      const { data } = await api.post<Project>(endpoints.projects, { name: newName.trim() });
      setProjects((p) => [data, ...p]);
      setNewName("");
      message.success("Project created");
    } catch (e: any) {
      message.error(e?.message ?? "Create failed");
    } finally {
      setCreating(false);
    }
  };

  const columns = useMemo(
    () => [
      { title: "Name", dataIndex: "name", key: "name" },
      {
        title: "Actions",
        key: "actions",
        render: (_: unknown, proj: Project) => (
          <Space>
            <Button icon={<UploadOutlined />} onClick={() => setUploadOpen({ open: true, project: proj })}>
              Add dataset
            </Button>
            <Button type="primary" icon={<PlayCircleOutlined />} onClick={() => nav(`/projects/${proj.id}`)}>
              Open
            </Button>
          </Space>
        ),
      },
    ],
    [nav]
  );

  return (
    <div className="container">
      <Flex align="center" justify="space-between" style={{ marginBottom: 16 }}>
        <Typography.Title level={3} style={{ margin: 0 }}>
          Projects
        </Typography.Title>
        <Space.Compact>
          <Input
            placeholder="New project name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            style={{ width: 260 }}
          />
          <Button type="primary" icon={<PlusOutlined />} loading={creating} onClick={createProject}>
            New project
          </Button>
        </Space.Compact>
      </Flex>

      <Card title="Your projects" styles={{ body: { padding: 0 } }}>
        <Table<Project>
          rowKey="id"
          loading={loading}
          dataSource={projects}
          columns={columns as any}
          pagination={false}
          // Ensure light background even if old overrides linger
          style={{ background: "#fff" }}
        />
      </Card>

      <UploadDatasetModal
        open={uploadOpen.open}
        project={uploadOpen.project}
        onClose={() => setUploadOpen({ open: false })}
        onUploaded={() => {
          setUploadOpen({ open: false });
          message.success("Dataset uploaded");
        }}
        onOpenExisting={(datasetId) => {
          const proj = uploadOpen.project;
          if (proj) nav(`/projects/${proj.id}/datasets/${datasetId}`);
        }}
      />
    </div>
  );
}
