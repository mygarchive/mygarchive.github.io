'use client';

import { useState, useMemo } from 'react';
import localGamesData from '../../data/games.json';

// ⚙️ آیدی‌های شبکه اجتماعی پشتیبانی
const TELEGRAM_USERNAME = "HF273"; // آیدی تلگرام (بدون @)
const BALE_USERNAME = "HF273";         // آیدی بله (بدون @)

// 🖼️ کامپوننت هوشمند لود عکس (کیفیت شفاف + لود فوق‌سریع)
const ProxyImage = ({ 
  src, 
  alt, 
  className,
  priority = false 
}: { 
  src: string, 
  alt: string, 
  className: string,
  priority?: boolean 
}) => {
  const [proxyIndex, setProxyIndex] = useState(0);

  const cleanUrl = src ? src.replace(/^https?:\/\//i, '') : '';

  // تنظیم کیفیت روی w=480 و q=78 با فرمت webp جهت شفافیت کاورها و حجم بسیار پایین (~۱۵ کیلوبایت)
  const IMAGE_PROXIES = useMemo(() => [
    `https://images.weserv.nl/?url=${encodeURIComponent(cleanUrl)}&w=480&q=78&output=webp`,
    `https://rawg-proxy.hossein-hf273.workers.dev/?url=${encodeURIComponent(src)}`,
    `https://api.allorigins.win/raw?url=${encodeURIComponent(src)}`,
    src
  ], [cleanUrl, src]);

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
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "low"}
      decoding="async"
    />
  );
};

