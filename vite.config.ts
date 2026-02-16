import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  define: {
    'import.meta.env.VITE_SUPABASE_URL': JSON.stringify('https://ktfkuidoulxogiscwnws.supabase.co'),
    'import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY': JSON.stringify('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0Zmt1aWRvdWx4b2dpc2N3bndzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyNzYwMTUsImV4cCI6MjA4Njg1MjAxNX0.Fmv1UllFQbrjJYgCG4ud8Tf5PWfexU9QD68ITkD4p3w'),
  },
}));
