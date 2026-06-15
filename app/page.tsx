'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function Home() {
  const [games, setGames] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api-store')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setGames(data);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching data:', err);
        setLoading(false);
      });
  }, []);

  // پرکسی هوشمند و سریع تصاویر برای صفحه اصلی بدون نیاز به VPN
  const getBypassUrl = (url: string) => {
    if (!url) return '';
    const cleanUrl = url.replace(/^https?:\/\//i, '');
    return `https://images.weserv.nl/?url=${encodeURIComponent(cleanUrl)}&w=500&q=80`;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-12 relative overflow-hidden" dir="rtl">
      
      {/* هاله نور پس‌زمینه برای زیبایی و ظاهر مدرن */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-purple-900/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-pink-900/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="max-w-6xl mx-auto relative z-10">
        
        {/* هدر اصلی سایت با متن‌های اختصاصی و برندینگ AI */}
        <header className="flex flex-col md:flex-row justify-between items-center gap-6 mb-12 border-b border-slate-900 pb-8">
          <div className="text-center md:text-right">
            <h1 className="text-3xl md:text-5xl font-black text-white mb-3 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-500 to-red-400">
              لیست بازی‌ها
            </h1>
            <p className="text-slate-400 text-sm md:text-base font-medium">
              آرشیو جامع مشخصات، تریلرها و گالری تصاویر بازی‌ها
            </p>
          </div>

          {/* بخش اختصاصی Power by AI که در ادیت قبلی حذف شده بود */}
          <div className="flex items-center gap-2.5 bg-slate-900/50 border border-purple-500/30 px-4 py-2 rounded-2xl backdrop-blur-md shadow-lg shadow-purple-950/20">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
            </span>
            <span className="text-xs font-bold text-purple-300 tracking-wide uppercase select-none">
              Powered by AI Technology
            </span>
          </div>
        </header>

        {/* لودینگ اسکلتونی پیش‌فرض سایت */}
        {loading && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div key={n} className="bg-slate-900/40 border border-slate-900 rounded-3xl h-72 animate-pulse p-4 flex flex-col justify-between">
                <div className="w-full h-40 bg-slate-800 rounded-2xl"></div>
                <div className="h-4 bg-slate-800 rounded w-3/4 mt-2"></div>
                <div className="h-3 bg-slate-800 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        )}

        {/* وضعیت خالی بودن دیتابیس با لحن شیک و خنثی */}
        {!loading && games.length === 0 && (
          <div className="text-center py-20 bg-slate-900/20 border border-slate-900/60 rounded-3xl backdrop-blur-md">
            <p className="text-slate-400 font-medium text-lg">در حال حاضر بازی خاصی در این بخش ثبت نشده است.</p>
          </div>
        )}

        {/* رندر کردن لیست بازی‌ها پس از لود موفق از آپستاش */}
        {!loading && games.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {games.map((game) => (
              <Link
                href={`/game/${game.id}`}
                key={game.id}
                className="bg-slate-900/30 border border-slate-900 rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl flex flex-col justify-between group hover:border-purple-500/40 transition duration-300 backdrop-blur-sm"
              >
                <div className="relative aspect-[16/10] w-full bg-slate-950 overflow-hidden">
                  {game.background_image ? (
                    <img
                      src={getBypassUrl(game.background_image)}
                      alt={game.name}
                      className="object-cover w-full h-full group-hover:scale-105 transition duration-500"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-600 text-xs">بدون تصویر</div>
                  )}
                  {game.rating && (
                    <div className="absolute bottom-2 left-2 bg-slate-950/80 backdrop-blur-md px-2 py-0.5 rounded-lg border border-slate-800 text-[11px] font-bold text-amber-400">
                      ★ {game.rating.toFixed(1)}
                    </div>
                  )}
                </div>

                <div className="p-4 flex-1 flex flex-col justify-between bg-gradient-to-b from-transparent to-slate-950/40">
                  <h3 className="font-bold text-white text-sm md:text-base line-clamp-1 group-hover:text-purple-400 transition mb-1" title={game.name}>
                    {game.name}
                  </h3>
                  <div className="flex justify-between items-center text-[11px] text-slate-400 mt-2">
                    <span>{game.released ? game.released.split('-')[0] : 'نامشخص'}</span>
                    <span className="bg-slate-900 px-2 py-0.5 rounded-md border border-slate-800 text-slate-300">مشاهده مشخصات</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
