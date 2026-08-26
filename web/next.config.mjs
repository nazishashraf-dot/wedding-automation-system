/** @type {import('next').NextConfig} */
const nextConfig = {
  // The frontend (Vercel) and API (Railway) are different origins. Routing
  // browser requests through this same-origin path instead of calling the
  // Railway URL directly means the session cookie is first-party from the
  // browser's point of view — no cross-site cookie blocking. This runs at
  // request time on the Next.js server, so API_ORIGIN doesn't need the
  // NEXT_PUBLIC_ prefix.
  async rewrites() {
    const apiOrigin = process.env.API_ORIGIN || "http://localhost:4000";
    return [
      {
        source: "/api/:path*",
        destination: `${apiOrigin}/:path*`,
      },
    ];
  },
};

export default nextConfig;
