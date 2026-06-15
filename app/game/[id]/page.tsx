'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

export default function GameDetails() {
  const { id } = useParams();
  const [game, setGame] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeImgIndex, setActiveImgIndex] = useState<number | null>(null);

  // لود سریع اطلاعات بازی با تغییر اولویت درخواست شبکه
  useEffect(() => {
    if (!id) return;

    fetch('/api-store/', { priority: 'high' } as any)
      .then((res) => res.json())
      .then((data) => {
        const found = Array.isArray(data) ? data.find((g: any) => g.id.toString() === id.toString()) : null;
        setGame(found || null);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error:', err);
        setLoading(false);
      });
  }, [id]);

  const closeLightbox = () => setActiveImgIndex(null);
  
  const nextImg = useCallback(() => {
    if (activeImgIndex !== null && game?.short_screenshots) {
      const gallery = game.short_screenshots.slice(1);
      setActiveImgIndex((activeImgIndex + 1) % gallery.length);
    }
  }, [activeImgIndex, game]);

  const prevImg = useCallback(() => {
    if (activeImgIndex !== null && game?.short_screenshots) {
      const gallery = game.short_screenshots.slice(1);
      setActiveImgIndex((activeImgIndex - 1 + gallery.length) % gallery.length);
    }
  }, [activeImgIndex, game]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (activeImgIndex === null) return;
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowRight') prevImg();
      if (e.key === 'ArrowLeft') nextImg();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeImgIndex, nextImg, prevImg]);

  const getBypassUrl = (url: string) => {
    if (!url) return '';
    const cleanUrl = url.replace(/^https?:\/\//i, '');
    return `https://images.weserv.nl/?url=${encodeURIComponent(cleanUrl)}&w=800&q=85`;
  };

  const getHighQualityBypassUrl = (url: string) => {
    if (!url) return '';
    const cleanUrl = url.replace(/^https?:\/\//i, '');
    return `https://images.weserv.nl/?url=${encodeURIComponent(cleanUrl)}&w=1920&q=95`;
  };

  const formatAgeRating = (esrb: any) => {
    if (!esrb || !esrb.name) return 'نامشخص';
    const name = esrb.name.toLowerCase();
    const match = esrb.name.match(/\d+/);
    if (match) return `+${match[0]} سال`;
    if (name.includes('everyone')) return '+3 سال';
    if (name.includes('teen')) return '+13 سال';
    if (name.includes('mature')) return '+17 سال';
    if (name.includes('adults')) return '+18 سال';
    return esrb.name;
  };

  const formatRequirements = (reqText: string) => {
    if (!reqText) return [];
    return reqText
      .replace(/Minimum:|Recommended:/gi, '')
      .split(/(?=Processor:|Graphics:|Memory:|OS:|Storage:|DirectX:|Sound Card:|Network:)/i)
      .map(line => line.trim())
      .filter(line => line.length > 0);
  };

  // ⏳ لودینگ اسکلتونی فوق‌العاده مدرن و پرسرعت به جای متن قدیمی
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 p-6 md:p-12 max-w-5xl mx-auto animate-pulse" dir="rtl">
        <div className="h-10 bg-slate-900 rounded-xl w-40 mb-8"></div>
        <div className="bg-slate-900/50 h-96 rounded-3xl border border-slate-900 mb-8"></div>
        <div className="h-6 bg-slate-900 rounded w-1/4 mb-4"></div>
        <div className="grid grid-cols-3 gap-4 mb-8"><div className="h-24 bg-slate-900 rounded-xl"></div><div className="h-24 bg-slate-900 rounded-xl"></div><div className="h-24 bg-slate-900 rounded-xl"></div></div>
      </div>
    );
  }

  if (!game) return <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">بازی مورد نظر یافت نشد. <Link href="/" className="text-purple-400 mr-2 hover:underline">بازگشت به خانه</Link></div>;

  const pcPlatform = game.platforms?.find((p: any) => p.platform?.name?.toLowerCase() === 'pc' || p.platform?.slug === 'pc');
  const reqs = pcPlatform?.requirements_en || pcPlatform?.requirements_ru || null;
  const galleryImages = game.short_screenshots?.slice(1) || [];
  const gameVideo = game.clip?.clips?.medium || game.clip?.clip || null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 relative overflow-hidden pb-12" dir="rtl">
      
      {game.background_image && (
        <div 
          className="absolute inset-0 bg-cover bg-center scale-110 blur-3xl opacity-20 pointer-events-none z-0"
          style={{ backgroundImage: `url(${getBypassUrl(game.background_image)})` }}
        />
      )}

      <div className="relative z-10 max-w-5xl mx-auto p-4 md:p-8">
        
        <Link href="/" className="mb-6 text-sm text-slate-300 hover:text-white inline-flex items-center gap-2 bg-slate-900/80 border border-slate-800 px-4 py-2 rounded-xl w-fit transition backdrop-blur">
          ➔ بازگشت به لیست اصلی
        </Link>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8 bg-slate-900/40 border border-slate-900/60 p-5 md:p-8 rounded-3xl backdrop-blur-md shadow-2xl">
          
          <div className="lg:col-span-3 w-full overflow-hidden rounded-2xl border border-slate-800/60 bg-slate-950/40">
            {game.background_image ? (
              <img 
                src={getBypassUrl(game.background_image)} 
                alt={game.name} 
                className="w-full h-auto max-h-[420px] object-contain mx-auto" 
              />
            ) : (
              <div className="w-full h-64 bg-slate-900 rounded-2xl flex items-center justify-center text-slate-600">بدون تصویر</div>
            )}
          </div>
          
          <div className="lg:col-span-3 flex flex-col justify-between">
            <div>
              <h2 className="text-3xl md:text-4xl font-black mb-6 text-white tracking-tight text-center lg:text-right">{game.name}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 bg-slate-950/60 p-5 rounded-2xl border border-slate-900 text-sm">
                <p className="text-slate-400">🕒 زمان اتمام: <span className="text-white font-bold">{game.playtime || '---'} ساعت</span></p>
                <p className="text-slate-400">📅 تاریخ انتشار: <span className="text-white font-bold">{game.released || '---'}</span></p>
                <p className="text-slate-400">⭐ امتیاز منتقدین: <span className="text-amber-400 font-bold">★ {game.rating ? game.rating.toFixed(1) : '0'} / 5</span></p>
                <p className="text-slate-400">🔞 رده سنی: <span className="text-red-400 font-bold">{formatAgeRating(game.esrb_rating)}</span></p>
                <p className="text-slate-400">🏷️ ژانرها: <span className="text-purple-400 font-bold">{game.genres?.map((g: any) => g.name).join(' ، ') || '---'}</span></p>
                <p className="text-slate-400">💻 توسعه‌دهنده: <span className="text-teal-400 font-bold">{game.developers?.map((d: any) => d.name).join(' ، ') || 'ثبت نشده'}</span></p>
                <p className="text-slate-400">🏢 ناشر بازی: <span className="text-blue-400 font-bold">{game.publishers?.map((p: any) => p.name).join(' ، ') || 'ثبت نشده'}</span></p>
                <p className="text-slate-400 sm:col-span-2">🛒 فروشگاه‌های رسمی: <span className="text-slate-200 font-medium">{game.stores?.map((s: any) => s.store?.name).join(' ، ') || '---'}</span></p>
                
                {game.tags && game.tags.length > 0 && (
                  <div className="sm:col-span-2 border-t border-slate-800/50 pt-2 mt-1">
                    <span className="text-slate-500 text-xs block mb-1.5">تگ‌های بازی:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {game.tags.slice(0, 8).map((t: any) => (
                        <span key={t.id} className="text-[11px] bg-slate-900 px-2 py-0.5 rounded-md border border-slate-800 text-slate-400">{t.name}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {gameVideo && (
          <section className="mb-8 bg-slate-900/30 border border-slate-900 p-6 rounded-3xl backdrop-blur-sm">
            <h3 className="text-lg font-bold mb-4 text-slate-300 border-r-4 border-purple-500 pr-2">🎬 تریلر رسمی بازی</h3>
            <div className="overflow-hidden rounded-2xl border border-slate-800 aspect-video bg-black">
              <video src={gameVideo} controls className="w-full h-full" poster={getBypassUrl(game.background_image)} />
            </div>
          </section>
        )}

        {galleryImages.length > 0 && (
          <section className="mb-8 bg-slate-900/30 border border-slate-900 p-6 rounded-3xl backdrop-blur-sm">
            <h3 className="text-lg font-bold mb-4 text-slate-300 border-r-4 border-purple-500 pr-2">📸 گالری تصاویر بازی</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {galleryImages.map((img: any, index: number) => (
                <div 
                  key={img.id || img.image} 
                  onClick={() => setActiveImgIndex(index)}
                  className="overflow-hidden rounded-xl border border-slate-800 hover:border-purple-500/50 cursor-pointer aspect-video bg-slate-950 transition duration-300"
                >
                  <img src={getBypassUrl(img.image)} alt="screenshot" className="w-full h-full object-cover" loading="lazy" />
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="bg-slate-900/30 border border-slate-900 p-6 rounded-3xl backdrop-blur-sm">
          <h3 className="text-lg font-bold mb-4 text-slate-300 border-r-4 border-purple-500 pr-2">🖥️ سیستم مورد نیاز (PC)</h3>
          {reqs && (reqs.minimum || reqs.recommended) ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm" dir="ltr">
              {reqs.minimum && (
                <div className="bg-slate-950/70 p-5 rounded-2xl border border-slate-900 text-left">
                  <h4 className="text-red-400 font-bold text-base mb-3 border-b border-slate-800 pb-1">⚠️ Minimum Requirements</h4>
                  <ul className="space-y-2 text-slate-300 text-xs md:text-sm">
                    {formatRequirements(reqs.minimum).map((line, i) => (
                      <li key={i} className="leading-relaxed bg-slate-900/40 p-1.5 rounded border border-slate-900/40">{line}</li>
                    ))}
                  </ul>
                </div>
              )}
              {reqs.recommended && (
                <div className="bg-slate-950/70 p-5 rounded-2xl border border-slate-900 text-left">
                  <h4 className="text-green-400 font-bold text-base mb-3 border-b border-slate-800 pb-1">✅ Recommended Requirements</h4>
                  <ul className="space-y-2 text-slate-300 text-xs md:text-sm">
                    {formatRequirements(reqs.recommended).map((line, i) => (
                      <li key={i} className="leading-relaxed bg-slate-900/40 p-1.5 rounded border border-slate-900/40">{line}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-slate-500 text-center py-4">اطلاعات مشخصات سخت‌افزاری دقیقی از سرور بازی برای این پلتفرم دریافت نشد.</p>
          )}
        </section>

      </div>

      {activeImgIndex !== null && galleryImages.length > 0 && (
        <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4">
          <button onClick={closeLightbox} className="absolute top-6 right-6 text-white text-3xl font-light hover:text-red-400 transition z-50">✕</button>
          <button onClick={prevImg} className="absolute right-4 text-white text-4xl p-2 hover:text-purple-400 transition select-none z-50">❯</button>
          <button onClick={nextImg} className="absolute left-4 text-white text-4xl p-2 hover:text-purple-400 transition select-none z-50">❮</button>
          <div className="max-w-4xl max-h-[85vh] overflow-hidden rounded-xl shadow-2xl border border-slate-900">
            <img src={getHighQualityBypassUrl(galleryImages[activeImgIndex].image)} alt="High Quality Screenshot" className="object-contain w-full h-full" />
          </div>
          <div className="absolute bottom-6 text-slate-500 text-sm select-none">
            {activeImgIndex + 1} از {galleryImages.length} (کلید ESC برای خروج)
          </div>
        </div>
      )}

    </div>
  );
}
