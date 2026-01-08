import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import RequireRole from "./components/auth/RequireRole";
import {
  AdminLayout,
  AdminDashboard,
  AdminEmployees,
  AdminRecords,
  AdminPayments,
  AdminCenters,
  AdminFinance,
  AdminInsuranceCompanies,
  AdminFinanceDistribution,
  AdminAssistantAdmins,
  AdminPricing,
} from "./pages/admin";

import Home from "./pages/admin/Home";
import Login from "./pages/admin/Login";

// ✅ أنشئ صفحة/لاي اوت للمساعد (اعملها لو ما عندك)
import AssistantLayout from "./pages/assistant/AssistantLayout";
import AssistantDashboard from "./pages/assistant/AssistantDashboard";
import RequirePermission from "./components/auth/RequirePermission";

// ✅ Redirect ذكي حسب role
function RoleHomeRedirect() {
  const raw = localStorage.getItem("user");
  const user = raw ? JSON.parse(raw) : null;

  if (!user) return <Navigate to="/login" replace />;

  if (user.role === "admin") return <Navigate to="/admin" replace />;
  if (user.role === "assistant_admin") return <Navigate to="/assistant" replace />;

  // لو عندك موظفين لاحقاً
  return <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ✅ الصفحة الرئيسية: تحويل تلقائي */}
        <Route path="/" element={<RoleHomeRedirect />} />

        {/* (اختياري) إذا بدك تحتفظ بصفحة Home الحالية */}
        <Route path="/home" element={<Home />} />

        <Route path="/login" element={<Login />} />

        {/* ✅ Admin (فقط admin) */}
        <Route
          path="/admin"
          element={
            <RequireRole allowed={["admin"]}>
              <AdminLayout />
            </RequireRole>
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path="centers" element={<AdminCenters />} />
          <Route path="employees" element={<AdminEmployees />} />
          <Route path="records" element={<AdminRecords />} />
          <Route path="payments" element={<AdminPayments />} />
          <Route path="finance" element={<AdminFinance />} />
          <Route path="insurance-companies" element={<AdminInsuranceCompanies />} />
          <Route path="finance-distribution" element={<AdminFinanceDistribution />} />
          <Route path="assistant-admins" element={<AdminAssistantAdmins />} />
          <Route path="pricing" element={<AdminPricing />} />
        </Route>

        {/* ✅ Assistant Admin (assistant_admin + admin) بدون permissions */}
        <Route
  path="/assistant"
  element={
    <RequireRole allowed={["assistant_admin", "admin"]}>
      <AssistantLayout />
    </RequireRole>
  }
>
  <Route index element={<AssistantDashboard />} />

  <Route
    path="payments"
    element={
      <RequirePermission required="view_payments">
        <AdminPayments />
      </RequirePermission>
    }
  />

  <Route
    path="finance"
    element={
      <RequirePermission required="view_finance">
        <AdminFinance />
      </RequirePermission>
    }
  />

  <Route
    path="reports"
    element={
      <RequirePermission required="export_reports">
        <AdminRecords />
      </RequirePermission>
    }
  />
</Route>

        {/* ✅ أي مسار غير معروف */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
