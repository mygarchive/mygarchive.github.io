'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

const GITHUB_OWNER = 'mygarchive'; 
const GITHUB_REPO = 'mygarchive.github.io'; 
const RAWG_API_KEY = '8ceb3ebba03c4ddca51106af23868263';

// 🌐 تابع کمکی برای ترجمه خودکار متن به فارسی
async function translateToPersian(text: string): Promise<string> {
  try {
    const res = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=fa&dt=t&q=${encodeURIComponent(text)}`);
    if (!res.ok) return 'ترجمه خودکار با خطا مواجه شد.';
    const data = await res.json();
    return data[0].map((item: any) => item[0]).join('');
  } catch (err) {
    console.error('خطا در ترجمه:', err);
    return 'خطا در ارتباط با سرور ترجمه.';
  }
}

export default function AdminPanel() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [githubToken, setGithubToken] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [myGames, setMyGames] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', isError: false });
  const [fileSha, setFileSha] = useState('');

  // 🖼️ تابع بهینه‌سازی سایز عکس و دور زدن فیلترینگ ایران
  const getOptimizedUrl = (url: string, width = 400) => {
    if (!url) return '';
    const cleanUrl = url.replace(/^https?:\/\//i, '');
    return `https://images.weserv.nl/?url=${encodeURIComponent(cleanUrl)}&w=${width}&q=80`;
  };

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.pathname.includes('/app/')) {
      const cleanPath = window.location.pathname.replace('/app/', '/');
      window.location.replace(window.location.origin + cleanPath);
      return;
    }

    const adminStatus = localStorage.getItem('isAdmin');
    const savedToken = localStorage.getItem('gh_token');
    if (adminStatus === 'true' && savedToken) {
      setIsLoggedIn(true);
      setGithubToken(savedToken);
      fetchMyGames(savedToken);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUsername = username.trim().toLowerCase();
    const cleanPassword = password.trim().toLowerCase();

    if (cleanUsername === 'hf273' && cleanPassword === 'hf1to1') {
      if (!githubToken.trim().startsWith('ghp_')) {
        setLoginError('لطفاً توکن کلاسیک گیت‌هاب که با ghp_ شروع می‌شود را درست وارد کنید.');
        return;
      }
      localStorage.setItem('isAdmin', 'true');
      localStorage.setItem('gh_token', githubToken.trim());
      setGithubToken(githubToken.trim());
      setLoginError('');
      await fetchMyGames(githubToken.trim(), true);
    } else {
      setLoginError('نام کاربری یا رمز عبور اشتباه است!');
    }
  };

  const fetchMyGames = async (token: string, isInitialLogin = false) => {
    try {
      // استفاده از ترفند کش‌بریکست (?v=) برای گرفتن آخرین تغییرات دیتابیس
      const res = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/data/games.json?v=${Date.now()}`, {
        headers: { 'Authorization': `token ${token}` }
      });
      
      if (res.status === 200) {
        const data = await res.json();
        setFileSha(data.sha);
        const content = JSON.parse(atob(data.content));
        setMyGames(Array.isArray(content) ? content : []);
        setIsLoggedIn(true);
      } else if (res.status === 401 || res.status === 403) {
        localStorage.clear();
        setIsLoggedIn(false);
        setLoginError('توکن گیت‌هاب معتبر نیست یا منقضی شده است!');
      } else if (res.status === 404 && isInitialLogin) {
        setIsLoggedIn(true);
        setLoginError('');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery) return;
    setLoading(true);
    try {
      // 🚀 افزایش تعداد نتایج به 20 برای لود کردن تمام نسخه‌های بازی‌ها
      const res = await fetch(`https://api.rawg.io/api/games?key=${RAWG_API_KEY}&search=${searchQuery}&page_size=20`);
      const data = await res.json();
      setSearchResults(data.results || []);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const handleAddGame = async (game: any) => {
    setLoading(true);
    setMessage({ text: 'در حال دریافت اطلاعات تکمیلی و ترجمه خودکار توضیحات...', isError: false });

    try {
      const gameDetailsRes = await fetch(`https://api.rawg.io/api/games/${game.id}?key=${RAWG_API_KEY}`);
      const gameDetails = await gameDetailsRes.json();
      
      const rawDescriptionEn = gameDetails.description_raw || "No description available.";
      const shortDescriptionEn = rawDescriptionEn.length > 1000 ? rawDescriptionEn.substring(0, 1000) + '...' : rawDescriptionEn;
      const descriptionFa = await translateToPersian(shortDescriptionEn);

      const updatedGames = [...myGames, {
        id: game.id,
        name: game.name,
        background_image: game.background_image, // آدرس خام برای ذخیره در دیتابیس
        rating: game.rating,
        released: game.released,
        genres: game.genres,
        description_en: shortDescriptionEn,
        description_fa: descriptionFa 
      }];

      const res = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/data/games.json`, {
        method: 'PUT',
        headers: {
          'Authorization': `token ${githubToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: `Add ${game.name} with dual-language description`,
          content: btoa(unescape(encodeURIComponent(JSON.stringify(updatedGames, null, 2)))),
          sha: fileSha
        })
      });

      if (res.status === 200 || res.status === 201) {
        setMessage({ text: `بازی "${game.name}" با موفقیت به آرشیو اضافه شد! صفحه تا ۳ ثانیه دیگر رفرش می‌شود.`, isError: false });
        setTimeout(() => window.location.reload(), 3000);
      } else {
        setMessage({ text: 'خطا در ذخیره روی گیت‌هاب.', isError: true });
      }
    } catch (err) {
      setMessage({ text: 'ارتباط با سرور برقرار نشد.', isError: true });
    }
    setLoading(false);
  };

  // ❌ تابع هوشمند حذف بازی از آرشیو
  const handleRemoveGame = async (gameId: number, gameName: string) => {
    if (!window.confirm(`آیا از حذف بازی "${gameName}" مطمئن هستید؟`)) return;
    setLoading(true);
    
    const updatedGames = myGames.filter((g) => g.id !== gameId);

    try {
      const res = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/data/games.json`, {
        method: 'PUT',
        headers: {
          'Authorization': `token ${githubToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: `Remove ${gameName} from archive`,
          content: btoa(unescape(encodeURIComponent(JSON.stringify(updatedGames, null, 2)))),
          sha: fileSha
        })
      });

      if (res.status === 200 || res.status === 201) {
        setMessage({ text: `بازی "${gameName}" با موفقیت از آرشیو حذف شد! صفحه تا ۳ ثانیه دیگر رفرش می‌شود.`, isError: false });
        setTimeout(() => window.location.reload(), 3000);
      } else {
        setMessage({ text: 'خطا در حذف بازی از روی گیت‌هاب.', isError: true });
      }
    } catch (err) {
      setMessage({ text: 'مشکل در برقراری ارتباط با سرور.', isError: true });
    }
    setLoading(false);
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4" dir="rtl">
        <form onSubmit={handleLogin} className="bg-slate-900 border border-slate-800 p-6 rounded-2xl w-full max-w-md space-y-4 shadow-xl">
          <h2 className="text-xl font-black text-center text-white mb-2">⚙️ ورود به پنل مدیریت آرشیو</h2>
          <div>
            <label className="text-xs text-slate-400 block mb-1">نام کاربری:</label>
            <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-left outline-none" required />
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1">رمز عبور:</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-left outline-none" required />
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1">توکن کلاسیک گیت‌هاب (ghp_...):</label>
            <input type="password" value={githubToken} onChange={(e) => setGithubToken(e.target.value)} className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-left outline-none" required />
          </div>
          {loginError && <p className="text-xs text-red-400 text-center font-bold">{loginError}</p>}
          <button type="submit" className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 font-bold rounded-xl text-sm text-white transition">اتصال و ورود</button>
          <div className="text-center pt-2"><Link href="/" className="text-xs text-slate-500 hover:text-slate-300">➔ بازگشت به صفحه اصلی سایت</Link></div>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-12" dir="rtl">
      <div className="max-w-5xl mx-auto">
        <header className="flex justify-between items-center mb-8 border-b border-slate-900 pb-4">
          <h1 className="text-xl font-black text-white">🎮 پنل مدیریت و افزودن بازی</h1>
          <div className="flex items-center gap-4">
            {/* ➔ مورد دوم: دکمه بازگشت به صفحه اصلی سایت */}
            <Link href="/" className="text-xs text-purple-400 bg-purple-950/40 border border-purple-900/60 px-3 py-1.5 rounded-xl hover:bg-purple-600 hover:text-white transition">➔ مشاهده سایت اصلی</Link>
            <button onClick={() => { localStorage.clear(); setIsLoggedIn(false); }} className="text-xs text-red-400 hover:underline">خروج</button>
          </div>
        </header>

        <div className="bg-slate-900/50 border border-slate-900 p-4 rounded-xl mb-6 flex gap-2">
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch()} placeholder="نام بازی را به انگلیسی بنویسید (مثلاً Assassin)..." className="flex-1 p-3 bg-slate-950 border border-slate-800 rounded-xl text-sm outline-none focus:border-purple-500" />
          <button onClick={handleSearch} disabled={loading} className="px-6 bg-purple-600 hover:bg-purple-700 rounded-xl text-sm font-bold transition">جستجو</button>
        </div>

        {message.text && (
          <div className={`p-3 rounded-lg text-xs font-bold mb-6 text-center ${message.isError ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-green-500/10 text-green-400 border border-green-500/20'}`}>
            {message.text}
          </div>
        )}

        {loading && <div className="text-center py-6 text-sm text-slate-400 animate-pulse">در حال پردازش داده‌ها...</div>}

        {/* ⚡ تغییر استایل به کارت‌های بزرگ‌تر و شیک‌تر */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {searchResults.map((game) => {
            const isAlreadyAdded = myGames.some((g) => g.id === game.id);
            return (
              <div key={game.id} className="bg-slate-900 border border-slate-800/80 rounded-2xl overflow-hidden flex flex-col justify-between group shadow-lg hover:border-slate-700 transition">
                {/* 🖼️ استفاده از تصویر کم‌حجم، سریع و ضدتحریم ایران */}
                <img src={getOptimizedUrl(game.background_image, 500)} alt={game.name} className="w-full h-44 object-cover bg-slate-950 transition group-hover:scale-105 duration-300" />
                <div className="p-4 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    <h3 className="font-bold text-base text-white text-left tracking-tight truncate-2-lines mb-1" dir="ltr">{game.name}</h3>
                    <p className="text-xs text-slate-500">انتشار: {game.released || '---'}</p>
                  </div>
                  
                  {/* ❌ مورد پنجم: دکمه داینامیک افزودن یا حذف هوشمند */}
                  {isAlreadyAdded ? (
                    <button onClick={() => handleRemoveGame(game.id, game.name)} className="w-full py-2 bg-red-950/40 hover:bg-red-600 border border-red-900 hover:border-red-500 text-red-400 hover:text-white rounded-xl text-xs transition font-black">
                      ❌ حذف از آرشیو شما
                    </button>
                  ) : (
                    <button onClick={() => handleAddGame(game)} className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs transition font-black">
                      ＋ افزودن به آرشیو
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
