'use client';

import localGamesData from '../../data/games.json';

export default function CatalogPDF() {
  // تابع هوشمند برای کوچک کردن حجم عکس‌های RAWG مستقیماً از طریق لینک URL
  const getOptimizedImageUrl = (url: string) => {
    if (!url) return '';
    // اگر لینک مربوط به سرور RAWG باشد، دستور crop را برای دریافت نسخه سبک‌تر اضافه می‌کنیم
    if (url.includes('media.rawg.io/media/')) {
      return url.replace('media.rawg.io/media/', 'media.rawg.io/media/crop/600/400/');
    }
    return url;
  };

  // مرتب‌سازی خودکار بازی‌ها بر اساس حروف الفبا
  const sortedGames = [...localGamesData].sort((a: any, b: any) => 
    a.name.localeCompare(b.name, 'en', { sensitivity: 'accent' })
  );

  return (
    <div className="min-h-screen bg-white text-black p-6" dir="rtl">
      {/* استایل پرینت برای جلوگیری از کرش و بهینه‌سازی ابعاد */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body {
            background-color: white !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          h2 {
            white-space: normal !important;
            overflow: visible !important;
            text-overflow: unset !important;
            display: block !important;
          }
          div.aspect-video {
            height: 90px !important;
            max-height: 90px !important;
          }
          img {
            width: 100% !important;
            height: 100% !important;
            object-fit: cover !important;
          }
        }
      `}} />

      {/* هدر کاتالوگ */}
      <div className="text-center mb-6 pb-4 border-b-2 border-gray-800">
        <h1 className="text-3xl font-black mb-1">لیست دیتای بازی‌های کامپیوتری</h1>
        <p className="text-sm font-bold text-gray-600">
          برای سفارش، نام بازی‌ها را به پشتیبانی ارسال کنید
        </p>
      </div>

      {/* چیدمان ۴ بازی در هر ردیف */}
      <div className="grid grid-cols-4 gap-4">
        {sortedGames.map((game: any, index: number) => (
          <div 
            key={index} 
            className="border border-gray-300 rounded-xl p-3 flex flex-col bg-gray-50 shadow-sm"
            style={{ pageBreakInside: 'avoid' }}
          >
            {/* کاور بازی با لینک بهینه‌شده و سبک‌شده توسط سرور */}
            <div className="w-full aspect-video mb-3 rounded-lg overflow-hidden flex-shrink-0 bg-gray-200">
              <img
                src={getOptimizedImageUrl(game.background_image)}
                alt={game.name}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
            
            {/* اسم بازی */}
            <h2 
              className="text-[11px] font-black text-center w-full leading-tight mb-3" 
              dir="ltr"
            >
              {game.name}
            </h2>

            {/* کادر پایینی شامل اطلاعات */}
            <div className="mt-auto w-full border-t border-gray-200 pt-2 flex flex-col gap-2">
              
              {/* تگ‌ها و سال ساخت */}
              <div className="flex flex-wrap justify-center gap-1">
                {game.released && (
                  <span className="text-[9px] font-bold bg-slate-200 text-slate-800 px-1.5 py-0.5 rounded border border-slate-300">
                    📅 {game.released.split('-')[0]}
                  </span>
                )}
                
                {game.is_popular && (
                  <span className="text-[9px] font-bold bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded border border-amber-300">
                    🔥 پرطرفدار
                  </span>
                )}
                {game.is_coop && (
                  <span className="text-[9px] font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded border border-emerald-300">
                    👥 کوآپ
                  </span>
                )}
                
                {game.system_tier === 'light' && (
                  <span className="text-[9px] font-bold bg-green-100 text-green-800 px-1.5 py-0.5 rounded border border-green-300">
                    سیستم ضعیف
                  </span>
                )}
                {game.system_tier === 'normal' && (
                  <span className="text-[9px] font-bold bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded border border-blue-300">
                    سیستم معمولی
                  </span>
                )}
                {game.system_tier === 'heavy' && (
                  <span className="text-[9px] font-bold bg-red-100 text-red-800 px-1.5 py-0.5 rounded border border-red-300">
                    سیستم قوی
                  </span>
                )}
              </div>

              {/* امتیاز منتقدین و حجم بازی */}
              <div className="flex justify-between items-center border-t border-gray-200 pt-1.5 px-1">
                <span className="text-[11px] font-black text-gray-700" dir="ltr">
                  ⭐ {game.metacritic || '--'}
                </span>
                
                <p className="text-[12px] font-black text-purple-700" dir="ltr">
                  {game.size_gb ? `${game.size_gb} GB` : 'نامشخص'} 💾
                </p>
              </div>

            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
