/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ["@firecrawl/pdf-inspector"],
  // Local OCR runtime (PDFium, ONNX Runtime, PP-OCRv6 models) provisioned by
  // scripts/fetch-ocr-runtime.sh. Empty unless OCR_BUNDLE_RUNTIME=true at build.
  outputFileTracingIncludes: {
    "/api/parse-transmittal": ["./vendor/ocr/**/*"],
    "/api/transmittal-qa": ["./vendor/ocr/**/*"],
  },
  // Keep production verification builds isolated from Turbopack's live dev
  // database so `npm run build` cannot corrupt a running `next dev` process.
  // Vercel's Next.js adapter requires the framework-standard `.next` output.
  // Local verification builds still use `.next-build` via the npm script so
  // they do not collide with a running `next dev` process.
  distDir:
    process.env.VERCEL === "1"
      ? ".next"
      : process.env.NEXT_DIST_DIR || ".next",
};

export default nextConfig;
