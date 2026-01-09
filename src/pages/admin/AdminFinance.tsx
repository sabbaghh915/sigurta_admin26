import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/Select";
import { Alert, AlertDescription } from "../../components/ui/alert";
import { Separator } from "../../components/ui/separator";
import { Badge } from "../../components/ui/badge";
import { adminApi } from "../../services/adminApi";
import { Building2, RefreshCcw, Download, Printer, AlertCircle, BarChart3 } from "lucide-react";
import PageHeader from "../../components/export/PageHeader";

type Center = {
  _id: string;
  name: string;
  code?: string;
  ip?: string;
  province?: string;
  isActive?: boolean;
};

type FinanceBreakdownRow = {
  centerId: string;
  centerName?: string;
  centerCode?: string;
  centerIp?: string;
  province?: string;

  totalAmount: number;
  paymentsCount: number;

  martyrTotal: number;
  warTotal: number;
  stampTotal: number;
  agesTotal: number;
  localTotal: number;
  proposedTotal: number;

  stateShareTotal: number;
  federationTotal: number;
  companyShareTotal: number;
};

type FinanceBreakdownResponse = {
  success: boolean;
  from: string;
  to: string;
  data: FinanceBreakdownRow[];
  grand: {
    grandTotal?: number;
    grandCount?: number;

    martyrTotal?: number;
    warTotal?: number;
    stampTotal?: number;
    agesTotal?: number;
    localTotal?: number;
    proposedTotal?: number;

    stateShareTotal?: number;
    federationTotal?: number;
    companyShareTotal?: number;
  };
};

const toYMD = (d: Date) => d.toISOString().slice(0, 10);
const formatCurrency = (n: number) => (Number(n || 0)).toLocaleString("ar") + " ل.س";
const formatNumber = (n: number) => Number(n || 0).toLocaleString("ar");

