'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

// تنظیمات گیت‌هاب شما - این دو مورد را دقیقاً طبق اکانت خودت پر کن
const GITHUB_OWNER = 'نام_کاربری_شما_در_گیت‌هاب'; 
const GITHUB_REPO = 'نام_مخزن_یا_ریپازیتوری_شما';
const RAWG_API_KEY = '8ceb3ebba03c4ddca51106af23868263';

async function hashPassword(string: string) {
  const utf8 = new TextEncoder().encode(string);
  const hashBuffer = await crypto.subtle.digest('SHA-256', utf8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export default function AdminPanel() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginError, setLoginError] = useState('');
  
  // توکن گیت‌هاب که کپی کردی
  const [githubToken, setGithubToken] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [myGames, setMyGames] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', isError: false });
  const [fileSha, setFileSha] = useState(''); // گیت‌هاب برای آپدیت فایل به SHA نیاز دارد

  useEffect(() => {
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
    const userTypedHash = await hashPassword(password);

    if (username === 'HF273' && userTypedHash === '95ed82328afcc54d826006515d6334f77dab3fe2d2bec5b85fa9503ac19c502a') {
      if (!githubToken.trim()) {
        setLoginError('لطفاً توکن گیت‌هاب را وارد کنید!');
        return;
      }
      setIsLoggedIn(true);
      setLoginError('');
      localStorage.setItem('isAdmin', 'true');
      localStorage.setItem('gh_token', githubToken.trim());
      fetchMyGames(githubToken.trim());
    } else {
      setLoginError('نام کاربری یا رمز عبور اشتباه است!');
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    localStorage.removeItem('isAdmin');
    localStorage.removeItem('gh_token');
  };

  // دریافت مستقیم لیست بازی‌ها از گیت‌هاب
  const fetchMyGames = async (token: string) => {
    try {
      const res = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/data/games.json`, {
        headers: { Authorization: `token ${token}`, 'Cache-Control': 'no-cache' }
      });
      if (res.ok) {
        const data = await res.json();
        setFileSha(data.sha); // ذخیره SHA فایل برای آپدیت‌های بعدی
        const decodedContent = decodeURIComponent(escape(atob(data.content))); // رمزگشایی base64 به متن UTF-8
        const gamesList = JSON.parse(decodedContent);
        setMyGames(Array.isArray(gamesList) ? gamesList : []);
      }
    } catch (err) {
      console.error('خطا در دریافت لیست بازی‌ها از گیت‌هاب:', err);
    }
  };

  // جستجوی مستقیم بازی از RAWG در سمت کلاینت
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setLoading(true);
    setMessage({ text: '', isError: false });
    setSearchResults([]); 

    try {
      const apiUrl = `https://api.rawg.io/api/games?key=${RAWG_API_KEY}&search=${encodeURIComponent(searchQuery)}&page_size=12`;
      const res = await fetch(apiUrl);
      if (!res.ok) throw new Error('خطا در دریافت اطلاعات از RAWG');
      const data = await res.json();
      setSearchResults(data.results || []);
    } catch (err: any) {
      setMessage({ text: err.message, isError: true });
    } finally {
      setLoading(false);
    }
  };

  // ذخیره کل لیست جدید در گیت‌هاب
  const saveToGitHub = async (updatedList: any[], logMessage: string) => {
    setLoading(true);
    try {
      // تبدیل متن به Base64 مناسب برای متون فارسی/خاص
      const contentBase64 = btoa(unescape(encodeURIComponent(JSON.stringify(updatedList, null, 2))));
      
      const res = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/data/games.json`, {
        method: 'PUT',
        headers: {
          Authorization: `token ${githubToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: logMessage,
          content: contentBase64,
          sha: fileSha // فرستادن SHA الزامی است
        })
      });

      if (!res.ok) throw new Error('خطا در ذخیره‌سازی روی مخزن گیت‌هاب');
      
      const resData = await res.json();
      setFileSha(resData.content.sha); // بروزرسانی SHA برای عملیات بعدی
      setMyGames(updatedList);
      setMessage({ text: `عملیات با موفقیت در گیت‌هاب ثبت شد. سایت چند دقیقه دیگر بروز می‌شود.`, isError: false });
    } catch (err: any) {
      setMessage({ text: err.message, isError: true });
    } finally {
      setLoading(false);
    }
  };

  const handleAddGame = async (game: any) => {
    setMessage({ text: '', isError: false });
    if (myGames.some((g) => g.id.toString() === game.id.toString())) {
      setMessage({ text: `بازی "${game.name}" از قبل موجود است!`, isError: true });
      return;
    }

    setLoading(true);
    try {
      // دریافت جزئیات تکمیلی از RAWG قبل از ذخیره
      const detailRes = await fetch(`https://api.rawg.io/api/games/${game.id}?key=${RAWG_API_KEY}`);
      let description_raw = '';
      let developers = [];
      let publishers = [];
      let platforms = [];
      let clip = null;

      if (detailRes.ok) {
        const detailData = await detailRes.json();
        description_raw = detailData.description_raw || detailData.description || '';
        developers = detailData.developers || [];
        publishers = detailData.publishers || [];
        platforms = detailData.platforms || [];
        clip = detailData.clip || null;
      }

      const finalGameObject = {
        ...game,
        description_raw,
        developers,
        publishers,
        platforms,
        clip
      };

      const newList = [...myGames, finalGameObject];
      await saveToGitHub(newList, `➕ Added game: ${game.name}`);
    } catch (err: any) {
      setMessage({ text: 'خطا در دریافت جزئیات بازی', isError: true });
      setLoading(false);
    }
  };

  const handleDeleteGame = async (gameId: number, gameName: string) => {
    if (!confirm(`آیا از حذف بازی "${gameName}" مطمئن هستید؟`)) return;
    const newList = myGames.filter((g) => g.id.toString() !== gameId.toString());
    await saveToGitHub(newList, `❌ Deleted game: ${gameName}`);
  };

  const getAdminImage = (url: string) => {
    if (!url) return '';
    const cleanUrl = url.replace(/^https?:\/\//i, '');
    return `https://images.weserv.nl/?url=${encodeURIComponent(cleanUrl)}&w=500&q=80&output=jpg`;
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4" dir="rtl">
        <div className="bg-slate-900/60 p-8 rounded-3xl shadow-2xl w-full max-w-md border border-slate-800 backdrop-blur-md">
          <h1 className="text-2xl font-black text-white text-center mb-6">ورود به پنل مدیریت گیت‌هاب</h1>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-slate-400 text-sm mb-2 font-medium">نام کاربری:</label>
              <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} className="w-full p-3.5 bg-slate-950 border border-slate-800 rounded-2xl text-white focus:outline-none text-left" dir="ltr" required />
            </div>
            <div>
              <label className="block text-slate-400 text-sm mb-2 font-medium">رمز عبور:</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-3.5 bg-slate-950 border border-slate-800 rounded-2xl text-white focus:outline-none text-left" dir="ltr" required />
            </div>
            <div>
              <label className="block text-slate-400 text-sm mb-2 font-medium">توکن کلاسیک گیت‌هاب (ghp_...):</label>
              <input type="password" value={githubToken} onChange={(e) => setGithubToken(e.target.value)} placeholder="ghp_..." className="w-full p-3.5 bg-slate-950 border border-slate-800 rounded-2xl text-purple-400 focus:outline-none text-left" dir="ltr" required />
            </div>
            {loginError && <p className="text-red-400 text-sm text-center font-bold">{loginError}</p>}
            <button type="submit" disabled={loading} className="w-full py-3.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold rounded-2xl transition shadow-lg mt-2">
              {loading ? 'در حال اتصال...' : 'اتصال و ورود'}
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
          <h1 className="text-3xl font-black text-white bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-500">پنل مدیریت مستقیم گیت‌هاب</h1>
          <div className="flex items-center gap-3">
            <Link href="/" className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 rounded-xl text-sm font-bold">🌐 مشاهده سایت اصلی</Link>
            <button onClick={handleLogout} className="px-4 py-2 bg-slate-900 hover:bg-red-950/40 text-red-400 border border-slate-800 rounded-xl text-sm font-bold">خروج از پنل</button>
          </div>
        </header>

        <section className="bg-slate-900/40 p-6 rounded-3xl border border-slate-900 mb-8 backdrop-blur-sm">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4">
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="نام بازی را به انگلیسی بنویسید..." className="flex-1 p-4 bg-slate-950 border border-slate-800 rounded-2xl text-white placeholder-slate-600 focus:outline-none" />
            <button type="submit" disabled={loading} className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-2xl transition">
              {loading ? 'صبر کنید...' : 'جستجوی بازی'}
            </button>
          </form>
          {message.text && (
            <div className={`mt-4 p-4 rounded-2xl text-center font-medium border ${message.isError ? 'bg-red-950/40 text-red-400 border-red-900/50' : 'bg-green-950/40 text-green-400 border-green-900/50'}`}>
              {message.text}
            </div>
          )}
        </section>

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
                        <img src={getAdminImage(game.background_image)} alt={game.name} className="object-cover w-full h-full group-hover:scale-105 transition duration-500" referrerPolicy="no-referrer" loading="lazy" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-600 text-xs">بدون تصویر</div>
                      )}
                    </div>
                    <div className="p-4 flex-1 flex flex-col justify-between">
                      <div className="mb-4">
                        <h3 className="font-bold text-white text-sm md:text-base line-clamp-1 mb-1">{game.name}</h3>
                        <p className="text-[11px] text-slate-500">انتشار: {game.released ? game.released.split('-')[0] : 'نامشخص'}</p>
                      </div>
                      {isAlreadyAdded ? (
                        <button onClick={() => handleDeleteGame(game.id, game.name)} className="w-full py-2.5 bg-red-950/30 hover:bg-red-600 text-red-400 hover:text-white font-bold rounded-xl border border-red-900/40 transition text-xs">❌ حذف از آرشیو</button>
                      ) : (
                        <button onClick={() => handleAddGame(game)} className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl transition text-xs shadow-md">➕ اضافه به آرشیو</button>
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
