import { useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { LogIn, LayoutDashboard, Sparkles } from "lucide-react";

export default function Home() {
  const navigate = useNavigate();

  return (
    <div dir="rtl" className="min-h-screen bg-gradient-to-br from-green-600 via-green-700 to-green-800 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10 text-white">
          <div className="inline-flex items-center gap-2 bg-white/15 border border-white/20 rounded-full px-4 py-2 mb-4">
            <Sparkles className="w-4 h-4" />
            <span className="text-sm">واجهة جديدة بألوان زاهية</span>
          </div>
          <h1 className="text-4xl font-extrabold mb-2">لوحة إدارة التأمين الإلزامي</h1>
          <p className="text-white/90">اختر تسجيل الدخول أو الدخول إلى لوحة الأدمن</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card className="border-white/30 bg-white/90 backdrop-blur shadow-2xl hover:shadow-[0_20px_60px_rgba(0,0,0,0.25)] transition">
            <CardContent className="p-8">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="bg-gradient-to-r from-green-600 to-green-800 p-4 rounded-2xl shadow-md">
                  <LogIn className="h-8 w-8 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900">تسجيل الدخول</h2>
                <p className="text-slate-600">سجّل دخولك للوصول للنظام</p>
                <Button
                  onClick={() => navigate("/login")}
                  className="w-full bg-gradient-to-r from-green-600 via-green-700 to-green-800 hover:opacity-95"
                >
                  تسجيل الدخول الآن
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-white/30 bg-white/90 backdrop-blur shadow-2xl hover:shadow-[0_20px_60px_rgba(0,0,0,0.25)] transition">
            <CardContent className="p-8">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="bg-gradient-to-r from-emerald-500 to-cyan-500 p-4 rounded-2xl shadow-md">
                  <LayoutDashboard className="h-8 w-8 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900">لوحة الأدمن</h2>
                <p className="text-slate-600">ادخل مباشرة إذا كنت مسجّل مسبقاً</p>
                <Button
                  onClick={() => navigate("/admin")}
                  variant="outline"
                  className="w-full border-slate-200 hover:bg-slate-50"
                >
                  دخول لوحة الأدمن
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="text-center mt-8 text-white/80 text-sm">
          Tip: إذا شفت ألوان باهتة، اعمل تحديث للصفحة + أعد تشغيل Vite.
        </div>
      </div>
    </div>
  );
}
