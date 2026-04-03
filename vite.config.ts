import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 4000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (
            id.includes("react/") ||
            id.includes("react-dom/") ||
            id.includes("react/jsx-runtime") ||
            id.includes("react-dom/client")
          ) {
            return "react-vendor";
          }
          if (
            id.includes("emoji-picker-react") ||
            id.includes("lucide-react")
          ) {
            return "react-vendor";
          }
          if (id.includes("agora-rtc-react")) return "agora-rtc-react";
          if (id.includes("agora-chat")) return "agora-chat";
          if (id.includes("agora-rtc-sdk-ng")) return "agora-rtc-sdk";
          if (id.includes("agora-extension-virtual-background"))
            return "agora-extensions";
        },
      },
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    include: ["src/**/*.spec.ts", "src/**/*.spec.tsx"],
  },
});
