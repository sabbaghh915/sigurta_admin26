import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Separator } from "../../components/ui/separator";
import { Alert, AlertDescription } from "../../components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";

import { adminApi } from "../../services/adminApi";

import {
  AlertCircle,
  CreditCard,
  FileText,
  Home,
  RefreshCcw,
  Shield,
  TrendingUp,
  Users,
} from "lucide-react";

type AdminUser = {
  _id?: string;
  username?: string;
  fullName?: string;
  email?: string;
  role?: string;
  createdAt?: string;
};

type Vehicle = {
  _id?: string;
  ownerName?: string;
  plateNumber?: string;
  brand?: string;
  model?: string;
  year?: number;
  createdAt?: string;
  vehicleType?: "syrian" | "foreign" | string;
};

/**
 * ✅ Payment document (حسب DB)
 * - يدعم أيضاً أسماء قديمة لو رجعها الباك (status/method/reference/total)
 */
type PricingInput = {
  insuranceType?: "internal" | "border" | string;
  vehicleCode?: string;
  category?: string;
  classification?: number;
  months?: number;
  electronicCard?: boolean;
  premiumService?: boolean;
  rescueService?: boolean;
  vehicleType?: string;
  period?: number;
};

type Breakdown = {
  netPremium?: number;
  stampFee?: number;
  warEffort?: number;
  martyrFund?: number;
  localAdministration?: number;
  reconstruction?: number;

  agesFee?: number;
  federationFee?: number;

  electronicCardFee?: number;
  premiumServiceFee?: number;
  rescueServiceFee?: number;

  subtotal?: number;
  total?: number;
};

type PaymentDoc = {
  _id?: string;

  vehicleModel?: string;
  vehicleId?: string;

  policyNumber?: string;
  receiptNumber?: string;

  amount?: number;

  paymentMethod?: string;
  paymentStatus?: string;

  paidBy?: string;
  payerPhone?: string;

  issuedAt?: string;
  policyStartAt?: string;
  policyEndAt?: string;

  pricingInput?: PricingInput;
  breakdown?: Breakdown;

  paymentDate?: string;
  createdAt?: string;
};

const extractArray = (res: any): any[] => {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.items)) return res.items;
  if (Array.isArray(res?.payments)) return res.payments;
  return [];
};

const oid = (v: any) => (typeof v === "string" ? v : v?.$oid ? String(v.$oid) : undefined);
const dt = (v: any) =>
  typeof v === "string" ? v : v?.$date ? new Date(v.$date).toISOString() : undefined;

const normalizePayment = (raw: any): PaymentDoc => {
  if (!raw || typeof raw !== "object") return {};

  return {
    _id: oid(raw._id) || raw._id || raw.id,

    vehicleModel: raw.vehicleModel,
    vehicleId: oid(raw.vehicleId) || raw.vehicleId,

    policyNumber: raw.policyNumber,
    receiptNumber: raw.receiptNumber ?? raw.reference,

    amount: raw.amount ?? raw.total ?? raw.breakdown?.total,

    paymentMethod: raw.paymentMethod ?? raw.method,
    paymentStatus: raw.paymentStatus ?? raw.status,

    paidBy: raw.paidBy,
    payerPhone: raw.payerPhone,

    issuedAt: dt(raw.issuedAt) ?? raw.issuedAt,
    policyStartAt: dt(raw.policyStartAt) ?? raw.policyStartAt,
    policyEndAt: dt(raw.policyEndAt) ?? raw.policyEndAt,

    pricingInput: raw.pricingInput,
    breakdown: raw.breakdown,

    paymentDate: dt(raw.paymentDate) ?? raw.paymentDate,
    createdAt: dt(raw.createdAt) ?? raw.createdAt,
  };
};

function formatDate(value?: string) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("ar-SY", { year: "numeric", month: "2-digit", day: "2-digit" });
}

function formatMoney(value?: number) {
  const n = typeof value === "number" ? value : 0;
  return new Intl.NumberFormat("ar-SY").format(n) + " ل.س";
}

