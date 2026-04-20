import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from "path";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),  //this is used to directly access the src folder using a single @ instead of repeating the whole path
    },
  },
  build: {
    // Optimize chunks for faster loading
    rollupOptions: {
      output: {
        manualChunks: {
          // Separate Spline into its own chunk for better caching
          spline: ['@splinetool/react-spline'],
          // Group vendor libraries
          vendor: ['react', 'react-dom'],
          // UI components
          ui: ['lucide-react', '@radix-ui/react-toast', 'class-variance-authority', 'clsx', 'tailwind-merge']
        }
      }
    },
    // Enable minification
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.logs in production
        drop_debugger: true
      }
    }
  },
  // Optimize dependencies
  optimizeDeps: {
    include: [
      'react', 
      'react-dom', 
      'lucide-react',
      '@splinetool/react-spline'
    ]
  },
  // Enable HTTP/2 server push simulation
  server: {
    preTransformRequests: false,
  }
});

// -----------------------------
// Recommended npm packages:
// -----------------------------

// lucide-react            → Icon library for React
// react-router-dom         → Client-side routing for React apps
// tailwind-merge           → Merge Tailwind classes and resolve conflicts
// @radix-ui/react-toast    → Toast notifications UI components
// class-variance-authority → Utility for managing Tailwind variants
// clsx                     → Utility for conditionally joining class names