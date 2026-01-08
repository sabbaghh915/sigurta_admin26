import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Badge } from "../../components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../components/ui/dialog";
import { adminApi } from "../../services/adminApi";
import PageHeader from "../../components/export/PageHeader";
import { PaginationBar } from "../../components/ui/pagination";

type Center = {
  _id: string;
  name: string;
  ip?: string | null;
  code?: string;
  address?: string;
  employeesCount?: number;
};

type AdminUser = {
  _id: string;
  username?: string;
  fullName?: string;
  email?: string;
  role?: "admin" | "employee" | "assistant_admin" | string;
  employeeId?: string;

  // حسب الباك عندك أساساً centerId
  center?: string | Center | null;
  centerId?: string | Center | null;

  lastLoginIp?: string;
  lastLoginAt?: string | null;
  isActive?: boolean;
   isOnline?: boolean;
   lastSeenAt?: string | null;
  createdAt?: string;
};

const extractArray = (res: any): any[] => {
  if (Array.isArray(res)) return res;

  // حالات شائعة:
  // 1) res = { data: [...] }
  if (Array.isArray(res?.data)) return res.data;

  // 2) axios: res = { data: { data: [...] } }
  if (Array.isArray(res?.data?.data)) return res.data.data;

  // 3) res = { items: [...] }
  if (Array.isArray(res?.items)) return res.items;

  // 4) res = { data: { items: [...] } }
  if (Array.isArray(res?.data?.items)) return res.data.items;

  return [];
};

const normalizeId = (v: any): string => {
  if (!v) return "";
  if (typeof v === "string") return v;
  // إذا وصل ObjectId بشكل كائن (نادراً في الفرونت) أو كائن Center
  if (typeof v === "object") return String(v._id || v.id || v);
  return String(v);
};

// ✅ مرجع واحد للمركز: center أو centerId
const getUserCenter = (u: AdminUser): AdminUser["center"] => {
  return (u.center ?? u.centerId ?? null) as any;
};

const centerLabel = (u: AdminUser, centers: Center[]) => {
  const c = getUserCenter(u);
  if (!c) return "—";

  // populated object
  if (typeof c === "object") return c.name || c.code || c._id || "—";

  // string id
  const cid = normalizeId(c);
  const found = centers.find((x) => normalizeId(x._id) === cid);
  return found ? (found.name || found.code || "—") : "—";
};

const centerIpLabel = (u: AdminUser, centers: Center[]) => {
  const c = getUserCenter(u);
  if (!c) return "—";

  // populated object
  if (typeof c === "object") return (c.ip ?? "—") as any;

  // string id
  const cid = normalizeId(c);
  const found = centers.find((x) => normalizeId(x._id) === cid);
  return (found?.ip ?? "—") as any;
};

const roleBadge = (role?: string) => {
  if (role === "admin")
    return <Badge className="bg-rose-600 hover:bg-rose-600">أدمن</Badge>;
  if (role === "assistant_admin")
    return <Badge className="bg-green-600 hover:bg-green-600">أدمن مساعد</Badge>;
  return <Badge variant="secondary">موظف</Badge>;
};

// ✅ حالة الموظف (أونلاين / أوفلاين) بناءً على آخر دخول
const onlineStatusBadge = (u: AdminUser) => {
  // ✅ Online الحقيقي من الباك
  if (typeof u.isOnline === "boolean") {
    return u.isOnline ? (
      <Badge className="bg-emerald-600 hover:bg-emerald-600">أونلاين</Badge>
    ) : (
      <Badge variant="outline" className="border-slate-300 text-slate-600">
        أوفلاين
      </Badge>
    );
  }

  // ✅ fallback: lastSeenAt (أفضل من lastLoginAt)
  const ts = u.lastSeenAt || u.lastLoginAt;
  if (ts) {
    const last = new Date(ts).getTime();
    const diffMinutes = (Date.now() - last) / (1000 * 60);
    if (!Number.isNaN(last) && diffMinutes <= 5) {
      return <Badge className="bg-emerald-600 hover:bg-emerald-600">أونلاين</Badge>;
    }
  }

  return (
    <Badge variant="outline" className="border-slate-300 text-slate-600">
      أوفلاين
    </Badge>
  );
};



