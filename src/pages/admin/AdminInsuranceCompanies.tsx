import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Alert, AlertDescription } from "../../components/ui/alert";
import { Separator } from "../../components/ui/separator";
import { Badge } from "../../components/ui/badge";
import PageHeader from "../../components/export/PageHeader";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../components/ui/dialog";

import { adminApi } from "../../services/adminApi";
import {
  Building2,
  Save,
  Plus,
  AlertCircle,
  RefreshCcw,
  Trash2,
  Eye,
  Loader2,
} from "lucide-react";

type Company = {
  _id: string;
  name: string;
  sharePercent: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  [k: string]: any;
};

type StatsRow = {
  companyId: string;
  contractsCount: number;
  totalAmount: number;
};

type Row = {
  companyId: string;
  name: string;
  sharePercent: number;
  isActive: boolean;
  contractsCount: number;
  totalAmount: number;
  company?: Company; // نسخة من سجل الشركة كما هو من الداتا بيز
};

type Unassigned = { contractsCount: number; totalAmount: number };

type PaymentItem = {
  _id: string;
  receiptNumber?: string;
  policyNumber?: string;
  amount?: number;
  paymentMethod?: string;
  paidBy?: string;
  payerPhone?: string;
  paidAt?: string;
  createdAt?: string;
  notes?: string;
};

type CompanyPaymentsRes = {
  company?: any;
  stats?: { contractsCount?: number; totalAmount?: number };
  page?: number;
  limit?: number;
  total?: number;
  items?: PaymentItem[];
};

const pickPayload = (res: any) => res?.data ?? res;
const dt = (s?: string) => (s ? new Date(s).toLocaleString("ar") : "-");


const toYMD = (d: Date) => d.toISOString().slice(0, 10);
const fmt = (n: number) => Number(n || 0).toLocaleString("ar");
const money = (n: number) => `${fmt(n)} ل.س`;

const extractArray = (res: any): any[] => {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.data?.data)) return res.data.data;
  if (Array.isArray(res?.items)) return res.items;
  if (Array.isArray(res?.data?.items)) return res.data.items;
  return [];
};

const safeId = (obj: any): string => {
  return obj?.companyId || obj?._id || obj?.id || "";
};

