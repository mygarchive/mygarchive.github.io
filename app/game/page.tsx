'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

function GameDetailContent() {
  const searchParams = useSearchParams();
  const gameId = searchParams.get('id');
  const [game, setGame] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activePhotoIndex, setActivePhotoIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!gameId) return;
    fetch('https://api.github.com/repos/mygarchive/mygarchive.github.io/contents/data/games.json?v=' + Date.now())
      .then((res) => res.json())
      .then((repoData) => {
        if (repoData && repoData.content) {
          const content = decodeURIComponent(atob(repoData.content).split('').map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
          const data = JSON.parse(content);
          const found = data.find((g: any) => g.id.toString() === gameId);
          setGame(found);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, [gameId]);

  useEffect(() => {
    if (activePhotoIndex === null || !game?.gallery) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setActivePhotoIndex(null);
      if (e.key === 'ArrowLeft') {
        setActivePhotoIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : game.gallery.length - 1));
      }
      if (e.key === 'ArrowRight') {
        setActivePhotoIndex((prev) => (prev !== null && prev < game.gallery.length - 1 ? prev + 1 : 0));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activePhotoIndex, game]);

  if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-sm animate-pulse text-slate-400">در حال دریافت اطلاعات بازی...</div>;
  if (!game) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-sm text-red-400">بازی مورد نظر در آرشیو یافت نشد.</div>;

  const getOptimizedUrl = (url: string, width = 300) => {
    if (!url) return '';
    const cleanUrl = url.replace(/^https?:\/\//i, '');
    return `https://images.weserv.nl/?url=${encodeURIComponent(cleanUrl)}&w=${width}&q=80`;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-12 relative overflow-hidden" dir="rtl">
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-[0.07] blur-3xl pointer-events-none transform scale-110"
        style={{ backgroundImage: `url(${game.background_image})` }}
      />

      <div className="max-w-4xl mx-auto relative z-10">
        <header className="mb-6">
          <Link href="/" className="inline-flex items-center gap-2 text-xs text-purple-400 hover:text-purple-300 transition bg-purple-950/30 border border-purple-900/40 px-4 py-2 rounded-xl">
            ➔ بازگشت به صفحه اصلی آرشیو
          </Link>
        </header>

        <div className="w-full rounded-2xl overflow-hidden border border-slate-900 shadow-2xl bg-slate-950 mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={game.background_image} alt={game.name} className="w-full h-auto object-contain max-h-[500px]" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-6">
            <div>
              <h1 className="text-3xl font-black text-white text-left tracking-tight" dir="ltr">{game.name}</h1>
              <div className="flex flex-wrap gap-2 mt-3" dir="ltr">
                {game.genres?.map((g: any) => (
                  <span key={g.id || g.name} className="text-[10px] font-bold bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-md text-slate-400">{g.name}</span>
                ))}
              </div>
            </div>

            <div className="space-y-4 bg-slate-900/40 border border-slate-900 p-5 rounded-2xl">
              {game.description_fa && (
                <div>
                  <h3 className="text-xs font-bold text-purple-400 mb-2">✍️ توضیحات بازی (ترجمه خودکار ماشینی):</h3>
                  <p className="text-sm text-slate-300 leading-7 text-justify">{game.description_fa}</p>
                </div>
              )}
              {game.description_en && (
                <div className="pt-4 border-t border-slate-950" dir="ltr">
                  <h3 className="text-xs font-bold text-slate-500 mb-2 text-left">📄 Original Description:</h3>
                  <p className="text-xs text-slate-400 leading-6 text-left font-serif line-clamp-6 hover:line-clamp-none transition duration-300">{game.description_en}</p>
                </div>
              )}
            </div>

            {game.requirements && (
              <div className="bg-slate-900/60 border border-slate-900 p-5 rounded-2xl space-y-3">
                <h3 className="text-sm font-black text-white mb-2">💻 مشخصات سیستم مورد نیاز:</h3>
                {Object.entries(game.requirements).map(([key, value]: any) => (
                  <div key={key} className="flex flex-col sm:flex-row sm:justify-between text-xs py-2 border-b border-slate-950 gap-1">
                    <span className="text-slate-400 font-bold min-w-[120px] capitalize">{key.replace('_', ' ')}:</span>
                    <span className="text-slate-200 text-left" dir="ltr">{value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800/60 p-5 rounded-2xl space-y-4 text-xs text-slate-400">
              <h3 className="font-black text-white text-sm mb-2 border-b border-slate-950 pb-2">📊 اطلاعات عمومی</h3>
              <p>🗓️ تاریخ انتشار: <span className="text-slate-200 font-bold">{game.released || '---'}</span></p>
              <p>⭐ امتیاز منتقدین: <span className="text-purple-400 font-bold">{game.rating || '---'} / 5</span></p>
              <p>🔞 رده سنی (عدد): <span className="text-red-400 font-bold" dir="ltr">{game.esrb_rating || '---'}</span></p>
              <p>🏢 سازنده/ناشر: <span className="text-slate-200" dir="ltr">{game.developers || '---'}</span></p>
              <p>⏱️ مدت زمان اتمام: <span className="text-green-400 font-bold">{game.playtime || '---'} ساعت</span></p>
              
              {game.steam_link && (
                <div className="pt-2">
                  <a href={game.steam_link} target="_blank" rel="noopener noreferrer" className="w-full py-2.5 bg-[#171a21] hover:bg-[#2a475e] text-white border border-[#2a475e] rounded-xl font-bold flex items-center justify-center gap-2 transition">
                    🎮 مشاهده و خرید در استیم
                  </a>
                </div>
              )}
            </div>

            {((game.gallery && game.gallery.length > 0) || game.trailer_url) && (
              <div className="bg-slate-900/40 border border-slate-900 p-4 rounded-2xl space-y-3">
                <h3 className="text-xs font-black text-white mb-2">📸 گالری تصاویر و ویدیوها:</h3>
                
                {game.trailer_url && (
                  <div className="mb-3 rounded-xl overflow-hidden border border-slate-950 bg-slate-950">
                    <video src={game.trailer_url} controls poster={getOptimizedUrl(game.background_image, 400)} className="w-full h-auto aspect-video" />
                  </div>
                )}

                <div className="grid grid-cols-3 gap-2">
                  {game.gallery?.map((imgUrl: string, idx: number) => (
                    <button 
                      key={idx} 
                      onClick={() => setActivePhotoIndex(idx)}
                      className="aspect-video bg-slate-950 border border-slate-950 rounded-lg overflow-hidden hover:border-purple-500 transition"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={getOptimizedUrl(imgUrl, 200)} alt={`gallery-${idx}`} className="w-full h-full object-cover" loading="lazy" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {activePhotoIndex !== null && game.gallery && (
        <div className="fixed inset-0 z-50 bg-slate-950/95 flex flex-col items-center justify-center p-4 select-none touch-pan-y">
          <div className="absolute top-4 right-4 flex items-center gap-3">
            <span className="text-xs text-slate-500 font-mono" dir="ltr">{activePhotoIndex + 1} / {game.gallery.length}</span>
            <button 
              onClick={() => setActivePhotoIndex(null)}
              className="p-2 bg-slate-900 border border-slate-800 text-slate-300 rounded-xl hover:text-white text-xs font-bold"
            >
              خروج (Esc) ✕
            </button>
          </div>

          <button 
            onClick={() => setActivePhotoIndex((idx) => (idx !== null && idx > 0 ? idx - 1 : game.gallery.length - 1))}
            className="absolute left-4 p-4 bg-slate-900/60 border border-slate-800 rounded-2xl hover:bg-slate-800 text-white font-bold text-lg hidden sm:block"
          >
            ➔
          </button>

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img 
            src={game.gallery[activePhotoIndex]} 
            alt="Expanded view" 
            className="max-w-full max-h-[80vh] object-contain rounded-xl shadow-2xl transition-all duration-300"
            onClick={() => setActivePhotoIndex((idx) => (idx !== null && idx < game.gallery.length - 1 ? idx + 1 : 0))}
          />

          <button 
            onClick={() => setActivePhotoIndex((idx) => (idx !== null && idx < game.gallery.length - 1 ? idx + 1 : 0))}
            className="absolute right-4 p-4 bg-slate-900/60 border border-slate-800 rounded-2xl hover:bg-slate-800 text-white font-bold text-lg hidden sm:block"
          >
            ➔
          </button>

          <div className="flex gap-4 mt-6 sm:hidden">
            <button onClick={() => setActivePhotoIndex((idx) => (idx !== null && idx > 0 ? idx - 1 : game.gallery.length - 1))} className="px-6 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm font-bold">قبلی</button>
            <button onClick={() => setActivePhotoIndex((idx) => (idx !== null && idx < game.gallery.length - 1 ? idx + 1 : 0))} className="px-6 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm font-bold">بعدی</button>
          </div>
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
