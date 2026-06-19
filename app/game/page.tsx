/* eslint-disable @next/next/no-img-element */
'use client';

import { useEffect, useState, Suspense, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import localGamesData from '@/data/games.json';

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

  const fetchSmartData = async () => {
    const cacheBuster = Date.now();
    try {
      const res = await fetch(`https://raw.githubusercontent.com/mygarchive/mygarchive.github.io/main/data/games.json?v=${cacheBuster}`, {
        cache: 'no-store'
      });
      if (res.ok) return await res.json();
    } catch (e) {}

    try {
      const res = await fetch(`https://cdn.jsdelivr.net/gh/mygarchive/mygarchive.github.io@main/data/games.json?v=${cacheBuster}`);
      if (res.ok) return await res.json();
    } catch (e) {}

    if (Array.isArray(localGamesData)) return localGamesData;
    throw new Error("دیتابیس در دسترس نیست.");
  };

  useEffect(() => {
    if (!gameId) return;
    fetchSmartData()
      .then((data = []) => {
        const found = data.find((g: any) => g.id.toString() === gameId);
        setGame(found || null);
        setLoading(false);
      })
      .catch((err) => {
        console.error("خطا:", err);
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
    SwipeHandler();
  };

  const SwipeHandler = () => {
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

  const getSmartSteamLink = (steamLink: string) => {
    if (!steamLink || steamLink === '#' || steamLink.includes('search/?term=')) {
      return null;
    }

    const idMatch = steamLink.match(/(?:app\/|term=|check\/app\/)(\d+)/) || steamLink.match(/\/(\d+)\/?/);
    const appId = idMatch ? idMatch[1] : null;

    if (appId) {
      return `https://store.steampowered.com/app/${appId}`;
    }

    if (steamLink.startsWith('http') && !steamLink.includes('search')) {
      return steamLink;
    }

    return null;
  };

  const convertToEmbedUrl = (url: string) => {
    if (!url) return '';
    if (url.includes('youtube.com/embed/')) return url;
    
    let videoId = null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    
    if (match && match[2].length === 11) {
      videoId = match[2];
    }
    
    return videoId ? `https://www.youtube.com/embed/${videoId}` : url;
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
    opacity: darkMode ? '#020617' : '#f1f5f9',
    footerBg: darkMode ? '#0f172a' : '#ffffff'
  };

  if (loading || !game) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center text-sm animate-pulse transition-colors duration-300"
        style={{ backgroundColor: themeStyles.bg, color: themeStyles.subText }}
      >
        در حال بارگذاری اطلاعات بازی...
      </div>
    );
  }

  const validSteamUrl = game?.steam_link ? getSmartSteamLink(game.steam_link) : null;

  return (
    <div 
      className="min-h-screen p-6 md:p-12 relative overflow-hidden flex flex-col justify-between transition-colors duration-300" 
      dir="rtl"
      style={{ backgroundColor: themeStyles.bg, color: themeStyles.text }}
    >
      <div 
        className="absolute inset-0 bg-cover bg-center blur-sm pointer-events-none transform scale-105 transition-all"
        style={{ backgroundImage: `url(${game?.background_image})`, opacity: darkMode ? 0.15 : 0.08 }}
      />

      <div className="max-w-4xl mx-auto relative z-10 w-full flex-grow">
        
        <header 
          className="mb-6 flex justify-between items-center gap-4 pb-4"
          style={{ borderBottom: `1px solid ${themeStyles.border}` }}
        >
          <Link 
            href="/" 
            className="inline-flex items-center gap-2 text-xs px-4 py-2 rounded-xl transition font-bold"
            style={{ backgroundColor: themeStyles.btnBg, border: `1px solid ${themeStyles.btnBorder}`, color: themeStyles.btnText }}
          >
            ➔ بازگشت به صفحه اصلی آرشیو
          </Link>
        </header>

        <div 
          className="w-full rounded-2xl overflow-hidden shadow-xl mb-8 flex justify-center items-center"
          style={{ backgroundColor: darkMode ? '#0f172a' : '#ffffff', border: `1px solid ${themeStyles.border}` }}
        >
          <img src={getOptimizedUrl(game?.background_image, 800)} alt={game?.name || 'Game Image'} className="w-full h-auto object-cover max-h-[450px]" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-6">
            <div>
              <h1 className="text-3xl font-black text-left tracking-tight" style={{ color: themeStyles.titleText }} dir="ltr">{game?.name}</h1>
              <div className="flex flex-wrap gap-2 mt-3" dir="ltr">
                {game?.genres?.map((g: any) => (
                  <span 
                    key={g?.id || g?.name} 
                    className="text-xs font-bold px-2.5 py-1 rounded-md"
                    style={{ backgroundColor: darkMode ? '#0f172a' : '#ffffff', border: `1px solid ${themeStyles.border}`, color: themeStyles.subText }}
                  >
                    {g?.name}
                  </span>
                ))}
              </div>
            </div>

            <div 
              className="space-y-5 p-6 rounded-2xl shadow-sm"
              style={{ backgroundColor: themeStyles.cardBg, border: `1px solid ${themeStyles.border}` }}
            >
              {game?.description_fa && (
                <div>
                  <h3 className="text-sm font-bold text-purple-500 mb-2">✍️ توضیحات بازی (ترجمه فارسی):</h3>
                  <p className="text-base leading-8 text-justify font-normal" style={{ color: darkMode ? '#e2e8f0' : '#334155' }}>{game.description_fa}</p>
                </div>
              )}
              {game?.description_en && (
                <div className="pt-4" style={{ borderTop: `1px solid ${themeStyles.border}` }} dir="ltr">
                  <h3 className="text-xs font-bold mb-2 text-left" style={{ color: themeStyles.subText }}>📄 Original Description:</h3>
                  <p className="text-sm leading-7 text-left font-serif line-clamp-6 hover:line-clamp-none transition duration-300" style={{ color: themeStyles.subText }}>{game.description_en}</p>
                </div>
              )}
            </div>

            {((game?.youtube_videos && game.youtube_videos.length > 0) || game?.trailer_url) && (
              <div className="space-y-4">
                <h3 className="text-sm font-black flex items-center gap-2" style={{ color: themeStyles.titleText }}>🎬 ویدیوها و گیم‌پلی بازی (یوتیوب):</h3>
                <div className="space-y-4">
                  {game?.youtube_videos && game.youtube_videos.map((vidUrl: string, idx: number) => (
                    <div key={idx} className="w-full rounded-2xl overflow-hidden bg-black shadow-lg aspect-video" style={{ border: `1px solid ${themeStyles.border}` }}>
                      <iframe
                        src={convertToEmbedUrl(vidUrl)}
                        title={`${game?.name || 'Game'} Video ${idx + 1}`}
                        className="w-full h-full border-0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      ></iframe>
                    </div>
                  ))}
                  
                  {game?.trailer_url && !game.youtube_videos?.includes(game.trailer_url) && (
                    <div className="w-full rounded-2xl overflow-hidden bg-black shadow-lg" style={{ border: `1px solid ${themeStyles.border}` }}>
                      {game.trailer_url.includes('youtube.com') || game.trailer_url.includes('youtu.be') ? (
                        <div className="aspect-video w-full">
                          <iframe
                            src={convertToEmbedUrl(game.trailer_url)}
                            title="Game Trailer"
                            className="w-full h-full border-0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          ></iframe>
                        </div>
                      ) : (
                        <video src={game.trailer_url} controls preload="metadata" className="w-full h-auto max-h-[400px] outline-none" poster={getOptimizedUrl(game.background_image, 600)} />
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {game?.gallery && game.gallery.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-black" style={{ color: themeStyles.titleText }}>📸 گالری تصاویر بازی:</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {game.gallery.slice(0, 10).map((imgUrl: string, idx: number) => (
                    <div 
                      key={idx} 
                      onClick={() => setActivePhotoIndex(idx)}
                      className="cursor-pointer rounded-xl overflow-hidden hover:border-purple-500 hover:scale-[1.02] transition duration-300 shadow-md aspect-video"
                      style={{ backgroundColor: darkMode ? '#0f172a' : '#ffffff', border: `1px solid ${themeStyles.border}` }}
                    >
                      <img src={getOptimizedUrl(imgUrl, 400)} alt={`screenshot-${idx}`} className="w-full h-full object-cover" />
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
                    {game?.requirements?.minimum || 'مشخصات حداقل سخت‌افزار ثبت نشده است.'}
                  </p>
                </div>
                <div 
                  className="p-4 rounded-xl space-y-3 shadow-sm"
                  style={{ backgroundColor: darkMode ? 'rgba(22, 163, 74, 0.05)' : '#ffffff', border: `1px solid ${themeStyles.border}` }}
                >
                  <div className="text-xs font-bold text-green-600 pb-2 flex items-center justify-between" style={{ borderBottom: `1px solid ${darkMode ? '#0f172a' : '#f1f5f9'}` }}>
                    <span>✅ سیستم پیشنهادی آرشیو</span>
                    <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold" style={{ backgroundColor: darkMode ? 'rgba(22, 163, 74, 0.15)' : '#dcfce7', color: '#16a34a' }}>Recommended</span>
                  </div>
                  <p className="text-xs leading-6 text-left font-mono whitespace-pre-line" style={{ color: darkMode ? '#cbd5e1' : '#475569' }} dir="ltr">
                    {game?.requirements?.recommended || 'مشخصات سیستم پیشنهادی ثبت نشده است.'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div 
              className="p-5 rounded-2xl space-y-4 text-sm shadow-sm relative z-20"
              style={{ backgroundColor: themeStyles.sidebarBg, border: `1px solid ${themeStyles.border}`, color: themeStyles.text }}
            >
              <h3 className="font-black text-base mb-2 pb-2" style={{ color: themeStyles.titleText, borderBottom: `1px solid ${darkMode ? '#020617' : '#f1f5f9'}` }}>📊 اطلاعات عمومی</h3>
              <p>🗓️ تاریخ انتشار: <span className="font-bold" style={{ color: themeStyles.titleText }}>{game?.released || '---'}</span></p>
              
              {/* نمایش نمره منتقدین متاکریتیک (رسانه‌ها) */}
              {game?.metacritic ? (
                <p>🎯 امتیاز منتقدین (متاکریتیک): <span className="text-green-500 font-bold">{game.metacritic} / 100</span></p>
              ) : (
                <p>🎯 امتیاز منتقدین (متاکریتیک): <span className="text-slate-400 font-bold">نامشخص</span></p>
              )}

              <p>🔞 رده سنی: <span className="text-red-500 font-bold" dir="ltr">{game?.esrb_rating || '---'}</span></p>
              <p>🏢 سازنده/ناشر: <span style={{ color: themeStyles.titleText }} dir="ltr">{game?.developers || '---'}</span></p>
              <p>⏱️ زمان اتمام: <span className="text-blue-500 font-bold">{game?.playtime || '---'} ساعت</span></p>
              
              {validSteamUrl && (
                <div className="pt-2">
                  <a 
                    href={validSteamUrl} 
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

      <footer 
        className="mt-16 p-6 rounded-2xl border text-center space-y-4 max-w-4xl mx-auto w-full relative z-10"
        style={{ backgroundColor: themeStyles.footerBg, borderColor: themeStyles.border }}
      >
        <p className="text-xs leading-6 font-semibold" style={{ color: themeStyles.subText }}>
          ⚖️ تمامی حقوق مادی و معنوی مربوط به محتوای این بازی، متعلق به سازندگان و ناشران اصلی آن می‌باشد.
        </p>
      </footer>

      {PhotoModalRender(activePhotoIndex, game, setActivePhotoIndex, handleTouchMove, handleTouchStart, handleTouchEnd)}
    </div>
  );
}

// توابع کمکی برای جلوگیری از شلوغی
function PhotoModalRender(activePhotoIndex: any, game: any, setActivePhotoIndex: any, TouchMoveHandler: any, TouchStartHandler: any, TouchEndHandler: any) {
  if (activePhotoIndex === null || !game.gallery) return null;
  return (
    <div 
      className="fixed inset-0 bg-black/95 z-50 flex flex-col items-center justify-center p-2 md:p-6 select-none" 
      onClick={() => setActivePhotoIndex(null)}
    >
      <div 
        className="w-full max-w-[92vw] h-[75vh] max-h-[75vh] relative flex items-center justify-center" 
        onClick={(e) => e.stopPropagation()}
        onTouchMove={TouchMoveHandler}
      >
        <div className="w-full h-full flex items-center justify-center" onTouchStart={TouchStartHandler} onTouchEnd={TouchEndHandler}>
          <img 
            src={`https://images.weserv.nl/?url=${encodeURIComponent(game.gallery[activePhotoIndex].replace(/^https?:\/\//i, ''))}&w=1400&q=80`} 
            alt="Expanded preview" 
            className="w-full h-full object-contain rounded-xl shadow-2xl transition-all" 
            draggable="false"
          />
        </div>
      </div>

      <div 
        className="flex items-center gap-5 mt-6 bg-slate-900/90 px-6 py-3.5 rounded-2xl border border-slate-800 backdrop-blur-md shadow-2xl" 
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          onClick={() => setActivePhotoIndex(activePhotoIndex === 0 ? game.gallery.length - 1 : activePhotoIndex - 1)}
          className="text-white hover:text-purple-400 bg-slate-800 hover:bg-slate-700 transition font-black text-xl w-14 h-12 flex items-center justify-center rounded-xl border border-slate-700 active:scale-90"
        >
          ➔
        </button>

        <span className="text-sm font-mono font-bold text-slate-300 bg-slate-950 px-3.5 py-1.5 rounded-lg border border-slate-900 min-w-[60px] text-center">
          {activePhotoIndex + 1} / {Math.min(game.gallery.length, 10)}
        </span>

        <button 
          onClick={() => setActivePhotoIndex(null)} 
          className="px-6 h-12 bg-red-600 hover:bg-red-500 text-white rounded-xl text-sm font-extrabold transition border border-red-700 active:scale-90"
        >
          بستن ×
        </button>

        <button 
          onClick={() => setActivePhotoIndex(activePhotoIndex === game.gallery.length - 1 ? 0 : activePhotoIndex + 1)}
          className="text-white hover:text-purple-400 bg-slate-800 hover:bg-slate-700 transition font-black text-xl w-14 h-12 flex items-center justify-center rounded-xl border border-slate-700 active:scale-90"
        >
          ←
        </button>
      </div>
    </div>
  )
}

export default function GameDetailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-400 p-10 text-center animate-pulse transition-colors duration-300">در حال لود سیستم ناوبری...</div>}>
      <GameDetailContent />
    </Suspense>
  );
}
