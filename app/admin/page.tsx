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

  // 🔴 رمز عبور خودت را اینجا تغییر بده:
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
        setMyGames(data);
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
      const res = await fetch(`/api-store?search=${encodeURIComponent(searchQuery)}`);
      if (!res.ok) throw new Error('خطا در دریافت اطلاعات از سرور');
      const data = await res.json();
      setSearchResults(data);
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
          esrb_rating: game.esrb_rating
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'خطا در ذخیره‌سازی');

      setMessage({ text: `بازی "${game.name}" با موفقیت به دیتابیس اضافه شد و بدون VPN قابل مشاهده است.`, isError: false });
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

  // ⚡ ترفند جادویی: تبدیل خودکار عکس‌های سنگین به نسخه بهینه و فشرده ۴۲۰ پیکسلی RAWG
  const getOptimizedImage = (url: string) => {
    if (!url) return '';
    if (url.includes('media/games/')) {
      return url.replace('media/games/', 'media/resize/420/-/games/');
    }
    if (url.includes('media/screenshots/')) {
      return url.replace('media/screenshots/', 'media/resize/420/-/screenshots/');
    }
    return url;
  };

  // حالت اول: فرم ورود
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-4" dir="rtl">
        <div className="bg-slate-800 p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-700">
          <h1 className="text-2xl font-bold text-white text-center mb-6">ورود به پنل مدیریت</h1>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-slate-300 text-sm mb-2">نام کاربری:</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full p-3 bg-slate-900 border border-slate-600 rounded-xl text-white focus:outline-none focus:border-purple-500 transition"
                placeholder="Username"
                required
              />
            </div>
            <div>
              <label className="block text-slate-300 text-sm mb-2">رمز عبور:</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-3 bg-slate-900 border border-slate-600 rounded-xl text-white focus:outline-none focus:border-purple-500 transition"
                placeholder="••••••••"
                required
              />
            </div>
            {loginError && <p className="text-red-400 text-sm text-center font-medium">{loginError}</p>}
            <button
              type="submit"
              className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl transition shadow-lg shadow-purple-900/30"
            >
              ورود به پنل
            </button>
          </form>
        </div>
      </div>
    );
  }

  // حالت دوم: محتوای اصلی پنل ادمین
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-6" dir="rtl">
      <div className="max-w-6xl mx-auto">
        
        <header className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-8 border-b border-slate-800 pb-4">
          <h1 className="text-3xl font-extrabold text-white bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-500">
            پنل مدیریت و آرشیو بازی‌ها
          </h1>
          
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl transition text-sm font-medium flex items-center gap-1"
            >
              🌐 مشاهده سایت اصلی
            </Link>
            
            <button
              onClick={() => setIsLoggedIn(false)}
              className="px-4 py-2 bg-slate-800 hover:bg-red-900/40 text-red-400 border border-slate-700 hover:border-red-500 rounded-xl transition text-sm font-medium"
            >
              خروج از پنل
            </button>
          </div>
        </header>

        <section className="bg-slate-800 p-6 rounded-2xl border border-slate-700 mb-8 shadow-xl">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="نام بازی را به انگلیسی بنویسید... (مثلاً: Batman)"
              className="flex-1 p-4 bg-slate-900 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
            />
            <button
              type="submit"
              disabled={loading}
              className="px-8 py-4 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 text-white font-bold rounded-xl transition"
            >
              {loading ? 'در حال جستجو...' : 'جستجوی بازی'}
            </button>
          </form>

          {message.text && (
            <div className={`mt-4 p-4 rounded-xl text-center font-medium border ${
              message.isError ? 'bg-red-900/30 text-red-400 border-red-500/50' : 'bg-green-900/30 text-green-400 border-green-500/50'
            }`}>
              {message.text}
            </div>
          )}
        </section>

        {/* ⏳ لودینگ کارت‌ها به صورت اسکلتون متحرک و شیک */}
        {loading && (
          <section className="mb-12">
            <h2 className="text-xl font-bold text-slate-600 mb-4 animate-pulse">در حال دریافت نتایج...</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className="bg-slate-800/50 border border-slate-700/50 rounded-2xl overflow-hidden h-64 animate-pulse flex flex-col justify-between p-4">
                  <div className="w-full h-32 bg-slate-700 rounded-xl mb-4"></div>
                  <div className="h-4 bg-slate-700 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-slate-700 rounded w-1/2 mb-4"></div>
                  <div className="h-10 bg-slate-700 rounded-xl w-full"></div>
                </div>
              ))}
            </div>
          </section>
        )}

        {!loading && searchResults.length > 0 && (
          <section className="mb-12">
            <h2 className="text-xl font-bold text-slate-300 mb-4 border-r-4 border-purple-500 pr-2">نتایج یافت شده:</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {searchResults.map((game) => {
                const isAlreadyAdded = myGames.some((g) => g.id.toString() === game.id.toString());
                
                return (
                  <div key={game.id} className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden shadow-lg flex flex-col justify-between group hover:border-slate-500 transition duration-300">
                    
                    {/* بخش کاور بازی با لودینگ پیش‌فرض بک‌گراند */}
                    <div className="relative aspect-video w-full bg-slate-900 overflow-hidden">
                      {game.background_image ? (
                        <img
                          src={getOptimizedImage(game.background_image)} // 🌟 اعمال فشرده‌ساز آنلاین
                          alt={game.name}
                          className="object-cover w-full h-full group-hover:scale-105 transition duration-500"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-500 text-xs">بدون تصویر</div>
                      )}
                    </div>
                    
                    <div className="p-4 flex-1 flex flex-col justify-between">
                      <div className="mb-4">
                        <h3 className="font-bold text-white text-base line-clamp-1 mb-1" title={game.name}>{game.name}</h3>
                        <p className="text-xs text-slate-400">انتشار: {game.released || 'نامشخص'}</p>
                      </div>

                      {isAlreadyAdded ? (
                        <button
                          onClick={() => handleDeleteGame(game.id, game.name)}
                          className="w-full py-2.5 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white font-semibold rounded-xl border border-red-500/40 hover:border-red-600 transition text-sm flex items-center justify-center gap-1"
                        >
                          ❌ حذف از سایت
                        </button>
                      ) : (
                        <button
                          onClick={() => handleAddGame(game)}
                          className="w-full py-2.5 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition text-sm flex items-center justify-center gap-1 shadow-lg shadow-green-900/20"
                        >
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
