/* eslint-disable @next/next/no-img-element */
'use client';

import { useEffect, useState } from 'react';
import localGamesData from '../data/games.json';

export default function Home() {
  const [games, setGames] = useState<any[]>([]);
  const [filteredGames, setFilteredGames] = useState<any[]>([]);
  const [genres, setGenres] = useState<string[]>([]);

  // 🔍 حالت‌های فیلتر
  const [selectedGenre, setSelectedGenre] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('alphabetical');
  const [searchQuery, setSearchQuery] = useState('');
  const [maxSizeFilter, setMaxSizeFilter] = useState<number>(100);
  const [coopOnly, setCoopOnly] = useState<boolean>(false);
  const [popularOnly, setPopularOnly] = useState<boolean>(false);
  const [systemFilter, setSystemFilter] = useState<string>('all');

  // 🛒 سبد سفارشات
  const [cart, setCart] = useState<any[]>([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // 🎨 تم و نمایش
  const [loading, setLoading] = useState(true);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [isFooterOpen, setIsFooterOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState<number>(12);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    setDarkMode(savedTheme !== 'light');
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

      try {
        const proxyUrl = `https://rawg-proxy.hossein-hf273.workers.dev/?url=${encodeURIComponent(targetUrl)}`;
        const res = await fetch(proxyUrl, { cache: 'no-store' });
        if (res.ok) fetchedData = await res.json();
      } catch (e) { console.warn("لایه ۱ ناموفق بود."); }

      if (!fetchedData) {
        try {
          const res = await fetch(`https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(targetUrl)}`, { cache: 'no-store' });
          if (res.ok) fetchedData = await res.json();
        } catch (e) { console.warn("لایه ۲ ناموفق بود."); }
      }

      if (!fetchedData) {
        try {
          const res = await fetch(`https://corsproxy.io/?${encodeURIComponent(targetUrl)}`, { cache: 'no-store' });
          if (res.ok) fetchedData = await res.json();
        } catch (e) { console.warn("لایه ۳ ناموفق بود."); }
      }

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

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);

      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 800) {
        setVisibleCount((prev) => (prev < filteredGames.length ? prev + 12 : prev));
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [filteredGames.length]);

  // 🎯 اعمال یکپارچه فیلترها
  useEffect(() => {
    let result = [...games];

    if (selectedGenre !== 'all') {
      result = result.filter((game) => game.genres?.some((g: any) => g.name === selectedGenre));
    }

    if (searchQuery.trim() !== '') {
      result = result.filter((game) => game.name?.toLowerCase().includes(searchQuery.toLowerCase()));
    }

    if (maxSizeFilter < 100) {
      result = result.filter((game) => (game.customSizeGB || 0) <= maxSizeFilter);
    }

    if (coopOnly) {
      result = result.filter((game) => !!game.isCoop);
    }

    if (popularOnly) {
      result = result.filter((game) => !!game.isPopular);
    }

    if (systemFilter !== 'all') {
      result = result.filter((game) => game.systemReq === systemFilter);
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
    } else if (sortBy === 'size') {
      result.sort((a, b) => (b.customSizeGB || 0) - (a.customSizeGB || 0));
    }

    setFilteredGames(result);
    setVisibleCount(12);
  }, [selectedGenre, searchQuery, sortBy, maxSizeFilter, coopOnly, popularOnly, systemFilter, games]);

  // 🛒 مدیریت سبد خرید
  const toggleCartItem = (game: any, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (cart.some((item) => item.id === game.id)) {
      setCart(cart.filter((item) => item.id !== game.id));
    } else {
      setCart([...cart, game]);
    }
  };

  const totalCartSize = cart.reduce((acc, item) => acc + (item.customSizeGB || 0), 0);

  const generateOrderText = () => {
    let text = `🎮 لیست سفارش جدید:\n\n`;
    cart.forEach((item, index) => {
      text += `${index + 1}. ${item.name} (${item.customSizeGB || '?'} GB)\n`;
    });
    text += `\n📊 مجموع حجم: ${totalCartSize} GB`;
    return text;
  };

  const copyOrderText = () => {
    navigator.clipboard.writeText(generateOrderText());
    alert('متن سفارش کپی شد!');
  };

  const sendToTelegram = () => {
    const url = `https://t.me/share/url?url=${encodeURIComponent(generateOrderText())}`;
    window.open(url, '_blank');
  };

  const sendToBale = () => {
    const url = `bale://share?text=${encodeURIComponent(generateOrderText())}`;
    window.open(url, '_blank');
  };

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
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm animate-pulse" style={{ backgroundColor: themeStyles.bg, color: themeStyles.subText }}>
        در حال بارگذاری آرشیو بازی‌ها...
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-10 relative flex flex-col justify-between" dir="rtl" style={{ backgroundColor: themeStyles.bg, color: themeStyles.text }}>
      <div className="max-w-7xl mx-auto w-full flex-grow">
        
        {/* هدر */}
        <header className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6 pb-6" style={{ borderBottom: `1px solid ${themeStyles.border}` }}>
          <div>
            <h1 className="text-2xl font-black" style={{ color: themeStyles.titleText }}>🎮 آرشیو شخصی بازی‌های من</h1>
            <p className="text-xs font-medium mt-1" style={{ color: themeStyles.subText }}>
              موجود: <span className="text-purple-500 font-extrabold">{filteredGames.length}</span> بازی
            </p>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsDrawerOpen(true)}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg transition"
            >
              🛒 کشوی سفارشات ({cart.length})
            </button>

            <button
              onClick={toggleTheme}
              className="w-14 h-7 rounded-full p-1 relative shadow-inner transition"
              style={{ backgroundColor: darkMode ? '#334155' : '#cbd5e1' }}
            >
              <div className="w-5 h-5 rounded-full shadow-md flex items-center justify-center text-[10px] bg-white transition-transform" style={{ transform: darkMode ? 'translateX(-28px)' : 'translateX(0)' }}>
                {darkMode ? '🌙' : '☀️'}
              </div>
            </button>
          </div>
        </header>

        {/* پنل فیلترها */}
        <div className="p-4 rounded-2xl mb-8 space-y-4 shadow-sm" style={{ backgroundColor: darkMode ? 'rgba(15, 23, 42, 0.4)' : '#ffffff', border: `1px solid ${themeStyles.border}` }}>
          <div className="flex flex-col lg:flex-row gap-4">
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="🔍 جستجو در نام بازی‌ها..." 
              className="flex-1 p-3 rounded-xl text-xs outline-none font-bold" 
              style={{ backgroundColor: themeStyles.inputBg, border: `1px solid ${themeStyles.border}`, color: themeStyles.titleText }}
              dir="ltr"
            />

            <div className="flex flex-wrap items-center gap-3">
              <select 
                value={selectedGenre}
                onChange={(e) => setSelectedGenre(e.target.value)}
                className="p-3 rounded-xl text-xs font-bold outline-none cursor-pointer"
                style={{ backgroundColor: themeStyles.inputBg, border: `1px solid ${themeStyles.border}`, color: themeStyles.text }}
              >
                <option value="all">همه سبک‌ها</option>
                {genres.map((genre) => (
                  <option key={genre} value={genre}>{genre}</option>
                ))}
              </select>

              <select 
                value={systemFilter}
                onChange={(e) => setSystemFilter(e.target.value)}
                className="p-3 rounded-xl text-xs font-bold outline-none cursor-pointer"
                style={{ backgroundColor: themeStyles.inputBg, border: `1px solid ${themeStyles.border}`, color: themeStyles.text }}
              >
                <option value="all">همه سیستم‌ها</option>
                <option value="light">⚡ سیستم سبک</option>
                <option value="normal">💻 سیستم معمولی</option>
                <option value="heavy">🐘 سیستم سنگین</option>
              </select>

              <select 
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="p-3 rounded-xl text-xs font-bold outline-none cursor-pointer"
                style={{ backgroundColor: themeStyles.inputBg, border: `1px solid ${themeStyles.border}`, color: themeStyles.text }}
              >
                <option value="alphabetical">🔤 الفبا (A-Z)</option>
                <option value="released">📅 سال انتشار</option>
                <option value="rating">⭐ امتیاز</option>
                <option value="size">📦 حجم بازی</option>
              </select>
            </div>
          </div>

          {/* فیلتر حجم مدرن و تگ‌های سریع */}
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 pt-3 border-t border-slate-800/20">
            <div className="flex items-center gap-3 w-full md:w-auto">
              <span className="text-xs font-bold whitespace-nowrap" style={{ color: themeStyles.subText }}>📦 حداکثر حجم:</span>
              <input
                type="range"
                min="5"
                max="100"
                step="5"
                value={maxSizeFilter}
                onChange={(e) => setMaxSizeFilter(Number(e.target.value))}
                className="w-full md:w-48 accent-purple-500 cursor-pointer"
              />
              <span className="text-xs font-mono font-bold text-purple-500 whitespace-nowrap">{maxSizeFilter >= 100 ? 'همه' : `${maxSizeFilter} GB`}</span>

              <div className="flex gap-1 mr-2">
                {[10, 20, 50, 100].map((step) => (
                  <button
                    key={step}
                    onClick={() => setMaxSizeFilter(step)}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono border transition ${maxSizeFilter === step ? 'bg-purple-600 text-white border-purple-600' : 'opacity-70'}`}
                  >
                    {step === 100 ? 'All' : `${step}G`}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-4 w-full md:w-auto justify-end">
              <label className="flex items-center gap-1.5 text-xs font-bold cursor-pointer select-none">
                <input type="checkbox" checked={popularOnly} onChange={(e) => setPopularOnly(e.target.checked)} className="accent-purple-500" />
                🔥 پرطرفدار
              </label>

              <label className="flex items-center gap-1.5 text-xs font-bold cursor-pointer select-none">
                <input type="checkbox" checked={coopOnly} onChange={(e) => setCoopOnly(e.target.checked)} className="accent-purple-500" />
                👥 چندنفره (Co-op)
              </label>
            </div>
          </div>
        </div>

        {/* کارت‌های بازی */}
        {filteredGames.length === 0 ? (
          <div className="text-center py-12 text-xs" style={{ color: themeStyles.subText }}>بازی با مشخصات فیلتر شده یافت نشد.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredGames.slice(0, visibleCount).map((game) => {
              const inCart = cart.some((item) => item.id === game.id);
              return (
                <div 
                  key={game.id} 
                  className="rounded-2xl overflow-hidden flex flex-col justify-between group hover:border-purple-500 transition duration-300 shadow-sm relative border"
                  style={{ backgroundColor: themeStyles.cardBg, borderColor: themeStyles.border }}
                >
                  <a href={`./game?id=${game.id}`} target="_blank" rel="noopener noreferrer" className="block w-full aspect-video relative overflow-hidden">
                    <img 
                      src={getOptimizedUrl(game.background_image, 400)} 
                      alt={game.name} 
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-500" 
                    />

                    {/* 🏷️ تگ‌های هوشمند روی کاور */}
                    <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
                      {game.customSizeGB && (
                        <span className="bg-slate-950/80 backdrop-blur-md text-white text-[10px] font-mono font-bold px-2 py-0.5 rounded-lg border border-white/10">
                          📦 {game.customSizeGB} GB
                        </span>
                      )}
                      {game.systemReq === 'light' && <span className="bg-emerald-600/90 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md">⚡ سبک</span>}
                      {game.systemReq === 'heavy' && <span className="bg-rose-600/90 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md">🐘 سنگین</span>}
                    </div>

                    <div className="absolute top-2 left-2 flex gap-1">
                      {game.isPopular && <span className="bg-amber-500 text-black font-extrabold text-[10px] px-1.5 py-0.5 rounded-md shadow">🔥</span>}
                      {game.isCoop && <span className="bg-indigo-600 text-white font-extrabold text-[10px] px-1.5 py-0.5 rounded-md shadow">👥</span>}
                    </div>
                  </a>

                  <div className="p-4 flex flex-col justify-between flex-1 space-y-3">
                    <h3 className="font-bold text-xs truncate group-hover:text-purple-400 transition" dir="ltr">{game.name}</h3>
                    
                    <div className="flex justify-between items-center pt-2 text-[11px] border-t border-slate-800/20" style={{ color: themeStyles.subText }}>
                      <span className="font-bold text-purple-500">⭐ {game.rating || '---'}</span>
                      <span className="font-mono">{game.released?.split('-')[0] || '---'}</span>
                    </div>

                    <button
                      onClick={(e) => toggleCartItem(game, e)}
                      className={`w-full py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 ${
                        inCart ? 'bg-rose-600 hover:bg-rose-500 text-white' : 'bg-purple-600/10 hover:bg-purple-600 hover:text-white text-purple-400'
                      }`}
                    >
                      {inCart ? '❌ حذف از لیست' : '➕ افزودن به سفارش'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* 🛒 کشوی سفارشات کشویی سمت چپ */}
      <div 
        className={`fixed top-0 left-0 h-full w-80 max-w-[85vw] bg-slate-950 text-white z-50 shadow-2xl border-r border-slate-800 transition-transform duration-300 flex flex-col ${
          isDrawerOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        dir="rtl"
      >
        <div className="p-4 border-b border-slate-800 flex justify-between items-center">
          <h3 className="font-black text-sm text-purple-400">📋 لیست سفارشات انتخاب‌شده</h3>
          <button onClick={() => setIsDrawerOpen(false)} className="text-slate-400 hover:text-white text-xs">✕ بستن</button>
        </div>

        <div className="p-4 flex-1 overflow-y-auto space-y-2">
          {cart.length === 0 ? (
            <div className="text-center py-12 text-xs text-slate-500">هنوز بازی اضافه نشده است.</div>
          ) : (
            cart.map((item) => (
              <div key={item.id} className="p-3 bg-slate-900 border border-slate-800 rounded-xl flex justify-between items-center text-xs">
                <div className="truncate max-w-[170px]" dir="ltr">
                  <p className="font-bold truncate">{item.name}</p>
                  <span className="text-[10px] text-slate-400 font-mono">{item.customSizeGB || '?'} GB</span>
                </div>
                <button onClick={(e) => toggleCartItem(item, e)} className="text-rose-400 hover:text-rose-300 text-xs px-1">✕</button>
              </div>
            ))
          )}
        </div>

        {cart.length > 0 && (
          <div className="p-4 border-t border-slate-800 space-y-3 bg-slate-900/50">
            <div className="flex justify-between items-center text-xs font-bold">
              <span>مجموع حجم کل:</span>
              <span className="font-mono text-purple-400">{totalCartSize} GB</span>
            </div>

            <div className="space-y-2 pt-2">
              <button onClick={copyOrderText} className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-xs font-bold rounded-xl transition">
                📋 کپی متنی سفارش
              </button>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={sendToTelegram} className="py-2 bg-sky-600 hover:bg-sky-500 text-xs font-bold rounded-xl transition">
                  تلگرام
                </button>
                <button onClick={sendToBale} className="py-2 bg-emerald-600 hover:bg-emerald-500 text-xs font-bold rounded-xl transition">
                  بله
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 🔼 دکمه Back to top در سمت راست که با کشوی چپ تداخلی ندارد */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className={`p-3 bg-purple-600 hover:bg-purple-500 text-white rounded-full shadow-2xl transition duration-300 ${
            showScrollTop ? 'opacity-100 scale-100' : 'opacity-0 scale-75 pointer-events-none'
          }`}
        >
          ▲
        </button>
      </div>
    </div>
  );
}
