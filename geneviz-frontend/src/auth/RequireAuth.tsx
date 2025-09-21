import { Navigate, Outlet, useLocation } from "react-router-dom";
import { initAuthFromStorage } from "./auth";

export default function RequireAuth() {
  const location = useLocation();
  const token = initAuthFromStorage();
  if (!token) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return <Outlet />;
}
