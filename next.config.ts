import type { NextConfig } from "next";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const nextConfig: NextConfig = {
  images: {
    domains: ["assets.aceternity.com", "avatars.githubusercontent.com"],
  },
  webpack: (config) => {
    // Fix @splinetool/react-spline exports field not resolving with webpack
    config.resolve.alias = {
      ...config.resolve.alias,
      "@splinetool/react-spline/next": resolve(
        __dirname,
        "node_modules/@splinetool/react-spline/dist/react-spline-next.js"
      ),
      "@splinetool/react-spline": resolve(
        __dirname,
        "node_modules/@splinetool/react-spline/dist/react-spline.js"
      ),
    };
    return config;
  },
};

export default nextConfig;
