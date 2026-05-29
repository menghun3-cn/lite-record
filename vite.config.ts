import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  // Tauri 配置
  clearScreen: false,
  server: {
    port: 5173,
    strictPort: true,
    watch: {
      ignored: ['**/src-tauri/**'],
    },
  },
  envPrefix: ['VITE_', 'TAURI_'],
  build: {
    // Tauri 使用 ES2021 或更高版本
    target: process.env.TAURI_PLATFORM === 'windows' ? 'chrome105' : 'safari13',
    // 不压缩以获得更好的调试体验
    minify: !process.env.TAURI_DEBUG ? 'esbuild' : false,
    // 生成 sourcemap
    sourcemap: !!process.env.TAURI_DEBUG,
    // 输出目录
    outDir: 'dist',
  },
})
