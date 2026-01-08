import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useMemo } from "react";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Separator } from "../../components/ui/separator";
import { Badge } from "../../components/ui/badge";
import { LayoutDashboard, LogOut, Shield, User, CreditCard, Wallet, FileText } from "lucide-react";
import { cn } from "../../lib/utils";
import logo from "../../assets/logo.svg";

type NavItem = {
  to: string;
  label: string;
  icon: any;
  perm?: string; // إذا موجود => لازم تكون عنده هذه الصلاحية
  exact?: boolean;
};

export default function AssistantLayout() {
  const location = useLocation();
  const navigate = useNavigate();

  const raw = localStorage.getItem("user");
  const user = raw ? JSON.parse(raw) : null;

  const perms: string[] = useMemo(() => {
    if (user?.role === "admin") return ["*"];
    if (Array.isArray(user?.permissions)) return user.permissions;
    try {
      return JSON.parse(localStorage.getItem("permissions") || "[]");
    } catch {
      return [];
    }
  }, [user]);

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("authToken");
    localStorage.removeItem("role");
    localStorage.removeItem("user");
    localStorage.removeItem("permissions");
    navigate("/login", { replace: true });
  };

  const navItems: NavItem[] = [
    { to: "/assistant", label: "الرئيسية", icon: LayoutDashboard, exact: true },

    // ✅ حسب الصلاحيات
    { to: "/assistant/payments", label: "الدفعات", icon: CreditCard, perm: "view_payments" },
    { to: "/assistant/finance", label: "المالية", icon: Wallet, perm: "view_finance" },
    { to: "/assistant/reports", label: "التقارير / التصدير", icon: FileText, perm: "export_reports" },
  ];

  const isActive = (to: string, exact?: boolean) => {
    if (exact) return location.pathname === to;
    return location.pathname.startsWith(to);
  };

  const canSee = (item: NavItem) => {
    if (user?.role === "admin") return true;
    if (!item.perm) return true;
    return perms.includes(item.perm);
  };

  const visibleNav = navItems.filter(canSee);

  return (
    <div dir="rtl" className="min-h-screen bg-gradient-to-br from-white via-green-50 to-green-100">
      {/* Top Bar */}
      <div className="sticky top-0 z-20 border-b bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Syrian Insurance Federation" className="w-10 h-10 rounded-lg" />
            <div className="leading-tight">
              <div className="text-sm font-extrabold text-slate-900">لوحة الأدمن المساعد</div>
              <div className="text-xs text-slate-500">Assistant Admin</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2 rounded-xl border bg-white px-3 py-2">
              <User className="h-4 w-4 text-slate-500" />
              <span className="text-sm font-medium text-slate-800">
                {user?.fullName || user?.username || "-"}
              </span>
              <Badge variant="secondary" className="rounded-lg">
                {user?.role || "assistant_admin"}
              </Badge>
              {user?.role !== "admin" && (
                <Badge className="rounded-lg" variant="outline">
                  {perms.length} صلاحية
                </Badge>
              )}
            </div>

            <Button variant="outline" onClick={logout} className="rounded-xl">
              <LogOut className="ml-2 h-4 w-4" />
              خروج
            </Button>
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl grid-cols-12 gap-4 px-4 py-6">
        {/* Sidebar */}
        <aside className="col-span-12 md:col-span-3">
          <Card className="rounded-2xl shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-extrabold text-slate-900">القائمة</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {visibleNav.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.to, item.exact);

                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={cn(
                      "flex items-center justify-between rounded-xl border px-3 py-2 text-sm transition",
                      active
                        ? "border-green-200 bg-green-50 text-green-700"
                        : "border-transparent bg-white hover:bg-slate-50"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={cn("h-4 w-4", active ? "text-green-700" : "text-slate-500")} />
                      <span className="font-semibold">{item.label}</span>
                    </div>

                    {item.perm && user?.role !== "admin" && (
                      <Badge variant="outline" className="rounded-lg text-[10px]">
                        {item.perm}
                      </Badge>
                    )}
                  </Link>
                );
              })}

              {user?.role !== "admin" && visibleNav.length <= 1 && (
                <div className="rounded-xl border bg-amber-50 p-3 text-xs text-amber-800">
                  لا توجد صفحات متاحة حالياً. اطلب من الأدمن الرئيسي منحك صلاحيات.
                </div>
              )}

              <Separator className="my-3" />

              <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
                تظهر الصفحات حسب الصلاحيات التي يمنحها الأدمن الرئيسي.
              </div>
            </CardContent>
          </Card>
        </aside>

        {/* Content */}
        <main className="col-span-12 md:col-span-9">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
