import { readFileSync } from "node:fs";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// versao exibida no rodape: a do package.json
const { version } = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf-8"));

export default defineConfig({
  plugins: [react()],
  define: { __VERSAO__: JSON.stringify(version) },
  server: { proxy: { "/api": "http://localhost:8000" } },
});
