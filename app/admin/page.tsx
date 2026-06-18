/* eslint-disable @next/next/no-img-element */
'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import localGamesData from '../../data/games.json';

export default function AdminPage() {
  const [games, setGames] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(true);

  // فرم افزودن/ویرایش بازی
  const [isEditing, setIsEditing] = useState(false);
  const [editingGameId, setEditingGameId] = useState<string | null>(null);
  const [gameName, setGameName] = useState('');
  const [gameRating, setGameRating] = useState('');
  const [gameImage, setGameImage] = useState('');
  const [gameDescriptionFa, setGameDescriptionFa] = useState('');
  const [gameReleased, setGameReleased] = useState('');

  // رفرنس برای اسکرول به فرم هنگام ویرایش
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
      setDarkMode(false);
    } else {
      setDarkMode(true);
    }
  }, []);

  const processNextQueueTask = () => {
    // صف پردازش داخلی برای جلوگیری از خطای esLint
  };

  useEffect(() => {
    processNextQueueTask();
    try {
      let data: any[] = Array.isArray(localGamesData) ? localGamesData : [];
      setGames(data);
      setLoading(false);
    } catch (err) {
      console.error("خطا در بارگذاری دیتابیس ادمین:", err);
      setLoading(false);
    }
  }, []);

  const getOptimizedUrl = (url: string, width = 100) => {
    if (!url) return '';
    return `https://images.weserv.nl/?url=${encodeURIComponent(url.replace(/^https?:\/\//i, ''))}&w=${width}&q=80`;
  };

  // هندلر باز کردن فرم ویرایش
  const handleEditClick = (game: any) => {
    setIsEditing(true);
    setEditingGameId(game.id);
    setGameName(game.name || '');
    setGameRating(game.rating || '');
    setGameImage(game.background_image || '');
    setGameDescriptionFa(game.description_fa || '');
    setGameReleased(game.released || '');

    // اسکرول نرم به سمت فرم
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  // هندلر ذخیره تغییرات
  const handleSaveGame = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!gameName.trim()) {
      alert("نام بازی نمی‌تواند خالی باشد.");
      return;
    }

    const updatedGames = games.map(g => {
      if (g.id === editingGameId) {
        return {
          ...g,
          name: gameName,
          rating: gameRating,
          background_image: gameImage,
          description_fa: gameDescriptionFa,
          released: gameReleased
        };
      }
      return g;
    });

    setGames(updatedGames);
    resetForm();
    alert("اطلاعات بازی با موفقیت به‌روزرسانی شد (توجه: برای ذخیره دائمی، فایل games.json باید در سرور/لوکال بازنویسی شود).");
  };

  // هندلر حذف بازی
  const handleDeleteGame = (id: string) => {
    if (!confirm("آیا از حذف این بازی اطمینان دارید؟")) return;
    const filteredGames = games.filter(g => g.id !== id);
    setGames(filteredGames);
  };

  // ریست کردن فرم
  const resetForm = () => {
    setIsEditing(false);
    setEditingGameId(null);
    setGameName('');
    setGameRating('');
    setGameImage('');
    setGameDescriptionFa('');
    setGameReleased('');
  };

  const themeStyles = {
    bg: darkMode ? '#020617' : '#f8fafc',
    text: darkMode ? '#f1f5f9' : '#0f172a',
    titleText: darkMode ? '#ffffff' : '#0f172a',
    subText: darkMode ? '#94a3b8' : '#475569',
    cardBg: darkMode ? '#0f172a' : '#ffffff',
    border: darkMode ? '#1e293b' : '#e2e8f0',
    tableHeaderBg: darkMode ? '#1e293b' : '#f1f5f9',
    inputBg: darkMode ? '#020617' : '#f1f5f9',
  };

  if (loading) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center text-sm animate-pulse transition-colors duration-300"
        style={{ backgroundColor: themeStyles.bg, color: themeStyles.subText }}
      >
        در حال بارگذاری پنل مدیریت...
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen p-6 md:p-12 transition-colors duration-300" 
      dir="rtl"
      style={{ backgroundColor: themeStyles.bg, color: themeStyles.text }}
    >
      <div className="max-w-7xl mx-auto w-full">
        
        {/* هدر پنل */}
        <header 
          className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8 pb-6 border-b" 
          style={{ borderColor: themeStyles.border }}
        >
          <div>
            <h1 className="text-2xl font-black" style={{ color: themeStyles.titleText }}>🛠️ پنل مدیریت آرشیو بازی‌ها</h1>
            <p className="text-xs mt-2" style={{ color: themeStyles.subText }}>مدیریت، ویرایش و بررسی بازی‌های ثبت شده در دیتابیس</p>
          </div>
          
          <Link 
            href="/" 
            className="text-xs font-bold px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white transition shadow-sm"
          >
            ➔ بازگشت به صفحه اصلی سایت
          </Link>
        </header>

        {/* فرم ویرایش (در صورت کلیک روی دکمه ویرایش نمایش داده می‌شود) */}
        {isEditing && (
          <div 
            ref={formRef}
            className="p-6 rounded-2xl border shadow-sm mb-10 transition-colors duration-300"
            style={{ backgroundColor: themeStyles.cardBg, borderColor: themeStyles.border }}
          >
            <h2 className="text-base font-black mb-6" style={{ color: themeStyles.titleText }}>📝 فرم ویرایش اطلاعات بازی</h2>
            <form onSubmit={handleSaveGame} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold" style={{ color: themeStyles.subText }}>نام بازی:</label>
                  <input 
                    type="text" 
                    value={gameName}
                    onChange={(e) => setGameName(e.target.value)}
                    className="w-full p-3 rounded-xl text-xs outline-none font-bold"
                    style={{ backgroundColor: themeStyles.inputBg, border: `1px solid ${themeStyles.border}`, color: themeStyles.text }}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold" style={{ color: themeStyles.subText }}>امتیاز بازی:</label>
                  <input 
                    type="text" 
                    value={gameRating}
                    onChange={(e) => setGameRating(e.target.value)}
                    className="w-full p-3 rounded-xl text-xs outline-none font-mono"
                    style={{ backgroundColor: themeStyles.inputBg, border: `1px solid ${themeStyles.border}`, color: themeStyles.text }}
                  />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-xs font-bold" style={{ color: themeStyles.subText }}>لینک تصویر پس‌زمینه (Background Image URL):</label>
                  <input 
                    type="text" 
                    value={gameImage}
                    onChange={(e) => setGameImage(e.target.value)}
                    className="w-full p-3 rounded-xl text-xs outline-none font-mono text-left"
                    dir="ltr"
                    style={{ backgroundColor: themeStyles.inputBg, border: `1px solid ${themeStyles.border}`, color: themeStyles.text }}
                  />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-xs font-bold" style={{ color: themeStyles.subText }}>توضیحات فارسی بازی:</label>
                  <textarea 
                    value={gameDescriptionFa}
                    onChange={(e) => setGameDescriptionFa(e.target.value)}
                    rows={4}
                    className="w-full p-3 rounded-xl text-xs outline-none font-sans leading-6 resize-y"
                    style={{ backgroundColor: themeStyles.inputBg, border: `1px solid ${themeStyles.border}`, color: themeStyles.text }}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold" style={{ color: themeStyles.subText }}>تاریخ انتشار (Released):</label>
                  <input 
                    type="text" 
                    value={gameReleased}
                    onChange={(e) => setGameReleased(e.target.value)}
                    className="w-full p-3 rounded-xl text-xs outline-none font-mono text-left"
                    dir="ltr"
                    placeholder="YYYY-MM-DD"
                    style={{ backgroundColor: themeStyles.inputBg, border: `1px solid ${themeStyles.border}`, color: themeStyles.text }}
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-4 border-t" style={{ borderColor: themeStyles.border }}>
                <button type="submit" className="px-6 py-2.5 bg-green-600 hover:bg-green-500 text-white rounded-xl text-xs font-bold transition">ذخیره تغییرات</button>
                <button type="button" onClick={resetForm} className="px-6 py-2.5 bg-slate-500 hover:bg-slate-600 text-white rounded-xl text-xs font-bold transition">انصراف</button>
              </div>
            </form>
          </div>
        )}

        {/* جدول لیست بازی‌ها */}
        <div 
          className="rounded-2xl overflow-hidden border shadow-sm transition-colors duration-300" 
          style={{ borderColor: themeStyles.border }}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse text-xs">
              <thead>
                <tr 
                  className="transition-colors duration-300"
                  style={{ backgroundColor: themeStyles.tableHeaderBg, color: themeStyles.titleText }}
                >
                  <th className="p-4 font-black">تصویر</th>
                  <th className="p-4 font-black">نام بازی</th>
                  <th className="p-4 font-black">امتیاز</th>
                  <th className="p-4 font-black" style={{ textAlign: 'left' }}>شناسه (ID)</th>
                  <th className="p-4 font-black" style={{ textAlign: 'center' }}>عملیات</th>
                </tr>
              </thead>
              <tbody 
                className="divide-y transition-colors duration-300" 
                style={{ borderColor: themeStyles.border }}
              >
                {games.map((game) => (
                  <tr 
                    key={game.id} 
                    className="hover:opacity-95 transition-colors duration-300" 
                    style={{ backgroundColor: themeStyles.cardBg }}
                  >
                    <td className="p-3">
                      <img 
                        src={getOptimizedUrl(game.background_image, 100)} 
                        alt={game.name} 
                        className="w-16 h-12 object-cover rounded-xl border"
                        style={{ borderColor: themeStyles.border }}
                      />
                    </td>
                    <td 
                      className="p-3 font-bold" 
                      style={{ color: themeStyles.titleText }} 
                      dir="ltr"
                    >
                      {game.name}
                    </td>
                    <td className="p-3 font-mono">⭐ {game.rating || '---'}</td>
                    <td 
                      className="p-3 font-mono text-left" 
                      style={{ color: themeStyles.subText }} 
                      dir="ltr"
                    >
                      {game.id}
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button 
                          onClick={() => handleEditClick(game)}
                          className="px-3 py-1.5 bg-sky-500/10 text-sky-500 font-bold rounded-lg text-[10px] border border-sky-500/20 cursor-pointer hover:bg-sky-500/20 transition"
                        >
                          ویرایش
                        </button>
                        <button 
                          onClick={() => handleDeleteGame(game.id)}
                          className="px-3 py-1.5 bg-red-500/10 text-red-500 font-bold rounded-lg text-[10px] border border-red-500/20 cursor-pointer hover:bg-red-500/20 transition"
                        >
                          حذف
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
