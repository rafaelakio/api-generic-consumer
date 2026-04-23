// Normalize Windows drive letter to uppercase before webpack reads any path.
// Prevents PackFileCacheStrategy mismatches caused by casing differences
// between the current shell (c:\...) and the stored cache (C:\...).
if (process.platform === 'win32') {
  const cwd = process.cwd();
  const normalized = cwd[0].toUpperCase() + cwd.slice(1);
  if (cwd !== normalized) process.chdir(normalized);
}

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