function getStatusBadge(status?: string) {
  const s = (status || "").toLowerCase();
  if (["paid", "success", "completed", "done"].includes(s)) {
    return <Badge className="bg-green-600 hover:bg-green-600">مدفوع</Badge>;
  }
  if (["pending", "waiting", "processing"].includes(s)) {
    return <Badge className="bg-amber-600 hover:bg-amber-600">قيد المعالجة</Badge>;
  }
  if (["failed", "rejected", "canceled", "cancelled"].includes(s)) {
    return <Badge className="bg-red-600 hover:bg-red-600">مرفوض</Badge>;
  }
  return <Badge variant="secondary">غير محدد</Badge>;
}

function StatCard({
  title,
  value,
  icon,
  hint,
  accent = "from-primary to-primary-700",
}: {
  title: string;
  value: React.ReactNode;
  icon: React.ReactNode;
  hint?: string;
  accent?: string;
}) {
  return (
    <Card className="overflow-hidden shadow-sm hover:shadow-lg transition-shadow">
      <div className={`h-1 w-full bg-gradient-to-r ${accent}`} />
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="text-gray-700">{title}</span>
          <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center border">
            {icon}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="text-3xl font-bold text-gray-900">{value}</div>
        {hint ? <p className="text-sm text-gray-500 mt-1">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}

export default function AdminDashboard() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [syVehicles, setSyVehicles] = useState<Vehicle[]>([]);
  const [frVehicles, setFrVehicles] = useState<Vehicle[]>([]);
  const [payments, setPayments] = useState<PaymentDoc[]>([]);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string>("");

  const counts = useMemo(() => {
    return {
      users: users.length,
      sy: syVehicles.length,
      fr: frVehicles.length,
      payments: payments.length,
    };
  }, [users, syVehicles, frVehicles, payments]);

  const loadData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      else setRefreshing(true);

      setError(null);

      const [usersRes, syRes, frRes, payRes] = await Promise.all([
        adminApi.getUsers(),
        adminApi.getSyrianVehicles(),
        adminApi.getForeignVehicles(),
        adminApi.getPayments(),
      ]);

      setUsers(Array.isArray(usersRes) ? usersRes : []);
      setSyVehicles(Array.isArray(syRes) ? syRes : []);
      setFrVehicles(Array.isArray(frRes) ? frRes : []);

      const payList = extractArray(payRes).map(normalizePayment);
      payList.sort((a, b) => {
        const ta = new Date(a.createdAt || a.paymentDate || 0).getTime();
        const tb = new Date(b.createdAt || b.paymentDate || 0).getTime();
        return tb - ta;
      });
      setPayments(payList);

      setLastUpdatedAt(new Date().toISOString());
    } catch (err) {
      console.error(err);
      setError("فشل في تحميل بيانات لوحة التحكم");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const latestUsers = useMemo(() => users.slice(0, 6), [users]);
  const latestPayments = useMemo(() => payments.slice(0, 6), [payments]);
  const latestSy = useMemo(() => syVehicles.slice(0, 6), [syVehicles]);
  const latestFr = useMemo(() => frVehicles.slice(0, 6), [frVehicles]);

  const totalVehicles = counts.sy + counts.fr;
  const syShare = totalVehicles ? Math.round((counts.sy / totalVehicles) * 100) : 0;

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50" dir="rtl">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <Alert variant="destructive" className="border-red-200">
            <AlertDescription className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {error}
            </AlertDescription>
          </Alert>

          <div className="mt-4">
            <Button onClick={() => loadData(false)} className="gap-2">
              <RefreshCcw className="w-4 h-4" />
              إعادة المحاولة
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Top Bar */}
      <div className="bg-gradient-to-r from-primary to-primary-700 shadow-lg border-b border-primary-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="h-16 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="text-xl font-bold text-white truncate">لوحة تحكم الإدارة</h1>
                <p className="text-sm text-white/90 truncate">ملخص سريع وإدارة بيانات النظام</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => loadData(true)}
                className="gap-2 border-white/30 bg-white/90 text-black hover:bg-white"
                disabled={refreshing}
              >
                <RefreshCcw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
                تحديث
              </Button>

              <Button
                variant="outline"
                onClick={() => navigate("/")}
                className="gap-2 border-white/30 bg-white/90 text-black hover:bg-white"
              >
                <Home className="w-4 h-4" />
                الرئيسية
              </Button>

              <Button
                variant="outline"
                onClick={() => {
                  localStorage.removeItem("isAuthenticated");
                  localStorage.removeItem("username");
                  localStorage.removeItem("token");
                  navigate("/login");
                }}
                className="border-white/30 bg-white/90 text-black hover:bg-white"
              >
                تسجيل الخروج
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Title Row */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <TrendingUp className="w-6 h-6" />
              نظرة عامة
            </h2>
            <p className="text-gray-600 text-sm mt-1">آخر تحديث: {lastUpdatedAt ? formatDate(lastUpdatedAt) : "—"}</p>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-sm">
              مركبات سورية: {syShare}%
            </Badge>
            <Badge variant="secondary" className="text-sm">
              إجمالي المركبات: {totalVehicles}
            </Badge>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard
            title="الموظفون"
            value={loading ? "…" : counts.users}
            hint="عدد حسابات الموظفين"
            icon={<Users className="w-5 h-5 text-blue-600" />}
            accent="from-blue-600 to-blue-400"
          />
          <StatCard
            title="مركبات سورية"
            value={loading ? "…" : counts.sy}
            hint="السجلات السورية"
            icon={<FileText className="w-5 h-5 text-green-600" />}
            accent="from-green-600 to-green-400"
          />
          <StatCard
            title="مركبات أجنبية"
            value={loading ? "…" : counts.fr}
            hint="السجلات الأجنبية"
            icon={<FileText className="w-5 h-5 text-green-600" />}
            accent="from-green-600 to-green-400"
          />
          <StatCard
            title="الدفعات"
            value={loading ? "…" : counts.payments}
            hint="عمليات الدفع المسجّلة"
            icon={<CreditCard className="w-5 h-5 text-amber-600" />}
            accent="from-amber-600 to-amber-400"
          />
        </div>

        <Separator className="my-8" />

        {/* Tables */}
        <Card className="shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between">
              <span className="text-lg">الجداول</span>
              <span className="text-sm text-gray-500">{loading ? "تحميل..." : "أحدث السجلات"}</span>
            </CardTitle>
          </CardHeader>

          <CardContent>
            <Tabs defaultValue="payments" className="w-full">
              <TabsList className="grid grid-cols-2 md:grid-cols-4 w-full">
                <TabsTrigger value="payments">الدفعات</TabsTrigger>
                <TabsTrigger value="users">الموظفون</TabsTrigger>
                <TabsTrigger value="sy">مركبات سورية</TabsTrigger>
                <TabsTrigger value="fr">مركبات أجنبية</TabsTrigger>
              </TabsList>

              {/* Payments */}
              <TabsContent value="payments" className="mt-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-900">آخر الدفعات</h3>
                  <Button variant="outline" onClick={() => navigate("/admin/payments")}>
                    عرض الكل
                  </Button>
                </div>

                <div className="rounded-lg border bg-white overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-right">التاريخ</TableHead>
                        <TableHead className="text-right">الإيصال</TableHead>
                        <TableHead className="text-right">الوثيقة</TableHead>
                        <TableHead className="text-right">المبلغ</TableHead>
                        <TableHead className="text-right">الحالة</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        Array.from({ length: 5 }).map((_, i) => (
                          <TableRow key={i}>
                            <TableCell colSpan={5}>
                              <div className="h-8 bg-gray-100 rounded animate-pulse" />
                            </TableCell>
                          </TableRow>
                        ))
                      ) : latestPayments.length ? (
                        latestPayments.map((p) => (
                          <TableRow key={p._id || Math.random()}>
                            <TableCell className="text-right">{formatDate(p.paymentDate || p.createdAt)}</TableCell>
                            <TableCell className="text-right font-mono text-xs">{p.receiptNumber || "—"}</TableCell>
                            <TableCell className="text-right font-mono text-xs">{p.policyNumber || "—"}</TableCell>
                            <TableCell className="text-right">{formatMoney(p.amount ?? p.breakdown?.total)}</TableCell>
                            <TableCell className="text-right">{getStatusBadge(p.paymentStatus)}</TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-gray-500 py-8">
                            لا توجد بيانات لعرضها
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              {/* Users */}
              <TabsContent value="users" className="mt-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-900">آخر الموظفين</h3>
                  <Button variant="outline" onClick={() => navigate("/admin/users")}>
                    عرض الكل
                  </Button>
                </div>

                <div className="rounded-lg border bg-white overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-right">الاسم</TableHead>
                        <TableHead className="text-right">المستخدم</TableHead>
                        <TableHead className="text-right">الدور</TableHead>
                        <TableHead className="text-right">تاريخ الإنشاء</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        Array.from({ length: 5 }).map((_, i) => (
                          <TableRow key={i}>
                            <TableCell colSpan={4}>
                              <div className="h-8 bg-gray-100 rounded animate-pulse" />
                            </TableCell>
                          </TableRow>
                        ))
                      ) : latestUsers.length ? (
                        latestUsers.map((u) => (
                          <TableRow key={u._id || Math.random()}>
                            <TableCell className="text-right">{u.fullName || "—"}</TableCell>
                            <TableCell className="text-right">{u.username || "—"}</TableCell>
                            <TableCell className="text-right">{u.role ? <Badge variant="secondary">{u.role}</Badge> : "—"}</TableCell>
                            <TableCell className="text-right">{formatDate(u.createdAt)}</TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-gray-500 py-8">
                            لا توجد بيانات لعرضها
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              {/* Syrian Vehicles */}
              <TabsContent value="sy" className="mt-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-900">آخر المركبات السورية</h3>
                  <Button variant="outline" onClick={() => navigate("/admin/syrian-vehicles")}>
                    عرض الكل
                  </Button>
                </div>

                <div className="rounded-lg border bg-white overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-right">المالك</TableHead>
                        <TableHead className="text-right">اللوحة</TableHead>
                        <TableHead className="text-right">المركبة</TableHead>
                        <TableHead className="text-right">التاريخ</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        Array.from({ length: 5 }).map((_, i) => (
                          <TableRow key={i}>
                            <TableCell colSpan={4}>
                              <div className="h-8 bg-gray-100 rounded animate-pulse" />
                            </TableCell>
                          </TableRow>
                        ))
                      ) : latestSy.length ? (
                        latestSy.map((v) => (
                          <TableRow key={v._id || Math.random()}>
                            <TableCell className="text-right">{v.ownerName || "—"}</TableCell>
                            <TableCell className="text-right">{v.plateNumber || "—"}</TableCell>
                            <TableCell className="text-right">
                              {(v.brand || "—") + " " + (v.model || "")} {v.year ? `(${v.year})` : ""}
                            </TableCell>
                            <TableCell className="text-right">{formatDate(v.createdAt)}</TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-gray-500 py-8">
                            لا توجد بيانات لعرضها
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              {/* Foreign Vehicles */}
              <TabsContent value="fr" className="mt-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-900">آخر المركبات الأجنبية</h3>
                  <Button variant="outline" onClick={() => navigate("/admin/foreign-vehicles")}>
                    عرض الكل
                  </Button>
                </div>

                <div className="rounded-lg border bg-white overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-right">المالك</TableHead>
                        <TableHead className="text-right">اللوحة</TableHead>
                        <TableHead className="text-right">المركبة</TableHead>
                        <TableHead className="text-right">التاريخ</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        Array.from({ length: 5 }).map((_, i) => (
                          <TableRow key={i}>
                            <TableCell colSpan={4}>
                              <div className="h-8 bg-gray-100 rounded animate-pulse" />
                            </TableCell>
                          </TableRow>
                        ))
                      ) : latestFr.length ? (
                        latestFr.map((v) => (
                          <TableRow key={v._id || Math.random()}>
                            <TableCell className="text-right">{v.ownerName || "—"}</TableCell>
                            <TableCell className="text-right">{v.plateNumber || "—"}</TableCell>
                            <TableCell className="text-right">
                              {(v.brand || "—") + " " + (v.model || "")} {v.year ? `(${v.year})` : ""}
                            </TableCell>
                            <TableCell className="text-right">{formatDate(v.createdAt)}</TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-gray-500 py-8">
                            لا توجد بيانات لعرضها
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <div className="text-sm text-gray-500 mt-6">
          Tip: إذا بدك “Top Bar” موحّد لكل صفحات الأدمن، بعملك Component مستقل (Layout) وتستخدمه بكل الصفحات.
        </div>
      </div>
    </div>
  );
}
