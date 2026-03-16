import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
// Static export only for production build (Tauri uses ../out). Dev server needs full Next so API routes work.
const nextConfig = {
  ...(process.env.NODE_ENV === "production" && { output: "export" }),
  images: {
    unoptimized: true,
  },
  // No assetPrefix in dev: layout.tsx <base href="http://127.0.0.1:4000/"> handles Tauri webview; assetPrefix can break CSS in Next 15.
  assetPrefix: undefined,
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
