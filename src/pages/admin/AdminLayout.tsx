import { Outlet, NavLink, useLocation, useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/button";
import { cn } from "../../lib/utils";
import {
  Building2,
  CreditCard,
  FileText,
  Home,
  LayoutDashboard,
  LogOut,
  Shield,
  Users,
} from "lucide-react";
import logo from "../../assets/logo.svg";

interface PageInfo {
  path: string;
  name: string;
  icon: React.ReactNode;
}

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const pages: PageInfo[] = [
    { path: "/admin", name: "لوحة التحكم", icon: <LayoutDashboard className="w-4 h-4" /> },
    { path: "/admin/centers", name: "المراكز", icon: <Building2 className="w-4 h-4" /> },
    { path: "/admin/employees", name: "الموظفون", icon: <Users className="w-4 h-4" /> },
    { path: "/admin/records", name: "السجلات", icon: <FileText className="w-4 h-4" /> },
    { path: "/admin/payments", name: "الدفعات", icon: <CreditCard className="w-4 h-4" /> },
    { path: "/admin/finance", name: "الإحصائيات المالية", icon: <CreditCard className="w-4 h-4" /> },
    { path: "/admin/insurance-companies", name: "شركات التأمين", icon: <Building2 className="w-4 h-4" /> },
    { path: "/admin/finance-distribution", name: "توزيع المبالغ", icon: <CreditCard className="w-4 h-4" /> },
    { path: "/admin/assistant-admins", name: "المسؤولون المساعدون", icon: <CreditCard className="w-4 h-4" /> },
    { path: "/admin/pricing", name: "التسعير", icon: <CreditCard className="w-4 h-4" /> },
  ];

  const current = pages.find((p) => p.path === location.pathname);

  const logout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    navigate("/login");
  };

  const navItemClass = ({ isActive }: any) =>
    cn(
      "flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition w-full",
      "hover:bg-white/60",
      isActive
        ? "bg-gradient-to-r from-green-600 via-green-700 to-green-800 text-white shadow"
        : "text-slate-700"
    );

  return (
    <div className="min-h-screen" dir="rtl">
      {/* Topbar (Gradient) */}
      <header className="sticky top-0 z-50">
        <div className="bg-gradient-to-r from-green-600 via-green-700 to-green-800 text-white shadow-lg">
          {/* ✅ FULL WIDTH */}
          <div className="w-full px-4 sm:px-6 lg:px-8">
            <div className="h-16 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <img src={logo} alt="Syrian Insurance Federation" className="w-12 h-12 rounded-lg bg-white/10 p-1" />
                <div className="min-w-0">
                  <div className="font-bold text-lg leading-5 truncate">لوحة الإدارة</div>
                  <div className="text-xs text-white/85 truncate">
                    {current ? `الصفحة الحالية: ${current.name}` : "إدارة التأمين الإلزامي"}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate("/")}
                  className="border-white/30 bg-white/90 text-black hover:bg-white gap-2"
                >
                  <Home className="w-4 h-4" />
                  الرئيسية
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={logout}
                  className="border-white/30 bg-white/90 text-black hover:bg-white gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  خروج
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Mini Nav bar */}
        <div className="border-b bg-white/60 backdrop-blur">
          {/* ✅ FULL WIDTH */}
          <div className="w-full px-4 sm:px-6 lg:px-8 py-2 flex gap-2 overflow-x-auto">
            {pages.map((p) => (
              <NavLink
                key={p.path}
                to={p.path}
                end={p.path === "/admin"}
                className={({ isActive }) =>
                  cn(
                    "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap border transition flex items-center gap-2",
                    isActive
                      ? "bg-gradient-to-r from-green-600 to-green-800 text-white border-transparent shadow"
                      : "bg-white/70 hover:bg-white border-slate-200 text-slate-700"
                  )
                }
              >
                {p.icon}
                {p.name}
              </NavLink>
            ))}
          </div>
        </div>
      </header>

      {/* Body */}
      {/* ✅ FULL WIDTH */}
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6 grid grid-cols-12 gap-6">
        {/* Sidebar */}
        {/* ✅ Sidebar أنحف (اختياري لكن أجمل) */}
        <aside className="col-span-12 lg:col-span-2 xl:col-span-2">
          <div className="rounded-2xl bg-white/70 backdrop-blur border border-slate-200 shadow-sm p-3 space-y-1">
            {pages.map((p) => (
              <NavLink key={p.path} to={p.path} end={p.path === "/admin"} className={navItemClass}>
                {p.icon}
                <span>{p.name}</span>
              </NavLink>
            ))}

            <div className="pt-3">
              <div className="h-px bg-slate-200 mb-3" />
              
            </div>
          </div>
        </aside>

        {/* Content */}
        <main className="col-span-12 lg:col-span-10 xl:col-span-10">
          <div className="rounded-2xl bg-white/70 backdrop-blur border border-slate-200 shadow-sm p-4 sm:p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
