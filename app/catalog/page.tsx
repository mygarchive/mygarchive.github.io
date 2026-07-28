'use client';

import { useState } from 'react';
import localGamesData from '../../data/games.json';

// ⚙️ آیدی‌های شبکه اجتماعی پشتیبانی
const TELEGRAM_USERNAME = "YourTelegramID"; // آیدی تلگرام (بدون @)
const BALE_USERNAME = "YourBaleID";         // آیدی بله (بدون @)

// 🖼️ کامپوننت هوشمند برای لود عکس (بدون برش و بدون دستکاری ابعاد کاور)
const ProxyImage = ({ src, alt, className }: { src: string, alt: string, className: string }) => {
  const [proxyIndex, setProxyIndex] = useState(0);

  // استفاده مستقیم از آدرس اصلی بدون دستکاری و برش خوردگی
  const cleanUrl = src ? src.replace(/^https?:\/\//i, '') : '';

  const IMAGE_PROXIES = [
    `https://rawg-proxy.hossein-hf273.workers.dev/?url=${encodeURIComponent(src)}`,
    `https://images.weserv.nl/?url=${encodeURIComponent(cleanUrl)}&q=85`,
    `https://api.allorigins.win/raw?url=${encodeURIComponent(src)}`,
    src
  ];

  const handleError = () => {
    if (proxyIndex < IMAGE_PROXIES.length - 1) {
      setProxyIndex((prevIndex) => prevIndex + 1);
    }
  };

  return (
    <img 
      src={IMAGE_PROXIES[proxyIndex]} 
      alt={alt} 
      className={className} 
      onError={handleError} 
      loading="lazy"
    />
  );
};

export default function CatalogPDF() {
  const [selectedGames, setSelectedGames] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // مرتب‌سازی الفبایی بازی‌ها
  const sortedGames = [...localGamesData].sort((a: any, b: any) => 
    (a.name || "").localeCompare(b.name || "", 'en', { sensitivity: 'accent' })
  );

  // محاسبه مجموع حجم
  const totalSizeGb = selectedGames.reduce((acc, g) => acc + (Number(g.size_gb) || 0), 0);

  // انتخاب یا حذف بازی (همراه با تاییدیه برای حذف)
  const toggleSelectGame = (game: any) => {
    const exists = selectedGames.some((item) => item.id === game.id);
    if (exists) {
      if (window.confirm(`آیا از حذف بازی "${game.name}" از سبد سفارش اطمینان دارید؟`)) {
        setSelectedGames((prev) => prev.filter((item) => item.id !== game.id));
      }
    } else {
      setSelectedGames((prev) => [...prev, game]);
    }
  };

  // حذف مستقیم از داخل پاپ‌آپ پیش‌نمایش (با تاییدیه)
  const handleRemoveFromModal = (game: any) => {
    if (window.confirm(`بازی "${game.name}" از سبد سفارش حذف شود؟`)) {
      setSelectedGames((prev) => prev.filter((item) => item.id !== game.id));
    }
  };

  // 📝 ساخت متن استاندارد و مرتب برای تلگرام / بله / کپی
  const generateOrderText = () => {
    let text = `سلام 👋\nقصد سفارش دیتای بازی‌های زیر رو دارم:\n\n`;
    
    selectedGames.forEach((g, idx) => {
      const sizeText = g.size_gb ? `${g.size_gb} GB` : 'حجم نامشخص';
      text += `${idx + 1}. ${g.name} (${sizeText})\n`;
    });

    text += `\n-------------------------\n`;
    text += `📊 *تعداد کل:* ${selectedGames.length} عنوان\n`;
    text += `💾 *مجموع حجم:* ${totalSizeGb.toFixed(1)} گیگابایت\n\n`;
    text += `لطفاً شرایط و نحوه ثبت نهایی سفارش رو بفرمایید. با تشکر!`;
    
    return text;
  };

  // ارسال به تلگرام
  const handleSendTelegram = () => {
    const text = encodeURIComponent(generateOrderText());
    window.open(`https://t.me/${TELEGRAM_USERNAME}?text=${text}`, '_blank');
  };

  // ارسال به بله
  const handleSendBale = () => {
    const text = encodeURIComponent(generateOrderText());
    window.open(`https://ble.ir/${BALE_USERNAME}?text=${text}`, '_blank');
  };

  // کپی در حافظه
  const handleCopyText = () => {
    navigator.clipboard.writeText(generateOrderText());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-white text-black p-4 sm:p-6 pb-28" dir="rtl">
      {/* استایل پرینت اصلاح شده برای چیدمان دقیقا ۴ تایی در هر ردیف */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body {
            background-color: white !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .print\\:hidden {
            display: none !important;
          }
          .catalog-grid {
            display: grid !important;
            grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
            gap: 1rem !important;
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

      {/* 🔴 هدر کاتالوگ */}
      <div className="text-center mb-6 pb-4 border-b-2 border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-right">
          <h1 className="text-2xl sm:text-3xl font-black mb-1">لیست دیتای بازی‌های کامپیوتری</h1>
          <p className="text-xs sm:text-sm font-bold text-gray-600">
            برای سفارش آنلاین، بازی‌ها را به سبد اضافه کرده و دکمه ارسال را بزنید.
          </p>
        </div>

        {/* آمار زنده و راه‌های ارتباطی */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 bg-purple-50 border border-purple-200 text-purple-900 px-3 py-1.5 rounded-full text-xs font-bold">
            <span className="relative flex h-2 w-2 print:hidden">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-600"></span>
            </span>
            <span>موجود در آرشیو:</span>
            <span className="font-mono text-sm text-purple-700">{sortedGames.length}</span>
            <span>عنوان</span>
          </div>

          <div className="flex items-center gap-1 text-xs font-bold text-gray-700 bg-gray-100 px-3 py-1.5 rounded-full border border-gray-300">
            <span>پشتیبانی:</span>
            <span className="text-sky-600" dir="ltr">@{TELEGRAM_USERNAME}</span>
            {BALE_USERNAME && <span className="text-emerald-600" dir="ltr"> / BALE</span>}
          </div>
        </div>
      </div>

      {/* 🎮 چیدمان دقیق ۴ بازی در هر ردیف (catalog-grid) */}
      <div className="grid grid-cols-4 gap-4 catalog-grid">
        {sortedGames.map((game: any, index: number) => {
          const isSelected = selectedGames.some((g) => g.id === game.id);

          return (
            <div 
              key={game.id || index} 
              className={`border rounded-xl p-3 flex flex-col transition-all relative ${
                isSelected 
                  ? 'border-purple-600 bg-purple-50/50 shadow-md ring-2 ring-purple-400' 
                  : 'border-gray-300 bg-gray-50 shadow-sm'
              }`}
              style={{ pageBreakInside: 'avoid' }}
            >
              {isSelected && (
                <span className="absolute top-2 right-2 z-10 bg-purple-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full print:hidden shadow">
                  ✓ انتخاب شد
                </span>
              )}

              {/* کاور اصلی بدون برش */}
              <div className="w-full aspect-video mb-3 rounded-lg overflow-hidden flex-shrink-0 bg-gray-200">
                <ProxyImage
                  src={game.background_image}
                  alt={game.name}
                  className="w-full h-full object-cover"
                />
              </div>
              
              <h2 className="text-[11px] font-black text-center w-full leading-tight mb-3" dir="ltr">
                {game.name}
              </h2>

              <div className="mt-auto w-full border-t border-gray-200 pt-2 flex flex-col gap-2">
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
                    <span className="text-[9px] font-bold bg-green-100 text-green-800 px-1.5 py-0.5 rounded border border-green-300">سیستم ضعیف</span>
                  )}
                  {game.system_tier === 'normal' && (
                    <span className="text-[9px] font-bold bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded border border-blue-300">سیستم معمولی</span>
                  )}
                  {game.system_tier === 'heavy' && (
                    <span className="text-[9px] font-bold bg-red-100 text-red-800 px-1.5 py-0.5 rounded border border-red-300">سیستم قوی</span>
                  )}
                </div>

                <div className="flex justify-between items-center border-t border-gray-200 pt-1.5 px-1">
                  <span className="text-[11px] font-black text-gray-700" dir="ltr">
                    ⭐ {game.metacritic || '--'}
                  </span>
                  <p className="text-[12px] font-black text-purple-700" dir="ltr">
                    {game.size_gb ? `${game.size_gb} GB` : 'نامشخص'} 💾
                  </p>
                </div>

                {/* دکمه انتخاب / حذف */}
                <button
                  onClick={() => toggleSelectGame(game)}
                  className={`mt-2 w-full py-1.5 px-2 rounded-lg text-xs font-bold transition-all print:hidden flex items-center justify-center gap-1 ${
                    isSelected
                      ? 'bg-red-500 hover:bg-red-600 text-white'
                      : 'bg-purple-600 hover:bg-purple-700 text-white shadow-sm'
                  }`}
                >
                  {isSelected ? '❌ حذف از سبد' : '➕ افزودن به سبد'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* 🛒 نوار شناور سبد سفارش در پایین صفحه */}
      {selectedGames.length > 0 && (
        <div className="fixed bottom-4 left-4 right-4 z-40 bg-slate-900 text-white p-4 rounded-2xl shadow-2xl border border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-4 max-w-5xl mx-auto print:hidden animate-in fade-in slide-in-from-bottom-5">
          <div className="flex items-center gap-4">
            <div className="bg-purple-600 text-white px-3 py-2 rounded-xl text-center">
              <span className="block text-xs text-purple-200">تعداد</span>
              <span className="font-mono font-bold text-lg">{selectedGames.length}</span>
            </div>
            <div>
              <p className="text-xs text-slate-400">مجموع حجم انتخابی:</p>
              <p className="text-lg font-black text-emerald-400" dir="ltr">
                {totalSizeGb.toFixed(1)} GB 💾
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => {
                if (window.confirm("آیا از پاکسازی کامل سبد سفارش اطمینان دارید؟")) {
                  setSelectedGames([]);
                }
              }}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors"
            >
              پاکسازی
            </button>
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-sm transition-all shadow-lg shadow-purple-900/40"
            >
              تایید و ارسال سفارش ({selectedGames.length})
            </button>
          </div>
        </div>
      )}

      {/* 📋 پاپ‌آپ پیش‌نمایش و اصلاح چیدمان متن */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 print:hidden">
          <div className="bg-white text-slate-900 rounded-2xl p-6 max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl animate-in zoom-in-95">
            
            <div className="flex justify-between items-center border-b pb-3 mb-3">
              <h3 className="text-lg font-black text-slate-800">پیش‌نمایش لیست سفارش</h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 font-bold text-lg px-2"
              >
                ✕
              </button>
            </div>

            {/* چیدمان متنی مرتب LTR */}
            <div className="flex-1 overflow-y-auto mb-4 space-y-2 pr-1">
              {selectedGames.map((g, i) => (
                <div 
                  key={g.id || i} 
                  className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-200 hover:bg-slate-100/80 transition-colors"
                >
                  <div className="flex items-center gap-2 overflow-hidden text-left" dir="ltr">
                    <span className="text-xs font-bold text-purple-600 font-mono w-5 flex-shrink-0">
                      {i + 1}.
                    </span>
                    <span className="text-xs font-bold text-slate-800 truncate max-w-[210px] sm:max-w-[260px]">
                      {g.name}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-xs font-black text-purple-700 font-mono" dir="ltr">
                      {g.size_gb ? `${g.size_gb} GB` : '---'}
                    </span>
                    <button
                      onClick={() => handleRemoveFromModal(g)}
                      className="text-red-500 hover:text-red-700 font-bold text-xs p-1 rounded hover:bg-red-50"
                      title="حذف از سبد"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* خلاصه حجم */}
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 mb-4 flex justify-between items-center">
              <span className="text-xs font-bold text-purple-900">حجم کل دیتای درخواستی:</span>
              <span className="text-sm font-black text-purple-700 font-mono" dir="ltr">
                {totalSizeGb.toFixed(1)} GB
              </span>
            </div>

            {/* دکمه‌های ارسال */}
            <div className="flex flex-col gap-2">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleSendTelegram}
                  className="py-2.5 px-4 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                >
                  ✈️ ارسال در تلگرام
                </button>
                <button
                  onClick={handleSendBale}
                  className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                >
                  🟢 ارسال در بله
                </button>
              </div>

              <button
                onClick={handleCopyText}
                className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
              >
                {copied ? '✅ متن سفارش کپی شد!' : '📋 کپی متن کامل لیست سفارش'}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 🖨️ استایل اختصاصی برای پرینت (کوچک‌سازی هدر و متن‌ها + بزرگ‌تر شدن عکس‌ها) */}
      <style>{`
        @media print {
          /* ۱. مخفی کردن المان‌های اضافی مثل دکمه‌ها، نوار فیلتر و پاپ‌آپ‌ها */
          button,
          input,
          select,
          footer,
          .no-print {
            display: none !important;
          }

          /* ۲. کوچک و فشرده کردن هدر اصلی */
          header {
            padding: 2px 0 !important;
            margin-bottom: 6px !important;
            border-bottom: 1px solid #cbd5e1 !important;
          }

          header h1 {
            font-size: 13px !important;
            margin: 0 !important;
            color: #000 !important;
          }

          header p {
            font-size: 9px !important;
            margin: 0 !important;
            color: #444 !important;
          }

          /* ۳. چیدمان ۴ ستونه مرتب در هر صفحه کاغذ */
          .grid {
            display: grid !important;
            grid-template-columns: repeat(4, 1fr) !important;
            gap: 6px !important;
          }

          /* ۴. تنظیم کارت بازی‌ها جهت چاپ تمیز */
          a[href*="game"] {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            border: 1px solid #cbd5e1 !important;
            border-radius: 6px !important;
            background: #ffffff !important;
            box-shadow: none !important;
            display: flex !important;
            flex-direction: column !important;
          }

          /* ۵. بزرگ‌تر ماندن بخش تصویر بازی */
          a[href*="game"] .aspect-video {
            height: 110px !important;
          }

          a[href*="game"] img {
            width: 100% !important;
            height: 100% !important;
            object-fit: cover !important;
            opacity: 1 !important;
          }

          /* ۶. ریز کردن متن‌ها و پدینگ داخل کارت */
          a[href*="game"] .p-4 {
            padding: 2px 4px !important;
          }

          a[href*="game"] h3 {
            font-size: 8px !important;
            line-height: 1.1 !important;
            font-weight: bold !important;
            color: #000000 !important;
            margin: 2px 0 !important;
            white-space: nowrap !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
          }

          /* ۷. ریز کردن بج‌های حجم و امتیاز */
          a[href*="game"] span {
            font-size: 7px !important;
            padding: 0px 3px !important;
            line-height: 1 !important;
            color: #000 !important;
            background: #f1f5f9 !important;
            border-color: #cbd5e1 !important;
          }

          /* ۸. حذف فاصله‌های اضافی بدنه صفحه */
          body {
            background: #ffffff !important;
            color: #000000 !important;
            margin: 0 !important;
            padding: 0 !important;
          }
        }
      `}</style>

    </div>
  );
}
