import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { adminApi } from "../../services/adminApi";
import { Loader2, AlertCircle } from "lucide-react";
import ExportButtons from "@/components/export/ExportButtons";
import { PaginationBar } from "../../components/ui/pagination";

/**
 * ✅ Payment document (حسب DB) — نستخدمه لإظهار "آخر وثيقة" لكل مركبة
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
  total?: number;
};

type PaymentDoc = {
  _id?: string;
  vehicleId?: string;
  vehicleModel?: string;

  policyNumber?: string;
  receiptNumber?: string;

  amount?: number;

  paymentStatus?: string;
  paymentMethod?: string;

  policyStartAt?: string;
  policyEndAt?: string;

  pricingInput?: PricingInput;
  breakdown?: Breakdown;

  createdAt?: string;
  paymentDate?: string;
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

const normalizePayment = (raw: any): PaymentDoc => {
  if (!raw || typeof raw !== "object") return {};
  return {
    _id: oid(raw._id) || raw._id || raw.id,
    vehicleId: oid(raw.vehicleId) || raw.vehicleId,
    vehicleModel: raw.vehicleModel,

    policyNumber: raw.policyNumber,
    receiptNumber: raw.receiptNumber ?? raw.reference,

    amount: raw.amount ?? raw.total ?? raw.breakdown?.total,

    paymentStatus: raw.paymentStatus ?? raw.status,
    paymentMethod: raw.paymentMethod ?? raw.method,

    policyStartAt: dt(raw.policyStartAt) ?? raw.policyStartAt,
    policyEndAt: dt(raw.policyEndAt) ?? raw.policyEndAt,

    pricingInput: raw.pricingInput,
    breakdown: raw.breakdown,

    createdAt: dt(raw.createdAt) ?? raw.createdAt,
    paymentDate: dt(raw.paymentDate) ?? raw.paymentDate,
  };
};

const formatDate = (value?: string) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("ar-SY", { year: "numeric", month: "2-digit", day: "2-digit" });
};

const formatMoney = (value?: number) => {
  const n = typeof value === "number" ? value : 0;
  return new Intl.NumberFormat("ar-SY").format(n) + " ل.س";
};

export default function AdminRecords() {
  const [tab, setTab] = useState<"syrian" | "foreign">("syrian");
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  // ✅ خريطة: vehicleId -> آخر دفع/وثيقة
  const [latestByVehicleId, setLatestByVehicleId] = useState<Record<string, PaymentDoc>>({});

  // Pagination (client-side)
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  // حمّل الدفعات مرة واحدة واصنع خريطة آخر وثيقة لكل مركبة
  useEffect(() => {
    adminApi
      .getPayments()
      .then((res) => {
        const list = extractArray(res).map(normalizePayment);

        // الأحدث أولاً
        list.sort((a, b) => {
          const ta = new Date(a.createdAt || a.paymentDate || 0).getTime();
          const tb = new Date(b.createdAt || b.paymentDate || 0).getTime();
          return tb - ta;
        });

        const map: Record<string, PaymentDoc> = {};
        for (const p of list) {
          const vid = String(p.vehicleId || "");
          if (!vid) continue;
          if (!map[vid]) map[vid] = p; // لأننا مرتبين DESC، أول عنصر هو الأحدث
        }
        setLatestByVehicleId(map);
      })
      .catch(() => {
        // حتى لو فشل تحميل الدفعات، صفحة المركبات تظل تعمل
      });
  }, []);

  useEffect(() => {
    setLoading(true);
    setError(null);

    const api = tab === "syrian" ? adminApi.getSyrianVehicles() : adminApi.getForeignVehicles();

    api
      .then((res) => {
        const list = extractArray(res);
        setItems(list);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError("فشل تحميل البيانات. تأكد من تسجيل الدخول كمشرف.");
        setLoading(false);
      });
  }, [tab]);

  const filtered = useMemo(() => {
    const list = Array.isArray(items) ? items : [];
    const s = q.toLowerCase().trim();
    if (!s) return list;
    return list.filter((x) => {
      return (
        String(x.plateNumber || "").toLowerCase().includes(s) ||
        String(x.ownerName || "").toLowerCase().includes(s) ||
        String(x.nationalId || "").toLowerCase().includes(s)
      );
    });
  }, [items, q]);

  // Reset page when filters/tab change
  useEffect(() => {
    setPage(1);
  }, [q, tab, from, to, items.length]);

  const paged = useMemo(() => {
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    if (start >= filtered.length && page > 1) {
      return filtered.slice(0, pageSize);
    }
    return filtered.slice(start, end);
  }, [filtered, page, pageSize]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>سجل المركبات</CardTitle>

        <div className="flex flex-wrap gap-3 mt-4 items-center">
          <Button variant={tab === "syrian" ? "default" : "outline"} onClick={() => setTab("syrian")}>
            مركبات سورية
          </Button>
          <Button variant={tab === "foreign" ? "default" : "outline"} onClick={() => setTab("foreign")}>
            مركبات أجنبية
          </Button>

          <ExportButtons entity="vehicles" fileName={`vehicles_${tab}`} params={{ from, to, q }} hideIfNoPermission={false} />

          <div className="flex gap-2">
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

        <Input
          placeholder="ابحث برقم اللوحة أو اسم المالك أو الهوية..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="mt-4"
        />
      </CardHeader>

      <CardContent>
        {loading && (
          <div className="flex justify-center py-8 items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span>جاري التحميل...</span>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 text-red-600 py-4">
            <AlertCircle className="h-5 w-5" />
            <span>{error}</span>
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <p className="text-center py-8 text-gray-500">{q ? "لا توجد نتائج تطابق البحث" : "لا توجد مركبات مسجلة"}</p>
        )}

        {!loading && !error && filtered.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-right p-3">رقم اللوحة</th>
                  <th className="text-right p-3">اسم المالك</th>
                  <th className="text-right p-3">رقم الهوية</th>
                  <th className="text-right p-3">نوع المركبة</th>

                  {/* ✅ أعمدة التأمين من جدول الدفعات */}
                  <th className="text-right p-3">آخر وثيقة</th>
                  <th className="text-right p-3">آخر إيصال</th>
                  <th className="text-right p-3">الحالة</th>
                  <th className="text-right p-3">المبلغ</th>
                  <th className="text-right p-3">بداية</th>
                  <th className="text-right p-3">نهاية</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((item, idx) => {
                  const vid = String(item._id || item.id || "");
                  const last = vid ? latestByVehicleId[vid] : undefined;

                  return (
                    <tr
                      key={item._id || item.id || `${item.plateNumber || "row"}-${idx}`}
                      className="border-b hover:bg-gray-50"
                    >
                      <td className="p-3 text-right">{item.plateNumber || "-"}</td>
                      <td className="p-3 text-right">{item.ownerName || "-"}</td>
                      <td className="p-3 text-right">{item.nationalId || "-"}</td>
                      <td className="p-3 text-right">{tab === "syrian" ? "سورية" : "أجنبية"}</td>

                      <td className="p-3 text-right font-mono text-xs">{last?.policyNumber || "—"}</td>
                      <td className="p-3 text-right font-mono text-xs">{last?.receiptNumber || "—"}</td>
                      <td className="p-3 text-right">{last?.paymentStatus || "—"}</td>
                      <td className="p-3 text-right">{last ? formatMoney(last.amount ?? last.breakdown?.total) : "—"}</td>
                      <td className="p-3 text-right">{formatDate(last?.policyStartAt)}</td>
                      <td className="p-3 text-right">{formatDate(last?.policyEndAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div className="text-xs text-muted-foreground mt-3">
              ملاحظة: "آخر وثيقة" مأخوذة من أحدث عملية دفع لنفس vehicleId ضمن جدول الدفعات.
            </div>

            <PaginationBar
              page={page}
              pageSize={pageSize}
              total={filtered.length}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
              pageSizeOptions={[20, 50, 100, 200]}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
