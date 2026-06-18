/* eslint-disable @next/next/no-img-element */
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import localGamesData from '../data/games.json';

export default function Home() {
  const [games, setGames] = useState<any[]>([]);
  const [filteredGames, setFilteredGames] = useState<any[]>([]);
  const [genres, setGenres] = useState<string[]>([]);
  const [selectedGenre, setSelectedGenre] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('alphabetical');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [darkMode, setDarkMode] = useState(true);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
      setDarkMode(false);
    } else {
      setDarkMode(true);
    }
  }, []);

  const toggleTheme = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    localStorage.setItem('theme', newMode ? 'dark' : 'light');
  };

  const initData = async () => {
    try {
      let data: any[] = Array.isArray(localGamesData) ? localGamesData : [];
      const cacheBuster = Date.now();
      
      const directRes = await fetch(`https://raw.githubusercontent.com/mygarchive/mygarchive.github.io/main/data/games.json?v=${cacheBuster}`, {
        cache: 'no-store'
      });
      
      if (directRes.ok) {
        const freshData = await directRes.json();
        if (Array.isArray(freshData) && freshData.length > 0) {
          data = freshData;
        }
      }

      setGames(data);
      setFilteredGames(data);

      const allGenres: string[] = [];
      data.forEach((game: any) => {
        game.genres?.forEach((g: any) => {
          if (!allGenres.includes(g.name)) allGenres.push(g.name);
        });
      });
      setGenres(allGenres.sort());
      setLoading(false);
    } catch (err) {
      console.error("خطا در پردازش هوشمند دیتابیس بازی‌ها:", err);
      if (Array.isArray(localGamesData)) {
        setGames(localGamesData);
        setFilteredGames(localGamesData);
      }
      setLoading(false);
    }
  };

  useEffect(() => {
    initData();
    const handleScroll = () => setShowScrollTop(window.scrollY > 400);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    let result = [...games];

    if (selectedGenre !== 'all') {
      result = result.filter((game) => game.genres?.some((g: any) => g.name === selectedGenre));
    }

    if (searchQuery.trim() !== '') {
      result = result.filter((game) => game.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }

    if (sortBy === 'alphabetical') {
      result.sort((a, b) => {
        if (!a.name) return 1;
        if (!b.name) return -1;
        return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
      });
    } else if (sortBy === 'released') {
      result.sort((a, b) => {
        const dateA = a.released ? new Date(a.released).getTime() : 0;
        const dateB = b.released ? new Date(b.released).getTime() : 0;
        return dateB - dateA;
      });
    } else if (sortBy === 'rating') {
      result.sort((a, b) => {
        const ratingA = a.rating ? parseFloat(a.rating) : 0;
        const ratingB = b.rating ? parseFloat(b.rating) : 0;
        return ratingB - ratingA;
      });
    }

    setFilteredGames(result);
  }, [selectedGenre, searchQuery, sortBy, games]);

  const getOptimizedUrl = (url: string, width = 400) => {
    if (!url) return '';
    return `https://images.weserv.nl/?url=${encodeURIComponent(url.replace(/^https?:\/\//i, ''))}&w=${width}&q=80`;
  };

  const themeStyles = {
    bg: darkMode ? '#020617' : '#f8fafc',
    text: darkMode ? '#f1f5f9' : '#0f172a',
    titleText: darkMode ? '#ffffff' : '#0f172a',
    subText: darkMode ? '#94a3b8' : '#475569',
    cardBg: darkMode ? '#0f172a' : '#ffffff',
    border: darkMode ? '#1e293b' : '#e2e8f0',
    inputBg: darkMode ? '#020617' : '#f1f5f9',
    footerBg: darkMode ? '#0f172a' : '#ffffff'
  };

  if (loading) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center text-sm animate-pulse transition-colors duration-300"
        style={{ backgroundColor: themeStyles.bg, color: themeStyles.subText }}
      >
        در حال بارگذاری آرشیو بازی‌ها...
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen p-6 md:p-12 relative flex flex-col justify-between transition-colors duration-300" 
      dir="rtl"
      style={{ backgroundColor: themeStyles.bg, color: themeStyles.text }}
    >
      <div className="max-w-7xl mx-auto w-full flex-grow">
        
        <header 
          className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8 pb-6"
          style={{ borderBottom: `1px solid ${themeStyles.border}` }}
        >
          <div>
            <h1 className="text-2xl font-black" style={{ color: themeStyles.titleText }}>🎮 آرشیو شخصی بازی‌های من</h1>
            <p className="text-sm font-medium mt-2" style={{ color: themeStyles.subText }}>
              تعداد بازی‌های موجود: <span className="text-base text-purple-600 dark:text-purple-400 font-extrabold">{filteredGames.length}</span> بازی
            </p>
          </div>
          <div className="flex items-center gap-4">
            
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold" style={{ color: themeStyles.subText }}>
                {darkMode ? 'تم تاریک' : 'تم روشن'}
              </span>
              <button
                onClick={toggleTheme}
                className="w-16 h-8 rounded-full p-1 transition-colors duration-300 relative focus:outline-none shadow-inner"
                style={{ backgroundColor: darkMode ? '#334155' : '#cbd5e1' }}
              >
                <div
                  className="w-6 h-6 rounded-full shadow-md flex items-center justify-center text-xs transition-transform duration-300 transform select-none bg-white"
                  style={{ transform: darkMode ? 'translateX(-32px)' : 'translateX(0px)' }}
                >
                  {darkMode ? '🌙' : '☀️'}
                </div>
              </button>
            </div>

            <Link
              href="/admin"
              className="text-xs px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white transition font-bold shadow-lg shadow-purple-600/20"
            >
              ⚙️ مدیریت آرشیو
            </Link>
          </div>
        </header>

        <div 
          className="p-4 rounded-2xl mb-8 flex flex-col lg:flex-row gap-4 shadow-sm"
          style={{ backgroundColor: darkMode ? 'rgba(15, 23, 42, 0.4)' : '#ffffff', border: `1px solid ${themeStyles.border}` }}
        >
          <div className="flex-1">
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="🔍 جستجو در بین بازی‌های آرشیو..." 
              className="w-full p-3 rounded-xl text-sm outline-none text-left" 
              style={{ backgroundColor: themeStyles.inputBg, border: `1px solid ${themeStyles.border}`, color: themeStyles.titleText }}
              dir="ltr"
            />
          </div>
          
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold whitespace-nowrap" style={{ color: themeStyles.subText }}>👁️ فیلتر ژانر:</span>
              <select 
                value={selectedGenre}
                onChange={(e) => setSelectedGenre(e.target.value)}
                className="p-3 rounded-xl text-xs font-bold outline-none cursor-pointer"
                style={{ backgroundColor: themeStyles.inputBg, border: `1px solid ${themeStyles.border}`, color: themeStyles.text }}
              >
                <option value="all">همه سبک‌ها (All)</option>
                {genres.map((genre) => (
                  <option key={genre} value={genre}>{genre}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold whitespace-nowrap" style={{ color: themeStyles.subText }}>↕️ مرتب‌سازی:</span>
              <select 
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="p-3 rounded-xl text-xs font-bold outline-none cursor-pointer"
                style={{ backgroundColor: themeStyles.inputBg, border: `1px solid ${themeStyles.border}`, color: themeStyles.text }}
              >
                <option value="alphabetical">🔤 حروف الفبا (A-Z)</option>
                <option value="released">📅 سال انتشار (جدیدترین)</option>
                <option value="rating">⭐ امتیاز منتقدین (بیشترین)</option>
              </select>
            </div>
          </div>
        </div>

        {filteredGames.length === 0 ? (
          <div className="text-center py-12 text-sm" style={{ color: themeStyles.subText }}>هیچ بازی با مشخصات فیلتر شده یافت نشد.</div>
        ) : (
          /* گرید هوشمند ۵ ستونه اختصاصی برای مانیتورهای بزرگ 2K */
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-6">
            {filteredGames.map((game) => (
              <Link 
                href={`/game?id=${game.id}`} 
                key={game.id} 
                className="rounded-2xl overflow-hidden flex flex-col justify-between group hover:border-purple-500 transition duration-300 shadow-sm"
                style={{ backgroundColor: themeStyles.cardBg, border: `1px solid ${themeStyles.border}` }}
              >
                <div className="w-full h-44 overflow-hidden relative" style={{ backgroundColor: themeStyles.inputBg }}>
                  <img 
                    src={getOptimizedUrl(game.background_image, 400)} 
                    alt={game.name} 
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-500 opacity-95 group-hover:opacity-100" 
                  />
                </div>
                <div className="p-4 flex flex-col justify-between flex-1 space-y-3">
                  <h3 className="font-bold text-sm text-left truncate group-hover:text-purple-500 transition" style={{ color: themeStyles.text }} dir="ltr">
                    {game.name}
                  </h3>
                  
                  <div 
                    className="flex justify-between items-center pt-2.5 text-[11px]"
                    style={{ borderTop: `1px solid ${darkMode ? '#020617' : '#f1f5f9'}`, color: themeStyles.subText }}
                  >
                    <span className="px-2 py-0.5 rounded font-bold text-purple-500 flex items-center gap-0.5" style={{ backgroundColor: themeStyles.inputBg }} dir="ltr">
                      ⭐ {game.rating || '---'}
                    </span>
                    <span className="font-mono">{game.released?.split('-')[0] || '---'}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* بخش پایینی سایت (Footer) همراه با متن حقوقی، امضا و شبکه‌های اجتماعی داینامیک */}
      <footer 
        className="mt-16 p-6 rounded-2xl border text-center space-y-4 max-w-7xl mx-auto w-full"
        style={{ backgroundColor: themeStyles.footerBg, borderColor: themeStyles.border }}
      >
        <p className="text-xs leading-6" style={{ color: themeStyles.subText }}>
          ⚖️ <span className="font-bold">سلب مسئولیت حقوقی:</span> تمامی محتوا، تصاویر و اطلاعات درج شده در این آرشیو صرفاً جهت استفاده شخصی، مستندسازی اطلاعات بازی‌ها و اهداف آموزشی پیاده‌سازی شده است و تمامی حقوق مادی و معنوی بازی‌ها متعلق به سازندگان و ناشران اصلی آن‌ها می‌باشد.
        </p>
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-3 text-xs border-t" style={{ borderColor: darkMode ? '#020617' : '#f1f5f9' }}>
          <div className="flex items-center gap-3">
            <a 
              href="https://t.me/HF273" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="flex items-center gap-1.5 hover:text-blue-500 transition font-bold"
            >
              <svg className="w-4 h-4 fill-current text-sky-400" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-1-.65-.35-1 .22-1.62.15-.15 2.7-2.48 2.75-2.7.01-.03.01-.14-.06-.2-.07-.06-.17-.04-.25-.02-.11.02-1.83 1.16-5.16 3.42-.49.34-.93.51-1.33.5-.44-.01-1.3-.25-1.93-.46-.78-.25-1.4-.39-1.35-.83.03-.23.35-.47.96-.71 3.76-1.64 6.27-2.72 7.54-3.25 3.59-1.48 4.34-1.74 4.83-1.75.11 0 .35.03.5.16.13.11.17.26.18.37z"/>
              </svg>
              کانال تلگرام
            </a>
            <a 
              href="https://bale.ai/invite/HF273" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="flex items-center gap-1.5 hover:text-green-600 transition font-bold"
            >
              <span className="w-4 h-4 rounded-full bg-green-500 text-white flex items-center justify-center font-mono text-[9px]">B</span>
              پیام‌رسان بله
            </a>
          </div>
          <div className="font-mono text-[11px]" style={{ color: themeStyles.subText }}>
            توسعه‌یافته با 💜 و هوش مصنوعی <span className="text-purple-500 font-bold">Gemini</span>
          </div>
        </div>
      </footer>

      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3">
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className={`p-3.5 bg-purple-600 hover:bg-purple-500 text-white rounded-full shadow-2xl transition-all duration-300 transform ${
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
