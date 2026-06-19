/* eslint-disable @next/next/no-img-element */
'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

const GITHUB_OWNER = 'mygarchive'; 
const GITHUB_REPO = 'mygarchive.github.io'; 
const RAWG_API_KEY = '8ceb3ebba03c4ddca51106af23868263';

interface QueueTask {
  type: 'ADD' | 'REMOVE' | 'UPDATE';
  game: any;
  gameId?: number;
  gameName?: string;
  overrideData?: any; // برای اعمال ویرایش دستی
}

async function translateToPersian(text: string): Promise<string> {
  try {
    const res = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=fa&dt=t&q=${encodeURIComponent(text)}`);
    return res.ok ? (await res.json())[0].map((item: any) => item[0]).join('') : 'ترجمه خودکار با خطا مواجه شد.';
  } catch { return 'خطا در ارتباط با سرور ترجمه.'; }
}

const safeBtoa = (str: string) => btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, p1) => String.fromCharCode(parseInt(p1, 16))));
const safeAtob = (str: string) => decodeURIComponent(atob(str).split('').map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));

export default function AdminPanel() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [githubToken, setGithubToken] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [myGames, setMyGames] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', isError: false });
  const [fileSha, setFileSha] = useState('');
  const [viewMode, setViewMode] = useState<'SEARCH' | 'ARCHIVE'>('SEARCH');

  const [queue, setQueue] = useState<QueueTask[]>([]);
  const [isProcessingQueue, setIsProcessingQueue] = useState(false);

  const getOptimizedUrl = (url: string, width = 400) => url ? `https://images.weserv.nl/?url=${encodeURIComponent(url.replace(/^https?:\/\//i, ''))}&w=${width}&q=80` : '';

  useEffect(() => {
    const savedToken = localStorage.getItem('gh_token');
    if (localStorage.getItem('isAdmin') === 'true' && savedToken) {
      setGithubToken(savedToken);
      fetchMyGames(savedToken);
    }
  }, []);

  const fetchSmartRoute = async (targetUrl: string, parseAllOrigins = false) => {
    try {
      const res = await fetch(`https://corsproxy.io/?${encodeURIComponent(targetUrl)}`);
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn("پروکسی اول ناموفق بود...", e);
    }

    try {
      const res = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`);
      if (res.ok) {
        const jsonWrapper = await res.json();
        return parseAllOrigins ? JSON.parse(jsonWrapper.contents) : jsonWrapper;
      }
    } catch (e) {
      console.warn("پروکسی دوم ناموفق بود...", e);
    }

    const directRes = await fetch(targetUrl);
    if (directRes.ok) return await directRes.json();
    
    throw new Error("تمامی مسیرهای ارتباطی با سرور بازی‌ها با خطا مواجه شدند.");
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    const trimmedToken = githubToken.trim();
    if (!trimmedToken.startsWith('ghp_') && !trimmedToken.startsWith('github_pat_')) {
      return setLoginError('لطفاً یک توکن معتبر گیت‌هاب وارد کنید.');
    }

    setLoading(true);
    try {
      const checkRes = await fetch('https://api.github.com/user', {
        headers: { 'Authorization': `token ${trimmedToken}` }
      });
      if (checkRes.status === 200) {
        localStorage.setItem('isAdmin', 'true');
        localStorage.setItem('gh_token', trimmedToken);
        await fetchMyGames(trimmedToken);
      } else {
        setLoginError('توکن وارد شده معتبر نیست یا دسترسی لازم را ندارد!');
      }
    } catch {
      setLoginError('خطا در برقراری ارتباط با گیت‌هاب.');
    }
    setLoading(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('isAdmin');
    localStorage.removeItem('gh_token');
    setIsLoggedIn(false);
    setGithubToken('');
    setMyGames([]);
    setSearchResults([]);
    setQueue([]);
    setMessage({ text: 'با موفقیت از پنل خارج شدید.', isError: false });
  };

  const fetchMyGames = async (token: string) => {
    try {
      const res = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/data/games.json?v=${Date.now()}`, { 
        headers: { 'Authorization': `token ${token}` } 
      });
      if (res.status === 200) {
        const data = await res.json();
        setFileSha(data.sha);
        const parsedGames = JSON.parse(safeAtob(data.content)) || [];
        setMyGames(parsedGames);
        setIsLoggedIn(true);
        return { sha: data.sha, games: parsedGames };
      }
    } catch (err) { 
      console.error(err);
      setLoginError('خطا در واکشی اطلاعات آرشیو از گیت‌هاب.');
    }
    return null;
  };

  const handleSearch = async () => {
    if (!searchQuery) return;
    setLoading(true);
    setViewMode('SEARCH');
    try {
      const targetUrl = `https://api.rawg.io/api/games?key=${RAWG_API_KEY}&search=${encodeURIComponent(searchQuery)}&page_size=24`;
      const data = await fetchSmartRoute(targetUrl, true);
      setSearchResults(data.results || []);
    } catch (err) { 
      console.error("خطای سیستم جستجو:", err); 
      setMessage({ text: 'خطا در برقراری ارتباط با سرور RAWG.', isError: true });
    }
    setLoading(false);
  };

  const handleAddGame = (game: any) => {
    setQueue((prev) => [...prev, { type: 'ADD', game }]);
    setMessage({ text: `بازی "${game.name}" به صف پردازش گیت‌هاب اضافه شد.`, isError: false });
  };

  const handleFixGame = (game: any) => {
    setQueue((prev) => [...prev, { type: 'ADD', game }]);
    setMessage({ text: `درخواست به‌روزرسانی/فیکس "${game.name}" به صف اضافه شد.`, isError: false });
  };

  const handleEditGame = (game: any) => {
    const newSteamLink = window.prompt("لینک استیم جدید را برای این بازی وارد کنید:", game.steam_link || "");
    if (newSteamLink === null) return;

    const overrideData = {
      steam_link: newSteamLink.trim()
    };

    setQueue((prev) => [...prev, { type: 'UPDATE', game, overrideData }]);
    setMessage({ text: `درخواست اصلاح اطلاعات بازی "${game.name}" به صف اضافه شد.`, isError: false });
  };

  const handleRemoveGame = (gameId: number, gameName: string) => {
    if (!window.confirm(`آیا از حذف بازی "${gameName}" مطمئن هستید؟`)) return;
    setQueue((prev) => [...prev, { type: 'REMOVE', game: null, gameId, gameName }]);
    setMessage({ text: `درخواست حذف "${gameName}" به صف اضافه شد.`, isError: false });
  };

  // --- اصلاح شده با useCallback ---
  const processNextQueueTask = useCallback(async () => {
    if (queue.length === 0) return;

    setIsProcessingQueue(true);
    const currentTask = queue[0];
    const { type, game, gameId, gameName, overrideData } = currentTask;

    function RepoStateCleaner(list: any[]) {
      return list.map(g => ({ ...g }));
    }

    try {
      const latestRepoState = await fetchMyGames(githubToken);
      let currentGamesList = latestRepoState ? RepoStateCleaner(latestRepoState.games) : [...myGames];
      let currentSha = latestRepoState ? latestRepoState.sha : fileSha;

      if (type === 'ADD') {
        setMessage({ text: `⏳ در حال استخراج اطلاعات از RAWG برای "${game.name}"...`, isError: false });

        const detailsTarget = `https://api.rawg.io/api/games/${game.id}?key=${RAWG_API_KEY}`;
        const moviesTarget = `https://api.rawg.io/api/games/${game.id}/movies?key=${RAWG_API_KEY}`;
        const screenshotsTarget = `https://api.rawg.io/api/games/${game.id}/screenshots?key=${RAWG_API_KEY}`;
        const youtubeTarget = `https://api.rawg.io/api/games/${game.id}/youtube?key=${RAWG_API_KEY}`;

        const [details, movieData, screenshots, youtubeData] = await Promise.all([
          fetchSmartRoute(detailsTarget, true),
          fetchSmartRoute(moviesTarget, true),
          fetchSmartRoute(screenshotsTarget, true),
          fetchSmartRoute(youtubeTarget, true).catch(() => ({ results: [] }))
        ]);
        
        const rawDescriptionFa = await translateToPersian((details.description_raw || "").substring(0, 1500));
        // اصلاح متغیر در خط زیر (rawFa به rawDescriptionFa تغییر یافت)
        const descriptionFaWithLabel = `توضیحات بازی (ترجمه ماشینی و خودکار):\n${rawDescriptionFa}`;
        
        let minReq = '';
        let recReq = '';
        
        const pcPlatformData = details.platforms?.find((p: any) => p.platform.slug === 'pc');
        if (pcPlatformData?.requirements) {
          if (pcPlatformData.requirements.minimum) minReq = pcPlatformData.requirements.minimum;
          if (pcPlatformData.requirements.recommended) recReq = pcPlatformData.requirements.recommended;
        }
        if (!minReq && pcPlatformData?.requirements_minimum) minReq = pcPlatformData.requirements_minimum;
        if (!recReq && pcPlatformData?.requirements_recommended) recReq = pcPlatformData.requirements_recommended;

        const cleanReq = (text: string, fallback: string) => {
          if (!text) return fallback;
          return text
            .replace(/Minimum:|Recommended:|⚙️/gi, '')
            .replace(/<\/?b>/g, '')
            .replace(/<\/?p>/g, '')
            .replace(/<\/?br\s*\/?>/g, '\n')
            .trim();
        };

        let finalAge = '---';
        const rawEsrb = details.esrb_rating?.slug || '';
        if (rawEsrb === 'mature') finalAge = '+17';
        else if (rawEsrb === 'adults-only') finalAge = '+18';
        else if (rawEsrb === 'teen') finalAge = '+13';
        else if (rawEsrb === 'everyone-10-plus') finalAge = '+10';
        else if (rawEsrb === 'everyone') finalAge = 'همه سنین';

        const metacriticScore = details.metacritic || null;

        console.log("========== RAWG DEBUG ==========");
console.log("GAME NAME:", details.name);
console.log("GAME ID:", details.id);
console.log("STORES:", details.stores);
console.log("WEBSITE:", details.website);
console.log("FULL DETAILS:", details);
console.log("================================");

let steamUrl = '';

if (details.stores && details.stores.length > 0) {

  const steamStore = details.stores.find(
    (s: any) =>
      s.store?.slug === 'steam' ||
      s.store?.id === 1
  );

  console.log(
  "STEAM STORE FULL:",
  JSON.stringify(steamStore, null, 2)
);
  console.log(
  "STEAM STORE FULL:",
  JSON.stringify(steamStore, null, 2)
);

  if (steamStore) {
    console.log("STEAM STORE KEYS:", Object.keys(steamStore));

    if (steamStore.url) {
      console.log("STEAM URL FIELD:", steamStore.url);

      const match = steamStore.url.match(/(?:app|sub)\/(\d+)/);

      steamUrl = match?.[1]
        ? `https://store.steampowered.com/app/${match[1]}/`
        : steamStore.url;
    }
  }
}

if (!steamUrl && details.website) {

  console.log("CHECKING WEBSITE FIELD:", details.website);

  if (details.website.includes('steampowered.com')) {

    const match = details.website.match(/(?:app|sub)\/(\d+)/);

    steamUrl = match?.[1]
      ? `https://store.steampowered.com/app/${match[1]}/`
      : details.website;
  }
}

console.log("FINAL STEAM URL:", steamUrl);

if (!steamUrl) {

  const exact = details.name || game.name;

  steamUrl = `https://store.steampowered.com/search/?term=${encodeURIComponent(exact)}`;

  console.log("FALLBACK SEARCH URL:", steamUrl);
}

        const autoYoutube: string[] = [];
        if (youtubeData?.results?.length > 0) {
          youtubeData.results.slice(0, 5).forEach((vid: any) => {
            if (vid.external_id) autoYoutube.push(`https://www.youtube.com/watch?v=${vid.external_id}`);
          });
        }
        const trailer = movieData.results?.[0]?.data?.max || '';
        if (trailer && !autoYoutube.includes(trailer)) autoYoutube.unshift(trailer);

        let galleryFinal: string[] = [];
        if (screenshots?.results?.length > 0) galleryFinal = screenshots.results.map((s: any) => s.image);
        if (game.short_screenshots?.length > 0) {
          game.short_screenshots.forEach((s: any) => {
            if (!galleryFinal.includes(s.image)) galleryFinal.push(s.image);
          });
        }
        galleryFinal = galleryFinal.slice(0, 10);

        const newGameObj = {
          id: game.id,
          name: game.name,
          background_image: game.background_image,
          rating: game.rating,
          metacritic: metacriticScore,
          released: game.released,
          genres: game.genres || [],
          esrb_rating: finalAge,
          playtime: details.playtime || 0,
          developers: details.developers?.map((d: any) => d.name).join(', ') || '---',
          steam_link: steamUrl, 
          trailer_url: trailer,
          youtube_videos: autoYoutube, 
          gallery: galleryFinal, 
          requirements: { 
            minimum: cleanReq(minReq, 'مشخصات حداقل سخت‌افزار ثبت نشده است.'), 
            recommended: cleanReq(recReq, 'مشخصات سیستم پیشنهادی ثبت نشده است.') 
          },
          description_en: (details.description_raw || "No description available.").substring(0, 1500),
          description_fa: descriptionFaWithLabel
        };

        const cleanList = currentGamesList.filter((g: any) => g.id !== game.id);
        cleanList.push(newGameObj);

        const res = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/data/games.json`, {
          method: 'PUT',
          headers: { 'Authorization': `token ${githubToken}`, 'Content-Type': 'application/json', 'Accept': 'application/vnd.github.v3+json' },
          body: JSON.stringify({ message: `Auto Add ${game.name}`, content: safeBtoa(JSON.stringify(cleanList, null, 2)), sha: currentSha })
        });

        if (res.status === 200 || res.status === 201) {
          const resData = await res.json();
          setFileSha(resData.content.sha);
          setMyGames(cleanList);
          setMessage({ text: `✅ بازی "${game.name}" با موفقیت ثبت شد.`, isError: false });
        } else { 
          setMessage({ text: '❌ خطا در ثبت روی گیت‌هاب.', isError: true }); 
        }

      } else if (type === 'UPDATE') {
        setMessage({ text: `⏳ در حال اعمال اصلاحیه برای "${game.name}"...`, isError: false });

        const targetGameIdx = currentGamesList.findIndex((g: any) => g.id === game.id);
        if (targetGameIdx !== -1) {
          currentGamesList[targetGameIdx] = {
            ...currentGamesList[targetGameIdx],
            ...overrideData
          };

          const res = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/data/games.json`, {
            method: 'PUT',
            headers: { 'Authorization': `token ${githubToken}`, 'Content-Type': 'application/json', 'Accept': 'application/vnd.github.v3+json' },
            body: JSON.stringify({ message: `Manual Edit ${game.name}`, content: safeBtoa(JSON.stringify(currentGamesList, null, 2)), sha: currentSha })
          });

          if (res.status === 200 || res.status === 201) {
            const resData = await res.json();
            setFileSha(resData.content.sha);
            setMyGames(currentGamesList);
            setMessage({ text: `✅ اصلاحیه بازی "${game.name}" با موفقیت اعمال و ذخیره شد.`, isError: false });
          } else {
            setMessage({ text: '❌ خطا در اعمال اصلاحیه.', isError: true });
          }
        }

      } else if (type === 'REMOVE') {
        setMessage({ text: `⏳ در حال حذف "${gameName}" از دیتابیس...`, isError: false });

        const updated = currentGamesList.filter((g: any) => g.id !== gameId);
        
        const res = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/data/games.json`, {
          method: 'PUT',
          headers: { 'Authorization': `token ${githubToken}`, 'Content-Type': 'application/json', 'Accept': 'application/vnd.github.v3+json' },
          body: JSON.stringify({ message: `Remove ${gameName}`, content: safeBtoa(JSON.stringify(updated, null, 2)), sha: currentSha })
        });

        if (res.status === 200 || res.status === 201) {
          const resData = await res.json();
          setFileSha(resData.content.sha);
          setMyGames(updated);
          setMessage({ text: `✅ بازی "${gameName}" با موفقیت حذف گردید.`, isError: false });
        } else {
          setMessage({ text: '❌ خطا در حذف بازی.', isError: true });
        }
      }
    } catch (err) {
      console.error("خطا در صف:", err);
      setMessage({ text: '❌ خطا در ارتباط با سرورها.', isError: true });
    } finally {
      setQueue((prev) => prev.slice(1));
      setIsProcessingQueue(false);
    }
  }, [githubToken, myGames, fileSha, queue]); // وابستگی‌ها اصلاح شد

  // اصلاح این بخش برای استفاده از تابع بهینه‌شده
  useEffect(() => {
    if (queue.length > 0 && !isProcessingQueue) {
      processNextQueueTask();
    }
  }, [queue, isProcessingQueue, processNextQueueTask]);

  const displayedGames = viewMode === 'SEARCH' ? searchResults : myGames;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-12" dir="rtl">
      {!isLoggedIn ? (
        <div className="min-h-screen text-slate-100 flex items-center justify-center p-6">
          <form onSubmit={handleLogin} className="bg-slate-900 border border-slate-800 p-8 rounded-2xl w-full max-w-md space-y-5">
            <div className="text-center space-y-2 mb-4">
              <h2 className="text-xl font-black text-white">🔒 ورود به پنل مدیریت آرشیو</h2>
              <p className="text-[11px] text-slate-400 font-medium">کلید دسترسی گیت‌هاب (Token) را وارد کنید.</p>
            </div>
            {loginError && <div className="p-3 bg-red-500/10 text-red-400 text-xs font-bold rounded-xl text-center border border-red-900/30">{loginError}</div>}
            <div className="space-y-1.5">
              <label className="text-xs text-slate-400 font-bold">توکن گیت‌هاب:</label>
              <input 
                type="password" 
                value={githubToken} 
                onChange={(e) => setGithubToken(e.target.value)} 
                className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs outline-none text-left tracking-wider text-purple-400 focus:border-purple-600 transition" 
                dir="ltr" 
                placeholder="ghp_..." 
                required
              />
            </div>
            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-sm transition disabled:opacity-50"
            >
              {loading ? 'در حال بررسی...' : 'ورود به پنل'}
            </button>
          </form>
        </div>
      ) : (
        <div className="max-w-5xl mx-auto">
          <header className="flex justify-between items-center mb-8 border-b border-slate-900 pb-4">
            <div className="flex items-center gap-4">
              <h1 className="text-lg font-black text-white">🎮 کنترل پنل هوشمند آرشیو</h1>
              <button onClick={handleLogout} className="text-xs bg-red-950/40 border border-red-900/60 hover:bg-red-900 text-red-400 hover:text-white px-3 py-1.5 rounded-xl transition font-bold">🚪 خروج</button>
            </div>
            {queue.length > 0 && (
              <div className="text-xs bg-purple-950/60 border border-purple-800/80 text-purple-300 px-3 py-1.5 rounded-xl animate-pulse font-mono">
                ⏳ صف پردازش: {queue.length}
              </div>
            )}
            <Link href="/" className="text-xs text-purple-400 bg-purple-950/40 border border-purple-900/60 px-4 py-2 rounded-xl">➔ صفحه اصلی سایت</Link>
          </header>

          <div className="flex gap-4 mb-6">
            <button 
              onClick={() => setViewMode('SEARCH')}
              className={`flex-1 py-3 rounded-xl text-sm font-bold transition border ${viewMode === 'SEARCH' ? 'bg-purple-600 border-purple-500 text-white shadow-lg shadow-purple-900/20' : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800'}`}
            >
              🔍 جستجوی بازی جدید
            </button>
            <button 
              onClick={() => setViewMode('ARCHIVE')}
              className={`flex-1 py-3 rounded-xl text-sm font-bold transition border ${viewMode === 'ARCHIVE' ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-900/20' : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800'}`}
            >
              🗂️ بازی‌های من ({myGames.length})
            </button>
          </div>

          {viewMode === 'SEARCH' && (
            <div className="bg-slate-900/50 border border-slate-900 p-4 rounded-xl mb-6 flex gap-2">
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch()} placeholder="نام بازی..." className="flex-1 p-3 bg-slate-950 border border-slate-800 rounded-xl text-sm outline-none text-left" dir="ltr" />
              <button onClick={handleSearch} className="px-6 bg-purple-600 hover:bg-purple-700 rounded-xl text-sm font-bold">جستجو</button>
            </div>
          )}

          {message.text && <div className={`p-3 rounded-lg text-xs font-bold mb-6 text-center ${message.isError ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'}`}>{message.text}</div>}

          {viewMode === 'ARCHIVE' && displayedGames.length === 0 && (
            <div className="text-center py-12 text-slate-500 font-bold text-sm bg-slate-900/30 rounded-2xl border border-slate-800/50">
              بازی‌ای در آرشیو موجود نیست.
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayedGames.map((game) => {
              const isAlreadyAdded = myGames.some((g) => g.id === game.id);
              const isTaskInQueue = queue.some((q) => q.game?.id === game.id || q.gameId === game.id);
              
              return (
                <div key={game.id} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex flex-col justify-between shadow-lg">
                  <img src={getOptimizedUrl(game.background_image, 400)} alt={game.name} className="w-full h-40 object-cover" />
                  <div className="p-4 flex flex-col justify-between flex-1 space-y-4">
                    <h3 className="font-bold text-sm text-white text-left truncate" dir="ltr">{game.name}</h3>
                    
                    {isTaskInQueue ? (
                      <button disabled className="w-full py-2 bg-slate-800 text-slate-400 border border-slate-700 rounded-xl text-xs font-bold animate-pulse cursor-not-allowed">
                        ⏳ در صف پردازش...
                      </button>
                    ) : isAlreadyAdded ? (
                      <div className="flex flex-col gap-2 w-full">
                        <div className="flex gap-2 w-full">
                          <button onClick={() => handleFixGame(game)} className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs transition font-bold">🔄 فیکس مجدد</button>
                          <button onClick={() => handleRemoveGame(game.id, game.name)} className="px-3 py-2 bg-red-950/40 border border-red-900 text-red-400 hover:bg-red-600 hover:text-white rounded-xl text-xs transition font-bold">❌ حذف</button>
                        </div>
                        <button onClick={() => handleEditGame(game)} className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-xl text-[11px] transition font-bold">✏️ ویرایش/اصلاح لینک استیم دستی</button>
                      </div>
                    ) : (
                      <button onClick={() => handleAddGame(game)} className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs transition font-bold">＋ افزودن به آرشیو</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
