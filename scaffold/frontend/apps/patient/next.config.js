/** @type {import(`next`).NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Enable polling for file watching on Windows
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

export default nextConfig;
