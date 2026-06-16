'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function Home() {
  const [games, setGames] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // خواندن مستقیم از فایل محلی پروژه
    fetch('/data/games.json', { 'cache': 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        setGames(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch((err) => {
        console.error('خطا در بارگذاری بازی‌های صفحه اصلی:', err);
        setLoading(false);
      });
  }, []);

  const getBypassUrl = (url: string) => {
    if (!url) return '';
    const cleanUrl = url.replace(/^https?:\/\//i, '');
    return `https://images.weserv.nl/?url=${encodeURIComponent(cleanUrl)}&w=500&q=80&output=jpg`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white font-bold animate-pulse">
        در حال بارگذاری آرشیو بازی‌ها...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-12" dir="rtl">
      <div className="max-w-6xl mx-auto">
        <header className="flex justify-between items-center mb-12 border-b border-slate-900 pb-6">
          <h1 className="text-2xl md:text-3xl font-black text-white">🎮 آرشیو شخصی بازی‌های من</h1>
          <Link href="/admin" className="px-4 py-2 bg-purple-600/20 hover:bg-purple-600 border border-purple-500/30 text-purple-300 hover:text-white rounded-xl transition text-sm font-bold">
            ⚙️ ورود به پنل
          </Link>
        </header>

        {games.length === 0 ? (
          <p className="text-center text-slate-500 py-12">هیچ بازی‌ای در آرشیو یافت نشد. از پنل مدیریت بازی اضافه کنید.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {games.map((game) => (
              <Link href={`/game/${game.id}`} key={game.id} className="bg-slate-900/40 border border-slate-900/80 rounded-2xl overflow-hidden hover:border-purple-500/40 transition duration-300 flex flex-col justify-between group">
                <div className="aspect-video w-full overflow-hidden bg-slate-950">
                  <img src={getBypassUrl(game.background_image)} alt={game.name} className="object-cover w-full h-full group-hover:scale-105 transition duration-500" />
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-white text-sm line-clamp-1 mb-1">{game.name}</h3>
                  <p className="text-xs text-slate-500">امتیاز: ★ {game.rating?.toFixed(1) || '0'}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