export default function AdminInsuranceCompanies() {
  const [from, setFrom] = useState(() =>
    toYMD(new Date(new Date().getFullYear(), new Date().getMonth(), 1))
  );
  const [to, setTo] = useState(() => toYMD(new Date()));

  const [rows, setRows] = useState<Row[]>([]);
  const [unassigned, setUnassigned] = useState<Unassigned>({ contractsCount: 0, totalAmount: 0 });

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // إضافة شركة
  const [newName, setNewName] = useState("");
  const [newShare, setNewShare] = useState("0");

  // حفظ/حذف
  const [rowSavingId, setRowSavingId] = useState<string | null>(null);
  const [rowDeletingId, setRowDeletingId] = useState<string | null>(null);

  // تفاصيل (من الداتا بيز + إحصائيات الفترة)
  //const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsRow, setDetailsRow] = useState<Row | null>(null);

  const totalActiveShare = useMemo(
    () => rows.filter((r) => r.isActive).reduce((a, r) => a + Number(r.sharePercent || 0), 0),
    [rows]
  );

  const [detailsOpen, setDetailsOpen] = useState(false);
const [detailsCompanyId, setDetailsCompanyId] = useState<string | null>(null);
const [detailsLoading, setDetailsLoading] = useState(false);
const [detailsErr, setDetailsErr] = useState("");
const [detailsRes, setDetailsRes] = useState<CompanyPaymentsRes | null>(null);

const [detailsPage, setDetailsPage] = useState(1);
const detailsLimit = 50; // غيّرها إذا بدك


  const mergeCompaniesWithStats = (companies: Company[], statsRows: StatsRow[]) => {
    const map = new Map<string, StatsRow>();
    for (const s of statsRows || []) {
      const id = safeId(s);
      if (!id) continue;
      map.set(id, {
        companyId: id,
        contractsCount: Number(s.contractsCount || 0),
        totalAmount: Number(s.totalAmount || 0),
      });
    }

    const merged: Row[] = (companies || []).map((c) => {
      const id = safeId(c);
      const s = map.get(id);
      return {
        companyId: id,
        name: c.name || "",
        sharePercent: Number(c.sharePercent || 0),
        isActive: !!c.isActive,
        contractsCount: Number(s?.contractsCount || 0),
        totalAmount: Number(s?.totalAmount || 0),
        company: c,
      };
    });

    // في حال الإحصائيات فيها شركات ليست موجودة بقائمة الشركات (نادر) نضيفها
    for (const s of statsRows || []) {
      const id = safeId(s);
      const exists = merged.some((m) => m.companyId === id);
      if (!exists && id) {
        merged.push({
          companyId: id,
          name: "(شركة غير موجودة بالقائمة)",
          sharePercent: 0,
          isActive: false,
          contractsCount: Number(s.contractsCount || 0),
          totalAmount: Number(s.totalAmount || 0),
        });
      }
    }

    return merged;
  };

  const load = async () => {
    setLoading(true);
    setErr("");
    try {
      const [companiesRes, statsRes] = await Promise.all([
        adminApi.getInsuranceCompanies(),
        adminApi.getInsuranceCompaniesStats(from, to),
      ]);

      const companies = extractArray(companiesRes) as Company[];

      // stats endpoint عندك ممكن يرجع:
      // 1) { data: [...], unassigned: {...} }
      // 2) { rows: [...], unassigned: {...} }
      // 3) [... مباشرة
      const statsPayload = statsRes?.data ?? statsRes;
      const statsRows =
        extractArray(statsPayload) ||
        extractArray(statsPayload?.rows) ||
        (Array.isArray(statsPayload?.data) ? statsPayload.data : []);

      const un =
        statsPayload?.unassigned ||
        statsRes?.unassigned ||
        statsRes?.data?.unassigned ||
        { contractsCount: 0, totalAmount: 0 };

      const merged = mergeCompaniesWithStats(companies, statsRows as any);

      setRows(merged);
      setUnassigned(un);
    } catch (e: any) {
      setErr(e?.response?.data?.message || e?.message || "فشل تحميل البيانات");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [from, to]);

  const updateRow = (id: string, patch: Partial<Row>) => {
    setRows((prev) => prev.map((r) => (r.companyId === id ? { ...r, ...patch } : r)));
  };

  const saveRow = async (r: Row) => {
    setRowSavingId(r.companyId);
    setErr("");
    try {
      await adminApi.updateInsuranceCompany(r.companyId, {
        name: r.name,
        sharePercent: Number(r.sharePercent),
        isActive: !!r.isActive,
      });
      await load();
    } catch (e: any) {
      setErr(e?.response?.data?.message || e?.message || "فشل حفظ الشركة");
    } finally {
      setRowSavingId(null);
    }
  };

  const saveAll = async () => {
    setLoading(true);
    setErr("");
    try {
      if (Math.round(totalActiveShare) !== 100) {
        if (!confirm(`مجموع حصص الشركات النشطة = ${totalActiveShare}%. الأفضل أن يكون 100%. هل تريد المتابعة؟`)) {
          setLoading(false);
          return;
        }
      }

      for (const r of rows) {
        await adminApi.updateInsuranceCompany(r.companyId, {
          name: r.name,
          sharePercent: Number(r.sharePercent),
          isActive: !!r.isActive,
        });
      }
      await load();
      alert("تم حفظ التعديلات ✅");
    } catch (e: any) {
      setErr(e?.response?.data?.message || e?.message || "فشل الحفظ");
    } finally {
      setLoading(false);
    }
  };

  const createCompany = async () => {
    setErr("");
    const share = Number(newShare);

    if (!newName.trim()) return setErr("اسم الشركة مطلوب");
    if (!Number.isFinite(share) || share < 0 || share > 100) return setErr("الحصة يجب أن تكون بين 0 و 100");

    setLoading(true);
    try {
      await adminApi.createInsuranceCompany({ name: newName.trim(), sharePercent: share, isActive: true });
      setNewName("");
      setNewShare("0");
      await load();
    } catch (e: any) {
      setErr(e?.response?.data?.message || e?.message || "فشل إضافة الشركة");
    } finally {
      setLoading(false);
    }
  };

  const removeCompany = async (r: Row) => {
    setErr("");

    const msg =
      r.contractsCount > 0
        ? `⚠️ هذه الشركة عليها ${r.contractsCount} عقد ضمن الفترة.\nقد يرفض السيرفر الحذف إذا كانت مرتبطة بسجلات.\nهل تريد المتابعة؟`
        : "هل أنت متأكد من حذف الشركة؟";

    if (!confirm(msg)) return;

    setRowDeletingId(r.companyId);
    try {
      await adminApi.deleteInsuranceCompany(r.companyId);
      await load();
      alert("تم حذف الشركة ✅");
    } catch (e: any) {
      setErr(e?.response?.data?.message || e?.message || "فشل حذف الشركة");
    } finally {
      setRowDeletingId(null);
    }
  };

  

  const loadCompanyPayments = async (companyId: string, page = 1) => {
  setDetailsLoading(true);
  setDetailsErr("");
  try {
    const res: any = await adminApi.getInsuranceCompanyPayments(companyId, from, to, page, detailsLimit);
    const payload = pickPayload(res) as CompanyPaymentsRes;

    setDetailsRes(payload);
    setDetailsPage(payload?.page || page);
  } catch (e: any) {
    setDetailsErr(e?.response?.data?.message || e?.message || "فشل تحميل تفاصيل الشركة");
    setDetailsRes(null);
  } finally {
    setDetailsLoading(false);
  }
};

const openDetails = async (companyId: string) => {
  setDetailsCompanyId(companyId);
  setDetailsOpen(true);
  setDetailsRes(null);
  setDetailsPage(1);
  await loadCompanyPayments(companyId, 1);
};


  return (
    <div dir="rtl" className="p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="h-10 w-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xl font-extrabold">شركات التأمين</div>
            <div className="text-sm text-muted-foreground">إدارة الشركات + إحصائيات ضمن الفترة</div>
            <PageHeader title="إدارة شركات التأمين" entity="insurance_companies" fileName="insurance_companies" />
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={load} disabled={loading} variant="secondary">
            <RefreshCcw className="h-4 w-4 ml-2" />
            تحديث
          </Button>
          <Button onClick={saveAll} disabled={loading || !rows.length}>
            <Save className="h-4 w-4 ml-2" />
            حفظ التعديلات
          </Button>
        </div>
      </div>

      {err && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{err}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>الفترة</CardTitle>
        </CardHeader>
        <CardContent className="grid md:grid-cols-4 gap-4 items-end">
          <div className="space-y-2">
            <Label>من</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} disabled={loading} />
          </div>
          <div className="space-y-2">
            <Label>إلى</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} disabled={loading} />
          </div>
          <div className="md:col-span-2 flex flex-wrap gap-2 items-center">
            <Badge variant="secondary">مجموع حصص الشركات النشطة: {fmt(totalActiveShare)}%</Badge>
            <Badge variant="secondary">
              غير موزعة: {fmt(unassigned.contractsCount)} عقد — {money(unassigned.totalAmount)}
            </Badge>
            {Math.round(totalActiveShare) !== 100 && <Badge variant="destructive">تنبيه: الأفضل أن يكون المجموع 100%</Badge>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>إضافة شركة</CardTitle>
        </CardHeader>
        <CardContent className="grid md:grid-cols-3 gap-3 items-end">
          <div className="space-y-2">
            <Label>اسم الشركة</Label>
            <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="مثال: شركة XYZ" />
          </div>
          <div className="space-y-2">
            <Label>حصة التوزيع (%)</Label>
            <Input value={newShare} onChange={(e) => setNewShare(e.target.value)} type="number" min={0} max={100} />
          </div>
          <Button onClick={createCompany} disabled={loading}>
            <Plus className="h-4 w-4 ml-2" />
            إضافة
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>جدول الشركات</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="p-3 text-right">اسم الشركة</th>
                  <th className="p-3 text-right">الحصة (%)</th>
                  <th className="p-3 text-right">الحالة</th>
                  <th className="p-3 text-right">عدد العقود</th>
                  <th className="p-3 text-right">قيمة العقود</th>
                  <th className="p-3 text-right">إجراءات</th>
                </tr>
              </thead>

              <tbody>
                {rows.map((r) => {
                  const saving = rowSavingId === r.companyId;
                  const deleting = rowDeletingId === r.companyId;

                  return (
                    <tr key={r.companyId} className="border-b hover:bg-muted/30 align-top">
                      <td className="p-3 min-w-[260px]">
                        <Input
                          value={r.name}
                          onChange={(e) => updateRow(r.companyId, { name: e.target.value })}
                          className="font-semibold"
                        />
                      </td>

                      <td className="p-3">
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          value={String(r.sharePercent ?? 0)}
                          onChange={(e) => updateRow(r.companyId, { sharePercent: Number(e.target.value) })}
                          className="w-28"
                        />
                      </td>

                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={!!r.isActive}
                            onChange={(e) => updateRow(r.companyId, { isActive: e.target.checked })}
                          />
                          <Badge variant={r.isActive ? "secondary" : "destructive"}>
                            {r.isActive ? "نشطة" : "متوقفة"}
                          </Badge>
                        </div>
                      </td>

                      <td className="p-3">{fmt(r.contractsCount)}</td>
                      <td className="p-3 font-extrabold">{money(r.totalAmount)}</td>

                      <td className="p-3">
                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => saveRow(r)}
                            disabled={loading || deleting || saving}
                          >
                            {saving ? (
                              <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                            ) : (
                              <Save className="h-4 w-4 ml-2" />
                            )}
                            حفظ
                          </Button>

                          <Button
  size="sm"
  variant="outline"
  onClick={() => openDetails(r.companyId)}
  disabled={loading}
>
  <Eye className="h-4 w-4 ml-2" />
  تفاصيل
                          </Button>


                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => removeCompany(r)}
                            disabled={loading || deleting || saving}
                          >
                            {deleting ? (
                              <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4 ml-2" />
                            )}
                            حذف
                          </Button>

                          <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
  <DialogContent className="max-w-4xl">
    <DialogHeader>
      <DialogTitle>تفاصيل الشركة (دفعات/عقود ضمن الفترة)</DialogTitle>
    </DialogHeader>

    {detailsLoading && (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        جاري التحميل...
      </div>
    )}

    {detailsErr && (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{detailsErr}</AlertDescription>
      </Alert>
    )}

    {!detailsLoading && !detailsErr && detailsRes && (
      <div className="space-y-4">
        {/* ملخص */}
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">
            عدد العقود: {fmt(detailsRes.stats?.contractsCount || 0)}
          </Badge>
          <Badge variant="secondary">
            إجمالي القيمة: {money(detailsRes.stats?.totalAmount || 0)}
          </Badge>
          <Badge variant="secondary">
            الصفحة: {detailsRes.page || detailsPage} /{" "}
            {Math.max(1, Math.ceil((detailsRes.total || 0) / (detailsRes.limit || detailsLimit)))}
          </Badge>
          <Badge variant="secondary">
            الإجمالي: {fmt(detailsRes.total || 0)}
          </Badge>
        </div>

        {/* جدول الدفعات */}
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="p-3 text-right">#</th>
                <th className="p-3 text-right">إيصال</th>
                <th className="p-3 text-right">بوليصة</th>
                <th className="p-3 text-right">المبلغ</th>
                <th className="p-3 text-right">الطريقة</th>
                <th className="p-3 text-right">التاريخ</th>
              </tr>
            </thead>
            <tbody>
              {(detailsRes.items || []).map((it, idx) => (
                <tr key={it._id || idx} className="border-b hover:bg-muted/30">
                  <td className="p-3 font-mono text-xs">{String(it._id || "").slice(-8) || "-"}</td>
                  <td className="p-3">{it.receiptNumber || "-"}</td>
                  <td className="p-3">{it.policyNumber || "-"}</td>
                  <td className="p-3 font-bold">{it.amount != null ? money(Number(it.amount)) : "-"}</td>
                  <td className="p-3">{it.paymentMethod || "-"}</td>
                  <td className="p-3">{dt(it.paidAt || it.createdAt)}</td>
                </tr>
              ))}

              {(!detailsRes.items || !detailsRes.items.length) && (
                <tr>
                  <td colSpan={6} className="p-4 text-center text-muted-foreground">
                    لا توجد دفعات ضمن الفترة
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between gap-2">
          <Button
            variant="secondary"
            disabled={detailsLoading || (detailsRes.page || detailsPage) <= 1 || !detailsCompanyId}
            onClick={() => detailsCompanyId && loadCompanyPayments(detailsCompanyId, (detailsRes.page || detailsPage) - 1)}
          >
            السابق
          </Button>

          <div className="text-sm text-muted-foreground">
            صفحة {(detailsRes.page || detailsPage)} من{" "}
            {Math.max(1, Math.ceil((detailsRes.total || 0) / (detailsRes.limit || detailsLimit)))}
          </div>

          <Button
            variant="secondary"
            disabled={
              detailsLoading ||
              !detailsCompanyId ||
              (detailsRes.page || detailsPage) >= Math.max(1, Math.ceil((detailsRes.total || 0) / (detailsRes.limit || detailsLimit)))
            }
            onClick={() => detailsCompanyId && loadCompanyPayments(detailsCompanyId, (detailsRes.page || detailsPage) + 1)}
          >
            التالي
          </Button>
        </div>
      </div>
    )}
  </DialogContent>
</Dialog>


                          <Dialog open={detailsOpen && detailsRow?.companyId === r.companyId} onOpenChange={setDetailsOpen}>
                            <DialogTrigger asChild>
                              <Button size="sm" variant="outline" onClick={() => openDetails(r)} disabled={loading}>
                                <Eye className="h-4 w-4 ml-2" />
                                عرض
                              </Button>
                            </DialogTrigger>

                            <DialogContent className="max-w-3xl">
                              <DialogHeader>
                                <DialogTitle>تفاصيل الشركة (من الداتا بيز) + إحصائيات الفترة</DialogTitle>
                              </DialogHeader>

                              <div className="space-y-3">
                                <div className="flex flex-wrap gap-2">
                                  <Badge variant="secondary">الاسم: {r.name}</Badge>
                                  <Badge variant="secondary">الحصة: {fmt(r.sharePercent)}%</Badge>
                                  <Badge variant="secondary">الحالة: {r.isActive ? "نشطة" : "متوقفة"}</Badge>
                                </div>

                                <div className="flex flex-wrap gap-2">
                                  <Badge variant="secondary">عدد العقود ضمن الفترة: {fmt(r.contractsCount)}</Badge>
                                  <Badge variant="secondary">إجمالي القيمة ضمن الفترة: {money(r.totalAmount)}</Badge>
                                </div>

                                <Separator />

                                <div className="text-sm font-bold">سجل الشركة كما هو في الداتا بيز</div>
                                <div className="rounded-xl border bg-muted/20 p-3 overflow-auto max-h-[360px]">
                                  <pre className="text-xs leading-relaxed">
                                    {JSON.stringify(r.company || {}, null, 2)}
                                  </pre>
                                </div>

                                <div className="text-xs text-muted-foreground">
                                  * إذا بدك “ما يتعلق بالشركة” مثل (الدفعات/العقود/البوليصات) قائمة مفصلة،
                                  لازم Endpoint إضافي مثل: <b>/admin/insurance-companies/:id/payments?from&to</b>.
                                  بس حالياً نحن نعرض بيانات الشركة من DB + الإحصائيات ضمن الفترة من endpoint الموجود.
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {!rows.length && (
                  <tr>
                    <td className="p-4 text-center text-muted-foreground" colSpan={6}>
                      لا توجد شركات
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <Separator className="my-4" />

          <div className="text-xs text-muted-foreground">
            الإحصائيات تأتي من <b>/admin/insurance-companies/stats</b> ضمن الفترة، بينما بيانات الشركة نفسها تأتي من <b>/admin/insurance-companies</b>.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
