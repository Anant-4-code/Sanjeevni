/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      {
        source: '/records',
        destination: '/vault',
        permanent: true,
      },
      {
        source: '/labs',
        destination: '/vault/lab-reports',
        permanent: true,
      },
      {
        source: '/patient',
        destination: '/dashboard',
        permanent: true,
      },
      {
        source: '/patient/dashboard',
        destination: '/dashboard',
        permanent: true,
      },
      {
        source: '/patient/calendar',
        destination: '/calendar',
        permanent: true,
      },
    ];
  },
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        poll: 300,
        aggregateTimeout: 300,
      };
    }
    return config;
  },
};

module.exports = nextConfig;