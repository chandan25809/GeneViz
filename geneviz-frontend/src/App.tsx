import { Routes, Route, Navigate } from "react-router-dom";
import type { ReactElement } from "react";
import Projects from "./pages/Projects";
import ProjectDetail from "./pages/ProjectDetail";
import Workstation from "./pages/Workstation";
import Login from "./pages/Login";
import AppLayout from "./AppLayout";
import { hasToken } from "./auth/auth";

function NotFound() {
  return <div style={{ color: "#e6e9f2", padding: 24 }}>404 — Not Found</div>;
}

// Use ReactElement instead of JSX.Element to avoid "Cannot find namespace 'JSX'"
function Protected({ children }: { children: ReactElement }) {
  if (!hasToken()) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        element={
          <Protected>
            <AppLayout />
          </Protected>
        }
      >
        <Route path="/" element={<Navigate to="/projects" replace />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/projects/:projectId" element={<ProjectDetail />} />
        <Route path="/projects/:projectId/datasets/:datasetId" element={<Workstation />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
