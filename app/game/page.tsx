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
                  <span key={g.id || g.name} className="text-xs font-bold bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-md text-slate-400">{g.name}</span>
                ))}
              </div>
            </div>

            {/* بخش توصیحات ارتقا یافته به سایز بزرگتر text-base */}
            <div className="space-y-5 bg-slate-900/40 border border-slate-900 p-6 rounded-2xl">
              {game.description_fa && (
                <div>
                  <h3 className="text-sm font-bold text-purple-400 mb-2">✍️ توضیحات بازی (ترجمه ماشینی):</h3>
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

            {/* بخش سیستم مورد نیاز فیکس‌شده با سایز فونت متناسب */}
            {game.requirements && (
              <div className="space-y-4">
                <h3 className="text-sm font-black text-white flex items-center gap-2 mb-1">💻 مشخصات سیستم سخت‌افزاری مورد نیاز:</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-slate-900/50 border border-slate-900 p-4 rounded-xl space-y-3">
                    <div className="text-xs font-bold text-red-400 border-b border-slate-900 pb-2 flex items-center justify-between">
                      <span>⚠️ حداقل سیستم مورد نیاز</span>
                      <span className="text-[10px] bg-red-950/40 px-2 py-0.5 rounded border border-red-900/50">Minimum</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-6 text-left font-mono whitespace-pre-line" dir="ltr">
                      {game.requirements.minimum || 'ثبت نشده است.'}
                    </p>
                  </div>
                  <div className="bg-slate-900/50 border border-slate-900 p-4 rounded-xl space-y-3">
                    <div className="text-xs font-bold text-green-400 border-b border-slate-900 pb-2 flex items-center justify-between">
                      <span>✅ سیستم پیشنهادی آرشیو</span>
                      <span className="text-[10px] bg-green-950/40 px-2 py-0.5 rounded border border-green-900/50">Recommended</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-6 text-left font-mono whitespace-pre-line" dir="ltr">
                      {game.requirements.recommended || 'ثبت نشده است.'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* بخش اطلاعات عمومی با سایز بزرگتر text-sm */}
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800/60 p-5 rounded-2xl space-y-4 text-sm text-slate-300">
              <h3 className="font-black text-white text-base mb-2 border-b border-slate-900 pb-2">📊 اطلاعات عمومی</h3>
              <p>🗓️ تاریخ انتشار: <span className="text-slate-100 font-bold">{game.released || '---'}</span></p>
              <p>⭐ امتیاز منتقدین: <span className="text-purple-400 font-bold">{game.rating || '---'} / 5</span></p>
              <p>🔞 رده سنی: <span className="text-red-400 font-bold" dir="ltr">{game.esrb_rating || '---'}</span></p>
              <p>🏢 سازنده/ناشر: <span className="text-slate-100" dir="ltr">{game.developers || '---'}</span></p>
              <p>⏱️ زمان اتمام: <span className="text-green-400 font-bold">{game.playtime || '---'} ساعت</span></p>
              
              {game.steam_link && (
                <div className="pt-2">
                  <a href={game.steam_link} target="_blank" rel="noopener noreferrer" className="w-full py-2.5 bg-[#171a21] hover:bg-[#2a475e] text-white border border-[#2a475e] rounded-xl font-bold flex items-center justify-center gap-2 text-xs transition">
                    🎮 مشاهده در استیم (صفحه اختصاصی)
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
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
