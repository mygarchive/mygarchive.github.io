/* eslint-disable @next/next/no-img-element */
/* eslint-disable react/no-unescaped-entities */
'use client';

import { useEffect, useState, useRef } from 'react';
import localGamesData from '../data/games.json';

// ⚙️ آیدی‌های شبکه اجتماعی پشتیبانی
const TELEGRAM_USERNAME = "HF273"; // آیدی تلگرام شما
const BALE_USERNAME = "";          // آیدی بله (در صورت داشتن قرار دهید)

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
  const [sizeIndex, setSizeIndex] = useState<number>(5);
  const [systemTierFilter, setSystemTierFilter] = useState<string>('all');
  const [onlyPopular, setOnlyPopular] = useState<boolean>(false);
  const [onlyCoop, setOnlyCoop] = useState<boolean>(false);

  // 🛒 سبد / لیست سفارش جدید
  const [orderCart, setOrderCart] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  // ⚡ کنترل تعداد کارت‌های قابل رندر
  const [visibleCount, setVisibleCount] = useState<number>(12);
  const loaderRef = useRef<HTMLDivElement>(null);

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
      const targetUrl = `https://raw.githubusercontent.com/mygarchive/mygarchive.github.io/main/data/games.json`;
      
      let fetchedData = null;

      try {
        const proxyUrl = `https://rawg-proxy.hossein-hf273.workers.dev/?url=${encodeURIComponent(targetUrl)}`;
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
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // 🚀 لود تدریجی با Intersection Observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((prev) => Math.min(prev + 12, filteredGames.length));
        }
      },
      { threshold: 0.1 }
    );

    if (loaderRef.current) {
      observer.observe(loaderRef.current);
    }

    return () => {
      if (loaderRef.current) {
        observer.unobserve(loaderRef.current);
      }
    };
  }, [filteredGames.length]);

  // 🔍 فیلتر جامع داده‌ها
  useEffect(() => {
    let result = [...games];

    if (selectedGenre !== 'all') {
      result = result.filter((game) => game.genres?.some((g: any) => g.name === selectedGenre));
    }

    if (searchQuery.trim() !== '') {
      result = result.filter((game) => game.name?.toLowerCase().includes(searchQuery.toLowerCase()));
    }

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
      result.sort((a, b) => (parseFloat(b.metacritic) || 0) - (parseFloat(a.metacritic) || 0));
    }

    setFilteredGames(result);
    setVisibleCount(12);
  }, [selectedGenre, searchQuery, sortBy, sizeIndex, systemTierFilter, onlyPopular, onlyCoop, games]);

  // 🛒 انتخاب یا حذف بازی (با تاییدیه هنگام حذف)
  const toggleSelectGame = (game: any, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const exists = orderCart.some((item) => item.id === game.id);
    if (exists) {
      if (window.confirm(`آیا از حذف بازی "${game.name}" از سبد سفارش اطمینان دارید؟`)) {
        setOrderCart((prev) => prev.filter((item) => item.id !== game.id));
      }
    } else {
      setOrderCart((prev) => [...prev, game]);
    }
  };

  // حذف از داخل پاپ‌آپ
  const handleRemoveFromModal = (game: any) => {
    if (window.confirm(`بازی "${game.name}" از سبد سفارش حذف شود؟`)) {
      setOrderCart((prev) => prev.filter((item) => item.id !== game.id));
    }
  };

  // محاسبه مجموع حجم
  const getTotalOrderSize = () => {
    return orderCart.reduce((acc, item) => acc + (parseFloat(item.size_gb) || 0), 0).toFixed(1);
  };

  // 📝 ساخت متن استاندارد و مرتب برای تلگرام / بله / کپی
  const generateOrderText = () => {
    if (orderCart.length === 0) return '';
    let text = `سلام 👋\nقصد سفارش دیتای بازی‌های زیر رو دارم:\n\n`;
    orderCart.forEach((g, idx) => {
      const sizeText = g.size_gb ? `${g.size_gb} GB` : 'حجم نامشخص';
      text += `${idx + 1}. ${g.name} (${sizeText})\n`;
    });
    text += `\n-------------------------\n`;
    text += `📊 *تعداد کل:* ${orderCart.length} عنوان\n`;
    text += `💾 *مجموع حجم:* ${getTotalOrderSize()} گیگابایت\n\n`;
    text += `لطفاً شرایط و نحوه ثبت نهایی سفارش رو بفرمایید. با تشکر!`;
    return text;
  };

  // کپی متن سفارش
  const copyOrderTextToClipboard = () => {
    const text = generateOrderText();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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

  const visibleGames = filteredGames.slice(0, visibleCount);

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

        {/* 🎛️ پنل فیلترهای پیشرفته */}
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
                <span>💾 حداکثر حجم بازی:</span>
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
            {visibleGames.map((game) => {
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
                      
                      {game.released && (
                        <span className="bg-slate-950/80 text-slate-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-slate-600/30 backdrop-blur-sm">
                          📅 {game.released.split('-')[0]}
                        </span>
                      )}

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
                      
                      {/* دکمه افزودن / حذف از سبد */}
                      <button
                        onClick={(e) => toggleSelectGame(game, e)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
                          isInCart 
                            ? 'bg-red-500 hover:bg-red-600 text-white' 
                            : 'bg-purple-600 hover:bg-purple-500 text-white shadow-md'
                        }`}
                      >
                        {isInCart ? '❌ حذف از سبد' : '➕ افزودن به سبد'}
                      </button>
                    </div>
                  </div>
                </a>
              );
            })}
          </div>
        )}

        {/* 🔻 عنصر ناظر (Intersection Observer Target) */}
        {visibleCount < filteredGames.length && (
          <div ref={loaderRef} className="text-center py-10 text-xs font-bold" style={{ color: themeStyles.subText }}>
            در حال بارگذاری بازی‌های بیشتر...
          </div>
        )}

      </div>

      {/* 🛒 نوار شناور سبد سفارش در پایین صفحه */}
      {orderCart.length > 0 && (
        <div className="fixed bottom-14 left-4 right-4 z-40 bg-slate-900 text-white p-4 rounded-2xl shadow-2xl border border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-4 max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-5">
          <div className="flex items-center gap-4">
            <div className="bg-purple-600 text-white px-3 py-2 rounded-xl text-center">
              <span className="block text-xs text-purple-200">تعداد</span>
              <span className="font-mono font-bold text-lg">{orderCart.length}</span>
            </div>
            <div>
              <p className="text-xs text-slate-400">مجموع حجم انتخابی:</p>
              <p className="text-lg font-black text-emerald-400" dir="ltr">
                {getTotalOrderSize()} GB 💾
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => {
                if (window.confirm("آیا از پاکسازی کامل سبد سفارش اطمینان دارید؟")) {
                  setOrderCart([]);
                }
              }}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors"
            >
              پاکسازی
            </button>
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-sm transition-all shadow-lg shadow-purple-900/40"
            >
              تایید و ارسال سفارش ({orderCart.length})
            </button>
          </div>
        </div>
      )}

      {/* 📋 پاپ‌آپ پیش‌نمایش و تایید نهایی سفارش */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white text-slate-900 rounded-2xl p-6 max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl animate-in zoom-in-95">
            
            <div className="flex justify-between items-center border-b pb-3 mb-3">
              <h3 className="text-lg font-black text-slate-800">پیش‌نمایش لیست سفارش</h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 font-bold text-lg px-2"
              >
                ✕
              </button>
            </div>

            {/* چیدمان متنی مرتب LTR */}
            <div className="flex-1 overflow-y-auto mb-4 space-y-2 pr-1">
              {orderCart.map((g, i) => (
                <div 
                  key={g.id || i} 
                  className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-200 hover:bg-slate-100/80 transition-colors"
                >
                  <div className="flex items-center gap-2 overflow-hidden text-left" dir="ltr">
                    <span className="text-xs font-bold text-purple-600 font-mono w-5 flex-shrink-0">
                      {i + 1}.
                    </span>
                    <span className="text-xs font-bold text-slate-800 truncate max-w-[210px] sm:max-w-[260px]">
                      {g.name}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-xs font-black text-purple-700 font-mono" dir="ltr">
                      {g.size_gb ? `${g.size_gb} GB` : '---'}
                    </span>
                    <button
                      onClick={() => handleRemoveFromModal(g)}
                      className="text-red-500 hover:text-red-700 font-bold text-xs p-1 rounded hover:bg-red-50"
                      title="حذف از سبد"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* خلاصه حجم */}
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 mb-4 flex justify-between items-center">
              <span className="text-xs font-bold text-purple-900">حجم کل دیتای درخواستی:</span>
              <span className="text-sm font-black text-purple-700 font-mono" dir="ltr">
                {getTotalOrderSize()} GB
              </span>
            </div>

            {/* دکمه‌های ارسال */}
            <div className="flex flex-col gap-2">
              <div className="grid grid-cols-2 gap-2">
                <a
                  href={`https://t.me/${TELEGRAM_USERNAME}?text=${encodeURIComponent(generateOrderText())}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-2.5 px-4 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-sm text-center"
                >
                  ✈️ ارسال در تلگرام
                </a>
                <a
                  href={`https://ble.ir/${BALE_USERNAME}?text=${encodeURIComponent(generateOrderText())}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-sm text-center"
                >
                  🟢 ارسال در بله
                </a>
              </div>

              <button
                onClick={copyOrderTextToClipboard}
                className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
              >
                {copied ? '✅ متن سفارش کپی شد!' : '📋 کپی متن کامل لیست سفارش'}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* دکمه بازگشت به بالا */}
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

      {/* 🔻 فوتر ثابت در پایین صفحه */}
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
                1️⃣ بازی‌های مورد نظر خود را از لیست آرشیو انتخاب کرده و روی گزینه <b>&quot;➕ افزودن به سبد&quot;</b> کلیک کنید.<br />
                2️⃣ دکمه <b>تایید و ارسال سفارش</b> را در نوار پایین صفحه بزنید تا پیش‌نمایش لیست انتخابی و حجم کلی را مشاهده کنید.<br />
                3️⃣ دکمه ارسال به تلگرام یا بله را بزنید تا متن سفارش جهت ثبت نهایی ارسال شود.
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
                  href={`https://t.me/${TELEGRAM_USERNAME}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2.5 rounded-xl text-sm font-bold transition flex items-center gap-2 hover:bg-sky-600 hover:text-white"
                  style={{ backgroundColor: themeStyles.inputBg, color: themeStyles.text }}
                >
                  ✈️ آیدی تلگرام: <span className="font-mono text-purple-400">@{TELEGRAM_USERNAME}</span>
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
          className="w-full py-2.5 text-xs font-bold flex justify-center items-center gap-2 hover:bg-purple-500/10 transition-colors"
          style={{ color: themeStyles.text }}
        >
          {isFooterOpen ? '🔼 بستن اطلاعات پشتیبانی' : '🔽 نمایش راهنمای سفارش و اطلاعات پشتیبانی'}
        </button>
      </footer>
    </div>
  );
}
