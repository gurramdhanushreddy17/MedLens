if (!process.env.NEXTAUTH_URL) {
  process.env.NEXTAUTH_URL = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "https://medlens-lovat.vercel.app";
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["pdf-parse", "tesseract.js", "@prisma/client", "tailwind-merge", "clsx"],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = [
        ...(Array.isArray(config.externals) ? config.externals : [config.externals ?? []].flat()),
        "canvas",
        "sharp",
      ];
    }
    return config;
  },
};

export default nextConfig;
