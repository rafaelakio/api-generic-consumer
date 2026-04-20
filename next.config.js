/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    serverComponentsExternalPackages: ['axios'],
  },
  serverRuntimeConfig: {
    AWS_REGION: process.env.AWS_REGION,
    AWS_SECRET_NAME_AZURE: process.env.AWS_SECRET_NAME_AZURE,
    AWS_SECRET_NAME_API_CREDENTIALS: process.env.AWS_SECRET_NAME_API_CREDENTIALS,
    LOCALSTACK_ENDPOINT: process.env.LOCALSTACK_ENDPOINT,
  },
  publicRuntimeConfig: {
    APP_ENV: process.env.APP_ENV ?? 'development',
  },
};

module.exports = nextConfig;
