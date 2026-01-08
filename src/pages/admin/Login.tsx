import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { AlertCircle, Lock, User } from "lucide-react";
import logo from "../../assets/logo.svg";

const API_BASE_URL = (import.meta.env.VITE_API_URL?.replace(/\/$/, "")) || "/api";

type LoginResponse = {
  success: boolean;
  token: string;
  user: {
    id: string;
    username: string;
    email?: string;
    fullName?: string;
    role: string;
    employeeId?: string;
  };
  message?: string;
};

export default function Login() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = (await res.json().catch(() => null)) as LoginResponse | null;
      if (!res.ok || !data?.success) throw new Error(data?.message || "فشل تسجيل الدخول");

      localStorage.setItem("token", data.token);
      localStorage.setItem("authToken", data.token);
      localStorage.setItem("role", data.user.role);
      localStorage.setItem("user", JSON.stringify(data.user));

      navigate("/admin");
    } catch (e: any) {
      setError(e?.message || "فشل تسجيل الدخول");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div dir="rtl" className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-green-600 via-green-700 to-green-800">
      <Card className="w-full max-w-md overflow-hidden border-white/25 bg-white/90 backdrop-blur shadow-2xl">
        <div className="h-2 bg-gradient-to-r from-green-600 via-green-700 to-green-800" />

        <CardHeader className="flex flex-col items-center">
          <img src={logo} alt="Syrian Insurance Federation" className="w-24 h-24 mb-4" />
          <CardTitle className="text-center text-2xl font-extrabold text-slate-900">
            تسجيل دخول الأدمن
          </CardTitle>
          <p className="text-center text-sm text-slate-600 mt-1">
            أدخل اسم المستخدم وكلمة المرور
          </p>
        </CardHeader>

        <CardContent className="space-y-4">
          {error && (
            <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">
              <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="username">اسم المستخدم</Label>
            <div className="relative">
              <User className="absolute right-3 top-3 h-4 w-4 text-slate-400" />
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                disabled={loading}
                className="pr-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">كلمة المرور</Label>
            <div className="relative">
              <Lock className="absolute right-3 top-3 h-4 w-4 text-slate-400" />
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                disabled={loading}
                className="pr-10"
              />
            </div>
          </div>

          <Button
            onClick={handleLogin}
            disabled={loading}
            className="w-full bg-gradient-to-r from-green-600 via-green-700 to-green-800 hover:opacity-95"
          >
            {loading ? "جاري تسجيل الدخول..." : "دخول"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
