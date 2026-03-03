import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const devOrigin = "http://127.0.0.1:4000";
// Static export only for production build (Tauri uses ../out). Dev server needs full Next so API routes work.
const nextConfig = {
  ...(process.env.NODE_ENV === "production" && { output: "export" }),
  images: {
    unoptimized: true,
  },
  // Only use assetPrefix when running via Tauri dev (TAURI_DEV=1). In browser, relative URLs work and avoid Next.js 15 assetPrefix CSS issues.
  assetPrefix: process.env.NODE_ENV === "development" && process.env.TAURI_DEV === "1" ? devOrigin : undefined,
  serverExternalPackages: ["ssh2"],
  // Force resolution of sonner and Next internal loaders from project node_modules
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push("ssh2");
    }
    config.resolve.alias = {
      ...config.resolve.alias,
      sonner: path.resolve(__dirname, "node_modules/sonner"),
    };
    // Fix "Can't resolve 'next-flight-client-entry-loader'" (Next 15.0.3 with ESM config)
    const nextLoadersDir = path.resolve(
      __dirname,
      "node_modules/next/dist/build/webpack/loaders"
    );
    config.resolveLoader = config.resolveLoader || {};
    config.resolveLoader.alias = {
      ...config.resolveLoader.alias,
      "next-flight-client-entry-loader": path.join(
        nextLoadersDir,
        "next-flight-client-entry-loader.js"
      ),
    };
    // Tauri webview can be slower to load chunks; avoid "Loading chunk app/layout failed (timeout)"
    if (!isServer) {
      config.output = {
        ...config.output,
        chunkLoadTimeout: 180000, // 3 minutes (default 120s can be too short in Tauri dev)
      };
    }
    return config;
  },
};

export default nextConfig;
