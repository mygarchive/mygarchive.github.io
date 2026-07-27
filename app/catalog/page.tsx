'use client';

import localGamesData from '../../data/games.json'; // مسیر فایل جیسون را در صورت نیاز اصلاح کنید

export default function CatalogPDF() {
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
      <div className="grid grid-cols-4 sm:grid-cols-5 gap-4">
        {localGamesData.map((game, index) => (
          <div 
            key={index} 
            className="border border-gray-300 rounded-lg p-2 flex flex-col items-center bg-gray-50"
            style={{ pageBreakInside: 'avoid' }} // جلوگیری از نصف شدن کارت بین دو صفحه
          >
            {/* کاور بازی */}
            <div className="w-full aspect-video mb-2 bg-gray-200 rounded overflow-hidden">
              <img
                src={game.background_image}
                alt={game.name}
                className="w-full h-full object-cover"
              />
            </div>
            
            {/* اسم بازی */}
            <h2 
              className="text-[11px] font-black text-center w-full leading-tight mb-2" 
              dir="ltr"
            >
              {game.name}
            </h2>
            
            {/* حجم بازی */}
            <div className="mt-auto w-full text-center border-t border-gray-200 pt-1">
              <p className="text-[10px] font-bold text-purple-700">
                💾 {game.size_gb ? `${game.size_gb} گیگابایت` : 'نامشخص'}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
