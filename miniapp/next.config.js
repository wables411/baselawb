/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Base MiniApp requirements
  headers: async () => {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'ALLOWALL'
          }
        ]
      }
    ];
  },
  webpack: (config, { isServer }) => {
    // Alias @react-native-async-storage/async-storage for web
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        '@react-native-async-storage/async-storage': false,
        'pino-pretty': false,
      };
    }
    return config;
  },
};

module.exports = nextConfig;

