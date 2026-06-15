'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function AdminPanel() {
  // --- بخش امنیت و ورود ---
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginError, setLoginError] = useState('');

  // --- بخش مدیریت بازی‌ها ---
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [myGames, setMyGames] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', isError: false });

  // 🔴 نام کاربری و رمز عبور پنل ادمین شما
  const YOUR_USERNAME = 'admin';
  const YOUR_PASSWORD = '123456';

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === YOUR_USERNAME && password === YOUR_PASSWORD) {
      setIsLoggedIn(true);
      setLoginError('');
      fetchMyGames();
    } else {
      setLoginError('نام کاربری یا رمز عبور اشتباه است!');
    }
  };

  const fetchMyGames = async () => {
    try {
      const res = await fetch('/api-store');
      if (res.ok) {
        const data = await res.json();
        setMyGames(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('خطا در دریافت لیست بازی‌ها', err);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setLoading(true);
    setMessage({ text: '', isError: false });

    try {
      // استفاده از آدرس کاملاً نسبی برای دور زدن ۱۰۰٪ هرگونه آدرس لوکال یا کش قدیمی
      const res = await fetch(`/api-store?search=${encodeURIComponent(searchQuery)}`);
      
      if (!res.ok) throw new Error('خطا در دریافت اطلاعات از سرور (ارور ۵۰۰ یا لیمیت دیتابیس)');
      
      const data = await res.json();
      setSearchResults(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setMessage({ text: err.message, isError: true });
    } finally {
      setLoading(false);
    }
  };

  const handleAddGame = async (game: any) => {
    setMessage({ text: '', isError: false });
    
    if (myGames.some((g) => g.id.toString() === game.id.toString())) {
      setMessage({ text: `بازی "${game.name}" از قبل در لیست شما موجود است!`, isError: true });
      return;
    }

    try {
      const res = await fetch('/api-store', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: game.id,
          name: game.name,
          released: game.released,
          rating: game.rating,
          background_image: game.background_image,
          short_screenshots: game.short_screenshots,
          platforms: game.platforms, 
          genres: game.genres,
          playtime: game.playtime,
          esrb_rating: game.esrb_rating,
          developers: game.developers || [], 
          publishers: game.publishers || [], 
          stores: game.stores || [],          
          tags: game.tags || [],              
          clip: game.clip || null            
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'خطا در ذخیره‌سازی بازی');

      setMessage({ text: `بازی "${game.name}" با موفقیت به دیتابیس اضافه شد.`, isError: false });
      fetchMyGames();
    } catch (err: any) {
      setMessage({ text: err.message, isError: true });
    }
  };

  const handleDeleteGame = async (gameId: number, gameName: string) => {
    if (!confirm(`آیا از حذف بازی "${gameName}" مطمئن هستید؟`)) return;
    setMessage({ text: '', isError: false });

    try {
      const res = await fetch(`/api-store?id=${gameId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'خطا در حذف بازی');

      setMessage({ text: `بازی "${gameName}" با موفقیت از دیتابیس پاک شد.`, isError: false });
      fetchMyGames();
    } catch (err: any) {
      setMessage({ text: err.message, isError: true });
    }
  };

  // سیستم بهینه‌سازی و فشرده‌سازی خودکار ابعاد تصاویر بازی
  const getOptimizedImage = (url: string) => {
    if (!url) return '';
    if (url.includes('media/games/')) {
      return url.replace('media/games/', 'media/resize/420/-/games/');
    }
    return url;
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4" dir="rtl">
        <div className="bg-slate-900/60 p-8 rounded-3xl shadow-2xl w-full max-w-md border border-slate-800 backdrop-blur-md">
          <h1 className="text-2xl font-black text-white text-center mb-6">ورود به پنل مدیریت</h1>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-slate-400 text-sm mb-2 font-medium">نام کاربری:</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full p-3.5 bg-slate-950 border border-slate-800 rounded-2xl text-white focus:outline-none focus:border-purple-500 transition text-left"
                dir="ltr"
                required
              />
            </div>
            <div>
              <label className="block text-slate-400 text-sm mb-2 font-medium">رمز عبور:</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-3.5 bg-slate-950 border border-slate-800 rounded-2xl text-white focus:outline-none focus:border-purple-500 transition text-left"
                dir="ltr"
                required
              />
            </div>
            {loginError && <p className="text-red-400 text-sm text-center font-bold">{loginError}</p>}
            <button type="submit" className="w-full py-3.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold rounded-2xl transition shadow-lg shadow-purple-900/20 mt-2">
              ورود به پنل
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-12" dir="rtl">
      <div className="max-w-6xl mx-auto">
        
        <header className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-12 border-b border-slate-900 pb-6">
          <h1 className="text-3xl font-black text-white bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-500">
            پنل مدیریت و آرشیو بازی‌ها
          </h1>
          <div className="flex items-center gap-3">
            <Link href="/" className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 rounded-xl transition text-sm font-bold">
              🌐 مشاهده سایت اصلی
            </Link>
            <button onClick={() => setIsLoggedIn(false)} className="px-4 py-2 bg-slate-900 hover:bg-red-950/40 text-red-400 border border-slate-800 rounded-xl transition text-sm font-bold">
              خروج از پنل
            </button>
          </div>
        </header>

        <section className="bg-slate-900/40 p-6 rounded-3xl border border-slate-900 mb-8 backdrop-blur-sm">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="نام بازی را به انگلیسی بنویسید... (مثلاً: Batman)"
              className="flex-1 p-4 bg-slate-950 border border-slate-800 rounded-2xl text-white placeholder-slate-600 focus:outline-none focus:border-purple-500 font-medium"
            />
            <button type="submit" disabled={loading} className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold rounded-2xl transition shadow-lg shadow-purple-900/10">
              {loading ? 'در حال جستجو...' : 'جستجوی بازی'}
            </button>
          </form>
          {message.text && (
            <div className={`mt-4 p-4 rounded-2xl text-center font-medium border ${message.isError ? 'bg-red-950/40 text-red-400 border-red-900/50' : 'bg-green-950/40 text-green-400 border-green-900/50'}`}>
              {message.text}
            </div>
          )}
        </section>

        {loading && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 animate-pulse">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="bg-slate-900/40 border border-slate-900 rounded-3xl h-64 p-4 flex flex-col justify-between">
                <div className="w-full h-32 bg-slate-800 rounded-2xl"></div>
                <div className="h-4 bg-slate-800 rounded w-3/4"></div>
                <div className="h-10 bg-slate-800 rounded-2xl w-full"></div>
              </div>
            ))}
          </div>
        )}

        {!loading && searchResults.length > 0 && (
          <section className="mb-12">
            <h2 className="text-lg font-bold text-slate-400 mb-6 border-r-4 border-purple-500 pr-3">نتایج یافت شده:</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {searchResults.map((game) => {
                const isAlreadyAdded = myGames.some((g) => g.id.toString() === game.id.toString());
                return (
                  <div key={game.id} className="bg-slate-900/30 border border-slate-900 rounded-3xl overflow-hidden shadow-lg flex flex-col justify-between group hover:border-purple-500/30 transition duration-300 backdrop-blur-sm">
                    <div className="relative aspect-video w-full bg-slate-950 overflow-hidden">
                      {game.background_image ? (
                        <img src={getOptimizedImage(game.background_image)} alt={game.name} className="object-cover w-full h-full group-hover:scale-105 transition duration-500" loading="lazy" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-600 text-xs">بدون تصویر</div>
                      )}
                    </div>
                    <div className="p-4 flex-1 flex flex-col justify-between">
                      <div className="mb-4">
                        <h3 className="font-bold text-white text-sm md:text-base line-clamp-1 mb-1" title={game.name}>{game.name}</h3>
                        <p className="text-[11px] text-slate-500">انتشار: {game.released ? game.released.split('-')[0] : 'نامشخص'}</p>
                      </div>
                      {isAlreadyAdded ? (
                        <button onClick={() => handleDeleteGame(game.id, game.name)} className="w-full py-2.5 bg-red-950/30 hover:bg-red-600 text-red-400 hover:text-white font-bold rounded-xl border border-red-900/40 transition text-xs">
                          ❌ حذف از سایت
                        </button>
                      ) : (
                        <button onClick={() => handleAddGame(game)} className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl transition text-xs shadow-md">
                          ➕ اضافه به سایت
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
