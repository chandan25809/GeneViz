import { useState } from "react";
import { Button, Card, ConfigProvider, Form, Input, Typography, theme, message } from "antd";
import { useNavigate, useLocation } from "react-router-dom";
import { login } from "../auth/auth";

export default function Login() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation() as any;

  async function onFinish(values: { username: string; password: string }) {
    try {
      setLoading(true);
      await login(values);
      message.success("Signed in");
      const to = location.state?.from?.pathname ?? "/projects";
      navigate(to, { replace: true });
    } catch (e: any) {
      message.error(e?.response?.data?.detail ?? "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    // Local light theme to ensure the login stays light regardless of any global overrides
    <ConfigProvider
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: {
          colorTextBase: "#1f1f1f",
          colorBgBase: "#ffffff",
          colorBorder: "#d9d9d9",
          colorPrimary: "#1677ff",
          borderRadius: 12,
        },
        components: {
          Card: { colorBgContainer: "#ffffff" },
          Input: { colorBgContainer: "#ffffff" },
          Layout: { bodyBg: "#f7f9fc" },
        },
      }}
    >
      <div
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#f7f9fc",
          padding: 24,
          color: "#1f1f1f", // keep global font color consistent on this page
        }}
      >
        <Card
          style={{
            width: 420,
            background: "#ffffff",
            boxShadow: "0 6px 24px rgba(0,0,0,0.06)",
            borderRadius: 12,
          }}
        >
          <Typography.Title level={4} style={{ margin: 0, color: "#1f1f1f" }}>
            GeneViz Login
          </Typography.Title>

          <Form layout="vertical" onFinish={onFinish} style={{ marginTop: 16 }}>
            <Form.Item name="username" label="Username" rules={[{ required: true }]}>
              <Input size="large" autoComplete="username" />
            </Form.Item>
            <Form.Item name="password" label="Password" rules={[{ required: true }]}>
              <Input.Password size="large" autoComplete="current-password" />
            </Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block size="large">
              Sign in
            </Button>
          </Form>
        </Card>
      </div>
    </ConfigProvider>
  );
}
