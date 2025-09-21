import { useRef, useState } from "react";
import {
  App,
  Button,
  Card,
  ConfigProvider,
  Divider,
  Form,
  Input,
  Modal,
  Segmented,
  Select,
  Space,
  Typography,
  Upload,
  theme,
} from "antd";
import { InboxOutlined, PlayCircleOutlined, UploadOutlined } from "@ant-design/icons";
import { api } from "../api/client";
import { endpoints } from "../api/endpoints";
import { useDatasets } from "../hooks/useDatasets";

const { Dragger } = Upload;

type Props = {
  open: boolean;
  project?: { id: number; name: string };
  onClose: () => void;
  onUploaded?: (datasetId: number) => void; // called after successful upload
  onOpenExisting?: (datasetId: number) => void; // optional: navigate/open
};

export default function UploadDatasetModal({
  open,
  project,
  onClose,
  onUploaded,
  onOpenExisting,
}: Props) {
  const { message } = App.useApp();
  const pid = project?.id;

  // MODE: create VS existing
  const [mode, setMode] = useState<"create" | "existing">("create");

  // existing dataset selection
  const { data: datasets } = useDatasets(pid);
  const [existingId, setExistingId] = useState<number | undefined>(undefined);

  // create: dataset name + file refs (we’ll upload manually)
  const [form] = Form.useForm<{ dataset_name: string }>();
  const fastaFile = useRef<File | null>(null);
  const tsvFile = useRef<File | null>(null);
  const [loadingFasta, setLoadingFasta] = useState(false);
  const [loadingTsv, setLoadingTsv] = useState(false);

  // antd Upload in “manual” mode
  const fastaProps = {
    name: "file",
    multiple: false,
    maxCount: 1,
    beforeUpload: (file: File) => {
      fastaFile.current = file;
      return false; // prevent auto upload
    },
    accept: ".fa,.fasta,.faa,.txt",
  };

  const tsvProps = {
    name: "file",
    multiple: false,
    maxCount: 1,
    beforeUpload: (file: File) => {
      tsvFile.current = file;
      return false;
    },
    accept: ".tsv,.txt",
  };

  async function upload(kind: "fasta" | "tsv") {
    try {
      if (!pid) throw new Error("Missing project id");
      const { dataset_name } = await form.validateFields();
      const file = (kind === "fasta" ? fastaFile.current : tsvFile.current) as File | null;
      if (!file) throw new Error(`Choose a ${kind.toUpperCase()} file`);

      const fd = new FormData();
      fd.append("project_id", String(pid));
      fd.append("dataset_name", dataset_name.trim());
      fd.append("file", file);

      kind === "fasta" ? setLoadingFasta(true) : setLoadingTsv(true);
      const url = kind === "fasta" ? endpoints.uploadFasta : endpoints.uploadTsv;
      const { data } = await api.post(url, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const matched = /dataset (\d+)/i.exec(String(data?.status ?? ""));
      const newId = matched ? Number(matched[1]) : undefined;

      message.success(data?.status || `${kind.toUpperCase()} uploaded`);
      if (newId && onUploaded) onUploaded(newId);
    } catch (e: any) {
      message.error(e?.response?.data?.detail ?? e?.message ?? "Upload failed");
    } finally {
      setLoadingFasta(false);
      setLoadingTsv(false);
    }
  }

  function resetState() {
    setMode("create");
    setExistingId(undefined);
    fastaFile.current = null;
    tsvFile.current = null;
    form.resetFields();
  }

  return (
    // Force LIGHT theme for this modal (card/content/inputs)
    <ConfigProvider
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: {
          colorBgBase: "#ffffff",
          colorTextBase: "#1f1f1f",
          borderRadius: 12,
        },
        components: {
          Modal: { contentBg: "#ffffff", headerBg: "#ffffff" },
          Card: { colorBgContainer: "#ffffff" },
          Select: { colorBgContainer: "#ffffff" },
          Input: { colorBgContainer: "#ffffff" },
          Segmented: {},
          Button: {},
        },
      }}
    >
      <Modal
        open={open}
        onCancel={() => {
          resetState();
          onClose();
        }}
        title={<Typography.Text strong>Upload dataset — {project?.name ?? ""}</Typography.Text>}
        footer={null}
        destroyOnClose
      >
        <Space direction="vertical" size="large" style={{ width: "100%" }}>
          <Segmented
            value={mode}
            onChange={(v) => setMode(v as "create" | "existing")}
            options={[
              { label: "Create new dataset", value: "create" },
              { label: "Use existing dataset", value: "existing" },
            ]}
            block
          />

          {mode === "existing" ? (
            <Card bordered={false} style={{ padding: 0 }}>
              <Typography.Paragraph type="secondary" style={{ marginBottom: 8 }}>
                Pick an existing dataset to open in the workstation.
              </Typography.Paragraph>
              <Space.Compact style={{ width: "100%" }}>
                <Select
                  placeholder="Select dataset"
                  style={{ flex: 1 }}
                  value={existingId}
                  onChange={(v) => setExistingId(v)}
                  options={(datasets ?? []).map((d) => ({
                    label: `${d.name} (id ${d.id})`,
                    value: d.id,
                  }))}
                  showSearch
                  optionFilterProp="label"
                />
                <Button
                  type="primary"
                  icon={<PlayCircleOutlined />}
                  disabled={!existingId}
                  onClick={() => {
                    if (!existingId) return;
                    onOpenExisting?.(existingId);
                    resetState();
                    onClose();
                  }}
                >
                  Open
                </Button>
              </Space.Compact>
            </Card>
          ) : (
            <Card bordered={false} style={{ padding: 0 }}>
              <Form form={form} layout="vertical" requiredMark="optional">
                <Form.Item
                  name="dataset_name"
                  label="Dataset name"
                  rules={[{ required: true, message: "Please enter a dataset name" }]}
                >
                  <Input placeholder="e.g., MyExperiment1" />
                </Form.Item>

                <Divider />

                <Typography.Title level={5} style={{ marginTop: 0 }}>
                  FASTA (protein sequences)
                </Typography.Title>
                <Dragger {...fastaProps}>
                  <p className="ant-upload-drag-icon">
                    <InboxOutlined />
                  </p>
                  <p className="ant-upload-text">Click or drag FASTA file here</p>
                  <p className="ant-upload-hint">Accepted: .fa, .fasta, .faa, .txt</p>
                </Dragger>
                <Button
                  icon={<UploadOutlined />}
                  type="primary"
                  loading={loadingFasta}
                  onClick={() => upload("fasta")}
                  style={{ marginTop: 12 }}
                >
                  Upload FASTA
                </Button>

                <Divider />

                <Typography.Title level={5} style={{ marginTop: 0 }}>
                  TSV (gene × sample matrix)
                </Typography.Title>
                <Dragger {...tsvProps}>
                  <p className="ant-upload-drag-icon">
                    <InboxOutlined />
                  </p>
                  <p className="ant-upload-text">Click or drag TSV file here</p>
                  <p className="ant-upload-hint">
                    Header must be <code>gene-ID</code> followed by sample ids.
                  </p>
                </Dragger>
                {/* FIX: make styling consistent with FASTA (primary button) */}
                <Button
                  icon={<UploadOutlined />}
                  type="primary"
                  loading={loadingTsv}
                  onClick={() => upload("tsv")}
                  style={{ marginTop: 12 }}
                >
                  Upload TSV
                </Button>
              </Form>
            </Card>
          )}
        </Space>
      </Modal>
    </ConfigProvider>
  );
}
