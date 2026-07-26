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
  overrideData?: any; 
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

  const [editingGame, setEditingGame] = useState<any | null>(null);

  const getOptimizedUrl = (url: string, width = 400) => {
    if (!url) return '';
    const cleanUrl = url.replace(/^https?:\/\//i, '');
    return `https://images.weserv.nl/?url=${encodeURIComponent(cleanUrl)}&w=${width}&q=80`;
  };

  // 🛠️ تعریف متد با استفاده از useCallback برای قرارگیری در دپندسی صف بدون رندر مداوم
  const getSteamIdFromSteam = useCallback(async (gameName: string): Promise<string | null> => {
    try {
      const searchUrl = `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(gameName)}&l=english&cc=US`;
      const data = await fetchSmartRoute(searchUrl, true);
      if (data && data.items && data.items.length > 0) {
        return data.items[0].id;
      }
    } catch (e) {
      console.error("خطا در جستجوی استیم:", e);
    }
    return null;
  }, []);

  useEffect(() => {
    const savedToken = localStorage.getItem('gh_token');
    if (localStorage.getItem('isAdmin') === 'true' && savedToken) {
      setGithubToken(savedToken);
      fetchMyGames(savedToken);
    }
  }, []);

  const fetchSmartRoute = async (targetUrl: string, parseAllOrigins = false) => {
    try {
      const myWorkerUrl = `https://rawg-proxy.hossein-hf273.workers.dev/?url=${encodeURIComponent(targetUrl)}`;
      const res = await fetch(myWorkerUrl);
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn("پروکسی اختصاصی کلادفلر ناموفق بود، سوئیچ به پروکسی‌های پشتیبان...");
    }

    try {
      const res = await fetch(`https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(targetUrl)}`);
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn("پروکسی CodeTabs ناموفق بود...");
    }

    try {
      const res = await fetch(`https://corsproxy.io/?${encodeURIComponent(targetUrl)}`);
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn("پروکسی Corsproxy ناموفق بود...");
    }

    try {
      const res = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`);
      if (res.ok) {
        const jsonWrapper = await res.json();
        return parseAllOrigins ? JSON.parse(jsonWrapper.contents) : jsonWrapper;
      }
    } catch (e) {
      console.warn("پروکسی AllOrigins ناموفق بود...");
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
      setLoginError('خطا در ارتباط با گیت‌هاب.');
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
    setEditingGame(null);
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
    setEditingGame(null); 
    try {
      const targetUrl = `https://api.rawg.io/api/games?key=${RAWG_API_KEY}&search=${encodeURIComponent(searchQuery)}&page_size=24`;
      const data = await fetchSmartRoute(targetUrl, true);
      setSearchResults(data.results || []);
    } catch (err) { 
      console.error("خطای سیستم جستجو:", err); 
      setMessage({ text: 'خطا در برقراری ارتباط با سرور RAWG (تمامی پروکسی‌ها مسدود هستند).', isError: true });
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
    const fullGameData = myGames.find((g) => g.id === game.id) || game;
    setEditingGame(JSON.parse(JSON.stringify(fullGameData))); 
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleEditFieldChange = (field: string, value: any) => {
    if (!editingGame) return;
    setEditingGame({ ...editingGame, [field]: value });
  };

  const handleRemoveGalleryImage = (imgUrl: string) => {
    if (!editingGame) return;
    const updatedGallery = (editingGame.gallery || []).filter((img: string) => img !== imgUrl);
    setEditingGame({ ...editingGame, gallery: updatedGallery });
  };

  const handleSaveFullEdit = () => {
    if (!editingGame) return;
    setQueue((prev) => [...prev, { type: 'UPDATE', game: editingGame, overrideData: editingGame }]);
    setMessage({ text: `درخواست اعمال ویرایش کامل "${editingGame.name}" به صف گیت‌هاب اضافه شد.`, isError: false });
    setEditingGame(null);
  };

  const handleRemoveGame = (gameId: number, gameName: string) => {
    if (!window.confirm(`آیا از حذف بازی "${gameName}" مطمئن هستید؟`)) return;
    setQueue((prev) => [...prev, { type: 'REMOVE', game: null, gameId, gameName }]);
    setMessage({ text: `درخواست حذف "${gameName}" به صف اضافه شد.`, isError: false });
  };

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

        let steamUrl = '';
        const steamId = await getSteamIdFromSteam(game.name);
        
        if (steamId) {
            steamUrl = `https://store.steampowered.com/app/${steamId}/`;
        } else if (details.stores && details.stores.length > 0) {
          const steamStore = details.stores.find((s: any) => s.store?.slug === 'steam' || s.store?.id === 1);
          if (steamStore && steamStore.url) {
            const match = steamStore.url.match(/(?:app|sub)\/(\d+)/);
            steamUrl = match && match[1] ? `https://store.steampowered.com/app/${match[1]}/` : steamStore.url;
          }
        }
        
        if (!steamUrl && details.website && details.website.includes('steampowered.com')) {
          const match = details.website.match(/(?:app|sub)\/(\d+)/);
          steamUrl = match && match[1] ? `https://store.steampowered.com/app/${match[1]}/` : details.website;
        }
        
        if (!steamUrl) {
           steamUrl = `https://store.steampowered.com/search/?term=${encodeURIComponent(game.name)}`;
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
        setMessage({ text: `⏳ در حال اعمال اصلاحیه جامع برای "${game.name}"...`, isError: false });

        const targetGameIdx = currentGamesList.findIndex((g: any) => g.id === game.id);
        if (targetGameIdx !== -1) {
          currentGamesList[targetGameIdx] = {
            ...currentGamesList[targetGameIdx],
            ...overrideData
          };

          const res = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/data/games.json`, {
            method: 'PUT',
            headers: { 'Authorization': `token ${githubToken}`, 'Content-Type': 'application/json', 'Accept': 'application/vnd.github.v3+json' },
            body: JSON.stringify({ message: `CMS Manual Edit ${game.name}`, content: safeBtoa(JSON.stringify(currentGamesList, null, 2)), sha: currentSha })
          });

          if (res.status === 200 || res.status === 201) {
            const resData = await res.json();
            setFileSha(resData.content.sha);
            setMyGames(currentGamesList);
            setMessage({ text: `✅ اصلاحات کامل بازی "${game.name}" با موفقیت روی گیت‌هاب اعمال شد.`, isError: false });
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
  }, [githubToken, myGames, fileSha, queue, getSteamIdFromSteam]); // 🛠️ رفع ارور دپندسی useCallback

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

          {/* 🛠️ بخش فرم ادیتور هوشمند و کامل بازی (CMS) */}
          {editingGame && (
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl mb-8 space-y-6 shadow-xl animate-fadeIn">
              <div className="flex justify-between items-center pb-3 border-b border-slate-800">
                <h3 className="text-sm font-black text-purple-400">📝 ویرایش کامل اطلاعات: {editingGame.name}</h3>
                <button 
                  onClick={() => setEditingGame(null)} 
                  className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-400 px-3 py-1.5 rounded-xl font-bold"
                >
                  انصراف ✕
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 font-bold mb-1.5">نام بازی:</label>
                  <input type="text" value={editingGame.name || ''} onChange={(e) => handleEditFieldChange('name', e.target.value)} className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs outline-none text-left font-bold" dir="ltr" />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 font-bold mb-1.5">امتیاز کاربران (Rating):</label>
                  <input type="number" step="0.01" value={editingGame.rating || ''} onChange={(e) => handleEditFieldChange('rating', parseFloat(e.target.value))} className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs outline-none text-left" dir="ltr" />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 font-bold mb-1.5">امتیاز متاتقد (Metacritic):</label>
                  <input type="number" value={editingGame.metacritic || ''} onChange={(e) => handleEditFieldChange('metacritic', parseInt(e.target.value) || '')} className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs outline-none text-left" dir="ltr" />
                </div>

                {/* ⏱️ ویرایش دستی زمان اتمام بازی */}
                <div>
                  <label className="block text-xs text-yellow-400 font-bold mb-1.5">⏱️ زمان اتمام بازی (ساعت):</label>
                  <input 
                    type="number" 
                    value={editingGame.playtime || ''} 
                    onChange={(e) => handleEditFieldChange('playtime', parseInt(e.target.value) || 0)} 
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs outline-none text-left text-yellow-500 font-bold" 
                    placeholder="مثلاً 45"
                    dir="ltr" 
                  />
                </div>

                {/* 🔞 ویرایش دستی رده سنی بازی */}
                <div>
                  <label className="block text-xs text-red-400 font-bold mb-1.5">🔞 رده سنی (ESRB):</label>
                  <select 
                    value={editingGame.esrb_rating || '---'} 
                    onChange={(e) => handleEditFieldChange('esrb_rating', e.target.value)} 
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs outline-none text-slate-300 font-bold"
                  >
                    <option value="---">نامشخص (---)</option>
                    <option value="همه سنین">همه سنین (Everyone)</option>
                    <option value="+10">+10 (Everyone 10+)</option>
                    <option value="+13">+13 (Teen)</option>
                    <option value="+17">+17 (Mature)</option>
                    <option value="+18">+18 (Adults Only)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-slate-400 font-bold mb-1.5">استودیو سازنده / توسعه‌دهنده:</label>
                  <input type="text" value={editingGame.developers || ''} onChange={(e) => handleEditFieldChange('developers', e.target.value)} className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs outline-none" placeholder="مثال: Rockstar Games" />
                </div>

                <div className="md:col-span-3">
                  <label className="block text-xs text-slate-400 font-bold mb-1.5">لینک استیم:</label>
                  <input type="text" value={editingGame.steam_link || ''} onChange={(e) => handleEditFieldChange('steam_link', e.target.value)} className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs outline-none text-left text-blue-400 font-mono" dir="ltr" />
                </div>

                {/* 🎬 بخش مدیریت تریلر و ویدیوهای یوتیوب */}
                <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-800/60 pt-4">
                  <div>
                    <label className="block text-xs text-purple-400 font-bold mb-1.5">🎥 لینک تریلر مستقیم (فایل MP4 یا فرمت ویدیویی):</label>
                    <input 
                      type="text" 
                      value={editingGame.trailer_url || ''} 
                      onChange={(e) => handleEditFieldChange('trailer_url', e.target.value)} 
                      className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs outline-none text-left text-purple-300 font-mono" 
                      placeholder="https://example.com/trailer.mp4"
                      dir="ltr" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-red-400 font-bold mb-1.5">🔻 ویدیوهای یوتیوب (لینک‌ها را با اینتر [خط جدید] از هم جدا کنید):</label>
                    <textarea 
                      rows={3} 
                      value={Array.isArray(editingGame.youtube_videos) ? editingGame.youtube_videos.join('\n') : editingGame.youtube_videos || ''} 
                      onChange={(e) => handleEditFieldChange('youtube_videos', e.target.value.split('\n').filter((link: string) => link.trim() !== ''))} 
                      className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs outline-none text-left text-red-300 font-mono leading-5" 
                      placeholder="https://www.youtube.com/watch?v=..."
                      dir="ltr" 
                    />
                  </div>
                </div>

                {/* ⚙️ بخش فیلدهای سیستم مورد نیاز */}
                <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-800/60 pt-4">
                  <div>
                    <label className="block text-xs text-red-400 font-bold mb-1.5">⚙️ حداقل سیستم مورد نیاز (Minimum):</label>
                    <textarea 
                      rows={5} 
                      value={editingGame.requirements?.minimum || ''} 
                      onChange={(e) => setEditingGame({
                        ...editingGame,
                        requirements: { ...editingGame.requirements, minimum: e.target.value }
                      })} 
                      className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs outline-none leading-6 text-slate-300 text-left font-mono" 
                      dir="ltr"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-green-400 font-bold mb-1.5">⚙️ سیستم پیشنهادی (Recommended):</label>
                    <textarea 
                      rows={5} 
                      value={editingGame.requirements?.recommended || ''} 
                      onChange={(e) => setEditingGame({
                        ...editingGame,
                        requirements: { ...editingGame.requirements, recommended: e.target.value }
                      })} 
                      className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs outline-none leading-6 text-slate-300 text-left font-mono" 
                      dir="ltr"
                    />
                  </div>
                </div>

                <div className="md:col-span-3 border-t border-slate-800/60 pt-4">
                  <label className="block text-xs text-slate-400 font-bold mb-1.5">توضیحات فارسی سایت:</label>
                  <textarea rows={5} value={editingGame.description_fa || ''} onChange={(e) => handleEditFieldChange('description_fa', e.target.value)} className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs outline-none leading-6 text-slate-300" />
                </div>

                <div className="md:col-span-3">
                  <label className="block text-xs text-slate-400 font-bold mb-1.5">توضیحات انگلیسی (English Description):</label>
                  <textarea rows={4} value={editingGame.description_en || ''} onChange={(e) => handleEditFieldChange('description_en', e.target.value)} className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs outline-none leading-6 text-slate-400 text-left" dir="ltr" />
                </div>
              </div>

              {/* 📸 مدیریت تصاویر گالری */}
              <div className="border-t border-slate-800 pt-4">
                <label className="block text-xs text-purple-400 font-bold mb-3">📸 مدیریت گالری تصاویر آرشیو (کلیک روی ✕ جهت حذف):</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
                  {editingGame.gallery?.map((imgUrl: string, idx: number) => (
                    <div key={idx} className="relative aspect-video rounded-xl overflow-hidden group border border-slate-800 bg-slate-950">
                      <img src={getOptimizedUrl(imgUrl, 200)} alt="گالری" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition" />
                      <button
                        type="button"
                        onClick={() => handleRemoveGalleryImage(imgUrl)}
                        className="absolute top-1 right-1 bg-red-600/90 hover:bg-red-500 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px] shadow-md transition transform hover:scale-110"
                        title="حذف این عکس"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  {(!editingGame.gallery || editingGame.gallery.length === 0) && (
                    <p className="text-xs text-slate-500 col-span-full">عکسی در گالری این بازی ثبت نشده است.</p>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-800 pt-4">
                <button onClick={() => setEditingGame(null)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition">انصراف</button>
                <button onClick={handleSaveFullEdit} className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-purple-900/30">✔ ثبت تغییرات بازی در صف</button>
              </div>
            </div>
          )}

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
                  <img 
                    src={getOptimizedUrl(game.background_image, 400)} 
                    alt={game.name} 
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = `https://rawg-proxy.hossein-hf273.workers.dev/?url=${encodeURIComponent(game.background_image)}`;
                    }}
                    className="w-full h-40 object-cover" 
                  />
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
                        <button onClick={() => handleEditGame(game)} className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-xl text-[11px] transition font-bold">✏️ ویرایش کامل اطلاعات و مدیریت تصاویر</button>
                      </div>
                    ) : (
                      // 🛠️ فیکس نهایی ارور کامپایل دکمه افزودن آرشیو:
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
