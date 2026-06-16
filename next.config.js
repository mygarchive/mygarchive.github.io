/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  basePath: '/mygarchive',     // ✅ این خط باعث میشه گیت‌هاب مسیر استایل‌ها رو درست پیدا کنه
  assetPrefix: '/mygarchive',  // ✅ این خط هم برای لود شدن درست فونت‌ها و فایل‌های سی‌اس‌اس هست
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
