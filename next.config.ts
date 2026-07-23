import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // mupdf is a wasm package — keep it out of the bundler so ingest can load it.
  serverExternalPackages: ["mupdf"],
};

export default nextConfig;
