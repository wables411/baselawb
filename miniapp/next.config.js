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
  }
};

module.exports = nextConfig;

