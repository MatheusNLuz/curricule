import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: process.env.CURRICULE_BUILD_DIR || ".next",
  output: "standalone",
  cacheMaxMemorySize: 8 * 1024 * 1024,
  serverExternalPackages: ["pdf-parse", "puppeteer-core", "@sparticuz/chromium", "docx"],
  outputFileTracingIncludes: { "/api/export": ["./node_modules/@sparticuz/chromium/bin/**/*"] },
  async headers(){return [{source:"/:path*",headers:[{key:"X-Content-Type-Options",value:"nosniff"},{key:"Referrer-Policy",value:"strict-origin-when-cross-origin"},{key:"X-Frame-Options",value:"SAMEORIGIN"}]}];},
};

export default nextConfig;
