import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { visualizer } from 'rollup-plugin-visualizer';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // Bundle 分析器，仅在需要时启用
    process.env.ANALYZE && visualizer({
      filename: 'dist/stats.html',
      open: true,
      gzipSize: true,
      brotliSize: true,
    }),
  ].filter(Boolean),
  base: './', // 确保资源路径正确
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    minify: 'terser', // 使用 terser 进行更好的压缩
    terserOptions: {
      compress: {
        drop_console: true, // 移除 console.log
        drop_debugger: true, // 移除 debugger
        pure_funcs: ['console.log', 'console.info', 'console.debug'], // 移除指定函数
        passes: 2, // 多次压缩以获得更好效果
      },
      mangle: {
        safari10: true, // 兼容 Safari 10
      },
      format: {
        comments: false, // 移除注释
      },
    },
    rollupOptions: {
      input: path.resolve(__dirname, 'index.html'),
      output: {
        // 优化的代码分割策略
        manualChunks: (id) => {
          // React 相关
          if (id.includes('react') || id.includes('react-dom')) {
            return 'react-vendor';
          }
          // Supabase
          if (id.includes('@supabase')) {
            return 'supabase';
          }
          // 图标库
          if (id.includes('lucide-react')) {
            return 'icons';
          }
          // 工具库
          if (id.includes('archiver') || id.includes('node-stream-zip')) {
            return 'utils';
          }
          // 其他 node_modules
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        },
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.');
          const ext = info[info.length - 1];
          if (/\.(png|jpe?g|gif|svg|webp|ico)$/i.test(assetInfo.name)) {
            return `assets/images/[name]-[hash].${ext}`;
          }
          if (/\.(css)$/i.test(assetInfo.name)) {
            return `assets/css/[name]-[hash].${ext}`;
          }
          return `assets/[name]-[hash].${ext}`;
        },
      },
      // 外部化不需要打包的依赖
      external: [],
      // Rollup 优化选项
      treeshake: {
        moduleSideEffects: false,
        propertyReadSideEffects: false,
        tryCatchDeoptimization: false,
      },
    },
    // 启用压缩报告和优化选项
    reportCompressedSize: true,
    chunkSizeWarningLimit: 800, // 降低警告阈值
    cssCodeSplit: true, // CSS 代码分割
    sourcemap: false, // 生产环境不生成 sourcemap
    // 启用实验性优化
    target: 'esnext',
    modulePreload: {
      polyfill: false, // 禁用 modulePreload polyfill
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  // 生产环境优化
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
});