export default function AdminEmployees() {
  const [loading, setLoading] = useState(true);

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [centers, setCenters] = useState<Center[]>([]);
  const [selectedCenter, setSelectedCenter] = useState<string>("all");
  const [centerSearchQuery, setCenterSearchQuery] = useState<string>("");
  const [centerSearchQueryInDialog, setCenterSearchQueryInDialog] = useState<string>("");

  const [openAdd, setOpenAdd] = useState(false);

  const [form, setForm] = useState({
    username: "",
    password: "",
    fullName: "",
    email: "",
    employeeId: "",
    role: "employee",
    center: "", // centerId
  });

  const resetForm = () => {
    setForm({
      username: "",
      password: "",
      fullName: "",
      email: "",
      employeeId: "",
      role: "employee",
      center: "",
    });
  };

  // دالة لجلب كل المراكز (كل الصفحات)
  const loadAllCenters = async (): Promise<Center[]> => {
    const allCenters: Center[] = [];
    let page = 1;
    const limit = 100; // جلب 100 مركز في كل صفحة
    let hasMore = true;

    while (hasMore) {
      try {
        const res: any = await adminApi.getCenters({ page, limit });
        const data = res?.data ?? res;
        
        const items: Center[] = Array.isArray(data?.items)
          ? data.items
          : Array.isArray(data)
          ? data
          : extractArray(res);

        allCenters.push(...items);

        // التحقق من وجود صفحات أخرى
        const meta = data?.meta;
        if (meta) {
          hasMore = page < meta.pages;
          page++;
        } else {
          // إذا لم يكن هناك meta، نتوقف إذا كانت النتائج أقل من limit
          hasMore = items.length === limit;
          page++;
        }
      } catch (error) {
        console.error("خطأ في جلب المراكز:", error);
        hasMore = false;
      }
    }

    return allCenters;
  };

  const loadAll = useCallback(async () => {
    try {
      setLoading(true);

      const [usersRes, centersArray] = await Promise.all([
        adminApi.getUsers(),
        loadAllCenters().catch(() => []),
      ]);

      setUsers(extractArray(usersRes) as AdminUser[]);
      setCenters(centersArray as Center[]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // فلترة المراكز حسب البحث
  const filteredCenters = useMemo(() => {
    if (!centerSearchQuery.trim()) return centers;
    const query = centerSearchQuery.trim().toLowerCase();
    return centers.filter(
      (c) =>
        c.name?.toLowerCase().includes(query) ||
        c.code?.toLowerCase().includes(query) ||
        c._id?.toLowerCase().includes(query)
    );
  }, [centers, centerSearchQuery]);

  const filteredCentersInDialog = useMemo(() => {
    if (!centerSearchQueryInDialog.trim()) return centers;
    const query = centerSearchQueryInDialog.trim().toLowerCase();
    return centers.filter(
      (c) =>
        c.name?.toLowerCase().includes(query) ||
        c.code?.toLowerCase().includes(query) ||
        c._id?.toLowerCase().includes(query)
    );
  }, [centers, centerSearchQueryInDialog]);

  const filteredUsers = useMemo(() => {
    if (selectedCenter === "all") return users;

    return users.filter((u) => {
      const c = getUserCenter(u);
      if (!c) return false;
      const cid = typeof c === "object" && c !== null ? normalizeId(c._id) : normalizeId(c);
      return cid === selectedCenter;
    });
  }, [users, selectedCenter]);

  // Pagination (client-side)
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  useEffect(() => {
    setPage(1);
  }, [selectedCenter, users.length]);

  const pagedUsers = useMemo(() => {
    // إذا كان pageSize = -1 يعني "الكل"
    if (pageSize === -1) {
      return filteredUsers;
    }
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    if (start >= filteredUsers.length && page > 1) {
      return filteredUsers.slice(0, pageSize);
    }
    return filteredUsers.slice(start, end);
  }, [filteredUsers, page, pageSize]);

  const removeUser = async (id: string) => {
    if (!id) return;
    if (!confirm("هل أنت متأكد من حذف الموظف؟")) return;
    await adminApi.deleteUser(id);
    await loadAll();
  };

  const saveUser = async () => {
    if (!form.username.trim()) return alert("اسم المستخدم مطلوب");
    if (!form.password.trim()) return alert("كلمة المرور مطلوبة");
    if (!form.fullName.trim()) return alert("الاسم الكامل مطلوب");
    if (!form.email.trim()) return alert("الإيميل مطلوب");

    // إذا موظف لازم مركز
    if (form.role === "employee" && !form.center) return alert("اختر مركز الموظف");

    await adminApi.createUser({
      username: form.username.trim(),
      password: form.password.trim(),
      fullName: form.fullName.trim(),
      email: form.email.trim(),
      employeeId: form.employeeId.trim() || undefined,
      role: form.role,
      centerId: form.role === "admin" ? null : form.center, // ✅
    });

    setOpenAdd(false);
    resetForm();
    await loadAll();
  };

  return (
    <div dir="rtl" className="space-y-4">
      <Card className="shadow-sm">
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <CardTitle>الموظفون</CardTitle>
          <PageHeader title="إدارة الموظفين" entity="employees" fileName="employees" />

          <div className="flex items-center gap-2">
            <Dialog
              open={openAdd}
              onOpenChange={(v) => {
                setOpenAdd(v);
                if (!v) {
                  resetForm();
                  setCenterSearchQueryInDialog("");
                }
              }}
            >
              <DialogTrigger asChild>
                <Button className="gap-2">+ إضافة موظف</Button>
              </DialogTrigger>

              <DialogContent className="sm:max-w-[820px]" dir="rtl">
                <DialogHeader>
                  <DialogTitle>إضافة موظف</DialogTitle>
                </DialogHeader>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                  <div className="space-y-2">
                    <Label>اسم المستخدم *</Label>
                    <Input
                      value={form.username}
                      onChange={(e) =>
                        setForm((s) => ({ ...s, username: e.target.value }))
                      }
                      placeholder="مثال: employee01"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>كلمة المرور *</Label>
                    <Input
                      type="password"
                      value={form.password}
                      onChange={(e) =>
                        setForm((s) => ({ ...s, password: e.target.value }))
                      }
                      placeholder="••••••••"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>الاسم الكامل *</Label>
                    <Input
                      value={form.fullName}
                      onChange={(e) =>
                        setForm((s) => ({ ...s, fullName: e.target.value }))
                      }
                      placeholder="الاسم الكامل"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>الإيميل *</Label>
                    <Input
                      value={form.email}
                      onChange={(e) =>
                        setForm((s) => ({ ...s, email: e.target.value }))
                      }
                      placeholder="example@mail.com"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>الرقم الوظيفي</Label>
                    <Input
                      value={form.employeeId}
                      onChange={(e) =>
                        setForm((s) => ({ ...s, employeeId: e.target.value }))
                      }
                      placeholder="اختياري"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>الدور</Label>
                    <select
                      className="w-full h-10 rounded-md border border-slate-200 bg-white px-3 text-sm"
                      value={form.role}
                      onChange={(e) =>
                        setForm((s) => ({ ...s, role: e.target.value }))
                      }
                    >
                      <option value="employee">موظف</option>
                      <option value="admin">أدمن</option>
                      <option value="assistant_admin">أدمن مساعد</option>
                    </select>
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label>المركز *</Label>
                    <div className="space-y-2">
                      <Input
                        placeholder="ابحث عن المركز (اسم أو رقم)..."
                        value={centerSearchQueryInDialog}
                        onChange={(e) => setCenterSearchQueryInDialog(e.target.value)}
                        disabled={form.role === "admin"}
                        className="w-full"
                      />
                      <select
                        className="w-full h-10 rounded-md border border-slate-200 bg-white px-3 text-sm"
                        value={form.center}
                        onChange={(e) =>
                          setForm((s) => ({ ...s, center: e.target.value }))
                        }
                        disabled={form.role === "admin"} // الأدمن بدون مركز
                      >
                        <option value="">
                          {form.role === "admin" ? "الأدمن بدون مركز" : "اختر مركز الموظف"}
                        </option>
                        {filteredCentersInDialog.map((c) => (
                          <option key={c._id} value={c._id}>
                            {c.name} {c.code ? `(${c.code})` : ""} {c.ip ? `— ${c.ip}` : ""}
                          </option>
                        ))}
                      </select>
                      {centerSearchQueryInDialog && filteredCentersInDialog.length === 0 && (
                        <p className="text-sm text-slate-500">لا توجد نتائج</p>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 justify-start md:col-span-2 mt-2">
                    <Button onClick={saveUser}>حفظ</Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setOpenAdd(false);
                        resetForm();
                      }}
                    >
                      إلغاء
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <div className="flex items-center gap-2">
              <Input
                placeholder="ابحث عن المركز..."
                value={centerSearchQuery}
                onChange={(e) => setCenterSearchQuery(e.target.value)}
                className="w-48 h-10"
              />
              <select
                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm min-w-[200px]"
                value={selectedCenter}
                onChange={(e) => setSelectedCenter(e.target.value)}
              >
                <option value="all">كل المراكز</option>
                {filteredCenters.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name} {c.code ? `(${c.code})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <Button variant="outline" onClick={loadAll}>
              تحديث
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          <div className="rounded-2xl border bg-white overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="p-3 text-right">المستخدم</th>
                  <th className="p-3 text-right">الاسم</th>
                  <th className="p-3 text-right">الإيميل</th>
                  <th className="p-3 text-right">المركز</th>
                  <th className="p-3 text-right">IP</th>
                  <th className="p-3 text-right">الحالة</th>
                  <th className="p-3 text-right">الدور</th>
                  <th className="p-3 text-right">إجراء</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-t">
                      <td className="p-3" colSpan={8}>
                        <div className="h-8 bg-slate-100 rounded animate-pulse" />
                      </td>
                    </tr>
                  ))
                ) : filteredUsers.length === 0 ? (
                  <tr className="border-t">
                    <td className="p-8 text-center text-slate-500" colSpan={8}>
                      لا يوجد موظفون
                    </td>
                  </tr>
                ) : (
                  pagedUsers.map((u) => {
                    const ipCenter = centerIpLabel(u, centers);

                    return (
                      <tr key={u._id} className="border-t">
                        <td className="p-3">{u.username || "—"}</td>
                        <td className="p-3">{u.fullName || "—"}</td>
                        <td className="p-3">{u.email || "—"}</td>

                        <td className="p-3">{centerLabel(u, centers)}</td>

                        <td className="p-3">
                          {/* IP المركز */}
                          <div>{ipCenter || "—"}</div>

                          {/* ✅ اختياري: إذا IP المركز غير موجود، اعرض IP آخر دخول بشكل خفيف */}
                          {(!ipCenter || ipCenter === "—") && u.lastLoginIp ? (
                            <div className="text-xs text-slate-500 mt-1">
                              آخر دخول: {u.lastLoginIp}
                            </div>
                          ) : null}
                        </td>

                        <td className="p-3">{onlineStatusBadge(u)}</td>

                        <td className="p-3">{roleBadge(u.role)}</td>

                        <td className="p-3">
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => removeUser(u._id)}
                            className="gap-2"
                          >
                            حذف
                          </Button>
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
              total={filteredUsers.length}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
              pageSizeOptions={[20, 50, 100, 200, "all"]}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
