import { useEffect, useState } from "react";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Alert, AlertDescription } from "../../components/ui/alert";
import { Badge } from "../../components/ui/badge";
import { Separator } from "../../components/ui/separator";
import PageHeader from "../../components/export/PageHeader";
import { adminApi } from "../../services/adminApi";
import { Edit, Plus, RefreshCcw, Trash2, MapPin, Network } from "lucide-react";
import { PaginationBar } from "../../components/ui/pagination";

type Center = {
  _id?: string;
  name?: string;
  ip?: string;
  code?: string;
  address?: string;
  city?: string;
  employeesCount?: number;
  createdAt?: string;
  updatedAt?: string;
};

type CenterForm = {
  name: string;
  ip: string;
  code: string;
  address: string;
  city: string;
};

type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  pages: number;
  hasPrev: boolean;
  hasNext: boolean;
};

const emptyForm: CenterForm = {
  name: "",
  ip: "",
  code: "",
  address: "",
  city: "",
};

function isValidIP(ip: string) {
  if (!ip.trim()) return true; // ip اختياري
  const re =
    /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;
  return re.test(ip.trim());
}

export default function AdminCenters() {
  const [centers, setCenters] = useState<Center[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string>("");

  const [query, setQuery] = useState("");

  // ✅ Pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [meta, setMeta] = useState<PaginationMeta>({
    page: 1,
    limit: 10,
    total: 0,
    pages: 1,
    hasPrev: false,
    hasNext: false,
  });

  // ✅ Modal state
  const [openModal, setOpenModal] = useState(false);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [form, setForm] = useState<CenterForm>(emptyForm);
  const [formError, setFormError] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [debouncedQuery, setDebouncedQuery] = useState("");

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 300);
    return () => clearTimeout(t);
  }, [query]);


  const loadCenters = async (silent = false) => {
  try {
    if (!silent) setLoading(true);
    else setRefreshing(true);

    setError("");

    // إذا كان limit = -1 يعني "الكل"، نجلب كل الصفحات
    if (limit === -1) {
      const allCenters: Center[] = [];
      let currentPage = 1;
      const pageLimit = 100; // جلب 100 مركز في كل صفحة
      let hasMore = true;

      while (hasMore) {
        try {
          const res: any = await adminApi.getCenters({
            page: currentPage,
            limit: pageLimit,
            q: debouncedQuery || undefined,
          });

          const data = res?.data ?? res;
          const items: Center[] = Array.isArray(data?.items)
            ? data.items
            : Array.isArray(data)
            ? data
            : [];

          allCenters.push(...items);

          const meta = data?.meta;
          if (meta) {
            hasMore = currentPage < meta.pages;
            currentPage++;
          } else {
            hasMore = items.length === pageLimit;
            currentPage++;
          }
        } catch (e) {
          console.error("خطأ في جلب المراكز:", e);
          hasMore = false;
        }
      }

      setCenters(allCenters);
      setMeta({
        page: 1,
        limit: -1,
        total: allCenters.length,
        pages: 1,
        hasPrev: false,
        hasNext: false,
      });
    } else {
      // الحالة العادية مع pagination
      const res: any = await adminApi.getCenters({
        page,
        limit,
        q: debouncedQuery || undefined,
      });

      // ✅ يدعم: apiFetch يرجّع JSON مباشرة أو axios-like { data: ... }
      const data = res?.data ?? res;

      const items: Center[] = Array.isArray(data?.items)
        ? data.items
        : Array.isArray(data)
        ? data
        : [];

      const incomingMeta: PaginationMeta | null =
        data?.meta && typeof data.meta.pages === "number" ? data.meta : null;

      setCenters(items);

      if (incomingMeta) {
        setMeta(incomingMeta);

        // ✅ مزامنة الصفحة إذا السيرفر رجّع page مختلف (مثلاً بعد حذف آخر عنصر)
        if (incomingMeta.page !== page) setPage(incomingMeta.page);
      } else {
        // fallback فقط إذا فعلاً ما في meta (يعني API قديم)
        setMeta({
          page: 1,
          limit,
          total: items.length,
          pages: 1,
          hasPrev: false,
          hasNext: false,
        });
      }
    }
  } catch (e) {
    console.error(e);
    setError("فشل في تحميل المراكز");
    setCenters([]);
    setMeta({
      page: 1,
      limit: limit === -1 ? -1 : limit,
      total: 0,
      pages: 1,
      hasPrev: false,
      hasNext: false,
    });
  } finally {
    setLoading(false);
    setRefreshing(false);
  }
};



  // ✅ debounce للبحث + تحميل عند تغيّر page/limit/query
  useEffect(() => {
    const t = setTimeout(() => {
      loadCenters(false);
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, query]);

  const openCreate = () => {
    setMode("create");
    setActiveId(null);
    setForm(emptyForm);
    setFormError("");
    setOpenModal(true);
  };

  const openEdit = (c: Center) => {
    setMode("edit");
    setActiveId(c._id || null);
    setForm({
      name: c.name || "",
      ip: c.ip || "",
      code: c.code || "",
      address: c.address || "",
      city: c.city || "",
    });
    setFormError("");
    setOpenModal(true);
  };

  const closeModal = () => {
    setOpenModal(false);
    setFormError("");
    setSaving(false);
  };

  const onChange = (key: keyof CenterForm, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const validate = () => {
    if (!form.name.trim()) return "اسم المركز مطلوب";
    if (!isValidIP(form.ip)) return "صيغة IP غير صحيحة";
    return "";
  };

  const onSave = async () => {
    const v = validate();
    if (v) {
      setFormError(v);
      return;
    }

    try {
      setSaving(true);
      setFormError("");

      const payload = {
        name: form.name.trim(),
        ip: form.ip.trim() || undefined,
        code: form.code.trim() || undefined,
        address: form.address.trim() || undefined,
        city: form.city.trim() || undefined,
      };

      if (mode === "create") {
        await adminApi.createCenter(payload);

        // ✅ الجديد يظهر بالصفحة الأولى (createdAt:-1)
        if (page !== 1) {
          setPage(1); // سيجلب تلقائياً عبر useEffect
        } else {
          await loadCenters(true);
        }
      } else {
        if (!activeId) {
          setFormError("لا يمكن تعديل مركز بدون id");
          return;
        }
        await adminApi.updateCenter(activeId, payload);
        await loadCenters(true);
      }

      closeModal();
    } catch (e: any) {
      console.error(e);
      setFormError(e?.response?.data?.message || "فشل الحفظ");
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (id?: string) => {
    if (!id) return;
    const ok = confirm("هل أنت متأكد من حذف هذا المركز؟");
    if (!ok) return;

    try {
      setRefreshing(true);
      await adminApi.deleteCenter(id);

      // ✅ إذا حذفت آخر عنصر بصفحة غير الأولى -> ارجع صفحة
      if (centers.length === 1 && page > 1) {
        setPage(page - 1); // useEffect سيجلب
      } else {
        await loadCenters(true);
      }
    } catch (e: any) {
      console.error(e);
      alert(e?.response?.data?.message || "فشل حذف المركز");
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="w-full" dir="rtl">
      {/* Page header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900">المراكز</h2>
          <PageHeader title="إدارة المراكز" entity="centers" fileName="centers" />
          <p className="text-sm text-slate-500 mt-1">
            إدارة مراكز اقتطاع بوليصة التأمين (اسم المركز + IP + كود + عنوان)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => loadCenters(true)}
            disabled={refreshing}
            className="gap-2"
          >
            <RefreshCcw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            تحديث
          </Button>

          <Button onClick={openCreate} className="gap-2">
            <Plus className="w-4 h-4" />
            إضافة مركز
          </Button>
        </div>
      </div>

      {error ? (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <Card className="shadow-lg">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between">
            <span>قائمة المراكز</span>
            <Badge variant="secondary">{meta.total} مركز</Badge>
          </CardTitle>
        </CardHeader>

        <CardContent>
          {/* Search + limit */}
          <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between mb-4">
            <div className="relative w-full md:max-w-md">
              <input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
                placeholder="بحث: اسم / IP / كود / عنوان..."
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            {/* page size control is handled by PaginationBar below */}
          </div>

          <Separator className="my-3" />

          {/* Table */}
          <div className="w-full overflow-auto rounded-2xl border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr className="border-b">
                  <th className="text-right font-semibold text-slate-700 p-3 whitespace-nowrap">
                    اسم المركز
                  </th>
                  <th className="text-right font-semibold text-slate-700 p-3 whitespace-nowrap">
                    IP
                  </th>
                  <th className="text-right font-semibold text-slate-700 p-3 whitespace-nowrap">
                    الكود
                  </th>
                  <th className="text-right font-semibold text-slate-700 p-3 whitespace-nowrap">
                    العنوان
                  </th>
                  <th className="text-right font-semibold text-slate-700 p-3 whitespace-nowrap">
                    عدد الموظفين
                  </th>
                  <th className="text-right font-semibold text-slate-700 p-3 whitespace-nowrap">
                    إجراء
                  </th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i} className="border-b">
                      <td className="p-3" colSpan={6}>
                        <div className="h-8 bg-slate-100 rounded animate-pulse" />
                      </td>
                    </tr>
                  ))
                ) : centers.length === 0 ? (
                  <tr>
                    <td className="p-6 text-center text-slate-500" colSpan={6}>
                      لا توجد مراكز
                    </td>
                  </tr>
                ) : (
                  centers.map((c) => (
                    <tr key={c._id} className="border-b hover:bg-slate-50/70">
                      {/* name */}
                      <td className="p-3">
                        <div className="font-semibold text-slate-900">{c.name || "—"}</div>
                      </td>

                      {/* ip */}
                      <td className="p-3">
                        {c.ip ? (
                          <span className="inline-flex items-center gap-2">
                            <Network className="w-4 h-4 text-green-600" />
                            <span className="font-mono" dir="ltr">
                              {c.ip}
                            </span>
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* code */}
                      <td className="p-3">
                        {c.code ? (
                          <Badge variant="secondary" className="font-mono" dir="ltr">
                            {c.code}
                          </Badge>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* address */}
                      <td className="p-3">
                        {c.address || c.city ? (
                          <span className="inline-flex items-center gap-2 text-slate-700">
                            <MapPin className="w-4 h-4 text-slate-500" />
                            <span>{[c.city, c.address].filter(Boolean).join(" - ")}</span>
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* employeesCount */}
                      <td className="p-3">
                        <Badge variant="secondary">{c.employeesCount ?? 0}</Badge>
                      </td>

                      {/* actions */}
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-2"
                            onClick={() => openEdit(c)}
                          >
                            <Edit className="w-4 h-4" />
                            تعديل
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-2 text-red-600 hover:text-red-700"
                            onClick={() => onDelete(c._id)}
                          >
                            <Trash2 className="w-4 h-4" />
                            حذف
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <PaginationBar
            page={page}
            pageSize={limit}
            total={meta.total}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setLimit(size);
              setPage(1);
            }}
            pageSizeOptions={[10, 20, 50, 100, 200, "all"]}
          />
        </CardContent>
      </Card>

      {/* ✅ Modal */}
      {openModal && (
        <div className="fixed inset-0 z-[9999]">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40" onClick={closeModal} />

          {/* Modal box */}
          <div className="absolute inset-0 flex items-start justify-center p-4 sm:p-6">
            <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden mt-20">
              <div className="px-6 py-4 bg-gradient-to-r from-green-600 via-green-700 to-green-800 text-white">
                <div className="text-lg font-bold">
                  {mode === "create" ? "إضافة مركز" : "تعديل مركز"}
                </div>
                <div className="text-sm text-white/90 mt-1">
                  أدخل بيانات المركز (الاسم مطلوب)
                </div>
              </div>

              <div className="p-6 space-y-4">
                {formError ? (
                  <Alert variant="destructive">
                    <AlertDescription>{formError}</AlertDescription>
                  </Alert>
                ) : null}

                {/* name */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">
                    اسم المركز <span className="text-red-600">*</span>
                  </label>
                  <input
                    value={form.name}
                    onChange={(e) => onChange("name", e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="مثال: مركز باب توما"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* code */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">الكود / الرقم</label>
                    <input
                      value={form.code}
                      onChange={(e) => onChange("code", e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="مثال: 41102"
                      dir="ltr"
                    />
                  </div>

                  {/* ip */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">IP</label>
                    <input
                      value={form.ip}
                      onChange={(e) => onChange("ip", e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-green-500 font-mono"
                      placeholder="مثال: 172.19.50.32"
                      dir="ltr"
                    />
                    <div className="text-xs text-slate-500">
                      (اختياري) إذا أدخلته لازم يكون بصيغة صحيحة
                    </div>
                  </div>
                </div>

                {/* city */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">المدينة</label>
                  <input
                    value={form.city}
                    onChange={(e) => onChange("city", e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="مثال: دمشق"
                  />
                </div>

                {/* address */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">العنوان</label>
                  <input
                    value={form.address}
                    onChange={(e) => onChange("address", e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="اختياري"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={closeModal} disabled={saving}>
                    إلغاء
                  </Button>
                  <Button onClick={onSave} disabled={saving} className="gap-2">
                    {saving ? (
                      <>
                        <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                        جارٍ الحفظ...
                      </>
                    ) : (
                      "حفظ"
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
