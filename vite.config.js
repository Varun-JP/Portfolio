import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from "path";
// https://vite.dev/config/
export default defineConfig({
  plugins: [react(),tailwindcss()],
  resolve:{
    alias:{
      "@":path.resolve(__dirname,"./src"),  //this is used to directly access the src folder using a single @ instead of repeating the whole path
    },
  },
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