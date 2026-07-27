'use client';

import localGamesData from '../../data/games.json';

export default function CatalogPDF() {
  // مرتب‌سازی خودکار بازی‌ها بر اساس حروف الفبا نام بازی
  const sortedGames = [...localGamesData].sort((a: any, b: any) => 
    a.name.localeCompare(b.name, 'en', { sensitivity: 'accent' })
  );

  return (
    <div className="min-h-screen bg-white text-black p-4" dir="rtl">
      {/* هدر کاتالوگ */}
      <div className="text-center mb-8 pb-4 border-b-2 border-gray-800">
        <h1 className="text-3xl font-black mb-2">لیست دیتای بازی‌های کامپیوتری</h1>
        <p className="text-sm font-bold text-gray-600">
          برای سفارش، نام بازی‌ها را به پشتیبانی ارسال کنید
        </p>
      </div>

      {/* چیدمان شبکه‌ای بازی‌ها برای کاغذ A4 */}
      <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
        {sortedGames.map((game: any, index: number) => (
          <div 
            key={index} 
            className="border border-gray-300 rounded-lg p-2 flex flex-col bg-gray-50"
            style={{ pageBreakInside: 'avoid' }}
          >
            {/* کاور بازی (بدون برش و کاملاً دست‌نخورده با object-contain) */}
            <div className="w-full aspect-video mb-2 bg-black rounded overflow-hidden flex-shrink-0">
              <img
                src={game.background_image}
                alt={game.name}
                className="w-full h-full object-contain"
              />
            </div>
            
            {/* اسم بازی */}
            <h2 
              className="text-xs sm:text-sm font-black text-center w-full leading-tight mb-3 line-clamp-2" 
              dir="ltr"
            >
              {game.name}
            </h2>

            {/* کادر پایینی شامل: سال ساخت، تگ‌ها، امتیاز و حجم */}
            <div className="mt-auto w-full border-t border-gray-300 pt-2 flex flex-col gap-2">
              
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
                    ضعیف
                  </span>
                )}
                {game.system_tier === 'normal' && (
                  <span className="text-[9px] font-bold bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded border border-blue-300">
                    معمولی
                  </span>
                )}
                {game.system_tier === 'heavy' && (
                  <span className="text-[9px] font-bold bg-red-100 text-red-800 px-1.5 py-0.5 rounded border border-red-300">
                    قوی
                  </span>
                )}
              </div>

              {/* خط زیر تگ‌ها و نمایش امتیاز منتقدین و حجم بازی */}
              <div className="flex justify-between items-center border-t border-gray-200 pt-1.5 px-1">
                {/* نمره منتقدین */}
                <span className="text-[10px] sm:text-[11px] font-black text-gray-700" dir="ltr">
                  ⭐ {game.metacritic || '--'}
                </span>
                
                {/* حجم بازی */}
                <p className="text-[11px] sm:text-[12px] font-black text-purple-700" dir="ltr">
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
