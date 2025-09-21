import { Button, ConfigProvider, Layout, Menu, Typography, theme } from "antd";
import { ProjectOutlined, LogoutOutlined } from "@ant-design/icons";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { logout } from "./auth/auth";

const { Header, Content } = Layout;

export default function AppLayout() {
  const location = useLocation();
  const nav = useNavigate();
  const selected = location.pathname.startsWith("/projects") ? ["projects"] : [];

  // Full-bleed layout for workstation route
  const isWorkstation = /^\/projects\/\d+\/datasets\/\d+/.test(location.pathname);
  const wrapperStyle = isWorkstation
    ? { maxWidth: "none" as const, margin: 0 }
    : { maxWidth: 1280, margin: "0 auto" };

  return (
    <ConfigProvider
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: {
          colorPrimary: "#1677ff",
          borderRadius: 8,
          colorTextBase: "#1f1f1f",
          colorBgBase: "#ffffff",
        },
        components: {
          Layout: { headerBg: "#ffffff", bodyBg: "#f7f9fc" },
          Card: { colorBgContainer: "#ffffff" },
          Table: {
            colorBgContainer: "#ffffff",
            headerBg: "#fafafa",
            rowHoverBg: "#f5f5f5",
            borderColor: "#f0f0f0",
          },
          Input: { colorBgContainer: "#ffffff" },
        },
      }}
    >
      <Layout style={{ minHeight: "100vh", background: "#f7f9fc" }}>
        <Header
          style={{
            background: "#ffffff",
            display: "flex",
            alignItems: "center",
            paddingInline: 16,
            borderBottom: "1px solid #f0f0f0",
          }}
        >
          <Typography.Text style={{ fontWeight: 700, marginRight: 16 }}>GeneViz</Typography.Text>
          <Menu
            mode="horizontal"
            selectedKeys={selected}
            items={[{ key: "projects", icon: <ProjectOutlined />, label: <Link to="/projects">Projects</Link> }]}
            style={{ borderBottom: "none", background: "transparent", flex: 1 }}
          />
          <Button
            size="small"
            icon={<LogoutOutlined />}
            onClick={() => {
              logout();
              nav("/login", { replace: true });
            }}
          >
            Sign out
          </Button>
        </Header>

        <Content style={{ padding: isWorkstation ? 16 : 24 }}>
          <div style={wrapperStyle}>
            <Outlet />
          </div>
        </Content>
      </Layout>
    </ConfigProvider>
  );
}
