'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

export default function GameDetails() {
  const { id } = useParams();
  const [game, setGame] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // برای مدیریت آلبوم عکس (Lightbox)
  const [activeImgIndex, setActiveImgIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!id) return;

    // خواندن مستقیم لیست بازی‌ها از آپستاش
    fetch('/api-store/')
      .then((res) => res.json())
      .then((data) => {
        const found = Array.isArray(data) ? data.find((g: any) => g.id.toString() === id.toString()) : null;
        setGame(found || null);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching game details:', err);
        setLoading(false);
      });
  }, [id]);

  // توابع کنترل آلبوم عکس با کیبورد و دکمه‌ها
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
      if (e.key === 'ArrowRight') prevImg(); // هماهنگ با جهت کیبورد فارسی
      if (e.key === 'ArrowLeft') nextImg();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeImgIndex, nextImg, prevImg]);

  // تابع تبدیل سیستم مورد نیاز متنی به آرایه خط‌به‌خط منظم
  const formatRequirements = (reqText: string) => {
    if (!reqText) return [];
    return reqText
      .replace(/Minimum:|Recommended:/gi, '')
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
  };

  if (loading) return <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">در حال دریافت مشخصات بازی...</div>;
  if (!game) return <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">بازی مورد نظر یافت نشد. <Link href="/" className="text-purple-400 mr-2 hover:underline">بازگشت به خانه</Link></div>;

  const pcPlatform = game.platforms?.find((p: any) => p.platform?.name?.toLowerCase() === 'pc' || p.platform?.slug === 'pc');
  const reqs = pcPlatform?.requirements_en || pcPlatform?.requirements_ru || null;

  // فیلتر کردن تصاویر گالری (عکس اول که هدر هست برداشته می‌شود)
  const galleryImages = game.short_screenshots?.slice(1) || [];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 relative overflow-hidden pb-12" dir="rtl">
      
      {/* 🔮 افکت خفن: بک‌گراند بلوری و تار از خود کاور بازی */}
      {game.background_image && (
        <div 
          className="absolute inset-0 bg-cover bg-center scale-110 blur-3xl opacity-20 pointer-events-none z-0"
          style={{ backgroundImage: `url(${game.background_image})` }}
        />
      )}

      <div className="relative z-10 max-w-5xl mx-auto p-4 md:p-8">
        
        {/* دکمه بازگشت مینیمال */}
        <Link href="/" className="mb-6 text-sm text-slate-300 hover:text-white flex items-center gap-2 bg-slate-900/80 border border-slate-800 px-4 py-2 rounded-xl w-fit transition backdrop-blur">
          ➔ بازگشت به لیست اصلی
        </Link>
        
        {/* کارت اصلی اطلاعات بازی */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8 bg-slate-900/40 border border-slate-900/60 p-5 md:p-8 rounded-3xl backdrop-blur-md shadow-2xl">
          
          {/* بخش کاور بازی */}
          <div className="lg:col-span-1">
            {game.background_image ? (
              <img src={game.background_image} alt={game.name} className="w-full h-72 md:h-96 object-cover rounded-2xl shadow-xl border border-slate-800/60" />
            ) : (
              <div className="w-full h-72 md:h-96 bg-slate-900 rounded-2xl flex items-center justify-center text-slate-600">بدون تصویر</div>
            )}
          </div>
          
          {/* مشخصات بازی */}
          <div className="lg:col-span-2 flex flex-col justify-between">
            <div>
              <h2 className="text-2xl md:text-4xl font-black mb-6 text-white tracking-tight">{game.name}</h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-950/60 p-5 rounded-2xl border border-slate-900 text-sm">
                <p className="text-slate-400">🕒 زمان اتمام: <span className="text-white font-bold">{game.playtime || '---'} ساعت</span></p>
                <p className="text-slate-400">📅 انتشار: <span className="text-white font-bold">{game.released || '---'}</span></p>
                <p className="text-slate-400">⭐ امتیاز: <span className="text-amber-400 font-bold">★ {game.rating ? game.rating.toFixed(1) : '0'} / 5</span></p>
                <p className="text-slate-400">🏷️ ژانرها: <span className="text-purple-400 font-bold">{game.genres?.map((g: any) => g.name).join(' ، ') || '---'}</span></p>
                
                {/* بخش رده سنی عددی شیک */}
                <p className="text-slate-400 sm:col-span-2">🔞 رده سنی:{' '}
                  <span className="text-red-400 font-bold">
                    {game.esrb_rating ? `+${game.esrb_rating.name.replace(/[^0-9]/g, '') || game.esrb_rating.name} سال` : 'نامشخص'}
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 📸 بخش گالری تصاویر به صورت آلبومی بدون باز شدن تب جدید */}
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
                  <img src={img.image} alt="screenshot" className="w-full h-full object-cover hover:scale-105 transition duration-500" loading="lazy" />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 🖥️ سیستم مورد نیاز خط‌به‌خط چیده شده در انتهای کل کار */}
        <section className="bg-slate-900/30 border border-slate-900 p-6 rounded-3xl backdrop-blur-sm">
          <h3 className="text-lg font-bold mb-4 text-slate-300 border-r-4 border-purple-500 pr-2">🖥️ سیستم مورد نیاز (PC)</h3>
          {reqs ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm" dir="ltr">
              
              {/* حداقل سیستم */}
              {reqs.minimum && (
                <div className="bg-slate-950/70 p-5 rounded-2xl border border-slate-900 text-left">
                  <h4 className="text-red-400 font-bold text-base mb-3 border-b border-slate-800 pb-1">⚠️ Minimum Requirements</h4>
                  <ul className="space-y-1.5 text-slate-300 list-disc list-inside">
                    {formatRequirements(reqs.minimum).map((line, i) => (
                      <li key={i} className="leading-relaxed">{line}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* سیستم پیشنهادی */}
              {reqs.recommended && (
                <div className="bg-slate-950/70 p-5 rounded-2xl border border-slate-900 text-left">
                  <h4 className="text-green-400 font-bold text-base mb-3 border-b border-slate-800 pb-1">✅ Recommended Requirements</h4>
                  <ul className="space-y-1.5 text-slate-300 list-disc list-inside">
                    {formatRequirements(reqs.recommended).map((line, i) => (
                      <li key={i} className="leading-relaxed">{line}</li>
                    ))}
                  </ul>
                </div>
              )}

            </div>
          ) : (
            <p className="text-sm text-slate-500 text-center py-4">اطلاعات سیستم مورد نیاز برای این بازی ثبت نشده است.</p>
          )}
        </section>

      </div>

      {/* 🖼️ مودال آلبوم تصاویر اصلی (Lightbox Overlay) */}
      {activeImgIndex !== null && galleryImages.length > 0 && (
        <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4">
          
          {/* دکمه ضربدر برای بستن */}
          <button onClick={closeLightbox} className="absolute top-6 right-6 text-white text-3xl font-light hover:text-red-400 transition z-50">✕</button>
          
          {/* دکمه‌های ناوبری چپ و راست */}
          <button onClick={prevImg} className="absolute right-4 text-white text-4xl p-2 hover:text-purple-400 transition select-none z-50">❯</button>
          <button onClick={nextImg} className="absolute left-4 text-white text-4xl p-2 hover:text-purple-400 transition select-none z-50">❮</button>

          {/* نمایش تصویر با کیفیت بزرگ */}
          <div className="max-w-4xl max-h-[85vh] overflow-hidden rounded-xl shadow-2xl border border-slate-900">
            <img src={galleryImages[activeImgIndex].image} alt="High Quality Screenshot" className="object-contain w-full h-full" />
          </div>

          <div className="absolute bottom-6 text-slate-500 text-sm select-none">
            {activeImgIndex + 1} از {galleryImages.length} (کلید ESC برای خروج)
          </div>
        </div>
      )}

    </div>
  );
}
