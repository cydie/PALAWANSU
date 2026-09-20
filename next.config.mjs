/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['pg', 'bcryptjs'],
  onDemandEntries: {
    maxInactiveAge: 60 * 60 * 1000,
    pagesBufferLength: 20,
  },
  experimental: {
    staleTimes: {
      dynamic: 30,
      static: 180,
    },
    optimizePackageImports: ['bootstrap-icons'],
  },
};

export default nextConfig;
