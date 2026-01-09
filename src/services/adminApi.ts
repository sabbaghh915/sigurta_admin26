// src/services/adminApi.ts
const API_BASE_URL =
  (import.meta.env.VITE_API_URL?.replace(/\/$/, "")) || "https://node.husam.club/api";

const getToken = () => {
  const raw =
    localStorage.getItem("authToken") ||
    localStorage.getItem("token") ||
    localStorage.getItem("accessToken") ||
    sessionStorage.getItem("authToken") ||
    sessionStorage.getItem("token") ||
    sessionStorage.getItem("accessToken");

  if (!raw) return null;

  const s = raw.trim();

  // لو مخزّن كـ JSON مثل {"token":"..."}
  if (s.startsWith("{")) {
    try {
      const obj = JSON.parse(s);
      const t = obj.token || obj.accessToken || obj.authToken;
      if (!t) return null;
      const tt = String(t).trim();
      return tt.startsWith("Bearer ") ? tt.slice(7).trim() : tt;
    } catch {
      // تجاهل
    }
  }

  // لو مخزن بين " "
  const noQuotes = s.replace(/^"+|"+$/g, "");

  // لو مخزن مع Bearer
  return noQuotes.startsWith("Bearer ") ? noQuotes.slice(7).trim() : noQuotes;
};


const unwrapArray = (res: any) => {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.items)) return res.items;
  if (Array.isArray(res?.users)) return res.users;
  if (Array.isArray(res?.vehicles)) return res.vehicles;
  if (Array.isArray(res?.payments)) return res.payments;
  if (Array.isArray(res?.centers)) return res.centers; // ✅ مهم للمراكز
  return res; // useful for create/update responses
};

const apiFetch = async (path: string, options: RequestInit = {}) => {
  const token = getToken();

  const url = `${API_BASE_URL}${path.startsWith("/") ? path : "/" + path}`;

  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);

  // GET يرجع Array عادة
 const wantRaw = (options.headers as any)?.["x-raw"] === "1";

  if ((!options.method || options.method === "GET") && !wantRaw) return unwrapArray(data);
  return data;
};

export const adminApi = {
  // Vehicles
  getSyrianVehicles: () => apiFetch("/vehicles?vehicleType=syrian"),
  getForeignVehicles: () => apiFetch("/vehicles?vehicleType=foreign"),

  // Payments
  getPayments: () => apiFetch("/payments?populate=1"),

  // Users
  getUsers: () => apiFetch("/admin/users"),
  createUser: (form: any) =>
    apiFetch("/admin/users", { method: "POST", body: JSON.stringify(form) }),
  deleteUser: (id: string) => apiFetch(`/admin/users/${id}`, { method: "DELETE" }),

  // ✅ Centers (بدون axios + مع توكن)
getCenters: (params?: { page?: number; limit?: number; q?: string }) => {
  const qs = new URLSearchParams();

  if (params?.page) qs.set("page", String(params.page));
  if (params?.limit) qs.set("limit", String(params.limit));
  if (params?.q) qs.set("q", params.q);

  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return apiFetch(`/admin/centers${suffix}`);
},
createCenter: (payload: any) =>
  apiFetch("/admin/centers", { method: "POST", body: JSON.stringify(payload) }),
updateCenter: (id: string, payload: any) =>
  apiFetch(`/admin/centers/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
deleteCenter: (id: string) =>
  apiFetch(`/admin/centers/${id}`, { method: "DELETE" }),


  // Finance
getFinanceByCenter: (from?: string, to?: string, centerId?: string) => {
  const qs = new URLSearchParams();
  if (from) qs.set("from", from);
  if (to) qs.set("to", to);
  if (centerId) qs.set("centerId", centerId);
  return apiFetch(`/admin/finance/centers?${qs.toString()}`, { headers: { "x-raw": "1" } as any });
},

rebuildFinanceByCenter: (payload: { from: string; to: string }) =>
  apiFetch("/admin/finance/centers/rebuild", { method: "POST", body: JSON.stringify(payload) }),



getSavedFinanceByCenter: (from?: string, to?: string) =>
  apiFetch(`/admin/finance/centers/saved?from=${from || ""}&to=${to || ""}`),

// Insurance Companies
getInsuranceCompanies: () => apiFetch("/admin/insurance-companies"),
createInsuranceCompany: (payload: any) =>
  apiFetch("/admin/insurance-companies", { method: "POST", body: JSON.stringify(payload) }),
updateInsuranceCompany: (id: string, payload: any) =>
  apiFetch(`/admin/insurance-companies/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
deleteInsuranceCompany: (id: string) =>
  apiFetch(`/admin/insurance-companies/${id}`, { method: "DELETE" }),

getInsuranceCompaniesStats: (from?: string, to?: string) =>
  apiFetch(`/admin/insurance-companies/stats?from=${from || ""}&to=${to || ""}`, { headers: { "x-raw": "1" } as any }),

getInsuranceCompanyPayments: (id: string, from?: string, to?: string, page = 1, limit = 50) =>
  apiFetch(
    `/admin/insurance-companies/${id}/payments?from=${from || ""}&to=${to || ""}&page=${page}&limit=${limit}`,
    { headers: { "x-raw": "1" } as any }
  ),
// Finance breakdown by center
getFinanceBreakdownByCenter: (from: string, to: string, centerId?: string) =>
  apiFetch(
    `/admin/finance/breakdown?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}${
      centerId ? `&centerId=${encodeURIComponent(centerId)}` : ""
    }`,
    { headers: { "x-raw": "1" } }
  ),

// Finance distribution by insurance company
getFinanceDistributionByCompany: (from: string, to: string, centerId?: string) =>
  apiFetch(
    `/admin/finance/distribution?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}${
      centerId ? `&centerId=${encodeURIComponent(centerId)}` : ""
    }`,
    { headers: { "x-raw": "1" } }
  ),

getAssistantAdmins: () => apiFetch("/admin/assistant-admins"),
createAssistantAdmin: (payload: any) =>
  apiFetch("/admin/assistant-admins", { method: "POST", body: JSON.stringify(payload) }),
updateAssistantAdmin: (id: string, payload: any) =>
  apiFetch(`/admin/assistant-admins/${id}`, { method: "PUT", body: JSON.stringify(payload) }),

getPricing: () => apiFetch("/admin/pricing"),
  updatePricing: (payload: any) => apiFetch("/admin/pricing", { method: "PUT", body: JSON.stringify(payload) }),
  resetPricing: () => apiFetch("/admin/pricing/reset", { method: "POST" }),
  patchPricingItem: (payload: { scope: "internal" | "border"; key: string; value: number; meta?: { label?: string; group?: string; duration?: string };  }) =>
    apiFetch("/admin/pricing/item", { method: "PATCH", body: JSON.stringify(payload) }),
deletePricingItem: (scope: "internal" | "border", key: string) =>
    apiFetch("/admin/pricing/item", { method: "DELETE", body: JSON.stringify({ scope, key }) }),

};
