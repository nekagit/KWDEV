const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Tauri bundles from ../out; enable static export only when building for Tauri.
  ...(process.env.TAURI_BUILD === '1' && {
    output: 'export',
    images: { unoptimized: true },
  }),
  webpack: (config, { webpack }) => {
    config.plugins.push(
      new webpack.NormalModuleReplacementPlugin(
        /@tauri-apps\/api\/core/,
        (resource) => {
          if (process.env.NEXT_PUBLIC_IS_TAURI !== 'true') {
            resource.request = path.resolve(__dirname, './src/lib/noop-tauri-api');
          }
        },
      ),
      new webpack.NormalModuleReplacementPlugin(
        /@tauri-apps\/api\/event/,
        (resource) => {
          if (process.env.NEXT_PUBLIC_IS_TAURI !== 'true') {
            resource.request = path.resolve(__dirname, './src/lib/noop-tauri-api');
          }
        },
      ),
      new webpack.NormalModuleReplacementPlugin(
        /@tauri-apps\/api\/dialog/,
        (resource) => {
          if (process.env.NEXT_PUBLIC_IS_TAURI !== 'true') {
            resource.request = path.resolve(__dirname, './src/lib/noop-tauri-api');
          }
        },
      ),
      new webpack.NormalModuleReplacementPlugin(
        /@tauri-apps\/api\/tauri/,
        (resource) => {
          if (process.env.NEXT_PUBLIC_IS_TAURI !== 'true') {
            resource.request = path.resolve(__dirname, './src/lib/noop-tauri-api');
          }
        },
      ),
    );
    return config;
  },
};

module.exports = nextConfig;
