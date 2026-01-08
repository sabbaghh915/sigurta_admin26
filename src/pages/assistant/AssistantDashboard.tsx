import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Separator } from "../../components/ui/separator";
import { ShieldCheck, Sparkles } from "lucide-react";

export default function AssistantDashboard() {
  const raw = localStorage.getItem("user");
  const user = raw ? JSON.parse(raw) : null;

  return (
    <div className="space-y-4">
      <Card className="rounded-2xl border-white/40 bg-white/90 backdrop-blur shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-extrabold text-slate-900">
            <ShieldCheck className="h-5 w-5 text-emerald-600" />
            الصفحة الرئيسية للأدمن المساعد
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="rounded-2xl border bg-slate-50 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-slate-600">مرحباً</span>
              <span className="text-sm font-bold text-slate-900">{user?.fullName || user?.username || "-"}</span>
              <Badge className="rounded-xl" variant="secondary">
                {user?.role || "assistant_admin"}
              </Badge>
            </div>

            <Separator className="my-3" />

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 text-sm">
              <div className="rounded-xl bg-white p-3 border">
                <div className="text-xs text-slate-500">اسم المستخدم</div>
                <div className="font-semibold text-slate-900">{user?.username || "-"}</div>
              </div>

              <div className="rounded-xl bg-white p-3 border">
                <div className="text-xs text-slate-500">البريد</div>
                <div className="font-semibold text-slate-900">{user?.email || "-"}</div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border bg-white p-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-green-600" />
              <div className="text-sm font-bold text-slate-900">ملاحظة</div>
            </div>

            <p className="mt-2 text-sm text-slate-700 leading-6">
              هذه الواجهة لا تعتمد على <b>permissions</b> نهائياً.
              فقط وجود <b>role = assistant_admin</b> يسمح بالدخول.
              يمكنك إضافة صفحات للمساعد لاحقاً (دفعات / تقارير / مالية) حسب حاجتك.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
