'use client';

import localGamesData from '../../data/games.json';

export default function CatalogPDF() {
  // مرتب‌سازی خودکار بازی‌ها بر اساس حروف الفبا
  const sortedGames = [...localGamesData].sort((a: any, b: any) => 
    a.name.localeCompare(b.name, 'en', { sensitivity: 'accent' })
  );

  return (
    <div className="min-h-screen bg-white text-black p-4" dir="rtl">
      {/* هدر کاتالوگ */}
      <div className="text-center mb-6 pb-3 border-b-2 border-gray-800">
        <h1 className="text-2xl font-black mb-1">لیست دیتای بازی‌های کامپیوتری</h1>
        <p className="text-xs font-bold text-gray-600">
          برای سفارش، نام بازی‌ها را به پشتیبانی ارسال کنید
        </p>
      </div>

      {/* چیدمان شبکه‌ای بازی‌ها (بهینه‌شده برای چاپ PDF) */}
      <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
        {sortedGames.map((game: any, index: number) => (
          <div 
            key={index} 
            className="border border-gray-300 rounded-lg p-2 flex flex-col bg-gray-50 break-inside-avoid"
            style={{ pageBreakInside: 'avoid' }}
          >
            {/* کاور بازی با ارتفاع ثابت (قفل شده برای جلوگیری از بهم ریختگی در PDF) */}
            <div className="w-full h-28 mb-2 bg-black rounded overflow-hidden flex-shrink-0 flex items-center justify-center">
              <img
                src={game.background_image}
                alt={game.name}
                className="w-full h-full object-contain"
              />
            </div>
            
            {/* اسم بازی */}
            <h2 
              className="text-xs font-black text-center w-full leading-tight mb-2 line-clamp-2" 
              dir="ltr"
            >
              {game.name}
            </h2>

            {/* کادر پایینی شامل: سال ساخت، تگ‌ها، امتیاز و حجم */}
            <div className="mt-auto w-full border-t border-gray-300 pt-2 flex flex-col gap-1.5">
              
              {/* تگ‌ها و سال ساخت */}
              <div className="flex flex-wrap justify-center gap-1">
                {game.released && (
                  <span className="text-[8px] font-bold bg-slate-200 text-slate-800 px-1 py-0.5 rounded border border-slate-300">
                    📅 {game.released.split('-')[0]}
                  </span>
                )}
                
                {game.is_popular && (
                  <span className="text-[8px] font-bold bg-amber-100 text-amber-800 px-1 py-0.5 rounded border border-amber-300">
                    🔥 پرطرفدار
                  </span>
                )}
                {game.is_coop && (
                  <span className="text-[8px] font-bold bg-emerald-100 text-emerald-800 px-1 py-0.5 rounded border border-emerald-300">
                    👥 کوآپ
                  </span>
                )}
                
                {game.system_tier === 'light' && (
                  <span className="text-[8px] font-bold bg-green-100 text-green-800 px-1 py-0.5 rounded border border-green-300">
                    ضعیف
                  </span>
                )}
                {game.system_tier === 'normal' && (
                  <span className="text-[8px] font-bold bg-blue-100 text-blue-800 px-1 py-0.5 rounded border border-blue-300">
                    معمولی
                  </span>
                )}
                {game.system_tier === 'heavy' && (
                  <span className="text-[8px] font-bold bg-red-100 text-red-800 px-1 py-0.5 rounded border border-red-300">
                    قوی
                  </span>
                )}
              </div>

              {/* خط زیر تگ‌ها و نمایش امتیاز منتقدین و حجم بازی */}
              <div className="flex justify-between items-center border-t border-gray-200 pt-1 px-1">
                {/* نمره منتقدین */}
                <span className="text-[10px] font-black text-gray-700" dir="ltr">
                  ⭐ {game.metacritic || '--'}
                </span>
                
                {/* حجم بازی */}
                <p className="text-[10px] font-black text-purple-700" dir="ltr">
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
