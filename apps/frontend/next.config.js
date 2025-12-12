/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    transpilePackages: ['@maplelaw/shared'],
    output: 'standalone',
};

module.exports = nextConfig;
