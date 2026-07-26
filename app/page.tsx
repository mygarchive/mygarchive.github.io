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
  const [isFooterOpen, setIsFooterOpen] = useState(false);

  // ⚡ کنترل تعداد کارت‌های قابل رندر برای رندر تدریجی
  const [visibleCount, setVisibleCount] = useState<number>(12);

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
      const targetUrl = `https://raw.githubusercontent.com/mygarchive/mygarchive.github.io/main/data/games.json?v=${cacheBuster}`;
      
      let fetchedData = null;

      // 🚀 لایه اول: پروکسی اختصاصی
      try {
        const proxyUrl = `https://rawg-proxy.hossein-hf273.workers.dev/?url=${encodeURIComponent(targetUrl)}`;
        const res = await fetch(proxyUrl, { cache: 'no-store' });
        if (res.ok) fetchedData = await res.json();
      } catch (e) { console.warn("لایه ۱ ناموفق بود."); }

      // 🔄 لایه دوم پشتیبان: پروکسی CodeTabs
      if (!fetchedData) {
        try {
          const res = await fetch(`https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(targetUrl)}`, { cache: 'no-store' });
          if (res.ok) fetchedData = await res.json();
        } catch (e) { console.warn("لایه ۲ ناموفق بود."); }
      }

      // 🔄 لایه سوم پشتیبان: پروکسی Corsproxy
      if (!fetchedData) {
        try {
          const res = await fetch(`https://corsproxy.io/?${encodeURIComponent(targetUrl)}`, { cache: 'no-store' });
          if (res.ok) fetchedData = await res.json();
        } catch (e) { console.warn("لایه ۳ ناموفق بود."); }
      }

      // 🔄 لایه چهارم: درخواست مستقیم
      if (!fetchedData) {
        try {
          const res = await fetch(targetUrl, { cache: 'no-store' });
          if (res.ok) fetchedData = await res.json();
        } catch (e) { console.warn("لایه ۴ ناموفق بود."); }
      }

      if (Array.isArray(fetchedData) && fetchedData.length > 0) {
        data = fetchedData;
      }

      setGames(data);
      setFilteredGames(data);

      const allGenres: string[] = [];
      data.forEach((game: any) => {
        game.genres?.forEach((g: any) => {
          if (g?.name && !allGenres.includes(g.name)) allGenres.push(g.name);
        });
      });
      setGenres(allGenres.sort());
      setLoading(false);
    } catch (err) {
      console.error("خطا در دریافت داده‌ها:", err);
      if (Array.isArray(localGamesData)) {
        setGames(localGamesData);
        setFilteredGames(localGamesData);
      }
      setLoading(false);
    }
  };

  useEffect(() => {
    initData();
  }, []);

  // 📜 اصلاح هوشمند اسکرول بی‌نهایت
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);

      // اگر کاربر به فاصله ۸۰۰ پیکسلی از انتهای صفحه رسید، ۱۲ تای بعدی را لود کن
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 800) {
        setVisibleCount((prev) => {
          if (prev < filteredGames.length) {
            return prev + 12;
          }
          return prev;
        });
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [filteredGames.length]);

  // 🔍 بررسی خودکار: اگر ارتفاع کارت‌ها از ارتفاع مانیتور کمتر بود، کارت‌های بیشتری لود کن تا اسکرول فعال شود
  useEffect(() => {
    if (!loading && filteredGames.length > visibleCount) {
      if (document.documentElement.scrollHeight <= window.innerHeight) {
        setVisibleCount((prev) => prev + 12);
      }
    }
  }, [visibleCount, filteredGames.length, loading]);

  useEffect(() => {
    let result = [...games];

    if (selectedGenre !== 'all') {
      result = result.filter((game) => game.genres?.some((g: any) => g.name === selectedGenre));
    }

    if (searchQuery.trim() !== '') {
      result = result.filter((game) => game.name?.toLowerCase().includes(searchQuery.toLowerCase()));
    }

    if (sortBy === 'alphabetical') {
      result.sort((a, b) => (a.name || "").toLowerCase().localeCompare((b.name || "").toLowerCase()));
    } else if (sortBy === 'released') {
      result.sort((a, b) => {
        const dateA = a.released ? new Date(a.released).getTime() : 0;
        const dateB = b.released ? new Date(b.released).getTime() : 0;
        return dateB - dateA;
      });
    } else if (sortBy === 'rating') {
      result.sort((a, b) => (parseFloat(b.rating) || 0) - (parseFloat(a.rating) || 0));
    }

    setFilteredGames(result);
    setVisibleCount(12);
  }, [selectedGenre, searchQuery, sortBy, games]);

  const getOptimizedUrl = (url: string, width = 400) => {
    if (!url) return '';
    return `https://images.weserv.nl/?url=${encodeURIComponent(url.replace(/^https?:\/\//i, ''))}&w=${width}&q=80`;
  };

  const themeStyles = {
    bg: darkMode ? '#020617' : '#f1f5f9',
    text: darkMode ? '#f1f5f9' : '#1e293b',
    titleText: darkMode ? '#ffffff' : '#0f172a',
    subText: darkMode ? '#94a3b8' : '#475569',
    cardBg: darkMode ? '#0f172a' : 'rgba(255, 255, 255, 0.8)',
    border: darkMode ? '#1e293b' : '#cbd5e1',
    inputBg: darkMode ? '#020617' : 'rgba(255, 255, 255, 0.6)',
    footerBg: darkMode ? '#0f172a' : 'rgba(255, 255, 255, 0.5)'
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

          <div className="flex flex-col sm:flex-row items-center gap-6">
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
              className="w-full p-3 rounded-xl text-sm outline-none text-left font-bold" 
              style={{ backgroundColor: themeStyles.inputBg, border: `1px solid ${themeStyles.border}`, color: themeStyles.titleText }}
              dir="ltr"
            />
          </div>
          
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold whitespace-nowrap" style={{ color: themeStyles.subText }}>👁️ فیلتر سبک:</span>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-4 gap-6">
            {filteredGames.slice(0, visibleCount).map((game) => (
              <a 
                href={`./game?id=${game.id}`} 
                key={game.id} 
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-2xl overflow-hidden flex flex-col justify-between group hover:border-purple-500 transition duration-300 shadow-sm cursor-pointer"
                style={{ backgroundColor: themeStyles.cardBg, border: `1px solid ${themeStyles.border}` }}
              >
                <div className="w-full aspect-video overflow-hidden relative" style={{ backgroundColor: themeStyles.inputBg }}>
                  <img 
                    src={getOptimizedUrl(game.background_image, 400)} 
                    alt={game.name} 
                    loading="lazy"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = `https://rawg-proxy.hossein-hf273.workers.dev/?url=${encodeURIComponent(game.background_image || '')}`;
                    }}
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
              </a>
            ))}
          </div>
        )}

        {/* نمایش راهنمای بارگذاری بازی‌های بیشتر */}
        {visibleCount < filteredGames.length && (
          <div className="text-center py-8 text-xs font-bold" style={{ color: themeStyles.subText }}>
            در حال بارگذاری بازی‌های بیشتر با اسکرول...
          </div>
        )}

      </div>

      <footer className="w-full mt-12 pb-6 flex flex-col items-center max-w-7xl mx-auto">
        <button
          onClick={() => setIsFooterOpen(!isFooterOpen)}
          className="px-5 py-2.5 rounded-full text-xs font-bold shadow-sm transition duration-300 flex items-center gap-2 hover:scale-105 active:scale-95 font-mono"
          style={{ 
            backgroundColor: themeStyles.cardBg, 
            color: themeStyles.text,
            border: `1px solid ${themeStyles.border}` 
          }}
        >
          {isFooterOpen ? '🔼 Close Info' : '🔽 Contact & Disclaimer'}
        </button>

        <div
          className={`w-full mt-4 rounded-2xl overflow-hidden transition-all duration-500 ease-in-out ${
            isFooterOpen ? 'max-h-[600px] opacity-100 p-6 border' : 'max-h-0 opacity-0 p-0 border-none'
          }`}
          style={{ 
            backgroundColor: darkMode ? 'rgba(15, 23, 42, 0.3)' : 'rgba(255, 255, 255, 0.6)', 
            backdropFilter: 'blur(12px)',
            borderColor: themeStyles.border 
          }}
        >
          <div className="flex flex-col md:flex-row justify-between items-center md:items-start gap-8" dir="rtl">
            <div className="flex-1 text-right space-y-4">
              <h4 className="text-xs font-black text-purple-500 mb-1">⚖️ Disclaimer & Source / اطلاعات حقوقی</h4>
              <p className="text-[12px] leading-6" style={{ color: themeStyles.subText }}>
                این وب‌سایت یک آرشیو شخصی برای معرفی بازی‌های ویدیویی است. اطلاعات و تصاویر این آرشیو از منابع شخص ثالث مانند{' '}
                <a 
                  href="https://rawg.io/" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-purple-500 hover:underline font-mono font-bold"
                >
                  RAWG
                </a>{' '}
                به صورت کاملاً خودکار جمع‌آوری و دریافت می‌شوند. تمامی حقوق مربوط به بازی‌ها، تصاویر، لوگوها و علائم تجاری متعلق به سازندگان و ناشران اصلی بازی می‌باشد. 
                در صورت وجود هرگونه درخواست حذف یا اصلاح محتوا، لطفاً از طریق راه‌های ارتباطی سایت اطلاع دهید.
              </p>
              <p className="text-[11px] leading-5 text-left font-mono opacity-75 pt-2 border-t border-dashed" style={{ color: themeStyles.subText, borderColor: themeStyles.border }} dir="ltr">
                This website is a personal archive for video game presentation. All data and media are automatically fetched and collected from third-party platforms like{' '}
                <a href="https://rawg.io/" target="_blank" rel="noopener noreferrer" className="text-purple-500 hover:underline font-bold">RAWG</a>. 
                All rights, logos, and trademarks belong to their respective owners and publishers. 
                For any content removal or correction requests, please reach out via contact links.
              </p>
            </div>

            <div className="flex flex-col items-center md:items-end gap-2 min-w-[150px]">
              <h4 className="text-xs font-black text-purple-500 mb-1 font-mono" dir="ltr">📬 Contact Me</h4>
              <div className="flex gap-3 mt-1">
                <a
                  href=""
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-2 rounded-xl text-xs font-bold font-mono transition hover:bg-sky-500 hover:text-white"
                  style={{ backgroundColor: themeStyles.inputBg, color: themeStyles.text }}
                >
                  Telegram
                </a>
              </div>
            </div>
          </div>
        
          <div 
            className="mt-6 pt-4 text-center text-[10px] tracking-wide font-mono opacity-80"
            style={{ borderTop: `1px dashed ${themeStyles.border}`, color: themeStyles.subText }}
          >
            Developed with <span className="text-purple-500 animate-pulse">💜</span> by{' '}
            <a 
              href="https://gemini.google.com" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-purple-500 font-bold hover:underline"
            >
              Gemini
            </a>
          </div>
        </div>
      </footer>

      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className={`p-3.5 bg-purple-600 hover:bg-purple-500 text-white rounded-full shadow-2xl transition-all duration-300 transform ${
            showScrollTop ? 'opacity-100 scale-100' : 'opacity-0 scale-75 pointer-events-none'
          }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
          </svg>
        </button>
      </div>

    </div>
  );
}
