import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: '/reparto',
        destination: 'https://reparto-lacrayola.vercel.app',
        permanent: false,
      },
      {
        source: '/reparto/:path*',
        destination: 'https://reparto-lacrayola.vercel.app/:path*',
        permanent: false,
      },
      {
        source: '/entregas',
        destination: 'https://reparto-lacrayola.vercel.app',
        permanent: false,
      },
      {
        source: '/entregas/:path*',
        destination: 'https://reparto-lacrayola.vercel.app/:path*',
        permanent: false,
      },
    ]
  },
};

export default nextConfig;
