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

  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);

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

  // استخراج آیدی استیم برای باز شدن مستقیم داخل اپلیکیشن استیم موبایل (Deep Link) بدون باگ و سرچ مجدد
  const getSteamAppUrl = (steamLink: string) => {
    if (!steamLink) return '#';
    const match = steamLink.match(/\/app\/(\d+)/);
    if (match && match[1]) {
      return `steam://store/${match[1]}`;
    }
    return steamLink;
  };

  if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-sm animate-pulse text-slate-400">در حال دریافت سریع اطلاعات بازی...</div>;
  if (!game) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-sm text-red-400">بازی مورد نظر در آرشیو یافت نشد.</div>;

  const getOptimizedUrl = (url: string, width = 800) => {
    if (!url) return '';
    const cleanUrl = url.replace(/^https?:\/\//i, '');
    return `https://images.weserv.nl/?url=${encodeURIComponent(cleanUrl)}&w=${width}&q=80`;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-12 relative overflow-hidden" dir="rtl">
      {/* افکت پس‌زمینه اصلاح‌شده: بلور ملایم‌تر (blur-md) و وضوح بیشتر (opacity-15) برای نمایش واضح کاور اصلی بازی */}
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-[0.15] blur-md pointer-events-none transform scale-105"
        style={{ backgroundImage: `url(${game.background_image})` }}
      />

      <div className="max-w-4xl mx-auto relative z-10">
        <header className="mb-6">
          <Link href="/" className="inline-flex items-center gap-2 text-xs text-purple-400 hover:text-purple-300 transition bg-purple-950/30 border border-purple-900/40 px-4 py-2 rounded-xl">
            ➔ بازگشت به صفحه اصلی آرشیو
          </Link>
        </header>

        {/* پوستر اصلی بازی */}
        <div className="w-full rounded-2xl overflow-hidden border border-slate-900 shadow-2xl bg-slate-900 mb-8 flex justify-center items-center">
          <img src={getOptimizedUrl(game.background_image, 800)} alt={game.name} className="w-full h-auto object-cover max-h-[450px]" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-6">
            <div>
              <h1 className="text-3xl font-black text-white text-left tracking-tight" dir="ltr">{game.name}</h1>
              <div className="flex flex-wrap gap-2 mt-3" dir="ltr">
                {game.genres?.map((g: any) => (
                  <span key={g.id || g.name} className="text-xs font-bold bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-md text-slate-400">{g.name}</span>
                ))}
              </div>
            </div>

            {/* بخش توضیحات فارسی و انگلیسی کامل */}
            <div className="space-y-5 bg-slate-900/40 border border-slate-900 p-6 rounded-2xl">
              {game.description_fa && (
                <div>
                  <h3 className="text-sm font-bold text-purple-400 mb-2">✍️ توضیحات بازی (ترجمه فارسی):</h3>
                  <p className="text-base text-slate-200 leading-8 text-justify font-normal">{game.description_fa}</p>
                </div>
              )}
              {game.description_en && (
                <div className="pt-4 border-t border-slate-900" dir="ltr">
                  <h3 className="text-xs font-bold text-slate-500 mb-2 text-left">📄 Original Description:</h3>
                  <p className="text-sm text-slate-400 leading-7 text-left font-serif line-clamp-6 hover:line-clamp-none transition duration-300">{game.description_en}</p>
                </div>
              )}
            </div>

            {/* ویدیوی پیش‌نمایش / تریلر بازی */}
            {game.trailer_url && (
              <div className="space-y-3">
                <h3 className="text-sm font-black text-white">🎬 ویدیو / تریلر بازی:</h3>
                <div className="w-full rounded-2xl overflow-hidden border border-slate-900 bg-slate-950 shadow-lg">
                  <video src={game.trailer_url} controls preload="metadata" className="w-full h-auto max-h-[400px] outline-none" poster={getOptimizedUrl(game.background_image, 600)} />
                </div>
              </div>
            )}

            {/* گالری تصاویر پیشرفته */}
            {game.gallery && game.gallery.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-black text-white">📸 گالری تصاویر بازی:</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {game.gallery.map((imgUrl: string, idx: number) => (
                    <div 
                      key={idx} 
                      onClick={() => setActivePhotoIndex(idx)}
                      className="cursor-pointer rounded-xl overflow-hidden border border-slate-900 bg-slate-900 hover:border-purple-500 transition shadow-md"
                    >
                      <img src={getOptimizedUrl(imgUrl, 300)} alt={`screenshot-${idx}`} className="w-full h-24 object-cover" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* مشخصات سخت‌افزاری کامل سیستم */}
            <div className="space-y-4">
              <h3 className="text-sm font-black text-white flex items-center gap-2 mb-1">💻 مشخصات سیستم سخت‌افزاری مورد نیاز:</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-slate-900/50 border border-slate-900 p-4 rounded-xl space-y-3">
                  <div className="text-xs font-bold text-red-400 border-b border-slate-900 pb-2 flex items-center justify-between">
                    <span>⚠️ حداقل سیستم مورد نیاز</span>
                    <span className="text-[10px] bg-red-950/40 px-2 py-0.5 rounded border border-red-900/50">Minimum</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-6 text-left font-mono whitespace-pre-line" dir="ltr">
                    {game.requirements?.minimum || 'مشخصات حداقل سخت‌افزار ثبت نشده است.'}
                  </p>
                </div>
                <div className="bg-slate-900/50 border border-slate-900 p-4 rounded-xl space-y-3">
                  <div className="text-xs font-bold text-green-400 border-b border-slate-900 pb-2 flex items-center justify-between">
                    <span>✅ سیستم پیشنهادی آرشیو</span>
                    <span className="text-[10px] bg-green-950/40 px-2 py-0.5 rounded border border-green-900/50">Recommended</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-6 text-left font-mono whitespace-pre-line" dir="ltr">
                    {game.requirements?.recommended || 'مشخصات سیستم پیشنهادی ثبت نشده است.'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* سایدبار اطلاعات عمومی بازی */}
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800/60 p-5 rounded-2xl space-y-4 text-sm text-slate-300">
              <h3 className="font-black text-white text-base mb-2 border-b border-slate-900 pb-2">📊 اطلاعات عمومی</h3>
              <p>🗓️ تاریخ انتشار: <span className="text-slate-100 font-bold">{game.released || '---'}</span></p>
              <p>⭐ امتیاز منتقدین: <span className="text-purple-400 font-bold">{game.rating || '---'} / 5</span></p>
              <p>🔞 رده سنی: <span className="text-red-400 font-bold" dir="ltr">{game.esrb_rating || '---'}</span></p>
              <p>🏢 سازنده/ناشر: <span className="text-slate-100" dir="ltr">{game.developers || '---'}</span></p>
              <p>⏱️ زمان اتمام: <span className="text-green-400 font-bold">{game.playtime || '---'} ساعت</span></p>
              
              {game.steam_link && (
                <div className="pt-2 space-y-2">
                  {/* دکمه اول: لینک مستقیم و عمیق به اپلیکیشن اختصاصی استیم روی موبایل */}
                  <a href={getSteamAppUrl(game.steam_link)} className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 text-xs transition duration-200">
                    📱 باز کردن مستقیم در اپ استیم موبایل
                  </a>
                  {/* دکمه دوم: باز کردن نسخه تحت وب استیم در مرورگر به عنوان جایگزین */}
                  <a href={game.steam_link} target="_blank" rel="noopener noreferrer" className="w-full py-2 bg-[#171a21] hover:bg-[#2a475e] text-slate-400 rounded-xl flex items-center justify-center gap-2 text-[11px] transition duration-200">
                    🌐 باز کردن نسخه تحت وب استیم
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* باکس نمایش تمام صفحه تصاویر کاملاً بهینه‌سازی شده برای موبایل و دکمه ضربدر پایین صفحه */}
      {activePhotoIndex !== null && game.gallery && (
        <div 
          className="fixed inset-0 bg-black/95 z-50 flex flex-col items-center justify-center p-2 md:p-6 cursor-zoom-out select-none" 
          onClick={() => setActivePhotoIndex(null)} // کلیک در فضای بیرون یا پس‌زمینه عکس گالری را می‌بندد
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <div className="w-full max-w-[92vw] h-[78vh] max-h-[78vh] relative flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
            <img 
              src={getOptimizedUrl(game.gallery[activePhotoIndex], 1400)} 
              alt="Expanded preview" 
              className="w-full h-full object-contain rounded-xl shadow-2xl transition-all duration-150" 
            />
          </div>

          {/* کنترل بار گالری منتقل شده به پایین صفحه جهت دسترسی راحت شست در موبایل */}
          <div className="flex items-center gap-6 mt-4 bg-slate-900/80 px-5 py-2.5 rounded-full border border-slate-800/70 backdrop-blur-md" onClick={(e) => e.stopPropagation()}>
            <button 
              onClick={() => setActivePhotoIndex(activePhotoIndex === 0 ? game.gallery.length - 1 : activePhotoIndex - 1)}
              className="text-slate-400 hover:text-white transition font-bold text-sm px-1"
            >
              ➔
            </button>
            <span className="text-xs font-mono font-bold text-slate-300 bg-slate-950 px-2.5 py-0.5 rounded">
              {activePhotoIndex + 1} / {game.gallery.length}
            </span>

            {/* دکمه ضربدر اصلاح شده در پایین صفحه در دسترس شست */}
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
    <Suspense fallback={<div className="min-h-screen bg-slate-950 text-slate-400 p-10 text-center animate-pulse">در حال لود سیستم ناوبری...</div>}>
      <GameDetailContent />
    </Suspense>
  );
}
