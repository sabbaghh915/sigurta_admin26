import { Navigate } from "react-router-dom";

type Props = {
  children: React.ReactNode;
  required: string | string[];
  mode?: "any" | "all"; // any: يكفي صلاحية واحدة / all: لازم كل الصلاحيات
};

export default function RequirePermission({ children, required, mode = "any" }: Props) {
  const raw = localStorage.getItem("user");
  const user = raw ? JSON.parse(raw) : null;

  if (!user) return <Navigate to="/login" replace />;

  // admin يتجاوز كل شيء
  if (user.role === "admin") return <>{children}</>;

  const perms: string[] =
    user?.permissions ||
    (() => {
      try {
        return JSON.parse(localStorage.getItem("permissions") || "[]");
      } catch {
        return [];
      }
    })();

  const req = Array.isArray(required) ? required : [required];
  const ok =
    mode === "all" ? req.every((p) => perms.includes(p)) : req.some((p) => perms.includes(p));

  if (!ok) return <Navigate to="/assistant" replace />;

  return <>{children}</>;
}
