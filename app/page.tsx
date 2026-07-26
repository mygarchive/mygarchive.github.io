/* eslint-disable @next/next/no-img-element */
/* eslint-disable react/no-unescaped-entities */
'use client';

import { useEffect, useState } from 'react';
import localGamesData from '../data/games.json';

// 🌐 دیکشنری معادل‌های فارسی ژانرها
const GENRE_PERSIAN_MAP: Record<string, string> = {
  'Action': 'اکشن',
  'Indie': 'مستقل',
  'Adventure': 'ماجراجویی',
  'RPG': 'نقش‌آفرینی',
  'Strategy': 'استراتژیک',
  'Shooter': 'شوتر (تیراندازی)',
  'Casual': 'تفننی',
  'Simulation': 'شبیه‌ساز',
  'Puzzle': 'فکری و پازل',
  'Arcade': 'آرکید',
  'Platformer': 'سکوبازی (پلتفرمر)',
  'Racing': 'مسابقه‌ای (رانندگی)',
  'Sports': 'ورزشی',
  'Fighting': 'مبارزه‌ای',
  'Family': 'خانوادگی',
  'Board Games': 'تخته‌ای',
  'Educational': 'آموزشی',
  'Card': 'کارتی',
  'Massively Multiplayer': 'آنلاین چندنفره'
};

