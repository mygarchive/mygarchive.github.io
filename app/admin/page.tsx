'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

const GITHUB_OWNER = 'mygarchive'; 
const GITHUB_REPO = 'mygarchive.github.io'; 
const RAWG_API_KEY = '8ceb3ebba03c4ddca51106af23868263';

async function translateToPersian(text: string): Promise<string> {
  try {
    const res = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=fa&dt=t&q=${encodeURIComponent(text)}`);
    if (!res.ok) return 'ترجمه خودکار با خطا مواجه شد.';
    const data = await res.json();
    return data[0].map((item: any) => item[0]).join('');
  } catch (err) {
    return 'خطا در ارتباط با سرور ترجمه.';
  }
}

function safeBtoa(str: string): string {
  return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (match, p1) => String.fromCharCode(parseInt(p1, 16))));
}

function safeAtob(str: string): string {
  return decodeURIComponent(atob(str).split('').map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
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

  const getOptimizedUrl = (url: string, width = 400) => {
    if (!url) return '';
    const cleanUrl = url.replace(/^https?:\/\//i, '');
    return `https://images.weserv.nl/?url=${encodeURIComponent(cleanUrl)}&w=${width}&q=80`;
  };

  useEffect(() => {
    const adminStatus = localStorage.getItem('isAdmin');
    const savedToken = localStorage.getItem('gh_token');
    if (adminStatus === 'true' && savedToken) {
      setGithubToken(savedToken);
      fetchMyGames(savedToken);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim().toLowerCase() === 'hf273' && password.trim().toLowerCase() === 'hf1to1') {
      if (!githubToken.trim().startsWith('ghp_')) {
        setLoginError('لطفاً توکن کلاسیک گیت‌هاب معتبر وارد کنید.');
        return;
      }
      localStorage.setItem('isAdmin', 'true');
      localStorage.setItem('gh_token', githubToken.trim());
      setLoginError('');
      await fetchMyGames(githubToken.trim());
    } else {
      setLoginError('نام کاربری یا رمز عبور اشتباه است!');
    }
  };

  const fetchMyGames = async (token: string) => {
    try {
      const res = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/data/games.json?v=${Date.now()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.status === 200) {
        const data = await res.json();
        setFileSha(data.sha);
        const content = JSON.parse(safeAtob(data.content));
        setMyGames(Array.isArray(content) ? content : []);
        setIsLoggedIn(true);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery) return;
    setLoading(true);
    try {
      const res = await fetch(`https://api.rawg.io/api/games?key=${RAWG_API_KEY}&search=${searchQuery}&page_size=24`);
      const data = await res.json();
      setSearchResults(data.results || []);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const handleAddGame = async (game: any) => {
    setLoading(true);
    setMessage({ text: 'در حال دریافت اطلاعات تکمیلی، سیستم مورد نیاز و ساخت گالری آلبومی...', isError: false });

    try {
      const gameDetailsRes = await fetch(`https://api.rawg.io/api/games/${game.id}?key=${RAWG_API_KEY}`);
      const gameDetails = await gameDetailsRes.json();
      
      const movieRes = await fetch(`https://api.rawg.io/api/games/${game.id}/movies?key=${RAWG_API_KEY}`);
      const movieData = await movieRes.json();
      const trailerUrl = movieData.results?.[0]?.data?.max || '';

      const screenshotRes = await fetch(`https://api.rawg.io/api/games/${game.id}/screenshots?key=${RAWG_API_KEY}`);
      const screenshotData = await screenshotRes.json();
      const gallery = screenshotData.results?.map((s: any) => s.image) || [];

      const rawDescriptionEn = gameDetails.description_raw || "No description available.";
      const descriptionFa = await translateToPersian(rawDescriptionEn.substring(0, 1000));

      const pcPlatforms = gameDetails.platforms?.find((p: any) => p.platform.slug === 'pc');
      
      const cleanRequirements = (reqText: string) => {
        if (!reqText) return '';
        return reqText
          .replace(/Minimum:|Recommended:|⚙️/gi, '')
          .replace(/<\/?b>/g, '')
          .replace(/<\/?p>/g, '')
          .trim();
      };

      const requirementsObj = {
        minimum: pcPlatforms?.requirements_minimum ? cleanRequirements(pcPlatforms.requirements_minimum) : 'مشخصات حداقل سخت‌افزار ثبت نشده است.',
        recommended: pcPlatforms?.requirements_recommended ? cleanRequirements(pcPlatforms.requirements_recommended) : 'مشخصات سیستم پیشنهادی ثبت نشده است.'
      };

      const esrbAge = gameDetails.esrb_rating?.id 
        ? `${gameDetails.esrb_rating.name.replace(/[^0-9]/g, '') || gameDetails.esrb_rating.name}+` 
        : '---';

      const developersList = gameDetails.developers?.map((d: any) => d.name).join(', ') || '---';
      const steamStore = gameDetails.stores?.find((s: any) => s.store.slug === 'steam');
      const steamUrl = steamStore?.url || (steamStore?.store?.id ? `https://store.steampowered.com/app/${game.id}` : '');

      const newGameObj = {
        id: game.id,
        name: game.name,
        background_image: game.background_image,
        rating: game.rating,
        released: game.released,
        genres: game.genres || [],
        esrb_rating: esrbAge,
        playtime: gameDetails.playtime || 0,
        developers: developersList,
        steam_link: steamUrl,
        trailer_url: trailerUrl,
        gallery: gallery,
        requirements: requirementsObj,
        description_en: rawDescriptionEn,
        description_fa: descriptionFa 
      };

      const updatedGames = [...myGames, newGameObj];

      const res = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/data/games.json`, {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${githubToken}`, 
          'Content-Type': 'application/json',
          'Accept': 'application/vnd.github.v3+json'
        },
        body: JSON.stringify({
          message: `Add ${game.name} to archive`,
          content: safeBtoa(JSON.stringify(updatedGames, null, 2)),
          sha: fileSha
        })
      });

      if (res.status === 200 || res.status === 201) {
        const resData = await res.json();
        setFileSha(resData.content.sha);
        setMyGames(updatedGames);
        setMessage({ text: `بازی "${game.name}" با تمام اطلاعات سخت‌افزاری و گالری با موفقیت ثبت آرشیو شد.`, isError: false });
      } else {
        setMessage({ text: 'خطا در ذخیره‌سازی روی گیت‌هاب. وضعیت توکن دسترسی را بررسی کنید.', isError: true });
      }
    } catch (err) {
      setMessage({ text: 'خطا در ارتباط با سرورها.', isError: true });
    }
    setLoading(false);
  };

  const handleRemoveGame = async (gameId: number, gameName: string) => {
    if (!window.confirm(`آیا از حذف بازی "${gameName}" مطمئن هستید؟`)) return;
    setLoading(true);
    const updatedGames = myGames.filter((g) => g.id !== gameId);

    try {
      const res = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/data/games.json`, {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${githubToken}`, 
          'Content-Type': 'application/json',
          'Accept': 'application/vnd.github.v3+json'
        },
        body: JSON.stringify({
          message: `Remove ${gameName}`,
          content: safeBtoa(JSON.stringify(updatedGames, null, 2)),
          sha: fileSha
        })
      });

      if (res.status === 200 || res.status === 201) {
        const resData = await res.json();
        setFileSha(resData.content.sha);
        setMyGames(updatedGames);
        setMessage({ text: `بازی "${gameName}" حذف گردید.`, isError: false });
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6" dir="rtl">
        <form onSubmit={handleLogin} className="bg-slate-900 border border-slate-800 p-8 rounded-2xl w-full max-w-md space-y-4 shadow-xl">
          <h2 className="text-xl font-black text-white text-center mb-6">🔒 ورود به پنل مدیریت آرشیو</h2>
          {loginError && <div className="p-3 bg-red-500/10 border border-red-900/40 text-red-400 text-xs font-bold rounded-xl text-center">{loginError}</div>}
          
          <div className="space-y-1">
            <label className="text-xs text-slate-400 font-bold">نام کاربری:</label>
            <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-sm outline-none text-left" dir="ltr" placeholder="hf273" />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-slate-400 font-bold">رمز عبور:</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-sm outline-none text-left" dir="ltr" placeholder="••••••••" />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-slate-400 font-bold">توکن گیت‌هاب (Personal Access Token):</label>
            <input type="password" value={githubToken} onChange={(e) => setGithubToken(e.target.value)} className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs outline-none text-left" dir="ltr" placeholder="ghp_..." />
          </div>

          <button type="submit" className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-sm transition mt-4">ورود به سیستم ادمین</button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-12" dir="rtl">
      <div className="max-w-5xl mx-auto">
        <header className="flex justify-between items-center mb-8 border-b border-slate-900 pb-4">
          <h1 className="text-lg font-black text-white">🎮 کنترل پنل هوشمند آرشیو</h1>
          <Link href="/" className="text-xs text-purple-400 bg-purple-950/40 border border-purple-900/60 px-4 py-2 rounded-xl">➔ نمایش صفحه اصلی سایت</Link>
        </header>

        <div className="bg-slate-900/50 border border-slate-900 p-4 rounded-xl mb-6 flex gap-2">
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch()} placeholder="نام بازی (مثال: Cyberpunk)..." className="flex-1 p-3 bg-slate-950 border border-slate-800 rounded-xl text-sm outline-none text-left" dir="ltr" />
          <button onClick={handleSearch} className="px-6 bg-purple-600 hover:bg-purple-700 rounded-xl text-sm font-bold">جستجو</button>
        </div>

        {message.text && <div className={`p-3 rounded-lg text-xs font-bold mb-6 text-center ${message.isError ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'}`}>{message.text}</div>}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {searchResults.map((game) => {
            const isAlreadyAdded = myGames.some((g) => g.id === game.id);
            return (
              <div key={game.id} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex flex-col justify-between shadow-lg">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={getOptimizedUrl(game.background_image, 400)} alt={game.name} className="w-full h-40 object-cover" />
                <div className="p-4 flex flex-col justify-between flex-1 space-y-4">
                  <h3 className="font-bold text-sm text-white text-left truncate" dir="ltr">{game.name}</h3>
                  {isAlreadyAdded ? (
                    <button onClick={() => handleRemoveGame(game.id, game.name)} className="w-full py-2 bg-red-950/40 border border-red-900 text-red-400 hover:bg-red-600 hover:text-white rounded-xl text-xs transition font-bold">❌ حذف از آرشیو</button>
                  ) : (
                    <button onClick={() => handleAddGame(game)} disabled={loading} className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs transition font-bold disabled:opacity-50">＋ افزودن به آرشیو</button>
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
