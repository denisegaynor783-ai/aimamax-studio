import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// 静态 SPA 部署到 GitHub Pages / 任意静态托管。
// base: "./" 让资源用相对路径，避免 GitHub Pages 子路径 404。
// 配合 HashRouter，路由不依赖服务端 rewrite，永不白屏。
export default defineConfig({
  base: "./",
  plugins: [react()],
  build: {
    outDir: "dist",
    assetsDir: "assets",
    sourcemap: false,
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom", "react-router-dom"],
          flow: ["@xyflow/react"],
        },
      },
    },
  },
});
