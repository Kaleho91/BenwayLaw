/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    transpilePackages: ['@maplelaw/shared'],
    experimental: {
        serverActions: true,
    },
};

module.exports = nextConfig;
