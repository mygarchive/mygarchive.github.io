'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

function GameDetailsContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const [game, setGame] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    fetch('/data/games.json')
      .then((res) => res.json())
      .then((gamesList) => {
        if (Array.isArray(gamesList)) {
          const foundGame = gamesList.find((g: any) => g.id.toString() === id.toString());
          setGame(foundGame || null);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error('خطا در دریافت جزئیات بازی:', err);
        setLoading(false);
      });
  }, [id]);

  const getBypassUrl = (url: string) => {
    if (!url) return '';
    const cleanUrl = url.replace(/^https?:\/\//i, '');
    return `https://images.weserv.nl/?url=${encodeURIComponent(cleanUrl)}&w=800&q=85`;
  };

  if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white animate-pulse">در حال دریافت مشخصات...</div>;
  if (!game) return <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">بازی یافت نشد. <Link href="/" className="text-purple-400 mr-2 hover:underline">بازگشت</Link></div>;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-12" dir="rtl">
      <div className="max-w-3xl mx-auto bg-slate-900/40 border border-slate-900 p-6 md:p-8 rounded-3xl backdrop-blur-md">
        <Link href="/" className="mb-6 text-xs text-slate-400 hover:text-white inline-block">➔ بازگشت به لیست</Link>
        <img src={getBypassUrl(game.background_image)} alt={game.name} className="w-full h-64 object-cover rounded-2xl mb-6" />
        <h2 className="text-3xl font-black mb-4 text-white">{game.name}</h2>
        <div className="space-y-2 text-sm text-slate-300 mb-6 bg-slate-950/60 p-4 rounded-xl">
          <p>📅 تاریخ انتشار: {game.released || 'نامشخص'}</p>
          <p>⭐ امتیاز منتقدین: ★ {game.rating || '0'}</p>
          <p>🏷️ ژانرها: {game.genres?.map((g: any) => g.name).join(' ، ') || '---'}</p>
        </div>
        {game.description_raw && (
          <div>
            <h3 className="font-bold text-white mb-2">📝 درباره بازی:</h3>
            <p className="text-slate-400 text-sm leading-relaxed text-justify whitespace-pre-line" dir="ltr">{game.description_raw}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function GameDetails() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">در حال بارگذاری...</div>}>
      <GameDetailsContent />
    </Suspense>
  );
}