// مقادیر دقیق پله‌های حجم بازی
const SIZE_STEPS = [5, 15, 35, 60, 90, 200];

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

  // 🆕 فیلترهای جدید
  const [sizeIndex, setSizeIndex] = useState<number>(5); // ایندکس 5 برابر 200 گیگ (همه)
  const [systemTierFilter, setSystemTierFilter] = useState<string>('all');
  const [onlyPopular, setOnlyPopular] = useState<boolean>(false);
  const [onlyCoop, setOnlyCoop] = useState<boolean>(false);

  // 🛒 سبد/لیست سفارش بازی‌ها
  const [orderCart, setOrderCart] = useState<any[]>([]);
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [copyToast, setCopyToast] = useState<boolean>(false);

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
      // حذف cacheBuster برای استفاده از کش مرورگر و افزایش سرعت لود اولیه
      const targetUrl = `https://raw.githubusercontent.com/mygarchive/mygarchive.github.io/main/data/games.json`;
      
      let fetchedData = null;

      try {
        const proxyUrl = `https://rawg-proxy.hossein-hf273.workers.dev/?url=${encodeURIComponent(targetUrl)}`;
        // برداشتن no-store برای لایه اول تا اطلاعات کش شوند
        const res = await fetch(proxyUrl);
        if (res.ok) fetchedData = await res.json();
      } catch (e) { console.warn("لایه ۱ ناموفق بود."); }

      if (!fetchedData) {
        try {
          const res = await fetch(`https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(targetUrl)}`);
          if (res.ok) fetchedData = await res.json();
        } catch (e) { console.warn("لایه ۲ ناموفق بود."); }
      }

      if (Array.isArray(fetchedData) && fetchedData.length > 0) {
        data = fetchedData;
      }

      // هرس داده‌های اولیه
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

  useEffect(() => {
    if (!loading && filteredGames.length > visibleCount) {
      if (document.documentElement.scrollHeight <= window.innerHeight) {
        setVisibleCount((prev) => prev + 12);
      }
    }
  }, [visibleCount, filteredGames.length, loading]);

  // 🔍 فیلتر جامع داده‌ها
  useEffect(() => {
    let result = [...games];

    if (selectedGenre !== 'all') {
      result = result.filter((game) => game.genres?.some((g: any) => g.name === selectedGenre));
    }

    if (searchQuery.trim() !== '') {
      result = result.filter((game) => game.name?.toLowerCase().includes(searchQuery.toLowerCase()));
    }

    // اعمال فیلتر حجم پله‌ای
    const selectedSizeLimit = SIZE_STEPS[sizeIndex];
    if (selectedSizeLimit < 200) {
      result = result.filter((game) => {
        const gSize = parseFloat(game.size_gb) || 0;
        return gSize <= selectedSizeLimit;
      });
    }

    if (systemTierFilter !== 'all') {
      result = result.filter((game) => game.system_tier === systemTierFilter);
    }

    if (onlyPopular) {
      result = result.filter((game) => !!game.is_popular);
    }

    if (onlyCoop) {
      result = result.filter((game) => !!game.is_coop);
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
      // استفاده از نمره منتقدین (metacritic) به جای نمره سایت منبع
      result.sort((a, b) => (parseFloat(b.metacritic) || 0) - (parseFloat(a.metacritic) || 0));
    }

    setFilteredGames(result);
    setVisibleCount(12);
  }, [selectedGenre, searchQuery, sortBy, sizeIndex, systemTierFilter, onlyPopular, onlyCoop, games]);

  const addToOrderCart = (game: any, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!orderCart.some((g) => g.id === game.id)) {
      setOrderCart((prev) => [...prev, game]);
      setIsCartOpen(true);
    }
  };

  const removeFromOrderCart = (gameId: number) => {
    setOrderCart((prev) => prev.filter((g) => g.id !== gameId));
  };

  const clearOrderCart = () => {
    if (window.confirm("آیا از پاک کردن کل لیست سفارش مطمئن هستید؟")) {
      setOrderCart([]);
    }
  };

  const confirmSend = (e: React.MouseEvent) => {
    if (!window.confirm("آیا سفارش شما نهایی شده و می‌خواهید آن را برای پشتیبانی ارسال کنید؟")) {
      e.preventDefault();
    }
  };

  const getTotalOrderSize = () => {
    return orderCart.reduce((acc, item) => acc + (parseFloat(item.size_gb) || 0), 0).toFixed(1);
  };

  const generateOrderText = () => {
    if (orderCart.length === 0) return '';
    let text = `سلام، قصد سفارش جدید بازی‌های زیر را دارم:\n\n`;
    orderCart.forEach((game, idx) => {
      const sizeStr = game.size_gb ? `${game.size_gb} گیگابایت` : 'حجم نامشخص';
      text += `${idx + 1}. ${game.name} — ${sizeStr}\n`;
    });
    text += `\n📊 مجموع حجم کل سفارش: ${getTotalOrderSize()} گیگابایت\n\n`;
    text += `لطفاً قیمت دیتای این بازی‌ها و شرایط ثبت نهایی را برام بفرستید.`;
    return text;
  };

  const copyOrderTextToClipboard = () => {
    const text = generateOrderText();
    navigator.clipboard.writeText(text);
    setCopyToast(true);
    setTimeout(() => setCopyToast(false), 3000);
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
      className="min-h-screen pb-32 relative flex flex-col justify-between transition-colors duration-300" 
      dir="rtl"
      style={{ backgroundColor: themeStyles.bg, color: themeStyles.text }}
    >
      <div className="max-w-7xl mx-auto w-full p-6 md:p-12 flex-grow">
        
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

        {/* 🎛️ پنل فیلترهای پیشرفته و هوشمند */}
        <div 
          className="p-5 rounded-2xl mb-8 space-y-4 shadow-sm"
          style={{ backgroundColor: darkMode ? 'rgba(15, 23, 42, 0.4)' : '#ffffff', border: `1px solid ${themeStyles.border}` }}
        >
          <div className="flex flex-col lg:flex-row gap-4">
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
            
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold whitespace-nowrap" style={{ color: themeStyles.subText }}>👁️ ژانر:</span>
                <select 
                  value={selectedGenre}
                  onChange={(e) => setSelectedGenre(e.target.value)}
                  className="p-2.5 rounded-xl text-xs font-bold outline-none cursor-pointer max-w-[200px]"
                  style={{ backgroundColor: themeStyles.inputBg, border: `1px solid ${themeStyles.border}`, color: themeStyles.text }}
                >
                  <option value="all">همه سبک‌ها (All)</option>
                  {genres.map((genre) => {
                    const faName = GENRE_PERSIAN_MAP[genre] || genre;
                    return (
                      <option key={genre} value={genre}>
                        {faName} ({genre})
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold whitespace-nowrap" style={{ color: themeStyles.subText }}>💻 سیستم:</span>
                <select 
                  value={systemTierFilter}
                  onChange={(e) => setSystemTierFilter(e.target.value)}
                  className="p-2.5 rounded-xl text-xs font-bold outline-none cursor-pointer"
                  style={{ backgroundColor: themeStyles.inputBg, border: `1px solid ${themeStyles.border}`, color: themeStyles.text }}
                >
                  <option value="all">همه سیستم‌ها</option>
                  <option value="light">بازی مناسب سیستم‌های ضعیف</option>
                  <option value="normal">بازی مناسب سیستم‌های معمولی</option>
                  <option value="heavy">نیازمند سیستم‌های قوی</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold whitespace-nowrap" style={{ color: themeStyles.subText }}>↕️ ترتیب:</span>
                <select 
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="p-2.5 rounded-xl text-xs font-bold outline-none cursor-pointer"
                  style={{ backgroundColor: themeStyles.inputBg, border: `1px solid ${themeStyles.border}`, color: themeStyles.text }}
                >
                  <option value="alphabetical">🔤 حروف الفبا (الف تا ی)</option>
                  <option value="released">📅 جدیدترین بازی‌ها</option>
                  <option value="rating">⭐ بیشترین امتیاز منتقدین</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center justify-between gap-6 border-t pt-4" style={{ borderColor: themeStyles.border }}>
            <div className="w-full md:w-1/2 space-y-1">
              <div className="flex justify-between text-xs font-bold" style={{ color: themeStyles.subText }}>
                <span>💾 حد اکثر حجم بازی:</span>
                <span className="text-purple-500 font-mono">
                  {SIZE_STEPS[sizeIndex] >= 200 ? 'همه حجم‌ها' : `حداکثر تا ${SIZE_STEPS[sizeIndex]} گیگابایت`}
                </span>
              </div>
              <input 
                type="range" 
                min="0" 
                max={SIZE_STEPS.length - 1}
                step="1"
                value={sizeIndex} 
                onChange={(e) => setSizeIndex(parseInt(e.target.value))}
                className="w-full accent-purple-600 h-2 bg-slate-800 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] font-mono opacity-60 mt-1" style={{ color: themeStyles.subText }}>
                {SIZE_STEPS.map((step, idx) => (
                  <button key={step} onClick={() => setSizeIndex(idx)} className="hover:underline">
                    {step >= 200 ? 'همه' : `${step}GB`}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold select-none">
                <input 
                  type="checkbox" 
                  checked={onlyPopular} 
                  onChange={(e) => setOnlyPopular(e.target.checked)} 
                  className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                />
                <span className="text-amber-500">🔥 فقط بازی‌های پرطرفدار</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold select-none">
                <input 
                  type="checkbox" 
                  checked={onlyCoop} 
                  onChange={(e) => setOnlyCoop(e.target.checked)} 
                  className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
                />
                <span className="text-emerald-500">👥 فقط کوآپ / چندنفره</span>
              </label>
            </div>
          </div>
        </div>

        {filteredGames.length === 0 ? (
          <div className="text-center py-12 text-sm" style={{ color: themeStyles.subText }}>هیچ بازی با مشخصات فیلتر شده یافت نشد.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-4 gap-6">
            {filteredGames.slice(0, visibleCount).map((game) => {
              const isInCart = orderCart.some((g) => g.id === game.id);

              return (
                <a 
                  href={`./game?id=${game.id}`} 
                  key={game.id} 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-2xl overflow-hidden flex flex-col justify-between group hover:border-purple-500 transition duration-300 shadow-sm cursor-pointer relative"
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

                    <div className="absolute top-2 right-2 flex flex-wrap gap-1">
                      {game.size_gb ? (
                        <span className="bg-slate-950/80 text-purple-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-purple-500/30 backdrop-blur-sm">
                          💾 {game.size_gb} GB
                        </span>
                      ) : null}
                      {game.is_popular && (
                        <span className="bg-amber-950/80 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-500/30 backdrop-blur-sm">
                          🔥 پرطرفدار
                        </span>
                      )}
                      {game.is_coop && (
                        <span className="bg-emerald-950/80 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/30 backdrop-blur-sm">
                          👥 کوآپ
                        </span>
                      )}
                    </div>
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
                        ⭐ {game.metacritic || '---'}
                      </span>
                      
                      <button
                        onClick={(e) => addToOrderCart(game, e)}
                        className={`px-3 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
                          isInCart 
                            ? 'bg-emerald-600 text-white' 
                            : 'bg-purple-600 hover:bg-purple-500 text-white shadow-md'
                        }`}
                      >
                        {isInCart ? '✔ افزوده شد' : '🛒 + افزودن به لیست'}
                      </button>
                    </div>
                  </div>
                </a>
              );
            })}
          </div>
        )}

        {visibleCount < filteredGames.length && (
          <div className="text-center py-8 text-xs font-bold" style={{ color: themeStyles.subText }}>
            در حال بارگذاری بازی‌های بیشتر با اسکرول...
          </div>
        )}

      </div>

      {/* 🛒 کشوی لیست سفارش (Mobile Optimized Backdrop) */}
      <div className={`fixed inset-0 z-50 transition-opacity duration-300 ${isCartOpen ? 'opacity-100 visible' : 'opacity-0 invisible'}`}>
        {/* هاله تاریک کلیک‌خوار برای بستن منو در موبایل */}
        <div 
          className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
          onClick={() => setIsCartOpen(false)}
        ></div>

        <div 
          className={`absolute left-0 top-0 bottom-0 w-[85%] max-w-md h-full p-5 flex flex-col justify-between shadow-2xl border-r border-slate-800 transition-transform duration-300 ${isCartOpen ? 'translate-x-0' : '-translate-x-full'}`}
          style={{ backgroundColor: darkMode ? '#090d16' : '#ffffff', color: themeStyles.text }}
        >
          <div>
            <div className="flex justify-between items-center pb-4 border-b border-slate-800">
              <h3 className="text-sm font-black flex items-center gap-2">
                🛒 لیست سفارش بازی‌ها ({orderCart.length})
              </h3>
              <button 
                onClick={() => setIsCartOpen(false)}
                className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-400 p-1.5 rounded-lg"
              >
                ✕ بستن
              </button>
            </div>

            <div className="mt-4 space-y-3 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
              {orderCart.map((item) => (
                <div 
                  key={item.id} 
                  className="p-2.5 rounded-xl border border-slate-800/80 flex justify-between items-center bg-slate-900/40"
                >
                  <div className="truncate max-w-[180px]">
                    <p className="text-xs font-bold text-left truncate" dir="ltr">{item.name}</p>
                    <p className="text-[10px] text-purple-400 font-mono">💾 {item.size_gb ? `${item.size_gb} GB` : 'حجم نامشخص'}</p>
                  </div>
                  <button 
                    onClick={() => removeFromOrderCart(item.id)}
                    className="text-red-400 hover:text-red-300 text-xs px-2 py-1 bg-red-950/40 hover:bg-red-900/60 rounded-lg"
                    title="حذف از لیست"
                  >
                    ✕
                  </button>
                </div>
              ))}

              {orderCart.length === 0 && (
                <div className="text-center py-12 text-xs text-slate-500 font-medium">
                  هنوز هیچ بازی به لیست سفارش اضافه نکرده‌اید.
                </div>
              )}
            </div>
          </div>

          {orderCart.length > 0 && (
            <div className="border-t border-slate-800 pt-4 space-y-3">
              <div className="flex justify-between items-center text-xs font-bold">
                <span>📊 مجموع حجم بازی‌ها:</span>
                <span className="text-purple-400 font-mono text-sm">{getTotalOrderSize()} GB</span>
              </div>

              {copyToast && (
                <div className="p-2 bg-green-500/20 text-green-400 border border-green-800 text-[11px] text-center font-bold rounded-xl animate-fadeIn">
                  ✔ متن سفارش کپی شد! می‌توانید آن را بفرستید.
                </div>
              )}

              <div className="grid grid-cols-1 gap-2 pt-1">
                <a 
                  href={`https://t.me/HF273?text=${encodeURIComponent(generateOrderText())}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={confirmSend}
                  className="w-full py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold text-center transition flex items-center justify-center gap-1.5 shadow-md"
                >
                  ✈️ ارسال مستقیم به تلگرام
                </a>

                <a 
                  href={`https://ble.ir/share?text=${encodeURIComponent(generateOrderText())}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={confirmSend}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold text-center transition flex items-center justify-center gap-1.5 shadow-md"
                >
                  🟢 ارسال به بله
                </a>

                <button 
                  onClick={copyOrderTextToClipboard}
                  className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold text-center transition border border-slate-700"
                >
                  📋 کپی متن کامل سفارش
                </button>

                <button 
                  onClick={clearOrderCart}
                  className="w-full py-1.5 text-[11px] text-red-400 hover:text-red-300 text-center font-bold"
                >
                  🗑️ پاک کردن کل لیست سفارش
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <button 
        onClick={() => setIsCartOpen(true)}
        className="fixed left-4 bottom-24 z-40 bg-purple-600 hover:bg-purple-500 text-white p-3.5 rounded-full shadow-2xl flex items-center gap-2 transition duration-300 transform hover:scale-105 active:scale-95"
      >
        <span className="text-base">🛒</span>
        {orderCart.length > 0 && (
          <span className="bg-amber-400 text-slate-950 text-xs font-extrabold px-2 py-0.5 rounded-full">
            {orderCart.length}
          </span>
        )}
      </button>

      <div className="fixed bottom-24 right-6 z-40">
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

      {/* 🔻 فوتر ثابت (Sticky Footer) در پایین صفحه */}
      <footer 
        className="fixed bottom-0 left-0 right-0 z-30 w-full shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] transition-colors duration-300 flex flex-col items-center"
        style={{ backgroundColor: themeStyles.footerBg, backdropFilter: 'blur(16px)', borderTop: `1px solid ${themeStyles.border}` }}
      >
        <div
          className={`w-full max-w-7xl mx-auto overflow-hidden transition-all duration-500 ease-in-out ${
            isFooterOpen ? 'max-h-[900px] opacity-100 p-6' : 'max-h-0 opacity-0 p-0'
          }`}
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8" dir="rtl">
            <div className="space-y-3">
              <h4 className="text-sm font-black text-purple-500 flex items-center gap-1.5">
                📖 راهنمای ثبت سفارش بازی
              </h4>
              <p className="text-sm leading-6 font-medium" style={{ color: themeStyles.text }}>
                1️⃣ بازی‌های مورد نظر خود را از لیست آرشیو انتخاب کرده و روی گزینه <b>&quot;🛒 + افزودن به لیست&quot;</b> کلیک کنید.<br />
                2️⃣ دکمه شناور سبد خرید را باز کنید تا لیست تمام بازی‌های انتخابی و <b>حجم کلی</b> آن‌ها را مشاهده کنید.<br />
                3️⃣ پس از نهایی شدن، دکمه ارسال را بزنید تا متن سفارش برای پشتیبانی ارسال شود و قیمت نهایی خدمت شما اعلام گردد.
              </p>
            </div>

            <div className="space-y-3">
              <h4 className="text-sm font-black text-purple-500 flex items-center gap-1.5">
                📞 ارتباط با پشتیبانی
              </h4>
              <p className="text-sm leading-6 font-medium" style={{ color: themeStyles.text }}>
                جهت هرگونه سوال، استعلام قیمت یا پیگیری سفارش با راه‌های زیر در ارتباط باشید:
              </p>
              <div className="flex flex-col gap-2 pt-1">
                <a
                  href="https://t.me/HF273"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2.5 rounded-xl text-sm font-bold transition flex items-center gap-2 hover:bg-sky-600 hover:text-white"
                  style={{ backgroundColor: themeStyles.inputBg, color: themeStyles.text }}
                >
                  ✈️ آیدی تلگرام: <span className="font-mono text-purple-400">@HF273</span>
                </a>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-sm font-black text-purple-500 flex items-center gap-1.5">
                ⚖️ اطلاعات حقوقی
              </h4>
              <p className="text-sm leading-6 font-medium" style={{ color: themeStyles.text }}>
                این وب‌سایت یک آرشیو شخصی برای معرفی بازی‌های ویدیویی است. اطلاعات و تصاویر از منابع شخص ثالث مانند{' '}
                <a href="https://rawg.io/" target="_blank" rel="noopener noreferrer" className="text-purple-500 hover:underline font-mono font-bold">RAWG</a>{' '}
                دریافت می‌شوند.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => setIsFooterOpen(!isFooterOpen)}
          className="w-full py-3 text-sm font-bold flex justify-center items-center gap-2 hover:bg-purple-500/10 transition-colors"
          style={{ color: themeStyles.text }}
        >
          {isFooterOpen ? '🔼 بستن اطلاعات پشتیبانی' : '🔽 نمایش راهنمای سفارش و اطلاعات پشتیبانی'}
        </button>
      </footer>
    </div>
  );
}
