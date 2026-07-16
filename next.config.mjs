/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Keep production verification builds isolated from Turbopack's live dev
  // database so `npm run build` cannot corrupt a running `next dev` process.
  distDir: process.env.NEXT_DIST_DIR || ".next",
};

export default nextConfig;
