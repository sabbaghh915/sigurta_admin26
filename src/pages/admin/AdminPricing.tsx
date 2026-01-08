import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Badge } from "../../components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../components/ui/dialog";
import PageHeader from "../../components/export/PageHeader";
import { adminApi } from "../../services/adminApi";
import { PaginationBar } from "../../components/ui/pagination";

import {
  INTERNAL_META_DEFAULTS,
  BORDER_META_DEFAULTS,
} from "../../constants/pricingMetaDefaults";

type PricingMeta = { label?: string; group?: string; duration?: string };

type PricingData = {
  internal: Record<string, number>;
  border: Record<string, number>;
  internalMeta: Record<string, PricingMeta>;
  borderMeta: Record<string, PricingMeta>;
  version?: number;
  updatedAt?: string;
};

type Row = {
  key: string;
  value: number;
  label: string;
  group: string;
  duration: string;
};

function toObj(v: any) {
  if (!v || typeof v !== "object" || Array.isArray(v)) return {};
  return v as Record<string, any>;
}

const deepClone = <T,>(x: T): T => {
  // @ts-ignore
  if (typeof structuredClone === "function") return structuredClone(x);
  return JSON.parse(JSON.stringify(x));
};

export default function AdminPricing() {
  const [loading, setLoading] = useState(true);
  const [scope, setScope] = useState<"internal" | "border">("internal");

  // ✅ بحث + فلاتر
  const [q, setQ] = useState("");
  const [groupFilter, setGroupFilter] = useState<string>("all");
  const [durationFilter, setDurationFilter] = useState<string>("all");

  // ✅ Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(50); // -1 = all

  // ✅ تعديل جماعي
  const [bulkPercent, setBulkPercent] = useState<string>("");
  const [bulkBackup, setBulkBackup] = useState<PricingData | null>(null);

  // ✅ إضافة بند يدوي
  const [openAdd, setOpenAdd] = useState(false);
  const [addForm, setAddForm] = useState({
    key: "",
    value: 0,
    label: "",
    group: "",
    duration: "",
  });

  // ✅ حفظ سطر واحد
  const [rowSaving, setRowSaving] = useState<Record<string, boolean>>({});

  const [data, setData] = useState<PricingData>({
    internal: {},
    border: {},
    internalMeta: {},
    borderMeta: {},
  });

  const [draft, setDraft] = useState<PricingData>({
    internal: {},
    border: {},
    internalMeta: {},
    borderMeta: {},
  });

  const fixedMetaMap = scope === "internal" ? INTERNAL_META_DEFAULTS : BORDER_META_DEFAULTS;
  const isFixedKey = (key: string) => !!fixedMetaMap[key];

  const metaObj = scope === "internal" ? draft.internalMeta : draft.borderMeta;
  const priceObj = scope === "internal" ? draft.internal : draft.border;

  const load = async () => {
    setLoading(true);
    try {
      const res: any = await adminApi.getPricing();
      const cfg = res?.data?.data ?? res?.data ?? res;

      // ✅ meta ثابت من defaults: defaults تكتب فوق أي قيمة موجودة لنفس المفتاح
      const normalized: PricingData = {
        internal: toObj(cfg.internal) as Record<string, number>,
        border: toObj(cfg.border) as Record<string, number>,
        internalMeta: { ...(toObj(cfg.internalMeta) as any), ...(INTERNAL_META_DEFAULTS as any) },
        borderMeta: { ...(toObj(cfg.borderMeta) as any), ...(BORDER_META_DEFAULTS as any) },
        version: cfg.version,
        updatedAt: cfg.updatedAt,
      };

      setData(normalized);
      setDraft(normalized);
      setBulkBackup(null);
      setBulkPercent("");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // ✅ لما تتغير الفلاتر/البحث أو scope رجّع الصفحة لأول
  useEffect(() => {
    setPage(1);
  }, [scope, q, groupFilter, durationFilter]);

  // ✅ قائمة الفئات/المدد من meta
  const groups = useMemo(() => {
    const set = new Set<string>();
    Object.values(metaObj).forEach((m) => {
      if (m?.group) set.add(m.group);
    });
    return ["all", ...Array.from(set)];
  }, [metaObj]);

  const durations = useMemo(() => {
    const set = new Set<string>();
    Object.values(metaObj).forEach((m) => {
      if (m?.duration) set.add(m.duration);
    });
    return ["all", ...Array.from(set)];
  }, [metaObj]);

  // ✅ rows = بعد البحث/الفلاتر
  const rows: Row[] = useMemo(() => {
    const list: Row[] = Object.keys(priceObj).map((key) => {
      const meta = metaObj[key] || {};
      return {
        key,
        value: Number(priceObj[key] ?? 0),
        label: meta.label || "",
        group: meta.group || "",
        duration: meta.duration || "",
      };
    });

    const t = q.trim().toLowerCase();

    const filtered = list.filter((r) => {
      const okSearch =
        !t ||
        r.key.toLowerCase().includes(t) ||
        r.label.toLowerCase().includes(t) ||
        r.group.toLowerCase().includes(t) ||
        r.duration.toLowerCase().includes(t);

      const okGroup = groupFilter === "all" || r.group === groupFilter;
      const okDur = durationFilter === "all" || r.duration === durationFilter;

      return okSearch && okGroup && okDur;
    });

    filtered.sort((a, b) => a.key.localeCompare(b.key));
    return filtered;
  }, [priceObj, metaObj, q, groupFilter, durationFilter]);

  const total = rows.length;

  const pagedRows = useMemo(() => {
    if (pageSize === -1) return rows;
    const start = (page - 1) * pageSize;
    return rows.slice(start, start + pageSize);
  }, [rows, page, pageSize]);

  const bulkCount = rows.length;

  const hasChanges = useMemo(() => {
    return JSON.stringify(data) !== JSON.stringify(draft);
  }, [data, draft]);

  const setRowValue = (key: string, value: number) => {
    setDraft((s) => {
      const next = { ...s } as PricingData;
      const obj = scope === "internal" ? { ...next.internal } : { ...next.border };
      obj[key] = value;

      if (scope === "internal") next.internal = obj;
      else next.border = obj;

      return next;
    });
  };

  // ✅ ميتا فقط للبنود غير الثابتة
  const setRowMeta = (key: string, meta: Partial<PricingMeta>) => {
    if (isFixedKey(key)) return;

    setDraft((s) => {
      const next = { ...s } as PricingData;
      const metaMap = scope === "internal" ? { ...next.internalMeta } : { ...next.borderMeta };
      metaMap[key] = { ...(metaMap[key] || {}), ...meta };

      if (scope === "internal") next.internalMeta = metaMap;
      else next.borderMeta = metaMap;

      return next;
    });
  };

  const saveAll = async () => {
    await adminApi.updatePricing({
      internal: draft.internal,
      border: draft.border,
      internalMeta: draft.internalMeta,
      borderMeta: draft.borderMeta,
    });
    await load();
  };

  // ✅ هل هذا السطر عليه تغييرات مقارنة بالمحفوظ؟
  const isRowDirty = (r: Row) => {
    const savedPrices = scope === "internal" ? data.internal : data.border;
    const savedMetas = scope === "internal" ? data.internalMeta : data.borderMeta;

    const savedVal = Number(savedPrices?.[r.key] ?? 0);
    const savedMeta = savedMetas?.[r.key] || {};

    return (
      Number(r.value ?? 0) !== savedVal ||
      (!isFixedKey(r.key) &&
        ((r.label || "") !== (savedMeta.label || "") ||
          (r.group || "") !== (savedMeta.group || "") ||
          (r.duration || "") !== (savedMeta.duration || "")))
    );
  };

  // ✅ حفظ سطر واحد فقط
  const saveRow = async (r: Row) => {
    const key = r.key;
    if (!key) return;
    if (!isRowDirty(r)) return;
    if (rowSaving[key]) return;

    setRowSaving((s) => ({ ...s, [key]: true }));

    try {
      const value = Number(r.value ?? 0);

      const metaToSend = isFixedKey(key)
        ? fixedMetaMap[key] || {}
        : { label: r.label, group: r.group, duration: r.duration };

      const res: any = await adminApi.patchPricingItem({
        scope,
        key,
        value,
        meta: metaToSend,
      });

      const cfg = res?.data?.data;

      // ✅ حدّث data لهذا السطر فقط (بدون ما نخرب تعديلات باقي الصفوف)
      setData((prev) => {
        const next = deepClone(prev);

        if (scope === "internal") {
          next.internal = { ...next.internal, [key]: value };
          next.internalMeta = { ...next.internalMeta, [key]: metaToSend };
        } else {
          next.border = { ...next.border, [key]: value };
          next.borderMeta = { ...next.borderMeta, [key]: metaToSend };
        }

        if (cfg?.version) next.version = cfg.version;
        if (cfg?.updatedAt) next.updatedAt = cfg.updatedAt;

        return next;
      });

      // ✅ حدّث رأس الصفحة فقط
      setDraft((prev) => {
        const next = deepClone(prev);
        if (cfg?.version) next.version = cfg.version;
        if (cfg?.updatedAt) next.updatedAt = cfg.updatedAt;
        return next;
      });
    } catch (e) {
      console.error(e);
      alert("فشل حفظ السطر");
    } finally {
      setRowSaving((s) => ({ ...s, [key]: false }));
    }
  };

  const addManual = () => {
    const key = addForm.key.trim();
    if (!key) return alert("المفتاح مطلوب");
    if (!Number.isFinite(Number(addForm.value))) return alert("القيمة غير صحيحة");

    const exists = Object.prototype.hasOwnProperty.call(priceObj, key);
    if (exists && !confirm("هذا المفتاح موجود. هل تريد استبداله؟")) return;

    const fixed = (scope === "internal" ? INTERNAL_META_DEFAULTS : BORDER_META_DEFAULTS)[key];

    setDraft((s) => {
      const next = { ...s } as PricingData;

      if (scope === "internal") {
        next.internal = { ...next.internal, [key]: Number(addForm.value) };
        next.internalMeta = {
          ...next.internalMeta,
          [key]: fixed
            ? fixed
            : { label: addForm.label, group: addForm.group, duration: addForm.duration },
        };
      } else {
        next.border = { ...next.border, [key]: Number(addForm.value) };
        next.borderMeta = {
          ...next.borderMeta,
          [key]: fixed
            ? fixed
            : { label: addForm.label, group: addForm.group, duration: addForm.duration },
        };
      }

      return next;
    });

    setOpenAdd(false);
    setAddForm({ key: "", value: 0, label: "", group: "", duration: "" });
  };

  const removeItem = async (key: string) => {
    if (!confirm(`حذف المفتاح ${key}؟`)) return;

    const existsInSaved =
      scope === "internal"
        ? Object.prototype.hasOwnProperty.call(data.internal, key)
        : Object.prototype.hasOwnProperty.call(data.border, key);

    if (existsInSaved) {
      await adminApi.deletePricingItem(scope, key);
      await load();
      return;
    }

    // محلياً فقط
    setDraft((s) => {
      const next = deepClone(s);

      if (scope === "internal") {
        const n = { ...next.internal };
        delete n[key];
        next.internal = n;

        const m = { ...next.internalMeta };
        delete m[key];
        next.internalMeta = m;
      } else {
        const n = { ...next.border };
        delete n[key];
        next.border = n;

        const m = { ...next.borderMeta };
        delete m[key];
        next.borderMeta = m;
      }

      return next;
    });
  };

  const applyBulkPercent = () => {
    const p = Number(bulkPercent);
    if (!Number.isFinite(p) || p === 0) return alert("أدخل نسبة صحيحة (مثال: 10 أو -5)");

    const isAll = groupFilter === "all" && durationFilter === "all" && !q.trim();
    if (isAll) {
      const ok = confirm("سيتم تطبيق النسبة على كل عناصر هذا القسم (داخلي/حدودي). هل أنت متأكد؟");
      if (!ok) return;
    }

    setBulkBackup(deepClone(draft));
    const factor = 1 + p / 100;

    setDraft((prev) => {
      const next = deepClone(prev);
      const map = (scope === "internal" ? next.internal : next.border) as Record<string, number>;

      for (const r of rows) {
        const oldVal = Number(map[r.key] || 0);
        const newVal = Math.max(0, Math.round(oldVal * factor));
        map[r.key] = newVal;
      }

      return next;
    });
  };

  const undoBulk = () => {
    if (!bulkBackup) return;
    setDraft(bulkBackup);
    setBulkBackup(null);
    setBulkPercent("");
  };

  return (
    <div dir="rtl" className="space-y-4">
      <Card className="shadow-sm">
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <CardTitle>التحكم بالتسعير</CardTitle>
            <div className="text-xs text-slate-500 flex items-center gap-2">
              <Badge variant="secondary">v{draft.version ?? "-"}</Badge>
              <span>آخر تحديث: {draft.updatedAt ? new Date(draft.updatedAt).toLocaleString() : "—"}</span>
              {hasChanges ? (
                <Badge className="bg-amber-600 hover:bg-amber-600">تعديلات غير محفوظة</Badge>
              ) : null}
            </div>
          </div>

          <PageHeader title="إعدادات التسعير" entity="pricing" fileName="pricing" />

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant={scope === "internal" ? "default" : "outline"}
              onClick={() => setScope("internal")}
            >
              داخلي
            </Button>
            <Button
              variant={scope === "border" ? "default" : "outline"}
              onClick={() => setScope("border")}
            >
              حدودي
            </Button>

            <Input
              className="w-56"
              placeholder="بحث بالمفتاح أو الوصف..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />

            <select
              className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm"
              value={groupFilter}
              onChange={(e) => setGroupFilter(e.target.value)}
            >
              {groups.map((g) => (
                <option key={g} value={g}>
                  {g === "all" ? "كل الفئات" : g}
                </option>
              ))}
            </select>

            <select
              className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm"
              value={durationFilter}
              onChange={(e) => setDurationFilter(e.target.value)}
            >
              {durations.map((d) => (
                <option key={d} value={d}>
                  {d === "all" ? "كل المدد" : d}
                </option>
              ))}
            </select>

            {/* ✅ تعديل جماعي */}
            <div className="flex items-center gap-2">
              <Input
                className="w-28"
                placeholder="%"
                value={bulkPercent}
                onChange={(e) => setBulkPercent(e.target.value)}
              />

              <Button
                variant="outline"
                onClick={applyBulkPercent}
                disabled={loading || bulkCount === 0}
                title="يطبق على النتائج حسب الفلاتر الحالية"
              >
                تطبيق جماعي
              </Button>

              <Button variant="outline" onClick={undoBulk} disabled={!bulkBackup}>
                تراجع
              </Button>

              <span className="text-xs text-slate-500">سيطبق على: {bulkCount}</span>
            </div>

            {/* ✅ إضافة بند */}
            <Dialog
              open={openAdd}
              onOpenChange={(v) => {
                setOpenAdd(v);
                if (!v) setAddForm({ key: "", value: 0, label: "", group: "", duration: "" });
              }}
            >
              <DialogTrigger asChild>
                <Button className="gap-2">+ إضافة بند يدوي</Button>
              </DialogTrigger>

              <DialogContent dir="rtl" className="sm:max-w-[780px]">
                <DialogHeader>
                  <DialogTitle>
                    إضافة بند تسعير ({scope === "internal" ? "داخلي" : "حدودي"})
                  </DialogTitle>
                </DialogHeader>

                {(() => {
                  const keyTrim = addForm.key.trim();
                  const fixed = (scope === "internal" ? INTERNAL_META_DEFAULTS : BORDER_META_DEFAULTS)[keyTrim];
                  return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                      <div className="space-y-2">
                        <label className="text-sm">المفتاح (Key) *</label>
                        <Input
                          value={addForm.key}
                          onChange={(e) => {
                            const v = e.target.value;
                            const k = v.trim();

                            const fm =
                              (scope === "internal" ? INTERNAL_META_DEFAULTS : BORDER_META_DEFAULTS)[k];

                            setAddForm((s) => ({
                              ...s,
                              key: v,
                              label: fm?.label ?? s.label,
                              group: fm?.group ?? s.group,
                              duration: fm?.duration ?? s.duration,
                            }));
                          }}
                          placeholder="مثال: 01a-01"
                        />
                        {fixed ? (
                          <p className="text-xs text-emerald-700">
                            ✅ سيتم جلب الوصف تلقائياً من الجدول (ثابت).
                          </p>
                        ) : (
                          <p className="text-xs text-slate-500">
                            هذا المفتاح غير موجود في الجدول، يمكنك إدخال الوصف يدوياً.
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm">القيمة *</label>
                        <Input
                          type="number"
                          value={addForm.value}
                          onChange={(e) =>
                            setAddForm((s) => ({ ...s, value: Number(e.target.value || 0) }))
                          }
                        />
                      </div>

                      <div className="space-y-2 md:col-span-2">
                        <label className="text-sm">الوصف (Label)</label>
                        <Input
                          value={addForm.label}
                          onChange={(e) => setAddForm((s) => ({ ...s, label: e.target.value }))}
                          placeholder="وصف..."
                          disabled={!!fixed}
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm">الفئة (Group)</label>
                        <Input
                          value={addForm.group}
                          onChange={(e) => setAddForm((s) => ({ ...s, group: e.target.value }))}
                          placeholder="فئة..."
                          disabled={!!fixed}
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm">المدة (Duration)</label>
                        <Input
                          value={addForm.duration}
                          onChange={(e) => setAddForm((s) => ({ ...s, duration: e.target.value }))}
                          placeholder="مدة..."
                          disabled={!!fixed}
                        />
                      </div>

                      <div className="flex gap-2 md:col-span-2">
                        <Button onClick={addManual}>إضافة</Button>
                        <Button variant="outline" onClick={() => setOpenAdd(false)}>
                          إلغاء
                        </Button>
                      </div>
                    </div>
                  );
                })()}
              </DialogContent>
            </Dialog>

            <Button variant="outline" onClick={load}>
              تحديث
            </Button>
            <Button onClick={saveAll} disabled={loading || !hasChanges}>
              حفظ الكل
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          <div className="rounded-2xl border bg-white overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="p-3 text-right">المفتاح</th>
                  <th className="p-3 text-right">الوصف</th>
                  <th className="p-3 text-right">الفئة</th>
                  <th className="p-3 text-right">المدة</th>
                  <th className="p-3 text-right">القيمة</th>
                  <th className="p-3 text-right">إجراء</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} className="border-t">
                      <td className="p-3" colSpan={6}>
                        <div className="h-8 bg-slate-100 rounded animate-pulse" />
                      </td>
                    </tr>
                  ))
                ) : pagedRows.length === 0 ? (
                  <tr className="border-t">
                    <td className="p-8 text-center text-slate-500" colSpan={6}>
                      لا توجد نتائج
                    </td>
                  </tr>
                ) : (
                  pagedRows.map((r) => {
                    const fixed = isFixedKey(r.key);

                    return (
                      <tr key={r.key} className="border-t">
                        <td className="p-3 font-mono">{r.key}</td>

                        {/* ✅ الوصف ثابت إذا موجود بالجدول */}
                        <td className="p-3">
                          {fixed ? (
                            <div className="text-sm">{r.label || "—"}</div>
                          ) : (
                            <Input
                              value={r.label}
                              onChange={(e) => setRowMeta(r.key, { label: e.target.value })}
                              placeholder="وصف..."
                            />
                          )}
                        </td>

                        <td className="p-3">
                          {fixed ? (
                            <div className="text-sm">{r.group || "—"}</div>
                          ) : (
                            <Input
                              value={r.group}
                              onChange={(e) => setRowMeta(r.key, { group: e.target.value })}
                              placeholder="فئة..."
                            />
                          )}
                        </td>

                        <td className="p-3">
                          {fixed ? (
                            <Badge variant="secondary">{r.duration || "—"}</Badge>
                          ) : (
                            <Input
                              value={r.duration}
                              onChange={(e) => setRowMeta(r.key, { duration: e.target.value })}
                              placeholder="مدة..."
                            />
                          )}
                        </td>

                        <td className="p-3">
                          <Input
                            type="number"
                            value={r.value}
                            onChange={(e) => setRowValue(r.key, Number(e.target.value || 0))}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") saveRow(r);
                            }}
                            className="w-40"
                          />
                        </td>

                        <td className="p-3">
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => saveRow(r)}
                              disabled={loading || !isRowDirty(r) || !!rowSaving[r.key]}
                              className="gap-2"
                            >
                              {rowSaving[r.key] ? "جارٍ..." : "حفظ"}
                            </Button>

                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => removeItem(r.key)}
                            >
                              حذف
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {!loading && (
            <PaginationBar
              page={page}
              pageSize={pageSize}
              total={total}
              onPageChange={setPage}
              onPageSizeChange={(v: any) => setPageSize(v === "all" ? -1 : Number(v))}
              pageSizeOptions={[20, 50, 100, 200, "all"]}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
