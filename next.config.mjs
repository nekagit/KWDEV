import path from "path";
import { fileURLToPath } from "url";
import webpack from "webpack";
import { resolveNextOutput } from "./script/next-output.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const output = resolveNextOutput(process.env);

/** @type {import('next').NextConfig} */
const nextConfig = {
  ...(output ? { output } : {}),
  images: {
    unoptimized: true,
  },
  assetPrefix: undefined,
  serverExternalPackages: ["ssh2"],
  webpack: (config, { isServer }) => {
    config.plugins.push(
      new webpack.NormalModuleReplacementPlugin(
        /@tauri-apps\/api\/core/,
        (resource) => {
          if (process.env.NEXT_PUBLIC_IS_TAURI !== "true") {
            resource.request = path.resolve(__dirname, "./src/lib/noop-tauri-api");
          }
        }
      ),
      new webpack.NormalModuleReplacementPlugin(
        /@tauri-apps\/api\/event/,
        (resource) => {
          if (process.env.NEXT_PUBLIC_IS_TAURI !== "true") {
            resource.request = path.resolve(__dirname, "./src/lib/noop-tauri-api");
          }
        }
      ),
      new webpack.NormalModuleReplacementPlugin(
        /@tauri-apps\/api\/dialog/,
        (resource) => {
          if (process.env.NEXT_PUBLIC_IS_TAURI !== "true") {
            resource.request = path.resolve(__dirname, "./src/lib/noop-tauri-api");
          }
        }
      ),
      new webpack.NormalModuleReplacementPlugin(
        /@tauri-apps\/api\/tauri/,
        (resource) => {
          if (process.env.NEXT_PUBLIC_IS_TAURI !== "true") {
            resource.request = path.resolve(__dirname, "./src/lib/noop-tauri-api");
          }
        }
      )
    );
    if (isServer) {
      config.externals.push("ssh2");
    }
    config.resolve.alias = {
      ...config.resolve.alias,
      sonner: path.resolve(__dirname, "node_modules/sonner"),
    };
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
    if (!isServer) {
      config.output = {
        ...config.output,
        chunkLoadTimeout: 180000,
      };
    }
    return config;
  },
};

export default nextConfig;
