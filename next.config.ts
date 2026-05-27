import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  transpilePackages: ['pdfjs-dist'],
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    serverActions: {
      allowedOrigins: [
        '6000-firebase-studio-1769922627111.cluster-xpmcxs2fjnhg6xvn446ubtgpio.cloudworkstations.dev',
        'localhost:9002',
        'localhost:9003',
      ],
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
