'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function Home() {
  const [games, setGames] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetch('/api-store')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          // 🌟 مرتب‌سازی حروف الفبایی و عددی (A-Z) به صورت محلی روی لیست بازی‌ها
          const sortedGames = data.sort((a, b) => 
            a.name.localeCompare(b.name, 'en', { numeric: true, sensitivity: 'base' })
          );
          setGames(sortedGames);
        }
        setLoading(false)
      })
      .catch((err) => {
        console.error('Error fetching games:', err);
        setLoading(false);
      });
  }, []);

  const getBypassUrl = (url: string) => {
    if (!url) return '';
    const cleanUrl = url.replace(/^https?:\/\//i, '');
    return `https://images.weserv.nl/?url=${encodeURIComponent(cleanUrl)}&w=500&q=80`;
  };

  // فیلتر کردن بازی‌ها بر اساس جستجوی کاربر
  const filteredGames = games.filter(game =>
    game.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 p-6 md:p-12 text-center text-slate-400" dir="rtl">
        <div className="max-w-6xl mx-auto animate-pulse">
          <div className="h-12 bg-slate-900 rounded-2xl w-64 mx-auto mb-12"></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="bg-slate-900/50 h-80 rounded-2xl border border-slate-900"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between" dir="rtl">
      
      <div className="max-w-6xl mx-auto p-6 md:p-12 w-full flex-grow">
        <header className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-black bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-blue-400 mb-4">
            آرشیو بازی‌های پیشرفته
          </h1>
          <p className="text-slate-400 text-sm md:text-base max-w-md mx-auto">
            مجموعه کامل مشخصات، تریلرها و سیستم مورد نیاز بازی‌های ویدیویی به ترتیب حروف الفبا
          </p>
          
          {/* باکس جستجو */}
          <div className="max-w-md mx-auto mt-8">
            <input 
              type="text" 
              placeholder="🔍 جستجو در بین بازی‌ها..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-900/80 border border-slate-800 text-white placeholder-slate-500 px-5 py-3 rounded-2xl focus:outline-none focus:border-purple-500 transition text-sm text-center"
            />
          </div>
        </header>

        {filteredGames.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredGames.map((game) => (
              <Link 
                href={`/game/${game.id}`} 
                key={game.id}
                className="group bg-slate-900/30 border border-slate-900 hover:border-purple-500/40 rounded-2xl overflow-hidden transition-all duration-300 flex flex-col justify-between backdrop-blur-sm hover:shadow-xl hover:shadow-purple-950/10"
              >
                <div className="relative aspect-[16/10] bg-slate-950 overflow-hidden">
                  {game.background_image ? (
                    <img 
                      src={getBypassUrl(game.background_image)} 
                      alt={game.name}
                      className="w-full h-full object-cover transition duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-700 text-xs">بدون تصویر</div>
                  )}
                  <div className="absolute top-3 left-3 bg-slate-950/80 text-amber-400 text-xs px-2.5 py-1 rounded-lg font-bold border border-slate-800 backdrop-blur">
                    ★ {game.rating ? game.rating.toFixed(1) : '0'}
                  </div>
                </div>

                <div className="p-4 flex-grow flex flex-col justify-between">
                  <h3 className="font-bold text-slate-200 group-hover:text-white transition duration-200 text-sm line-clamp-1 mb-2 text-right">
                    {game.name}
                  </h3>
                  <div className="flex justify-between items-center text-[11px] text-slate-500 mt-2 border-t border-slate-900 pt-2" dir="ltr">
                    <span>{game.released || '---'}</span>
                    <span className="text-purple-400 font-medium">مشاهده جزئیات ➔</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-slate-500 text-sm">بازی مورد نظری یافت نشد.</div>
        )}

        {/* 📞 بخش جدید تماس با ما اختصاصی در صفحه اصلی */}
        <section className="mt-20 max-w-md mx-auto bg-slate-900/20 border border-slate-900 rounded-2xl p-6 text-center backdrop-blur-sm">
          <h4 className="text-base font-bold text-slate-200 mb-2">📞 ارتباط با ما</h4>
          <p className="text-xs text-slate-500 mb-4">سوال یا پیشنهادی دارید؟ از طریق تلگرام با پشتیبانی در ارتباط باشید.</p>
          <a 
            href="https://t.me/HF273" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-slate-900 border border-slate-800 hover:border-blue-500/40 hover:bg-slate-950 text-slate-300 hover:text-white px-4 py-2.5 rounded-xl text-xs font-bold transition mx-auto"
          >
            ✈️ پیام در تلگرام (@HF273)
          </a>
        </section>
      </div>

      {/* 🌟 فوتر استاندارد، وسط‌چین شده به همراه لینک اختصاصی شما */}
      <footer className="w-full border-t border-slate-900 bg-slate-950 py-6 text-center text-xs text-slate-500 mt-12 z-10 relative">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-center gap-2">
          <span>قدرت گرفته از هوش مصنوعی</span>
          <span className="hidden sm:inline text-slate-700">|</span>
          <a 
            href="https://t.me/HF273" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-purple-400 hover:text-purple-300 font-semibold transition hover:underline"
          >
            توسعه داده شده توسط Hossein
          </a>
        </div>
      </footer>

    </div>
  );
}
