'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function Home() {
  const [games, setGames] = useState<any[]>([]);
  const [filteredGames, setFilteredGames] = useState<any[]>([]);
  const [genres, setGenres] = useState<string[]>([]);
  const [selectedGenre, setSelectedGenre] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [darkMode, setDarkMode] = useState(true);

  // لود اولیه وضعیت تم از حافظه مرورگر
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
      setDarkMode(false);
      document.documentElement.classList.remove('dark');
    } else {
      setDarkMode(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  // تابع تغییر تم و ذخیره آن برای کل صفحات
  const toggleTheme = () => {
    if (darkMode) {
      setDarkMode(false);
      localStorage.setItem('theme', 'light');
      document.documentElement.classList.remove('dark');
    } else {
      setDarkMode(true);
      localStorage.setItem('theme', 'dark');
      document.documentElement.classList.add('dark');
    }
  };

  const fetchSmartData = async () => {
    try {
      const res = await fetch('https://cdn.statically.io/gh/mygarchive/mygarchive.github.io/main/data/games.json');
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn("CDN اول ناموفق بود...", e);
    }
    try {
      const res = await fetch('https://cdn.jsdelivr.net/gh/mygarchive/mygarchive.github.io@main/data/games.json');
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn("CDN دوم ناموفق بود...", e);
    }
    const directRes = await fetch('https://api.github.com/repos/mygarchive/mygarchive.github.io/contents/data/games.json?v=' + Date.now());
    if (directRes.ok) {
      const repoData = await directRes.json();
      if (repoData && repoData.content) {
        const content = decodeURIComponent(atob(repoData.content).split('').map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
        return JSON.parse(content);
      }
    }
    throw new Error("خطا در فچ دیتا.");
  };

  useEffect(() => {
    fetchSmartData()
      .then((data = []) => {
        const sortedData = data.sort((a: any, b: any) => {
          if (!a.name) return 1;
          if (!b.name) return -1;
          return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
        });
        setGames(sortedData);
        setFilteredGames(sortedData);

        const allGenres: string[] = [];
        sortedData.forEach((game: any) => {
          game.genres?.forEach((g: any) => {
            if (!allGenres.includes(g.name)) allGenres.push(g.name);
          });
        });
        setGenres(allGenres.sort());
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });

    const handleScroll = () => setShowScrollTop(window.scrollY > 400);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    let result = games;
    if (selectedGenre !== 'all') {
      result = result.filter((game) => game.genres?.some((g: any) => g.name === selectedGenre));
    }
    if (searchQuery.trim() !== '') {
      result = result.filter((game) => game.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    setFilteredGames(result);
  }, [selectedGenre, searchQuery, games]);

  const getOptimizedUrl = (url: string, width = 400) => {
    if (!url) return '';
    return `https://images.weserv.nl/?url=${encodeURIComponent(url.replace(/^https?:\/\//i, ''))}&w=${width}&q=80`;
  };

  if (loading) return <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center text-sm animate-pulse text-slate-500 dark:text-slate-400">در حال بارگذاری آرشیو بازی‌ها...</div>;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 p-6 md:p-12 relative transition-colors duration-300" dir="rtl">
      <div className="max-w-6xl mx-auto">
        
        <header className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8 border-b border-slate-200 dark:border-slate-900 pb-6">
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">🎮 آرشیو شخصی بازی‌های من</h1>
            <p className="text-xl font-black text-slate-700 dark:text-slate-200 mt-3">
              تعداد بازی‌های موجود: <span className="text-2xl text-purple-600 dark:text-purple-400 font-extrabold">{games.length}</span> بازی
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* دکمه انتقال یافته روز و شب به بالای سایت قرینه با استایل درخواستی */}
            <button
              onClick={toggleTheme}
              className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold shadow-sm transition hover:scale-105 active:scale-95 text-slate-800 dark:text-white flex items-center gap-1.5"
              title={darkMode ? "فعال‌سازی حالت روز" : "فعال‌سازی حالت شب"}
            >
              {darkMode ? '☀️ حالت روز' : '🌙 حالت شب'}
            </button>

            <a href="https://t.me/HF273" target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 px-4 py-2 rounded-xl transition hover:bg-blue-200 dark:hover:bg-blue-900/30">
              ✈️ کانال تلگرام: HF273
            </a>
          </div>
        </header>

        <div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-900 p-4 rounded-2xl mb-8 flex flex-col md:flex-row gap-4 shadow-sm dark:shadow-none">
          <div className="flex-1">
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="🔍 جستجو در بین بازی‌های آرشیو..." 
              className="w-full p-3 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm outline-none text-slate-900 dark:text-white text-left" 
              dir="ltr"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 whitespace-nowrap">👁️ فیلتر ژانر:</span>
            <select 
              value={selectedGenre}
              onChange={(e) => setSelectedGenre(e.target.value)}
              className="p-3 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 outline-none cursor-pointer"
            >
              <option value="all">همه سبک‌ها (All)</option>
              {genres.map((genre) => (
                <option key={genre} value={genre}>{genre}</option>
              ))}
            </select>
          </div>
        </div>

        {filteredGames.length === 0 ? (
          <div className="text-center py-12 text-sm text-slate-400 dark:text-slate-500">هیچ بازی با مشخصات فیلتر شده یافت نشد.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredGames.map((game) => (
              <Link 
                href={`/game?id=${game.id}`} 
                key={game.id} 
                className="bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-900 rounded-2xl overflow-hidden flex flex-col justify-between group hover:border-purple-500 dark:hover:border-purple-600/50 transition duration-300 shadow-sm dark:shadow-md"
              >
                <div className="w-full h-44 overflow-hidden bg-slate-200 dark:bg-slate-950 relative">
                  <img 
                    src={getOptimizedUrl(game.background_image, 400)} 
                    alt={game.name} 
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-500 opacity-95 group-hover:opacity-100" 
                  />
                </div>
                <div className="p-4 flex flex-col justify-between flex-1 space-y-3">
                  <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200 text-left truncate group-hover:text-purple-600 dark:group-hover:text-purple-400 transition" dir="ltr">
                    {game.name}
                  </h3>
                  <div className="flex justify-between items-center border-t border-slate-100 dark:border-slate-950 pt-2.5 text-[11px] text-slate-500 dark:text-slate-400">
                    <span className="bg-slate-100 dark:bg-slate-950 px-2 py-0.5 rounded text-red-500 dark:text-red-400 font-bold" dir="ltr">{game.esrb_rating || '---'}</span>
                    <span className="font-mono">{game.released?.split('-')[0] || '---'}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

      </div>

      {/* دکمه شناور بازگشت به بالا بدون دکمه تم مکرر */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3">
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className={`p-3.5 bg-purple-600 hover:bg-purple-500 text-white rounded-full shadow-2xl border border-purple-500/30 transition-all duration-300 transform ${
            showScrollTop ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-4 scale-75 pointer-events-none'
          }`}
          title="برگشت به بالای سایت"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
          </svg>
        </button>
      </div>

    </div>
  );
}