export default function CatalogPDF() {
  const [selectedGames, setSelectedGames] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // مرتب‌سازی الفبایی بازی‌ها با کش متغیر جهت جلوگیری از محاسبات مجدد
  const sortedGames = useMemo(() => {
    return [...localGamesData].sort((a: any, b: any) => 
      (a.name || "").localeCompare(b.name || "", 'en', { sensitivity: 'accent' })
    );
  }, []);

  // محاسبه مجموع حجم
  const totalSizeGb = useMemo(() => {
    return selectedGames.reduce((acc, g) => acc + (Number(g.size_gb) || 0), 0);
  }, [selectedGames]);

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
      
      {/* 🔴 هدر کاتالوگ */}
      <div className="text-center mb-6 pb-4 border-b-2 border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-right">
          <h1 className="text-2xl sm:text-3xl font-black mb-1">لیست دیتای بازی‌های کامپیوتری</h1>
          
          {/* 1️⃣ راهنمای مخصوص سایت آنلاین */}
          <p className="text-xs sm:text-sm font-bold text-gray-600 print:hidden">
            برای سفارش آنلاین، بازی‌ها را به سبد اضافه کرده و دکمه ارسال را بزنید.
          </p>

          {/* 2️⃣ راهنمای اختصاصی مخصوص فایل PDF / پرینت */}
          <p className="hidden print:block text-xs sm:text-sm font-bold text-gray-800">
            📄 <b>راهنمای سفارش از روی نسخه PDF:</b> جهت ثبت سفارش، نام بازی‌های مورد نظر خود را یادداشت کرده و به آیدی تلگرام یا بله ارسال کنید.
          </p>
        </div>

        {/* آمار زنده و راه‌های ارتباطی */}
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          <div className="flex items-center gap-1.5 bg-purple-50 border border-purple-200 text-purple-900 px-3 py-1.5 rounded-full text-xs font-bold">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-600"></span>
            </span>
            <span>موجود در آرشیو:</span>
            <span className="font-mono text-sm text-purple-700">{sortedGames.length}</span>
            <span>عنوان</span>
          </div>

          <div className="flex items-center gap-2 text-xs font-bold text-gray-700 bg-gray-100 px-3 py-1.5 rounded-full border border-gray-300">
            <span>پشتیبانی:</span>
            <a href={`https://t.me/${TELEGRAM_USERNAME}`} target="_blank" rel="noopener noreferrer" className="text-sky-600 hover:underline" dir="ltr">@{TELEGRAM_USERNAME}</a>
            {BALE_USERNAME && (
              <>
                <span>/</span>
                <a href={`https://ble.ir/${BALE_USERNAME}`} target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:underline" dir="ltr">@{BALE_USERNAME}</a>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 🎮 چیدمان شبکه کارت‌های بازی (با قابلیت هماهنگی سایز تصویر هنگام زوم) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 catalog-grid">
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
            >
              {isSelected && (
                <span className="absolute top-2 right-2 z-10 bg-purple-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full print:hidden shadow">
                  ✓ انتخاب شد
                </span>
              )}

              {/* کادر تصویر واکنش‌گرا و هماهنگ با زوم */}
              <div className="w-full h-auto aspect-video mb-3 rounded-lg overflow-hidden flex-shrink-0 bg-gray-200 relative">
                <ProxyImage
                  src={game.background_image}
                  alt={game.name}
                  className="w-full h-full object-cover block"
                  priority={index < 8}
                />
              </div>
              
              <h2 className="text-[11px] sm:text-xs font-black text-center w-full leading-tight mb-3" dir="ltr">
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
                  onClick={(e) => {
                    if (selectedGames.length === 0) {
                      alert('لطفاً ابتدا حداقل یک بازی را از کاتالوگ انتخاب کنید.');
                      return;
                    }
                    handleSendTelegram();
                  }}
                  className={`py-2.5 px-4 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-sm ${
                    selectedGames.length === 0
                      ? 'bg-gray-400 opacity-60 cursor-not-allowed'
                      : 'bg-sky-500 hover:bg-sky-600'
                  }`}
                >
                  ✈️ ارسال در تلگرام
                </button>

                <button
                  onClick={(e) => {
                    if (selectedGames.length === 0) {
                      alert('لطفاً ابتدا حداقل یک بازی را از کاتالوگ انتخاب کنید.');
                      return;
                    }
                    handleSendBale();
                  }}
                  className={`py-2.5 px-4 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-sm ${
                    selectedGames.length === 0
                      ? 'bg-gray-400 opacity-60 cursor-not-allowed'
                      : 'bg-emerald-600 hover:bg-emerald-700'
                  }`}
                >
                  🟢 ارسال در بله
                </button>
              </div>

              <button
                onClick={(e) => {
                  if (selectedGames.length === 0) {
                    alert('لطفاً ابتدا حداقل یک بازی را از کاتالوگ انتخاب کنید.');
                    return;
                  }
                  handleCopyText();
                }}
                className={`w-full py-2.5 px-4 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 ${
                  selectedGames.length === 0
                    ? 'bg-gray-400 opacity-60 cursor-not-allowed'
                    : 'bg-slate-800 hover:bg-slate-900'
                }`}
              >
                {copied ? '✅ متن سفارش کپی شد!' : '📋 کپی متن کامل لیست سفارش'}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 🔝 دکمه شناور رفتن به بالای صفحه کاتالوگ */}
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        className="fixed bottom-6 left-6 z-50 p-3.5 bg-slate-800 text-white rounded-full shadow-2xl hover:bg-purple-600 transition-all duration-300 active:scale-90 border border-slate-700 print:hidden"
        title="رفتن به بالای صفحه"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 10l7-7m0 0l7 7m-7-7v18" />
        </svg>
      </button>

      {/* 🖨️ استایل اختصاصی و استاندارد پرینت A4 */}
      <style>{`
        @page {
          size: A4 portrait;
          margin: 8mm;
        }

        @media print {
          /* ۱. مخفی کردن تمام المان‌های غیرضروری در فایل PDF */
          header, 
          footer, 
          nav, 
          button, 
          [class*="print:hidden"],
          .print\\:hidden {
            display: none !important;
          }

          /* ۲. تنظیمات پایه و استاندارد صفحه */
          html, body {
            width: 100% !important;
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            color: #000000 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          /* ۳. آزاد کردن کانتینر اصلی کاتالوگ و حذف عرض‌های محدودکننده */
          main, .max-w-7xl {
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
          }

          /* ۴. اجبار چیدمان کارت‌ها به ۴ ستون کاملاً متوازن و منظم در PDF */
          .grid {
            display: grid !important;
            grid-template-columns: repeat(4, 1fr) !important;
            gap: 12px !important;
          }

          /* ۵. جلوگیری قطعی از نصف شدن یا دو تکه شدن کارت‌های بازی بین دو صفحه */
          tr, 
          a, 
          .grid > *, 
          .break-inside-avoid {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
        }
      `}</style>

    </div>
  );
}
