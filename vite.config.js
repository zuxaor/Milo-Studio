import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/Milo-Studio/",
  plugins: [react()],
  build: {
    outDir: "dist",
    emptyOutDir: true
  }
});
