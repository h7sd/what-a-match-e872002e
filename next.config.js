/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: [
      'ksejlspyueghbrhgoqtd.supabase.co',
      'cdn.discordapp.com',
      'i.imgur.com',
      'avatars.githubusercontent.com',
    ],
    unoptimized: true,
  },
  // Handle trailing slashes consistently
  trailingSlash: false,
  // Enable experimental features for better performance
  experimental: {
    optimizePackageImports: ['lucide-react', 'framer-motion'],
  },
};

module.exports = nextConfig;
