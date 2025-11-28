import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // better-sqlite3はネイティブモジュールのため、webpackから除外
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push('better-sqlite3');
    }
    return config;
  },
  // サーバーサイドで外部パッケージとして扱う
  serverExternalPackages: ['better-sqlite3'],
  // 画像最適化の設定
  images: {
    // Base64データURLを許可（アバター画像用）
    remotePatterns: [],
    // 画像フォーマットの最適化を有効化（WebP、AVIFなど）
    formats: ['image/avif', 'image/webp'],
    // 画像サイズの制限（必要に応じて調整）
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
};

export default nextConfig;

