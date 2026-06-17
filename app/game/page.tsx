/* eslint-disable @next/next/no-img-element */
'use client';

import { useEffect, useState, Suspense, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
// 🛠️ لایه محافظتی لوکال برای هماهنگی کامل با فرآیند بیلد و کش‌شکنی صفحه اصلی
import localGamesData from '../data/games.json';

function GameDetailContent() {
  const searchParams = useSearchParams();
  const gameId = searchParams.get('id');
  const [game, setGame] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activePhotoIndex, setActivePhotoIndex] = useState<number | null>(null);
  const [darkMode, setDarkMode] = useState(true);

  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);

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

  // مجهز به سیستم کش‌شکن جهت بروزرسانی همزمان دیتابیس در همان لحظه کامپایل گیت‌هاب
  const fetchSmartData = async () => {
    const cacheBuster = Date.now();
    
    // 🛠️ رفع ارور Mixed Content: تغییر تمام پروتکل‌های CDN به https مستقیم و امن
    try {
      const res = await fetch(`https://raw.githubusercontent.com/mygarchive/mygarchive.github.io/main/data/games.json?v=${cacheBuster}`, {
        cache: 'no-store'
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn("منبع اول (گیت‌هاب خام) ناموفق بود، سوئیچ به CDN دوم...", e);
    }

    try {
      const res = await fetch(`https://cdn.statically.io/gh/mygarchive/mygarchive.github.io/main/data/games.json?v=${cacheBuster}`);
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn("CDN استاتیکالی ناموفق بود، سوئیچ به CDN سوم...", e);
    }

    try {
      const res = await fetch(`https://cdn.jsdelivr.net/gh/mygarchive/mygarchive.github.io@main/data/games.json?v=${cacheBuster}`);
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn("CDN جی‌اس‌دلیور ناموفق بود، سوئیچ به گیت‌هاب API...", e);
    }

    const directRes = await fetch(`https://api.github.com/repos/mygarchive/mygarchive.github.io/contents/data/games.json?v=${cacheBuster}`);
    if (directRes.ok) {
      const repoData = await directRes.json();
      if (repoData && repoData.content) {
        const content = decodeURIComponent(atob(repoData.content).split('').map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
        return JSON.parse(content);
      }
    }
    
    // لایه نهایی پایداری: اگر هیچ‌کدام از شبکه لود نشدند، از دیتای لوکال زمان بیلد استفاده کن
    if (Array.isArray(localGamesData)) {
      return localGamesData;
    }
    
    throw new Error("دیتابیس در دسترس نیست.");
  };

  useEffect(() => {
    if (!gameId) return;
    
    fetchSmartData()
      .then((data = []) => {
        const found = data.find((g: any) => g.id.toString() === gameId);
        // اگر در دیتای لایو شبکه نبود، برای اطمینان بیشتر مجدداً دیتای لوکال بیلد شده را چک کن
        if (!found && Array.isArray(localGamesData)) {
          const fallbackFound = localGamesData.find((g: any) => g.id.toString() === gameId);
          setGame(fallbackFound || null);
        } else {
          setGame(found || null);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("خطا در سیستم دریافت هوشمند اطلاعات:", err);
        if (Array.isArray(localGamesData)) {
          const found = localGamesData.find((g: any) => g.id.toString() === gameId);
          setGame(found || null);
        }
        setLoading(false);
      });
  }, [gameId]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (activePhotoIndex === null || !game?.gallery) return;

      if (e.key === 'Escape') {
        setActivePhotoIndex(null);
      } else if (e.key === 'ArrowRight') {
        const prevIndex = activePhotoIndex === 0 ? game.gallery.length - 1 : activePhotoIndex - 1;
        setActivePhotoIndex(prevIndex);
      } else if (e.key === 'ArrowLeft') {
        const nextIndex = activePhotoIndex === game.gallery.length - 1 ? 0 : activePhotoIndex + 1;
        setActivePhotoIndex(nextIndex);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activePhotoIndex, game]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.changedTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (activePhotoIndex !== null) {
      if (e.cancelable) e.preventDefault();
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    touchEndX.current = e.changedTouches[0].clientX;
    handleSwipe();
  };

  const handleSwipe = () => {
    if (activePhotoIndex === null || !game?.gallery) return;

    const swipeDistance = touchStartX.current - touchEndX.current;
    const minSwipeDistance = 40;

    if (swipeDistance > minSwipeDistance) {
      const nextIndex = activePhotoIndex === game.gallery.length - 1 ? 0 : activePhotoIndex + 1;
      setActivePhotoIndex(nextIndex);
    } else if (swipeDistance < -minSwipeDistance) {
      const prevIndex = activePhotoIndex === 0 ? game.gallery.length - 1 : activePhotoIndex - 1;
      setActivePhotoIndex(prevIndex);
    }
  };

  // الگوریتم کاملاً هوشمند استخراج آیدی و بازسازی لینک به فرمت مستقیم استیم فروشگاه بدون ریدایرکت سرچ کامپوننت ادمین
  const getSmartSteamLink = (steamLink: string, fallbackName: string) => {
    if (!steamLink || steamLink === '#') {
      if (fallbackName) return `https://store.steampowered.com/search/?term=${encodeURIComponent(fallbackName)}`;
      return 'https://store.steampowered.com';
    }

    // استخراج شماره شناسه یکتا از لینک خام ورودی پنل
    const idMatch = steamLink.match(/(?:app\/|term=|check\/app\/)(\d+)/) || steamLink.match(/\/(\d+)\/?/);
    const appId = idMatch ? idMatch[1] : null;

    if (appId) {
      return `https://store.steampowered.com/app/${appId}`;
    }

    // بازسازی لینک‌های متنی و تم‌های از پیش ساخته ادمین گیت‌هاب
    if (steamLink.includes('term=')) {
      const urlParams = new URLSearchParams(steamLink.split('?')[1]);
      const term = urlParams.get('term');
      if (term) {
        // اگر شناسه در نام موجود بود (مثلا حاصل از برخی ربات‌ها)
        const innerId = term.match(/(\d+)/);
        if (innerId) return `https://store.steampowered.com/app/${innerId[1]}`;
        return `https://store.steampowered.com/search/?term=${encodeURIComponent(term)}`;
      }
    }

    if (steamLink.startsWith('http')) {
      return steamLink;
    }

    return `https://store.steampowered.com/search/?term=${encodeURIComponent(fallbackName)}`;
  };

  const getOptimizedUrl = (url: string, width = 800) => {
    if (!url) return '';
    const cleanUrl = url.replace(/^https?:\/\//i, '');
    return `https://images.weserv.nl/?url=${encodeURIComponent(cleanUrl)}&w=${width}&q=80`;
  };

  const themeStyles = {
    bg: darkMode ? '#020617' : '#f8fafc',
    text: darkMode ? '#f1f5f9' : '#0f172a',
    titleText: darkMode ? '#ffffff' : '#0f172a',
    subText: darkMode ? '#94a3b8' : '#475569',
    cardBg: darkMode ? 'rgba(15, 23, 42, 0.4)' : '#ffffff',
    sidebarBg: darkMode ? '#0f172a' : '#ffffff',
    border: darkMode ? '#1e293b' : '#e2e8f0',
    btnBg: darkMode ? 'rgba(88, 28, 135, 0.3)' : '#f3e8ff',
    btnBorder: darkMode ? 'rgba(126, 34, 206, 0.4)' : '#e9d5ff',
    btnText: darkMode ? '#c084fc' : '#6b21a8',
    opacity: darkMode ? '0.15' : '0.08'
  };

  if (loading) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center text-sm animate-pulse transition-colors duration-300"
        style={{ backgroundColor: themeStyles.bg, color: themeStyles.subText }}
      >
        در حال دریافت سریع اطلاعات بازی...
      </div>
    );
  }
  
  if (!game) {
    return (
      <div 
        className="min-h-screen flex flex-col items-center justify-center gap-4 transition-colors duration-300"
        style={{ backgroundColor: themeStyles.bg, color: '#f87171' }}
        dir="rtl"
      >
        <div className="text-3xl">⚠️</div>
        <h2 className="text-sm font-bold">بازی مورد نظر در آرشیو یافت نشد.</h2>
        <p className="text-xs" style={{ color: themeStyles.subText }}>اگر بازی جدیداً اضافه شده، ممکن است دپلو گیت‌هاب چند لحظه زمان ببرد.</p>
        <Link href="/" className="mt-2 text-xs bg-purple-600 hover:bg-purple-700 text-white px-5 py-2.5 rounded-xl font-bold transition">بازگشت به صفحه اصلی آرشیو</Link>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen p-6 md:p-12 relative overflow-hidden transition-colors duration-300" 
      dir="rtl"
      style={{ backgroundColor: themeStyles.bg, color: themeStyles.text }}
    >
      
      <div 
        className="absolute inset-0 bg-cover bg-center blur-sm pointer-events-none transform scale-105 transition-all"
        style={{ backgroundImage: `url(${game.background_image})`, opacity: themeStyles.opacity }}
      />

      <div className="max-w-4xl mx-auto relative z-10">
        <header 
          className="mb-6 flex justify-between items-center gap-4 pb-4"
          style={{ borderBottom: `1px solid ${themeStyles.border}` }}
        >
          <Link 
            href="/" 
            className="inline-flex items-center gap-2 text-xs px-4 py-2 rounded-xl transition"
            style={{ backgroundColor: themeStyles.btnBg, border: `1px solid ${themeStyles.btnBorder}`, color: themeStyles.btnText }}
          >
            ➔ بازگشت به صفحه اصلی آرشیو
          </Link>

          {/* اسلایدر لایو اختصاصی وضعیت روز و شب هماهنگ با صفحه اصلی سایت */}
          <div className="flex items-center gap-2">
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
        </header>

        <div 
          className="w-full rounded-2xl overflow-hidden shadow-xl mb-8 flex justify-center items-center"
          style={{ backgroundColor: darkMode ? '#0f172a' : '#ffffff', border: `1px solid ${themeStyles.border}` }}
        >
          <img src={getOptimizedUrl(game.background_image, 800)} alt={game.name} className="w-full h-auto object-cover max-h-[450px]" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-6">
            <div>
              <h1 className="text-3xl font-black text-left tracking-tight" style={{ color: themeStyles.titleText }} dir="ltr">{game.name}</h1>
              <div className="flex flex-wrap gap-2 mt-3" dir="ltr">
                {game.genres?.map((g: any) => (
                  <span 
                    key={g.id || g.name} 
                    className="text-xs font-bold px-2.5 py-1 rounded-md"
                    style={{ backgroundColor: darkMode ? '#0f172a' : '#ffffff', border: `1px solid ${themeStyles.border}`, color: themeStyles.subText }}
                  >
                    {g.name}
                  </span>
                ))}
              </div>
            </div>

            <div 
              className="space-y-5 p-6 rounded-2xl shadow-sm"
              style={{ backgroundColor: themeStyles.cardBg, border: `1px solid ${themeStyles.border}` }}
            >
              {game.description_fa && (
                <div>
                  <h3 className="text-sm font-bold text-purple-500 mb-2">✍️ توضیحات بازی (ترجمه فارسی):</h3>
                  <p className="text-base leading-8 text-justify font-normal" style={{ color: darkMode ? '#e2e8f0' : '#334155' }}>{game.description_fa}</p>
                </div>
              )}
              {game.description_en && (
                <div className="pt-4" style={{ borderTop: `1px solid ${themeStyles.border}` }} dir="ltr">
                  <h3 className="text-xs font-bold mb-2 text-left" style={{ color: themeStyles.subText }}>📄 Original Description:</h3>
                  <p className="text-sm leading-7 text-left font-serif line-clamp-6 hover:line-clamp-none transition duration-300" style={{ color: themeStyles.subText }}>{game.description_en}</p>
                </div>
              )}
            </div>

            {game.trailer_url && (
              <div className="space-y-3">
                <h3 className="text-sm font-black" style={{ color: themeStyles.titleText }}>🎬 ویدیو / تریلر بازی:</h3>
                <div className="w-full rounded-2xl overflow-hidden bg-black shadow-lg" style={{ border: `1px solid ${themeStyles.border}` }}>
                  <video src={game.trailer_url} controls preload="metadata" className="w-full h-auto max-h-[400px] outline-none" poster={getOptimizedUrl(game.background_image, 600)} />
                </div>
              </div>
            )}

            {game.gallery && game.gallery.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-black" style={{ color: themeStyles.titleText }}>📸 گالری تصاویر بازی:</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {game.gallery.map((imgUrl: string, idx: number) => (
                    <div 
                      key={idx} 
                      onClick={() => setActivePhotoIndex(idx)}
                      className="cursor-pointer rounded-xl overflow-hidden hover:border-purple-500 transition shadow-md"
                      style={{ backgroundColor: darkMode ? '#0f172a' : '#ffffff', border: `1px solid ${themeStyles.border}` }}
                    >
                      <img src={getOptimizedUrl(imgUrl, 300)} alt={`screenshot-${idx}`} className="w-full h-24 object-cover" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-4">
              <h3 className="text-sm font-black flex items-center gap-2 mb-1" style={{ color: themeStyles.titleText }}>💻 مشخصات سیستم سخت‌افزاری مورد نیاز:</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div 
                  className="p-4 rounded-xl space-y-3 shadow-sm"
                  style={{ backgroundColor: darkMode ? 'rgba(15, 23, 42, 0.5)' : '#ffffff', border: `1px solid ${themeStyles.border}` }}
                >
                  <div className="text-xs font-bold text-red-500 pb-2 flex items-center justify-between" style={{ borderBottom: `1px solid ${darkMode ? '#0f172a' : '#f1f5f9'}` }}>
                    <span>⚠️ حداقل سیستم مورد نیاز</span>
                    <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold" style={{ backgroundColor: darkMode ? 'rgba(220, 38, 38, 0.15)' : '#fee2e2', color: '#ef4444' }}>Minimum</span>
                  </div>
                  <p className="text-xs leading-6 text-left font-mono whitespace-pre-line" style={{ color: darkMode ? '#cbd5e1' : '#475569' }} dir="ltr">
                    {game.requirements?.minimum || 'مشخصات حداقل سخت‌افزار ثبت نشده است.'}
                  </p>
                </div>
                <div 
                  className="p-4 rounded-xl space-y-3 shadow-sm"
                  style={{ backgroundColor: darkMode ? 'rgba(15, 23, 42, 0.5)' : '#ffffff', border: `1px solid ${themeStyles.border}` }}
                >
                  <div className="text-xs font-bold text-green-600 pb-2 flex items-center justify-between" style={{ borderBottom: `1px solid ${darkMode ? '#0f172a' : '#f1f5f9'}` }}>
                    <span>✅ سیستم پیشنهادی آرشیو</span>
                    <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold" style={{ backgroundColor: darkMode ? 'rgba(22, 163, 74, 0.15)' : '#dcfce7', color: '#16a34a' }}>Recommended</span>
                  </div>
                  <p className="text-xs leading-6 text-left font-mono whitespace-pre-line" style={{ color: darkMode ? '#cbd5e1' : '#475569' }} dir="ltr">
                    {game.requirements?.recommended || 'مشخصات سیستم پیشنهادی ثبت نشده است.'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div 
              className="p-5 rounded-2xl space-y-4 text-sm shadow-sm"
              style={{ backgroundColor: themeStyles.sidebarBg, border: `1px solid ${themeStyles.border}`, color: themeStyles.text }}
            >
              <h3 className="font-black text-base mb-2 pb-2" style={{ color: themeStyles.titleText, borderBottom: `1px solid ${darkMode ? '#020617' : '#f1f5f9'}` }}>📊 اطلاعات عمومی</h3>
              <p>🗓️ تاریخ انتشار: <span className="font-bold" style={{ color: themeStyles.titleText }}>{game.released || '---'}</span></p>
              <p>⭐ امتیاز منتقدین: <span className="text-purple-500 font-bold">{game.rating || '---'} / 5</span></p>
              <p>🔞 رده سنی: <span className="text-red-500 font-bold" dir="ltr">{game.esrb_rating || '---'}</span></p>
              <p>🏢 سازنده/ناشر: <span style={{ color: themeStyles.titleText }} dir="ltr">{game.developers || '---'}</span></p>
              <p>⏱️ زمان اتمام: <span className="text-green-500 font-bold">{game.playtime || '---'} ساعت</span></p>
              
              {game.steam_link && (
                <div className="pt-2">
                  <a 
                    href={getSmartSteamLink(game.steam_link, game.name)} 
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 text-xs transition shadow-lg shadow-purple-900/10"
                  >
                    🎮 مشاهده در استیم (Steam)
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {activePhotoIndex !== null && game.gallery && (
        <div 
          className="fixed inset-0 bg-black/95 z-50 flex flex-col items-center justify-center p-2 md:p-6 select-none" 
          onClick={() => setActivePhotoIndex(null)}
          onTouchStart={() => setActivePhotoIndex(null)}
        >
          <div 
            className="w-full max-w-[92vw] h-[75vh] max-h-[75vh] relative flex items-center justify-center" 
            onClick={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            onTouchMove={handleTouchMove}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div
              className="w-full h-full flex items-center justify-center"
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              <img 
                src={getOptimizedUrl(game.gallery[activePhotoIndex], 1400)} 
                alt="Expanded preview" 
                className="w-full h-full object-contain rounded-xl shadow-2xl transition-all" 
                draggable="false"
              />
            </div>
          </div>

          <div 
            className="flex items-center gap-5 mt-6 bg-slate-900/90 px-6 py-3.5 rounded-2xl border border-slate-800 backdrop-blur-md shadow-2xl" 
            onClick={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
          >
            <button 
              onClick={() => setActivePhotoIndex(activePhotoIndex === 0 ? game.gallery.length - 1 : activePhotoIndex - 1)}
              className="text-white hover:text-purple-400 bg-slate-800 hover:bg-slate-700 transition font-black text-xl w-14 h-12 flex items-center justify-center rounded-xl border border-slate-700 active:scale-90 select-none"
              title="تصویر بعدی"
            >
              ➔
            </button>

            <span className="text-sm font-mono font-bold text-slate-300 bg-slate-950 px-3.5 py-1.5 rounded-lg border border-slate-900 min-w-[60px] text-center">
              {activePhotoIndex + 1} / {game.gallery.length}
            </span>

            <button 
              onClick={() => setActivePhotoIndex(null)} 
              className="px-6 h-12 bg-red-600 hover:bg-red-500 text-white rounded-xl text-sm font-extrabold transition border border-red-700 active:scale-90 flex items-center justify-center gap-1 select-none"
            >
              بستن ×
            </button>

            <button 
              onClick={() => setActivePhotoIndex(activePhotoIndex === game.gallery.length - 1 ? 0 : activePhotoIndex + 1)}
              className="text-white hover:text-purple-400 bg-slate-800 hover:bg-slate-700 transition font-black text-xl w-14 h-12 flex items-center justify-center rounded-xl border border-slate-700 active:scale-90 select-none"
              title="تصویر قبلی"
            >
              ←
            </button>
          </div>
          <p className="text-[11px] text-slate-500 mt-3 block sm:hidden">💡 روی صفحه موبایل می‌توانید با کشیدن انگشت (Swipe) نیز بین عکس‌ها جابجا شوید.</p>
        </div>
      )}
    </div>
  );
}

export default function GameDetailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-400 p-10 text-center animate-pulse transition-colors duration-300">در حال لود سیستم ناوبری...</div>}>
      <GameDetailContent />
    </Suspense>
  );
}
