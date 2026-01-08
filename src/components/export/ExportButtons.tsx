import { Button } from "@/components/ui/button";
import { FileText, FileSpreadsheet, FileDown } from "lucide-react";

const API_BASE_URL = (import.meta.env.VITE_API_URL?.replace(/\/$/, "")) || "/api";

type ExportFormat = "pdf" | "xlsx" | "csv";

type Props = {
  entity: string;                 // مثال: "payments" | "centers" | "users" ...
  fileName?: string;              // اسم الملف (اختياري)
  params?: Record<string, any>;   // فلاتر الصفحة (بحث، from/to...الخ)
  className?: string;
  hideIfNoPermission?: boolean;   // للمساعد: اخفِ الأزرار إذا ما عنده export_reports
};

function getAuth() {
  const rawUser = localStorage.getItem("user");
  const user = rawUser ? JSON.parse(rawUser) : null;
  const token = localStorage.getItem("token") || localStorage.getItem("authToken");
  const permissions: string[] = Array.isArray(user?.permissions)
    ? user.permissions
    : (() => {
        try {
          return JSON.parse(localStorage.getItem("permissions") || "[]");
        } catch {
          return [];
        }
      })();

  return { user, token, permissions };
}

async function downloadBlob(url: string, token?: string, fileName?: string) {
  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(txt || `Export failed: ${res.status}`);
  }

  const blob = await res.blob();

  // حاول أخذ الاسم من الهيدر إن كان موجود
  const cd = res.headers.get("content-disposition") || "";
  const m = cd.match(/filename\*=UTF-8''([^;]+)|filename="([^"]+)"/i);
  const serverName = decodeURIComponent((m?.[1] || m?.[2] || "").trim());

  const a = document.createElement("a");
  const href = URL.createObjectURL(blob);
  a.href = href;
  a.download = serverName || fileName || "export";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(href);
}

function buildQuery(params?: Record<string, any>) {
  const sp = new URLSearchParams();
  if (!params) return sp.toString();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "") return;
    sp.set(k, String(v));
  });
  return sp.toString();
}

export default function ExportButtons({
  entity,
  fileName,
  params,
  className,
  hideIfNoPermission = false,
}: Props) {
  const { user, token, permissions } = getAuth();

  const isAdmin = user?.role === "admin";
  const canExport = isAdmin || permissions.includes("export_reports");

  if (hideIfNoPermission && !canExport) return null;

  const doExport = async (format: ExportFormat) => {
    const qs = buildQuery({ ...params, format });
    const url = `${API_BASE_URL}/admin/exports/${entity}${qs ? `?${qs}` : ""}`;

    const ext = format === "xlsx" ? "xlsx" : format;
    const finalName = `${fileName || entity}.${ext}`;

    await downloadBlob(url, token, finalName);
  };

  return (
    <div className={className ? className : "flex gap-2"}>
      <Button variant="outline" className="rounded-xl" onClick={() => doExport("pdf")} disabled={!canExport}>
        <FileText className="ml-2 h-4 w-4" />
        PDF
      </Button>

      <Button variant="outline" className="rounded-xl" onClick={() => doExport("xlsx")} disabled={!canExport}>
        <FileSpreadsheet className="ml-2 h-4 w-4" />
        Excel
      </Button>

      <Button variant="outline" className="rounded-xl" onClick={() => doExport("csv")} disabled={!canExport}>
        <FileDown className="ml-2 h-4 w-4" />
        CSV
      </Button>
    </div>
  );
}
