import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
   plugins: [react(), tailwindcss()],

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },

  server: {
    port: 5173, // اختياري: للتأكيد على البورت
    open: true, // اختياري: يفتح المتصفح تلقائياً

    proxy: {
      // كل الطلبات التي تبدأ بـ /api تُحوّل إلى الباك إند
      "/api": {
        target: "http://localhost:3000", // → غيّر هذا إذا كان الباك إند على بورت مختلف (مثل 5000 أو 8000)
        changeOrigin: true,
        secure: false, // مهم إذا كان الباك إند بدون HTTPS
        //rewrite: (path) => path.replace(/^\/api/, ""), // اختياري: إذا كان الباك إند لا يتوقع /api في البداية
      },
    },
  },
});