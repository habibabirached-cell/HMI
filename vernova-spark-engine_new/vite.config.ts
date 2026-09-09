// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

const apiPort = process.env.FASTAPI_PORT || process.env.VITE_API_PORT || "8001";
const apiTarget = `http://127.0.0.1:${apiPort}`;

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    server: {
      port: 5173,
      allowedHosts: ["dev.aplus-technology.com"],
      proxy: {
        "/api": {
          target: apiTarget,
          changeOrigin: true,
          configure: (proxy) => {
            proxy.on("error", (err, _req, res) => {
              // Suppress noisy ECONNREFUSED terminal logs when FastAPI is starting up or offline
              if (res && "writeHead" in res && typeof res.writeHead === "function") {
                if (!res.headersSent) {
                  res.writeHead(503, { "Content-Type": "application/json" });
                }
                res.end(
                  JSON.stringify({
                    ok: false,
                    error: "FastAPI backend is offline or starting up",
                    code: "ECONNREFUSED",
                  })
                );
              }
            });
          },
        },
      },
    },
    optimizeDeps: {
      include: ["@react-three/fiber", "@react-three/drei", "three"],
    },
  },
});


