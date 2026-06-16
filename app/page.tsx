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
      <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-12 max-w-6xl mx-auto animate-pulse" dir="rtl">
        <div className="h-12 bg-slate-900 rounded-2xl w-64 mb-12"></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="bg-slate-900/40 h-72 rounded-3xl border border-slate-900"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-12 font-sans" dir="rtl">
      <div className="max-w-6xl mx-auto flex flex-col min-h-[calc(100vh-6rem)]">
        
        <header className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-12 border-b border-slate-900 pb-6">
          <h1 className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-500">
            آرشیو و کاتالوگ بازی‌های من
          </h1>
        </header>

        <main className="flex-1">
          {games.length === 0 ? (
            <div className="text-center py-24 bg-slate-900/20 rounded-3xl border border-slate-900 border-dashed">
              <p className="text-slate-500 mb-2">هنوز هیچ بازی به آرشیو اضافه نشده است.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {games.map((game) => (
                <Link 
                  href={`/game/${game.id}`} 
                  key={game.id}
                  className="bg-slate-900/30 border border-slate-900 rounded-3xl overflow-hidden shadow-lg flex flex-col justify-between group hover:border-purple-500/40 hover:shadow-purple-950/10 transition duration-300 backdrop-blur-sm"
                >
                  <div className="relative aspect-video w-full bg-slate-950 overflow-hidden">
                    {game.background_image ? (
                      <img 
                        src={getBypassUrl(game.background_image)} 
                        alt={game.name} 
                        className="object-cover w-full h-full group-hover:scale-105 transition duration-500" 
                        referrerPolicy="no-referrer"
                        loading="lazy" 
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-600 text-xs">بدون تصویر</div>
                    )}
                  </div>
                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="font-bold text-white text-base line-clamp-1 mb-2 group-hover:text-purple-400 transition" title={game.name}>
                        {game.name}
                      </h3>
                      <div className="flex justify-between items-center text-xs text-slate-500 mb-3">
                        <span>📅 {game.released ? game.released.split('-')[0] : '---'}</span>
                        <span className="text-amber-400 font-bold">★ {game.rating ? game.rating.toFixed(1) : '0'}</span>
                      </div>
                    </div>
                    <div className="w-full py-2 bg-slate-950/50 group-hover:bg-purple-600 text-slate-400 group-hover:text-white font-bold rounded-xl border border-slate-800 group-hover:border-purple-500 text-center transition text-xs">
                      🎮 مشاهده جزئیات بیشتر
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </main>

        <footer className="mt-20 pt-6 border-t border-slate-900 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-slate-500">
          <p>تمامی حقوق برای آرشیو بازی‌ها محفوظ است © ۲۰۲۶</p>
          <p className="flex items-center gap-1">
            قدرت‌گرفته و توسعه‌یافته با 💜 توسط 
            <a 
              href="https://gemini.google.com" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-purple-400 hover:text-purple-300 font-bold underline decoration-purple-500/30 underline-offset-4 transition mr-1"
            >
              Gemini
            </a>
          </p>
        </footer>

      </div>
    </div>
  );
}
