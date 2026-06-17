'use client';

import { useEffect, useState, Suspense, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

function GameDetailContent() {
  const searchParams = useSearchParams();
  const gameId = searchParams.get('id');
  const [game, setGame] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activePhotoIndex, setActivePhotoIndex] = useState<number | null>(null);
  const [darkMode, setDarkMode] = useState(true);

  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);

  // لود همگام وضعیت تم سراسری از روی حافظه محلی سیستم
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

  // تابع هوشمند چندمرحله‌ای لود بازی تکی از لایه‌های کش واسط جهت سرعت حداکثری در ایران
  const fetchSmartData = async () => {
    try {
      const res = await fetch('https://cdn.statically.io/gh/mygarchive/mygarchive.github.io/main/data/games.json');
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn("CDN اول ناموفق بود، سوئیچ به CDN دوم...", e);
    }

    try {
      const res = await fetch('https://cdn.jsdelivr.net/gh/mygarchive/mygarchive.github.io@main/data/games.json');
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn("CDN دوم ناموفق بود، سوئیچ به گیت‌هاب مستقیم...", e);
    }

    const directRes = await fetch('https://api.github.com/repos/mygarchive/mygarchive.github.io/contents/data/games.json?v=' + Date.now());
    if (directRes.ok) {
      const repoData = await directRes.json();
      if (repoData && repoData.content) {
        const content = decodeURIComponent(atob(repoData.content).split('').map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
        return JSON.parse(content);
      }
    }
    throw new Error("دیتابیس در دسترس نیست.");
  };

  useEffect(() => {
    if (!gameId) return;
    
    fetchSmartData()
      .then((data = []) => {
        const found = data.find((g: any) => g.id.toString() === gameId);
        setGame(found);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
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

  const handleTouchEnd = (e: React.TouchEvent) => {
    touchEndX.current = e.changedTouches[0].clientX;
    handleSwipe();
  };

  const handleSwipe = () => {
    if (activePhotoIndex === null || !game?.gallery) return;

    const swipeDistance = touchStartX.current - touchEndX.current;
    const minSwipeDistance = 50;

    if (swipeDistance > minSwipeDistance) {
      const nextIndex = activePhotoIndex === game.gallery.length - 1 ? 0 : activePhotoIndex + 1;
      setActivePhotoIndex(nextIndex);
    } else if (swipeDistance < -minSwipeDistance) {
      const prevIndex = activePhotoIndex === 0 ? game.gallery.length - 1 : activePhotoIndex - 1;
      setActivePhotoIndex(prevIndex);
    }
  };

  // تابع مهندسی شده و هوشمند برای فیکس ۱۰۰٪ دکمه استیم و باز کردن مستقیم کلاینت یا صفحه رسمی وب
  const getSmartSteamLink = (steamLink: string, fallbackName: string) => {
    if (!steamLink || steamLink === '#') {
      if (fallbackName) return `steam://openurl/https://store.steampowered.com/search/?term=${encodeURIComponent(fallbackName)}`;
      return '#';
    }
    
    // ۱. بررسی وجود ساختار آیدی عددی مستقیم در رشته آدرس داده شده
    const idMatch = steamLink.match(/(?:app\/|term=)(\d+)/) || steamLink.match(/\/(\d+)\/?/);
    const appId = idMatch ? idMatch[1] : null;

    if (appId) {
      // اجرای مستقیم برنامه استیم سیستم کاربر به صفحه دقیق خود بازی بدون رفتن به تب سرچ کلاینت
      return `steam://openurl/https://store.steampowered.com/app/${appId}`;
    }

    // ۲. اگر لینک به شکل سرچ خام ذخیره شده بود، برای رفع باگ آن را فیلتر و بازسازی اختصاصی می‌کنیم
    if (steamLink.includes('search') || steamLink.includes('term=')) {
      if (fallbackName) {
        return `steam://openurl/https://store.steampowered.com/search/?term=${encodeURIComponent(fallbackName)}`;
      }
    }

    // ۳. اگر هیچکدام نبود ولی آدرس معتبر بود، پروتکل نیتیو استیم را به ابتدای آن متصل می‌کنیم
    if (steamLink.startsWith('http')) {
      return `steam://openurl/${steamLink}`;
    }

    return steamLink;
  };

  if (loading) return <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center text-sm animate-pulse text-slate-500 dark:text-slate-400">در حال دریافت سریع اطلاعات بازی...</div>;
  if (!game) return <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center text-sm text-red-500">بازی مورد نظر در آرشیو یافت نشد.</div>;

  const getOptimizedUrl = (url: string, width = 800) => {
    if (!url) return '';
    const cleanUrl = url.replace(/^https?:\/\//i, '');
    return `https://images.weserv.nl/?url=${encodeURIComponent(cleanUrl)}&w=${width}&q=80`;
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 p-6 md:p-12 relative overflow-hidden transition-colors duration-300" dir="rtl">
      
      {/* افکت پس‌زمینه اصلاح شده: بلور روی blur-sm جهت شفافیت بیشتر و وضوح پوستر بازی در پشت صفحه */}
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-[0.08] dark:opacity-[0.15] blur-sm pointer-events-none transform scale-105 transition-all"
        style={{ backgroundImage: `url(${game.background_image})` }}
      />

      <div className="max-w-4xl mx-auto relative z-10">
        <header className="mb-6 flex justify-between items-center gap-4 border-b border-slate-200 dark:border-slate-900 pb-4">
          <Link href="/" className="inline-flex items-center gap-2 text-xs text-purple-600 dark:text-purple-400 hover:text-purple-500 bg-purple-100 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900/40 px-4 py-2 rounded-xl transition">
            ➔ بازگشت به صفحه اصلی آرشیو
          </Link>
        </header>

        {/* پوستر اصلی بازی */}
        <div className="w-full rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-900 shadow-xl bg-white dark:bg-slate-900 mb-8 flex justify-center items-center">
          <img src={getOptimizedUrl(game.background_image, 800)} alt={game.name} className="w-full h-auto object-cover max-h-[450px]" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-6">
            <div>
              <h1 className="text-3xl font-black text-slate-900 dark:text-white text-left tracking-tight" dir="ltr">{game.name}</h1>
              <div className="flex flex-wrap gap-2 mt-3" dir="ltr">
                {game.genres?.map((g: any) => (
                  <span key={g.id || g.name} className="text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2.5 py-1 rounded-md text-slate-500 dark:text-slate-400">{g.name}</span>
                ))}
              </div>
            </div>

            {/* بخش توضیحات فارسی و انگلیسی کامل */}
            <div className="space-y-5 bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-900 p-6 rounded-2xl shadow-sm dark:shadow-none">
              {game.description_fa && (
                <div>
                  <h3 className="text-sm font-bold text-purple-600 dark:text-purple-400 mb-2">✍️ توضیحات بازی (ترجمه فارسی):</h3>
                  <p className="text-base text-slate-700 dark:text-slate-200 leading-8 text-justify font-normal">{game.description_fa}</p>
                </div>
              )}
              {game.description_en && (
                <div className="pt-4 border-t border-slate-100 dark:border-slate-900" dir="ltr">
                  <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 mb-2 text-left">📄 Original Description:</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 leading-7 text-left font-serif line-clamp-6 hover:line-clamp-none transition duration-300">{game.description_en}</p>
                </div>
              )}
            </div>

            {/* ویدیوی پیش‌نمایش / تریلر بازی */}
            {game.trailer_url && (
              <div className="space-y-3">
                <h3 className="text-sm font-black text-slate-900 dark:text-white">🎬 ویدیو / تریلر بازی:</h3>
                <div className="w-full rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-900 bg-black shadow-lg">
                  <video src={game.trailer_url} controls preload="metadata" className="w-full h-auto max-h-[400px] outline-none" poster={getOptimizedUrl(game.background_image, 600)} />
                </div>
              </div>
            )}

            {/* گالری تصاویر پیشرفته */}
            {game.gallery && game.gallery.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-black text-slate-900 dark:text-white">📸 گالری تصاویر بازی:</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {game.gallery.map((imgUrl: string, idx: number) => (
                    <div 
                      key={idx} 
                      onClick={() => setActivePhotoIndex(idx)}
                      className="cursor-pointer rounded-xl overflow-hidden border border-slate-200 dark:border-slate-900 bg-white dark:bg-slate-900 hover:border-purple-500 transition shadow-sm"
                    >
                      <img src={getOptimizedUrl(imgUrl, 300)} alt={`screenshot-${idx}`} className="w-full h-24 object-cover" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* مشخصات سخت‌افزاری کامل سیستم */}
            <div className="space-y-4">
              <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2 mb-1">💻 مشخصات سیستم سخت‌افزاری مورد نیاز:</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-900 p-4 rounded-xl space-y-3 shadow-sm dark:shadow-none">
                  <div className="text-xs font-bold text-red-500 dark:text-red-400 border-b border-slate-100 dark:border-slate-900 pb-2 flex items-center justify-between">
                    <span>⚠️ حداقل سیستم مورد نیاز</span>
                    <span className="text-[10px] bg-red-50 dark:bg-red-950/40 px-2 py-0.5 rounded border border-red-200 dark:border-red-900/50">Minimum</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-6 text-left font-mono whitespace-pre-line" dir="ltr">
                    {game.requirements?.minimum || 'مشخصات حداقل سخت‌افزار ثبت نشده است.'}
                  </p>
                </div>
                <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-900 p-4 rounded-xl space-y-3 shadow-sm dark:shadow-none">
                  <div className="text-xs font-bold text-green-600 dark:text-green-400 border-b border-slate-100 dark:border-slate-900 pb-2 flex items-center justify-between">
                    <span>✅ سیستم پیشنهادی آرشیو</span>
                    <span className="text-[10px] bg-green-50 dark:bg-green-950/40 px-2 py-0.5 rounded border border-green-200 dark:border-green-900/50">Recommended</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-6 text-left font-mono whitespace-pre-line" dir="ltr">
                    {game.requirements?.recommended || 'مشخصات سیستم پیشنهادی ثبت نشده است.'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* سایدبار اطلاعات عمومی بازی */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/60 p-5 rounded-2xl space-y-4 text-sm text-slate-600 dark:text-slate-300 shadow-sm dark:shadow-none transition-colors duration-300">
              <h3 className="font-black text-slate-900 dark:text-white text-base mb-2 border-b border-slate-100 dark:border-slate-900 pb-2">📊 اطلاعات عمومی</h3>
              <p>🗓️ تاریخ انتشار: <span className="text-slate-900 dark:text-slate-100 font-bold">{game.released || '---'}</span></p>
              <p>⭐ امتیاز منتقدین: <span className="text-purple-600 dark:text-purple-400 font-bold">{game.rating || '---'} / 5</span></p>
              <p>🔞 رده سنی: <span className="text-red-500 dark:text-red-400 font-bold" dir="ltr">{game.esrb_rating || '---'}</span></p>
              <p>🏢 سازنده/ناشر: <span className="text-slate-800 dark:text-slate-100" dir="ltr">{game.developers || '---'}</span></p>
              <p>⏱️ زمان اتمام: <span className="text-green-600 dark:text-green-400 font-bold">{game.playtime || '---'} ساعت</span></p>
              
              {game.steam_link && (
                <div className="pt-2">
                  {/* دکمه هوشمند فیکس شده با لایه مانیتورینگ متغیر نام اختصاصی بازی */}
                  <a 
                    href={getSmartSteamLink(game.steam_link, game.name)} 
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

      {/* باکس نمایش تمام صفحه تصاویر - برطرف کننده کامل باگ لمس در اندروید و iOS */}
      {activePhotoIndex !== null && game.gallery && (
        <div 
          className="fixed inset-0 bg-black/95 z-50 flex flex-col items-center justify-center p-2 md:p-6 cursor-zoom-out select-none" 
          onClick={() => setActivePhotoIndex(null)}
          onTouchStart={() => setActivePhotoIndex(null)} // شلیک پد لمسی اختصاصی برای واکنش سریع در موبایل
        >
          <div 
            className="w-full max-w-[92vw] h-[78vh] max-h-[78vh] relative flex items-center justify-center" 
            onClick={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()} // جلوگیری از بسته شدن هنگام کلیک یا لمس روی خود عکس
          >
            <img 
              src={getOptimizedUrl(game.gallery[activePhotoIndex], 1400)} 
              alt="Expanded preview" 
              className="w-full h-full object-contain rounded-xl shadow-2xl transition-all duration-150" 
            />
          </div>

          <div 
            className="flex items-center gap-6 mt-4 bg-slate-900/80 px-5 py-2.5 rounded-full border border-slate-800/70 backdrop-blur-md" 
            onClick={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()} // عدم انتشار کلیک دکمه‌های کنترل بار به بیرون
          >
            <button 
              onClick={() => setActivePhotoIndex(activePhotoIndex === 0 ? game.gallery.length - 1 : activePhotoIndex - 1)}
              className="text-slate-400 hover:text-white transition font-bold text-sm px-1"
            >
              ➔
            </button>
            <span className="text-xs font-mono font-bold text-slate-300 bg-slate-950 px-2.5 py-0.5 rounded">
              {activePhotoIndex + 1} / {game.gallery.length}
            </span>

            <button 
              onClick={() => setActivePhotoIndex(null)} 
              className="px-3 py-0.5 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white rounded text-xs font-bold transition border border-red-500/20"
            >
              بستن ×
            </button>

            <button 
              onClick={() => setActivePhotoIndex(activePhotoIndex === game.gallery.length - 1 ? 0 : activePhotoIndex + 1)}
              className="text-slate-400 hover:text-white transition font-bold text-sm px-1"
            >
              ←
            </button>
          </div>
          <p className="text-[10px] text-slate-500 mt-2 block sm:hidden">💡 روی موبایل می‌توانید تصویر را به چپ یا راست بکشید (Swipe).</p>
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
