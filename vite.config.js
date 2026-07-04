import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
// 完全静的（バックエンド無し）。Vercel/Netlify にそのままデプロイできる。
export default defineConfig({
    plugins: [react()],
});
