import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../../components/ui/table";
import { adminApi } from "../../services/adminApi";
import { AlertCircle, Loader2, CreditCard } from "lucide-react";
import ExportButtons from "@/components/export/ExportButtons";
import { PaginationBar } from "../../components/ui/pagination";

/**
 * ✅ Payment document shape (حسب الـ DB)
 * - يدعم أيضاً الأسماء القديمة (status/method/reference/total) لو رجعها الباك.
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

  electronicCard?: boolean;
  premiumService?: boolean;
  rescueService?: boolean;
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

  center?: string;

  paidBy?: string;
  payerPhone?: string;

  processedBy?: string;

  issuedAt?: string;
  policyStartAt?: string;
  policyEndAt?: string;

  pricingInput?: PricingInput;
  breakdown?: Breakdown;

  insuranceCompany?: string;

  paymentDate?: string;
  createdAt?: string;
  updatedAt?: string;

  __v?: number;
};

const extractArray = (res: any): any[] => {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.items)) return res.items;
  if (Array.isArray(res?.vehicles)) return res.vehicles;
  if (Array.isArray(res?.users)) return res.users;
  return [];
};

const oid = (v: any) => (typeof v === "string" ? v : v?.$oid ? String(v.$oid) : undefined);
const dt = (v: any) =>
  typeof v === "string" ? v : v?.$date ? new Date(v.$date).toISOString() : undefined;

// Helper to extract name from populated objects (center/insuranceCompany)
const extractName = (v: any): string => {
  if (!v) return "";
  if (typeof v === "string") return v;
  if (typeof v === "object") {
    // If it's a populated object, get the name property
    return v.name || v._id || String(v);
  }
  return String(v);
};

const normalizePayment = (raw: any): PaymentDoc => {
  if (!raw || typeof raw !== "object") return {};

  const _id = oid(raw._id) || raw._id || raw.id;

  return {
    _id,
    vehicleModel: raw.vehicleModel,
    vehicleId: oid(raw.vehicleId) || raw.vehicleId,

    policyNumber: raw.policyNumber,
    receiptNumber: raw.receiptNumber ?? raw.reference,

    amount: raw.amount ?? raw.total ?? raw.breakdown?.total,

    paymentMethod: raw.paymentMethod ?? raw.method,
    paymentStatus: raw.paymentStatus ?? raw.status,

    center: oid(raw.center) || raw.center,

    paidBy: raw.paidBy,
    payerPhone: raw.payerPhone,

    processedBy: oid(raw.processedBy) || raw.processedBy,

    issuedAt: dt(raw.issuedAt) ?? raw.issuedAt,
    policyStartAt: dt(raw.policyStartAt) ?? raw.policyStartAt,
    policyEndAt: dt(raw.policyEndAt) ?? raw.policyEndAt,

    pricingInput: raw.pricingInput,
    breakdown: raw.breakdown,

    insuranceCompany: oid(raw.insuranceCompany) || raw.insuranceCompany,

    paymentDate: dt(raw.paymentDate) ?? raw.paymentDate,
    createdAt: dt(raw.createdAt) ?? raw.createdAt,
    updatedAt: dt(raw.updatedAt) ?? raw.updatedAt,

    __v: raw.__v,
  };
};

const formatDate = (value?: string) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("ar-SY", { year: "numeric", month: "2-digit", day: "2-digit" });
};

const formatMoney = (value?: number) => {
  const n = typeof value === "number" ? value : 0;
  return new Intl.NumberFormat("ar-SY").format(n) + " ل.س";
};

function TableEmptyState({ message, colSpan }: { message: string; colSpan: number }) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="text-center text-muted-foreground py-10">
        {message}
      </TableCell>
    </TableRow>
  );
}

export default function AdminPayments() {
  const [items, setItems] = useState<PaymentDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // تستخدم مع أزرار التصدير (إذا عندك endpoint يدعمها)
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [q, setQ] = useState("");

  // Pagination (client-side)
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  useEffect(() => {
    setLoading(true);
    setError(null);

    adminApi
      .getPayments()
      .then((res) => {
        const list = extractArray(res).map(normalizePayment);

        // ✅ رتّب: الأحدث أولاً
        list.sort((a, b) => {
          const ta = new Date(a.createdAt || a.paymentDate || 0).getTime();
          const tb = new Date(b.createdAt || b.paymentDate || 0).getTime();
          return tb - ta;
        });

        setItems(list);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError("فشل تحميل البيانات. تأكد من تسجيل الدخول كمشرف.");
        setLoading(false);
      });
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return items;

    const result = items.filter((p) => {
      return (
        String(p.receiptNumber || "").toLowerCase().includes(s) ||
        String(p.policyNumber || "").toLowerCase().includes(s) ||
        String(p.paidBy || "").toLowerCase().includes(s) ||
        String(p.payerPhone || "").toLowerCase().includes(s)
      );
    });
    return result;
  }, [items, q]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [q, from, to, items.length]);

  const paged = useMemo(() => {
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    if (start >= filtered.length && page > 1) {
      // clamp if total shrank
      return filtered.slice(0, pageSize);
    }
    return filtered.slice(start, end);
  }, [filtered, page, pageSize]);

  return (
    <Card className="overflow-hidden border-0 bg-white/70 backdrop-blur shadow-xl">
      <div className="h-2 bg-gradient-to-r from-rose-500 via-orange-500 to-amber-500" />

      <CardHeader className="pb-3">
        <CardTitle className="flex items-start gap-3 text-slate-900">
          <span className="w-10 h-10 rounded-2xl bg-gradient-to-r from-rose-500 to-amber-500 flex items-center justify-center mt-0.5">
            <CreditCard className="w-5 h-5 text-white" />
          </span>

          <div className="flex-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-col">
                <span className="text-lg font-extrabold">الدفعات</span>
                <span className="text-sm font-normal text-slate-600">({items.length}) عملية</span>
              </div>

              <ExportButtons
                entity="payments"
                fileName="payments"
                params={{ from, to, q }}
                hideIfNoPermission={false}
              />
            </div>

            {/* فلاتر بسيطة محلية */}
            <div className="mt-3 flex flex-wrap gap-2">
              <input
                className="h-9 rounded-md border px-3 text-sm"
                placeholder="بحث: إيصال/وثيقة/اسم/هاتف…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
              <input
                className="h-9 rounded-md border px-3 text-sm"
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
              <input
                className="h-9 rounded-md border px-3 text-sm"
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </div>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent>
        {loading && (
          <div className="flex items-center justify-center py-10 gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-rose-600" />
            <span className="text-slate-700">جاري تحميل البيانات...</span>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 mb-4">
            <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {!loading && !error && (
          <div className="rounded-2xl border border-slate-200/70 bg-white overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">رقم الإيصال</TableHead>
                  <TableHead className="text-right">رقم الوثيقة</TableHead>
                  <TableHead className="text-right">المبلغ</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                  <TableHead className="text-right">طريقة الدفع</TableHead>
                  <TableHead className="text-right">الدافع</TableHead>
                  <TableHead className="text-right">الهاتف</TableHead>
                  <TableHead className="text-right">المركز</TableHead>
                  <TableHead className="text-right">شركة التأمين</TableHead>
                  <TableHead className="text-right">تاريخ الدفع</TableHead>
                  <TableHead className="text-right">بداية</TableHead>
                  <TableHead className="text-right">نهاية</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {paged.map((p) => (
                  <TableRow key={p._id}>
                    <TableCell className="font-mono text-xs">{p.receiptNumber || "—"}</TableCell>
                    <TableCell className="font-mono text-xs">{p.policyNumber || "—"}</TableCell>
                    <TableCell className="font-extrabold">{formatMoney(p.amount ?? p.breakdown?.total)}</TableCell>
                    <TableCell>{p.paymentStatus || "—"}</TableCell>
                    <TableCell>{p.paymentMethod || "—"}</TableCell>
                    <TableCell>{p.paidBy || "—"}</TableCell>
                    <TableCell className="font-mono text-xs">{p.payerPhone || "—"}</TableCell>
                    <TableCell className="text-xs" title={extractName(p.center)}>{extractName(p.center) || "—"}</TableCell>
                    <TableCell className="text-xs" title={extractName(p.insuranceCompany)}>{extractName(p.insuranceCompany) || "—"}</TableCell>
                    <TableCell>{formatDate(p.paymentDate || p.createdAt)}</TableCell>
                    <TableCell>{formatDate(p.policyStartAt)}</TableCell>
                    <TableCell>{formatDate(p.policyEndAt)}</TableCell>
                  </TableRow>
                ))}

                {!filtered.length && !loading && !error && (
                  <TableEmptyState message="لا يوجد دفعات" colSpan={12} />
                )}
              </TableBody>
            </Table>
          </div>
        )}

        {!loading && !error && (
          <PaginationBar
            page={page}
            pageSize={pageSize}
            total={filtered.length}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            pageSizeOptions={[20, 50, 100, 200]}
          />
        )}
      </CardContent>
    </Card>
  );
}
