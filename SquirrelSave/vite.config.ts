import { jsxLocPlugin } from "@builder.io/vite-plugin-jsx-loc";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig, loadEnv, type PluginOption } from "vite";

const projectRoot = path.resolve(import.meta.dirname);

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, projectRoot, "");
  const appName =
    !env.VITE_APP_NAME || env.VITE_APP_NAME === "PiggyCoach"
      ? "SquirryCoach"
      : env.VITE_APP_NAME;

  const plugins: PluginOption[] = [react(), tailwindcss()];
  if (mode === "development") {
    plugins.push(jsxLocPlugin());
  }

  return {
  plugins,
  define: {
    "import.meta.env.VITE_APP_NAME": JSON.stringify(appName),
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  envDir: projectRoot,
  root: path.resolve(projectRoot, "client"),
  publicDir: path.resolve(import.meta.dirname, "client", "public"),
  optimizeDeps: {
    include: ["@trpc/client", "@trpc/react-query", "@trpc/server"],
  },
  build: {
    outDir: path.resolve(projectRoot, "dist/public"),
    emptyOutDir: true,
    commonjsOptions: {
      include: [/node_modules/],
    },
  },
  ssr: {
    noExternal: ["@trpc/server", "@trpc/client", "@trpc/react-query"],
  },
  server: {
    host: true,
    allowedHosts: ["localhost", "127.0.0.1"],
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
};
});
