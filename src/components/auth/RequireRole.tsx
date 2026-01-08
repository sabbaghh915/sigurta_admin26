import { Navigate } from "react-router-dom";

export default function RequireRole({
  allowed,
  children,
}: {
  allowed: Array<"admin" | "employee">;
  children: React.ReactNode;
}) {
  const token = localStorage.getItem("authToken");
  const role = (localStorage.getItem("role") || "").toLowerCase() as any;

  if (!token) return <Navigate to="/login" replace />;
  if (!allowed.includes(role)) return <Navigate to="/" replace />;

  return <>{children}</>;
}