export default function AdminFinance() {
  const [from, setFrom] = useState(() => toYMD(new Date(new Date().getFullYear(), new Date().getMonth(), 1)));
  const [to, setTo] = useState(() => toYMD(new Date()));

  const [centers, setCenters] = useState<Center[]>([]);
  const [centerId, setCenterId] = useState<string>("all");

  const [rows, setRows] = useState<FinanceBreakdownRow[]>([]);
  const [grand, setGrand] = useState<FinanceBreakdownResponse["grand"]>({});

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  const selectedCenter = useMemo(() => {
    if (centerId === "all") return null;
    return centers.find((c) => c._id === centerId) || null;
  }, [centerId, centers]);

  const rangeLabel = useMemo(() => {
    const fromLabel = new Date(from + "T00:00:00").toLocaleDateString("ar");
    const toLabel = new Date(to + "T00:00:00").toLocaleDateString("ar");
    return `من ${fromLabel} إلى ${toLabel}`;
  }, [from, to]);

  const loadCenters = async () => {
    const list = await adminApi.getCenters();
    const active = Array.isArray(list) ? list.filter((c: any) => c.isActive !== false) : [];
    setCenters(active);
  };

  const loadFinance = async () => {
    setError("");
    setLoading(true);
    try {
      const res = (await adminApi.getFinanceBreakdownByCenter(
        from,
        to,
        centerId === "all" ? undefined : centerId
      )) as FinanceBreakdownResponse;

      setRows(res?.data || []);
      setGrand(res?.grand || {});
    } catch (e: any) {
      setError(e?.message || "فشل تحميل البيانات المالية التفصيلية");
    } finally {
      setLoading(false);
    }
  };

  // (اختياري) إذا عندك rebuild سابق للـ totals القديمة فقط — اتركه كما هو
  const rebuildAndSave = async () => {
    setError("");
    setLoading(true);
    try {
      await adminApi.rebuildFinanceByCenter({ from, to });
      await loadFinance();
      alert("تمت إعادة الحساب والحفظ ✅");
    } catch (e: any) {
      setError(e?.message || "فشل إعادة الحساب");
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = () => {
    const header = [
      "المركز",
      "المحافظة",
      "IP",
      "عدد الدفعات",
      "الإجمالي",
      "طابع الشهيد",
      "المجهود الحربي",
      "رسم الطابع",
      "رسم الأعمار",
      "الإدارة المحلية",
      "البدل المقترح",
      "حصة الدولة",
      "حصة الاتحاد",
      "حصة الشركات",
    ];
    const lines = [header.join(",")];

    const esc = (s: any) => `"${String(s ?? "").replace(/"/g, '""')}"`;

    for (const r of rows) {
      const centerLabel = r.centerName || r.centerCode || r.centerId;
      lines.push(
        [
          esc(centerLabel),
          esc(r.province || ""),
          esc(r.centerIp || ""),
          String(r.paymentsCount || 0),
          String(r.totalAmount || 0),

          String(r.martyrTotal || 0),
          String(r.warTotal || 0),
          String(r.stampTotal || 0),
          String(r.agesTotal || 0),
          String(r.localTotal || 0),
          String(r.proposedTotal || 0),

          String(r.stateShareTotal || 0),
          String(r.federationTotal || 0),
          String(r.companyShareTotal || 0),
        ].join(",")
      );
    }

    const csv = "\uFEFF" + lines.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `finance_breakdown_by_center_${from}_to_${to}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const printPDF = () => {
    const title = "المالية - تفصيل الرسوم حسب المراكز";
    const centerFilter = selectedCenter ? `المركز: ${selectedCenter.name}` : "كل المراكز";

    const rowHtml = rows
      .map((r) => {
        const c = r.centerName || r.centerCode || r.centerId;
        const p = r.province || "—";
        const ip = r.centerIp || "—";
        return `
          <tr>
            <td>${c}</td>
            <td>${p}</td>
            <td>${ip}</td>
            <td>${formatNumber(r.paymentsCount || 0)}</td>
            <td><b>${formatCurrency(r.totalAmount || 0)}</b></td>

            <td>${formatCurrency(r.martyrTotal || 0)}</td>
            <td>${formatCurrency(r.warTotal || 0)}</td>
            <td>${formatCurrency(r.stampTotal || 0)}</td>
            <td>${formatCurrency(r.agesTotal || 0)}</td>
            <td>${formatCurrency(r.localTotal || 0)}</td>
            <td>${formatCurrency(r.proposedTotal || 0)}</td>

            <td><b>${formatCurrency(r.stateShareTotal || 0)}</b></td>
            <td><b>${formatCurrency(r.federationTotal || 0)}</b></td>
            <td><b>${formatCurrency(r.companyShareTotal || 0)}</b></td>
          </tr>
        `;
      })
      .join("");

    const html = `
      <html lang="ar" dir="rtl">
      <head>
        <meta charset="utf-8" />
        <title>${title}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 16px; }
          h1 { margin: 0 0 8px; font-size: 18px; }
          .meta { margin: 0 0 12px; color: #444; font-size: 12px; }
          .cards { display: flex; flex-wrap: wrap; gap: 10px; margin: 12px 0 16px; }
          .card { border: 1px solid #ddd; border-radius: 10px; padding: 10px 12px; }
          table { width: 100%; border-collapse: collapse; font-size: 11px; }
          th, td { border: 1px solid #ddd; padding: 6px; text-align: right; vertical-align: top; }
          th { background: #f5f5f5; }
          @media print { .noprint { display: none; } }
        </style>
      </head>
      <body>
        <div class="noprint" style="margin-bottom:10px;">
          <button onclick="window.print()">طباعة / حفظ PDF</button>
        </div>
        <h1>${title}</h1>
        <div class="meta">${rangeLabel} — ${centerFilter}</div>

        <div class="cards">
          <div class="card"><div>إجمالي المبالغ</div><div><b>${formatCurrency(grand.grandTotal || 0)}</b></div></div>
          <div class="card"><div>حصة الدولة</div><div><b>${formatCurrency(grand.stateShareTotal || 0)}</b></div></div>
          <div class="card"><div>حصة الاتحاد</div><div><b>${formatCurrency(grand.federationTotal || 0)}</b></div></div>
          <div class="card"><div>حصة الشركات</div><div><b>${formatCurrency(grand.companyShareTotal || 0)}</b></div></div>
        </div>

        <table>
          <thead>
            <tr>
              <th>المركز</th>
              <th>المحافظة</th>
              <th>IP</th>
              <th>عدد الدفعات</th>
              <th>الإجمالي</th>

              <th>طابع الشهيد</th>
              <th>المجهود الحربي</th>
              <th>رسم الطابع</th>
              <th>رسم الأعمار</th>
              <th>الإدارة المحلية</th>
              <th>البدل المقترح</th>

              <th>حصة الدولة</th>
              <th>حصة الاتحاد</th>
              <th>حصة الشركات</th>
            </tr>
          </thead>
          <tbody>
            ${rowHtml || `<tr><td colspan="14">لا يوجد بيانات</td></tr>`}
          </tbody>
        </table>
      </body>
      </html>
    `;

    const w = window.open("", "_blank", "width=1200,height=700");
    if (!w) return alert("المتصفح منع فتح نافذة جديدة للطباعة");
    w.document.open();
    w.document.write(html);
    w.document.close();
  };

  useEffect(() => {
    loadCenters().catch(() => {});
    loadFinance().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div dir="rtl" className="p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="h-10 w-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center">
            <BarChart3 className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xl font-extrabold">المالية — تفصيل الرسوم حسب المراكز</div>
            <PageHeader title="إدارة المالية" entity="finance" fileName="finance" />
            
            <div className="text-sm text-muted-foreground">{rangeLabel}</div>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          <Button onClick={exportCSV} disabled={loading || !rows.length} variant="secondary">
            <Download className="h-4 w-4 ml-2" />
            تصدير CSV
          </Button>
          <Button onClick={printPDF} disabled={loading || !rows.length} variant="secondary">
            <Printer className="h-4 w-4 ml-2" />
            طباعة / PDF
          </Button>
          <Button onClick={rebuildAndSave} disabled={loading} variant="outline">
            <RefreshCcw className="h-4 w-4 ml-2" />
            إعادة حساب + حفظ
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card className="border-white/20 bg-white/90 backdrop-blur">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            الفلاتر
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>من</Label>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} disabled={loading} />
            </div>

            <div className="space-y-2">
              <Label>إلى</Label>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} disabled={loading} />
            </div>

            <div className="space-y-2">
              <Label>المركز</Label>
              <Select value={centerId} onValueChange={setCenterId} disabled={loading}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر مركز" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل المراكز</SelectItem>
                  {centers.map((c) => (
                    <SelectItem key={c._id} value={c._id}>
                      {c.name}
                      {c.ip ? ` — ${c.ip}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button className="w-full" onClick={loadFinance} disabled={loading}>
                {loading ? "جاري التحميل..." : "تحديث"}
              </Button>
            </div>
          </div>

          <Separator />

          <div className="flex flex-wrap gap-2 items-center">
            <Badge variant="secondary">الإجمالي: {formatCurrency(grand.grandTotal || 0)}</Badge>
            <Badge variant="secondary">عدد الدفعات: {formatNumber(grand.grandCount || 0)}</Badge>
            <Badge>حصة الدولة: {formatCurrency(grand.stateShareTotal || 0)}</Badge>
            <Badge>حصة الاتحاد: {formatCurrency(grand.federationTotal || 0)}</Badge>
            <Badge>حصة الشركات: {formatCurrency(grand.companyShareTotal || 0)}</Badge>

            {selectedCenter && (
              <Badge variant="secondary">
                المركز: {selectedCenter.name} {selectedCenter.ip ? `(${selectedCenter.ip})` : ""}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardHeader><CardTitle>طابع الشهيد</CardTitle></CardHeader>
          <CardContent className="text-xl font-extrabold">{formatCurrency(grand.martyrTotal || 0)}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>المجهود الحربي</CardTitle></CardHeader>
          <CardContent className="text-xl font-extrabold">{formatCurrency(grand.warTotal || 0)}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>رسم الطابع</CardTitle></CardHeader>
          <CardContent className="text-xl font-extrabold">{formatCurrency(grand.stampTotal || 0)}</CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>رسم الأعمار</CardTitle></CardHeader>
          <CardContent className="text-xl font-extrabold">{formatCurrency(grand.agesTotal || 0)}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>الإدارة المحلية</CardTitle></CardHeader>
          <CardContent className="text-xl font-extrabold">{formatCurrency(grand.localTotal || 0)}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>البدل المقترح</CardTitle></CardHeader>
          <CardContent className="text-xl font-extrabold">{formatCurrency(grand.proposedTotal || 0)}</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>التفصيل حسب المركز</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="p-3 text-right">المركز</th>
                  <th className="p-3 text-right">المحافظة</th>
                  <th className="p-3 text-right">IP</th>
                  <th className="p-3 text-right">عدد الدفعات</th>
                  <th className="p-3 text-right">الإجمالي</th>

                  <th className="p-3 text-right">طابع الشهيد</th>
                  <th className="p-3 text-right">المجهود الحربي</th>
                  <th className="p-3 text-right">رسم الطابع</th>
                  <th className="p-3 text-right">رسم الأعمار</th>
                  <th className="p-3 text-right">الإدارة المحلية</th>
                  <th className="p-3 text-right">البدل المقترح</th>

                  <th className="p-3 text-right">حصة الدولة</th>
                  <th className="p-3 text-right">حصة الاتحاد</th>
                  <th className="p-3 text-right">حصة الشركات</th>
                </tr>
              </thead>

              <tbody>
                {rows.map((r) => (
                  <tr key={String(r.centerId)} className="border-b hover:bg-muted/30">
                    <td className="p-3">
                      <div className="font-semibold">{r.centerName || r.centerCode || String(r.centerId)}</div>
                      {r.centerCode && <div className="text-xs text-muted-foreground">كود: {r.centerCode}</div>}
                    </td>
                    <td className="p-3">{r.province || "—"}</td>
                    <td className="p-3">{r.centerIp || "—"}</td>
                    <td className="p-3">{formatNumber(r.paymentsCount || 0)}</td>
                    <td className="p-3 font-extrabold">{formatCurrency(r.totalAmount || 0)}</td>

                    <td className="p-3">{formatCurrency(r.martyrTotal || 0)}</td>
                    <td className="p-3">{formatCurrency(r.warTotal || 0)}</td>
                    <td className="p-3">{formatCurrency(r.stampTotal || 0)}</td>
                    <td className="p-3">{formatCurrency(r.agesTotal || 0)}</td>
                    <td className="p-3">{formatCurrency(r.localTotal || 0)}</td>
                    <td className="p-3">{formatCurrency(r.proposedTotal || 0)}</td>

                    <td className="p-3 font-bold">{formatCurrency(r.stateShareTotal || 0)}</td>
                    <td className="p-3 font-bold">{formatCurrency(r.federationTotal || 0)}</td>
                    <td className="p-3 font-bold">{formatCurrency(r.companyShareTotal || 0)}</td>
                  </tr>
                ))}

                {!rows.length && (
                  <tr>
                    <td className="p-4 text-center text-muted-foreground" colSpan={14}>
                      لا يوجد بيانات ضمن هذه الفترة
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="text-xs text-muted-foreground mt-3">
            ملاحظة: التفصيل يعتمد على وجود <b>breakdown/quote</b> داخل payment. أي دفعات بدون breakdown ستظهر رسومها = 0.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}