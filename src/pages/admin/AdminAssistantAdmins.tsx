import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Checkbox } from "../../components/ui/checkbox";
import { Badge } from "../../components/ui/badge";
import { Separator } from "../../components/ui/separator";
import { Alert, AlertDescription } from "../../components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { adminApi } from "../../services/adminApi";
import { Shield, Plus, RefreshCcw, AlertCircle, UserCog } from "lucide-react";
import { PaginationBar } from "../../components/ui/pagination";

type AssistantAdmin = {
  _id: string;
  username: string;
  fullName?: string;
  email?: string;
  role: string;
  permissions: string[];
  isActive: boolean;
  createdAt?: string;
};

const ALL_PERMS = [
  { key: "view_finance", label: "عرض المالية" },
  { key: "view_payments", label: "عرض الدفعات" },
  { key: "view_policies", label: "عرض العقود" },
  { key: "view_vehicles", label: "عرض المركبات" },
  { key: "export_reports", label: "تصدير التقارير" },
  // لا تضف manage_users / manage_centers / manage_companies هنا إلا إذا تريد admin مساعد قوي
];

export default function AdminAssistantAdmins() {
  const [items, setItems] = useState<AssistantAdmin[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // create form
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [perms, setPerms] = useState<string[]>(["view_payments", "view_finance", "export_reports"]);
  const [saving, setSaving] = useState(false);

  // Pagination (client-side)
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const load = async () => {
    setError("");
    setLoading(true);
    try {
      const res: any = await adminApi.getAssistantAdmins();
      const list = Array.isArray(res) ? res : (res?.data || res?.items || []);
      setItems(list);
    } catch (e: any) {
      setError(e?.message || "فشل تحميل الأدمن المساعدين");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load().catch(() => {});
  }, []);

  const togglePerm = (p: string) => {
    setPerms((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));
  };

  const create = async () => {
    setError("");
    setSaving(true);
    try {
      await adminApi.createAssistantAdmin({
        username,
        fullName,
        email,
        password,
        permissions: perms,
      });
      setUsername("");
      setFullName("");
      setEmail("");
      setPassword("");
      setPerms(["view_payments", "view_finance", "export_reports"]);
      await load();
    } catch (e: any) {
      setError(e?.message || "فشل إنشاء الأدمن المساعد");
    } finally {
      setSaving(false);
    }
  };

  const update = async (id: string, patch: Partial<AssistantAdmin>) => {
    setError("");
    try {
      await adminApi.updateAssistantAdmin(id, patch);
      await load();
    } catch (e: any) {
      setError(e?.message || "فشل تحديث الأدمن المساعد");
    }
  };

  const totalActive = useMemo(() => items.filter((x) => x.isActive).length, [items]);

  const pagedItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    if (start >= items.length && page > 1) {
      return items.slice(0, pageSize);
    }
    return items.slice(start, end);
  }, [items, page, pageSize]);

  return (
    <div dir="rtl" className="p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="h-10 w-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xl font-extrabold">الأدمن المساعد</div>
            <div className="text-sm text-muted-foreground">
              إدارة حسابات الأدمن المساعد وتحديد صلاحياته
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={load} disabled={loading} variant="secondary">
            <RefreshCcw className="h-4 w-4 ml-2" />
            تحديث
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
            <UserCog className="h-5 w-5" />
            إضافة أدمن مساعد
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>اسم المستخدم</Label>
              <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="assistant1" />
            </div>
            <div className="space-y-2">
              <Label>الاسم الكامل</Label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Admin Assistant" />
            </div>
            <div className="space-y-2">
              <Label>البريد (اختياري)</Label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="a@x.com" />
            </div>
            <div className="space-y-2">
              <Label>كلمة المرور</Label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <div className="font-semibold">الصلاحيات</div>
            <div className="grid md:grid-cols-3 gap-3">
              {ALL_PERMS.map((p) => (
                <label key={p.key} className="flex items-center gap-2 rounded-xl border p-3 bg-white">
                  <Checkbox checked={perms.includes(p.key)} onCheckedChange={() => togglePerm(p.key)} />
                  <span>{p.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={create} disabled={saving || !username || !password}>
              <Plus className="h-4 w-4 ml-2" />
              {saving ? "جاري الإضافة..." : "إضافة"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-2 flex-wrap">
        <Badge variant="secondary">الإجمالي: {items.length}</Badge>
        <Badge variant="secondary">النشط: {totalActive}</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>قائمة الأدمن المساعد</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">المستخدم</TableHead>
                  <TableHead className="text-right">الصلاحيات</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                  <TableHead className="text-right">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedItems.map((u) => (
                  <TableRow key={u._id}>
                    <TableCell>
                      <div className="font-semibold">{u.username}</div>
                      <div className="text-xs text-muted-foreground">{u.fullName || "—"} {u.email ? `— ${u.email}` : ""}</div>
                    </TableCell>

                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {(u.permissions || []).map((p) => (
                          <Badge key={p} variant="secondary">{p}</Badge>
                        ))}
                        {!u.permissions?.length && <span className="text-muted-foreground text-sm">—</span>}
                      </div>
                    </TableCell>

                    <TableCell>
                      <Badge variant={u.isActive ? "default" : "secondary"}>
                        {u.isActive ? "نشط" : "موقوف"}
                      </Badge>
                    </TableCell>

                    <TableCell className="space-x-2 space-x-reverse">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => update(u._id, { isActive: !u.isActive })}
                      >
                        {u.isActive ? "إيقاف" : "تفعيل"}
                      </Button>

                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          const next = prompt("أدخل الصلاحيات مفصولة بفواصل:", (u.permissions || []).join(","));
                          if (!next) return;
                          const nextPerms = next.split(",").map((x) => x.trim()).filter(Boolean);
                          update(u._id, { permissions: nextPerms });
                        }}
                      >
                        تعديل الصلاحيات
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}

                {!items.length && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground p-6">
                      لا يوجد أدمن مساعدين
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <PaginationBar
            page={page}
            pageSize={pageSize}
            total={items.length}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            pageSizeOptions={[10, 20, 50]}
          />
        </CardContent>
      </Card>
    </div>
  );
}
