/* eslint-disable @next/next/no-img-element */
'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

const GITHUB_OWNER = 'mygarchive'; 
const GITHUB_REPO = 'mygarchive.github.io'; 
const RAWG_API_KEY = '8ceb3ebba03c4ddca51106af23868263';
// ⚡ اتصال مستقیم به API گیت‌هاب بدون نیاز به ورکر و بدون وی‌پی‌ان
const GITHUB_API_URL = 'https://api.github.com';

// ⚡ شبکه مقاوم با تایم‌آوت قابل تنظیم
const safeFetchWithTimeout = async (url: string, options: RequestInit = {}, timeoutMs = 15000) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { 
      ...options, 
      signal: controller.signal,
      cache: 'no-store'
    });
    clearTimeout(id);
    return res;
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
};

// ⚡ ترجمه مقاوم در برابر Rate-Limit و تایم‌آوت
async function translateToPersian(text: string): Promise<string> {
  if (!text) return '';
  try {
    const res = await safeFetchWithTimeout(
      `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=fa&dt=t&q=${encodeURIComponent(text)}`,
      {},
      5000
    );
    if (!res.ok) return 'توضیحات فارسی ثبت نشده است.';
    const data = await res.json();
    return data[0]?.map((item: any) => item[0]).join('') || 'توضیحات فارسی ثبت نشده است.';
  } catch { 
    return 'توضیحات فارسی ثبت نشده است.'; 
  }
}

// ⚡ کدگذاری ایمن UTF-8 به Base64
const safeBtoa = (str: string) => {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

const safeAtob = (str: string) => {
  const binary = atob(str);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
};

const extractSizeFromReqText = (reqText: string): number | null => {
  if (!reqText) return null;
  const lines = reqText.split('\n');
  for (const line of lines) {
    const lowerLine = line.toLowerCase();
    const isStorageLine = 
      lowerLine.includes('storage') || 
      lowerLine.includes('hard drive') || 
      lowerLine.includes('disk') || 
      lowerLine.includes('hdd') || 
      lowerLine.includes('ssd') || 
      lowerLine.includes('space');

    const isMemoryLine = lowerLine.includes('memory') || lowerLine.includes('ram');

    if (isStorageLine && !isMemoryLine) {
      const match = line.match(/(\d+(?:\.\d+)?)\s*(gb|mb|giga)/i);
      if (match && match[1]) {
        const amount = parseFloat(match[1]);
        const unit = (match[2] || '').toLowerCase();
        if (!isNaN(amount)) {
          if (unit.startsWith('mb')) return parseFloat((amount / 1024).toFixed(2));
          return amount;
        }
      }
    }
  }
  return null;
};

export default function AdminPanel() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [githubToken, setGithubToken] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [myGames, setMyGames] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [message, setMessage] = useState({ text: '', isError: false });
  const [fileSha, setFileSha] = useState('');
  const [viewMode, setViewMode] = useState<'SEARCH' | 'ARCHIVE'>('SEARCH');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const [editingGame, setEditingGame] = useState<any | null>(null);

  const getOptimizedUrl = (url: string, width = 400) => {
    if (!url) return '';
    const cleanUrl = url.replace(/^https?:\/\//i, '');
    return `https://images.weserv.nl/?url=${encodeURIComponent(cleanUrl)}&w=${width}&q=80`;
  };

  // ⚡ سرویس هوشمند هوک شده بدون معطلی ۱۰ ثانیه‌ای ورکر کلاودفلر
  const fetchSmartRoute = async (targetUrl: string) => {
    try {
      const res = await safeFetchWithTimeout(`https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(targetUrl)}`, {}, 8000);
      if (res.ok) return await res.json();
    } catch (e) { console.warn("پروکسی اول ناموفق بود..."); }

    try {
      const res = await safeFetchWithTimeout(`https://corsproxy.io/?${encodeURIComponent(targetUrl)}`, {}, 8000);
      if (res.ok) return await res.json();
    } catch (e) { console.warn("پروکسی دوم ناموفق بود..."); }

    const directRes = await safeFetchWithTimeout(targetUrl, {}, 8000);
    if (directRes.ok) return await directRes.json();
    throw new Error("تمامی مسیرهای ارتباطی با خطا مواجه شدند.");
  };

  const getSteamIdFromSteam = useCallback(async (gameName: string): Promise<string | null> => {
    try {
      const searchUrl = `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(gameName)}&l=english&cc=US`;
      const data = await fetchSmartRoute(searchUrl);
      if (data && data.items && data.items.length > 0) return data.items[0].id;
    } catch (e) {
      console.error("خطا در جستجوی استیم:", e);
    }
    return null;
  }, []);

  // 🔄 بارگذاری داده‌ها از LocalStorage
  useEffect(() => {
    const savedToken = localStorage.getItem('gh_token');
    const savedGames = localStorage.getItem('admin_my_games_cache');
    const unsavedFlag = localStorage.getItem('admin_has_unsaved') === 'true';

    if (savedGames) {
      try { 
        setMyGames(JSON.parse(savedGames)); 
        setHasUnsavedChanges(unsavedFlag);
      } catch (e) { console.error("Error reading games cache", e); }
    }

    if (localStorage.getItem('isAdmin') === 'true' && savedToken) {
      setGithubToken(savedToken);
      fetchMyGames(savedToken);
    }
  }, []);

  // 💾 بروزرسانی استیت محلی و هشدارهای ذخیره‌نشده
  const updateMyGamesState = (newGamesList: any[], markUnsaved = true) => {
    setMyGames(newGamesList);
    try {
      localStorage.setItem('admin_my_games_cache', JSON.stringify(newGamesList));
      if (markUnsaved) {
        setHasUnsavedChanges(true);
        localStorage.setItem('admin_has_unsaved', 'true');
      }
    } catch (e) { 
      console.error("LocalStorage quota exceeded", e); 
    }
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
      // ⚡ اتصال مستقیم به API گیت‌هاب بدون ورکر
      const checkRes = await safeFetchWithTimeout(`${GITHUB_API_URL}/user`, {
        headers: { 
          'Authorization': `Bearer ${trimmedToken}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      }, 10000);
      
      if (checkRes.status === 200) {
        localStorage.setItem('isAdmin', 'true');
        localStorage.setItem('gh_token', trimmedToken);
        await fetchMyGames(trimmedToken);
      } else {
        setLoginError('توکن وارد شده معتبر نیست یا دسترسی لازم را ندارد!');
      }
    } catch {
      setLoginError('خطا در ارتباط مستقیم با گیت‌هاب. وضعیت اینترنت را بررسی کنید.');
    }
    setLoading(false);
  };

  const handleLogout = () => {
    if (hasUnsavedChanges) {
      if (!window.confirm('⚠️ شما تغییرات ذخیره‌نشده دارید! آیا می‌خواهید بدون ارسال به گیت‌هاب خارج شوید؟')) {
        return;
      }
    }
    localStorage.removeItem('isAdmin');
    localStorage.removeItem('gh_token');
    localStorage.removeItem('admin_my_games_cache');
    localStorage.removeItem('admin_has_unsaved');
    setIsLoggedIn(false);
    setGithubToken('');
    setMyGames([]);
    setSearchResults([]);
    setHasUnsavedChanges(false);
    setEditingGame(null);
    setMessage({ text: 'با موفقیت از پنل خارج شدید.', isError: false });
  };

  const fetchMyGames = async (token: string) => {
    try {
      const res = await safeFetchWithTimeout(`${GITHUB_API_URL}/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/data/games.json?v=${Date.now()}`, { 
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json'
        } 
      }, 15000);

      if (res.status === 200) {
        const data = await res.json();
        setFileSha(data.sha);
        
        // اگر تغییرات محلی ذخیره‌نشده نداریم، داده‌های تازه گیت‌هاب را جایگزین کن
        if (!localStorage.getItem('admin_has_unsaved')) {
          let parsedGames = [];
          if (data.download_url) {
            const rawRes = await safeFetchWithTimeout(`${data.download_url}?v=${Date.now()}`, {}, 15000);
            parsedGames = await rawRes.json();
          } else if (data.content) {
            const cleanContent = data.content.replace(/\n/g, '');
            parsedGames = JSON.parse(safeAtob(cleanContent));
          }

          if (Array.isArray(parsedGames)) {
            updateMyGamesState(parsedGames, false);
          }
        }
        setIsLoggedIn(true);
        return { sha: data.sha };
      }
    } catch (err) { 
      console.error(err);
      if (myGames.length > 0) setIsLoggedIn(true);
      setMessage({ text: '⚠️ نمایش نسخه ذخیره‌شده مرورگر (آفلاین).', isError: true });
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
      const data = await fetchSmartRoute(targetUrl);
      setSearchResults(data.results || []);
    } catch (err) { 
      console.error("خطای سیستم جستجو:", err); 
      setMessage({ text: 'خطا در برقراری ارتباط با سرور RAWG.', isError: true });
    }
    setLoading(false);
  };

  // ⚡ افزودن بازی جدید به لیست محلی
  const handleAddGame = async (game: any) => {
    setLoading(true);
    setMessage({ text: `⏳ در حال استخراج اطلاعات جامع "${game.name}"...`, isError: false });

    try {
      const detailsTarget = `https://api.rawg.io/api/games/${game.id}?key=${RAWG_API_KEY}`;
      const moviesTarget = `https://api.rawg.io/api/games/${game.id}/movies?key=${RAWG_API_KEY}`;
      const screenshotsTarget = `https://api.rawg.io/api/games/${game.id}/screenshots?key=${RAWG_API_KEY}`;
      const youtubeTarget = `https://api.rawg.io/api/games/${game.id}/youtube?key=${RAWG_API_KEY}`;

      const results = await Promise.allSettled([
        fetchSmartRoute(detailsTarget),
        fetchSmartRoute(moviesTarget),
        fetchSmartRoute(screenshotsTarget),
        fetchSmartRoute(youtubeTarget)
      ]);

      const details = results[0].status === 'fulfilled' ? results[0].value : {};
      const movieData = results[1].status === 'fulfilled' ? results[1].value : { results: [] };
      const screenshots = results[2].status === 'fulfilled' ? results[2].value : { results: [] };
      const youtubeData = results[3].status === 'fulfilled' ? results[3].value : { results: [] };

      let descriptionFaWithLabel = 'توضیحات فارسی ثبت نشده است.';
      try {
        const rawDescriptionFa = await translateToPersian((details?.description_raw || "").substring(0, 1500));
        if (rawDescriptionFa) descriptionFaWithLabel = `توضیحات بازی (ترجمه ماشینی):\n${rawDescriptionFa}`;
      } catch { console.warn("خطا در ترجمه"); }

      let minReq = '';
      let recReq = '';
      const pcPlatformData = details?.platforms?.find((p: any) => p?.platform?.slug === 'pc');
      if (pcPlatformData?.requirements) {
        minReq = pcPlatformData.requirements.minimum || '';
        recReq = pcPlatformData.requirements.recommended || '';
      }

      const cleanReq = (text: string, fallback: string) => {
        if (!text || typeof text !== 'string') return fallback;
        return text.replace(/Minimum:|Recommended:|⚙️/gi, '').replace(/<\/?b>/g, '').replace(/<\/?p>/g, '').replace(/<\/?br\s*\/?>/g, '\n').trim();
      };

      let finalAge = '---';
      const rawEsrb = details?.esrb_rating?.slug || '';
      if (rawEsrb === 'mature') finalAge = '+17';
      else if (rawEsrb === 'adults-only') finalAge = '+18';
      else if (rawEsrb === 'teen') finalAge = '+13';
      else if (rawEsrb === 'everyone-10-plus') finalAge = '+10';
      else if (rawEsrb === 'everyone') finalAge = 'همه سنین';

      let steamUrl = '';
      try {
        const steamId = await getSteamIdFromSteam(game.name);
        if (steamId) steamUrl = `https://store.steampowered.com/app/${steamId}/`;
      } catch { console.warn("خطا در Steam ID"); }

      if (!steamUrl && details?.stores?.length > 0) {
        const steamStore = details.stores.find((s: any) => s.store?.slug === 'steam' || s.store?.id === 1);
        if (steamStore?.url) {
          const match = steamStore.url.match(/(?:app|sub)\/(\d+)/);
          steamUrl = match && match[1] ? `https://store.steampowered.com/app/${match[1]}/` : steamStore.url;
        }
      }
      if (!steamUrl) steamUrl = `https://store.steampowered.com/search/?term=${encodeURIComponent(game?.name || '')}`;

      const autoYoutube: string[] = [];
      if (youtubeData?.results?.length > 0) {
        youtubeData.results.slice(0, 5).forEach((vid: any) => {
          if (vid?.external_id) autoYoutube.push(`https://www.youtube.com/watch?v=${vid.external_id}`);
        });
      }
      const trailer = movieData?.results?.[0]?.data?.max || '';
      if (trailer && !autoYoutube.includes(trailer)) autoYoutube.unshift(trailer);

      let galleryFinal: string[] = [];
      if (screenshots?.results?.length > 0) galleryFinal = screenshots.results.map((s: any) => s.image).filter(Boolean);
      if (game?.short_screenshots?.length > 0) {
        game.short_screenshots.forEach((s: any) => {
          if (s?.image && !galleryFinal.includes(s.image)) galleryFinal.push(s.image);
        });
      }
      galleryFinal = galleryFinal.slice(0, 10);

      const autoExtractedGb = extractSizeFromReqText(minReq) || extractSizeFromReqText(recReq) || 0;

      const newGameObj = {
        id: game.id,
        name: game.name || 'نامشخص',
        background_image: game.background_image || '',
        metacritic: typeof details?.metacritic === 'number' ? details.metacritic : null,
        released: game.released || '---',
        genres: Array.isArray(game.genres) ? game.genres : [],
        esrb_rating: finalAge,
        playtime: details?.playtime || 0,
        developers: details?.developers?.map((d: any) => d.name).join(', ') || '---',
        steam_link: steamUrl,
        trailer_url: trailer,
        youtube_videos: autoYoutube,
        gallery: galleryFinal,
        requirements: {
          minimum: cleanReq(minReq, 'مشخصات حداقل سخت‌افزار ثبت نشده است.'),
          recommended: cleanReq(recReq, 'مشخصات سیستم پیشنهادی ثبت نشده است.')
        },
        description_en: (details?.description_raw || "No description available.").substring(0, 1500),
        description_fa: descriptionFaWithLabel,
        size_gb: isNaN(autoExtractedGb) ? 0 : autoExtractedGb,
        is_popular: false,
        is_coop: false,
        system_tier: 'unspecified'
      };

      const updatedList = myGames.filter((g: any) => g.id !== game.id);
      updatedList.push(newGameObj);

      updateMyGamesState(updatedList, true);
      setMessage({ text: `⚡ بازی "${game.name}" به آرشیو محلی اضافه شد. آماده ارسال یک‌باره به گیت‌هاب.`, isError: false });

    } catch (e) {
      console.error(e);
      setMessage({ text: 'خطا در استخراج اطلاعات کامل بازی از RAWG.', isError: true });
    }
    setLoading(false);
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

    let finalSizeGb = editingGame.size_gb;
    if (finalSizeGb === null || finalSizeGb === undefined || finalSizeGb === '') {
      finalSizeGb = extractSizeFromReqText(editingGame.requirements?.minimum || '') || extractSizeFromReqText(editingGame.requirements?.recommended || '') || 0;
    } else {
      finalSizeGb = parseFloat(finalSizeGb);
      if (isNaN(finalSizeGb)) finalSizeGb = 0;
    }

    const updatedGameObj = { ...editingGame, size_gb: finalSizeGb };
    const updatedList = myGames.map(g => g.id === editingGame.id ? updatedGameObj : g);
    
    updateMyGamesState(updatedList, true);
    
    setMessage({ text: `✅ تغییرات "${editingGame.name}" در مرورگر ذخیره شد.`, isError: false });
    setEditingGame(null);
  };

  const handleRemoveGame = (gameId: number, gameName: string) => {
    if (!window.confirm(`آیا از حذف بازی "${gameName}" مطمئن هستید؟`)) return;
    
    const updatedList = myGames.filter(g => g.id !== gameId);
    updateMyGamesState(updatedList, true);
    setMessage({ text: `🗑️ بازی "${gameName}" از آرشیو محلی حذف شد.`, isError: false });
  };

  // 🚀 ارسال تجمیعی و یک‌باره کل اطلاعات به گیت‌هاب (تنها یک درخواست PUT)
  const syncAllChangesToGithub = async () => {
    if (!githubToken) return setMessage({ text: 'لطفاً توکن گیت‌هاب را بررسی کنید.', isError: true });

    setIsSyncing(true);
    setMessage({ text: '⏳ در حال دریافت تازه‌ترین SHA و ارسال تجمیعی تغییرات به گیت‌هاب...', isError: false });

    try {
      let currentSha = fileSha;

      // ۱. گرفتن آخرین SHA برای جلوگیری از تداخل 409
      const repoRes = await safeFetchWithTimeout(
        `${GITHUB_API_URL}/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/data/games.json?v=${Date.now()}`,
        { 
          headers: { 
            'Authorization': `Bearer ${githubToken}`,
            'Accept': 'application/vnd.github.v3+json'
          } 
        },
        12000
      );

      if (repoRes.ok) {
        const latestRepoState = await repoRes.json();
        if (latestRepoState?.sha) currentSha = latestRepoState.sha;
      }

      // ۲. کدگذاری کل فایل و ارسال یک‌باره (Batch PUT)
      const encodedContent = safeBtoa(JSON.stringify(myGames, null, 0));

      const putRes = await safeFetchWithTimeout(
        `${GITHUB_API_URL}/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/data/games.json`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${githubToken}`,
            'Content-Type': 'application/json',
            'Accept': 'application/vnd.github.v3+json'
          },
          body: JSON.stringify({
            message: `CMS Sync: Updated ${myGames.length} games archive`,
            content: encodedContent,
            sha: currentSha
          })
        },
        20000
      );

      if (putRes.status === 200 || putRes.status === 201) {
        const resData = await putRes.json();
        setFileSha(resData.content.sha);
        setHasUnsavedChanges(false);
        localStorage.removeItem('admin_has_unsaved');
        setMessage({ text: `🎉 با موفقیت تمام تغییرات به گیت‌هاب ارسال و سایت بروز شد!`, isError: false });
      } else {
        setMessage({ text: `⚠️ خطای ثبت گیت‌هاب (${putRes.status}). اطلاعات در مرورگر شما کاملاً محفوظ است.`, isError: true });
      }

    } catch (err: any) {
      console.error("خطا در همگام‌سازی تجمیعی:", err);
      setMessage({ text: `⚠️ عدم برقراری ارتباط با گیت‌هاب. اطلاعات شما در مرورگر محفوظ است.`, isError: true });
    } finally {
      setIsSyncing(false);
    }
  };

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
          <header className="flex flex-wrap justify-between items-center gap-4 mb-8 border-b border-slate-900 pb-4">
            <div className="flex items-center gap-4">
              <h1 className="text-lg font-black text-white">🎮 کنترل پنل هوشمند آرشیو</h1>
              <button onClick={handleLogout} className="text-xs bg-red-950/40 border border-red-900/60 hover:bg-red-900 text-red-400 hover:text-white px-3 py-1.5 rounded-xl transition font-bold">🚪 خروج</button>
            </div>

            <div className="flex items-center gap-3">
              {/* 🚀 دکمه ثبت تجمیعی تغییرات محلی روی گیت‌هاب */}
              <button 
                onClick={syncAllChangesToGithub} 
                disabled={isSyncing}
                className={`text-xs px-4 py-2.5 rounded-xl font-extrabold transition flex items-center gap-2 shadow-lg ${
                  hasUnsavedChanges 
                    ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 animate-pulse shadow-amber-900/40' 
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/20'
                }`}
              >
                {isSyncing ? '⏳ در حال همگام‌سازی...' : hasUnsavedChanges ? '⚠️ ثبت تغییرات ذخیره‌نشده در گیت‌هاب' : '✔ همگام با گیت‌هاب (ارسال مجدد)'}
              </button>

              <Link href="/" className="text-xs text-purple-400 bg-purple-950/40 border border-purple-900/60 px-4 py-2.5 rounded-xl font-bold">➔ صفحه اصلی</Link>
            </div>
          </header>

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
                  <label className="block text-xs text-slate-400 font-bold mb-1.5">امتیاز منتقدین (Metacritic):</label>
                  <input 
                    type="number" 
                    value={editingGame.metacritic || ''} 
                    onChange={(e) => handleEditFieldChange('metacritic', parseInt(e.target.value) || '')} 
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs outline-none text-left" 
                    dir="ltr" 
                  />
                </div>

                <div className="md:col-span-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 border-t border-b border-slate-800/80 py-4 my-2">
                  <div>
                    <label className="block text-xs text-purple-400 font-bold mb-1.5">💾 حجم بازی (گیگابایت - دستی):</label>
                    <input 
                      type="number" 
                      step="0.1" 
                      value={editingGame.size_gb !== undefined && editingGame.size_gb !== null ? editingGame.size_gb : ''} 
                      onChange={(e) => handleEditFieldChange('size_gb', e.target.value === '' ? null : parseFloat(e.target.value))} 
                      className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs outline-none text-left font-bold text-purple-300" 
                      placeholder="اگر خالی بماند خودکار استخراج می‌شود"
                      dir="ltr" 
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-blue-400 font-bold mb-1.5">⚡ سطح سیستم مورد نیاز:</label>
                    <select 
                      value={editingGame.system_tier || 'unspecified'} 
                      onChange={(e) => handleEditFieldChange('system_tier', e.target.value)} 
                      className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs outline-none text-slate-300 font-bold"
                    >
                      <option value="unspecified">نامشخص / خودکار</option>
                      <option value="light">⚡ سبک (Light System)</option>
                      <option value="normal">💻 معمولی (Normal System)</option>
                      <option value="heavy">🐘 سنگین (Heavy System)</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2 pt-6">
                    <input 
                      type="checkbox" 
                      id="is_popular_checkbox" 
                      checked={!!editingGame.is_popular} 
                      onChange={(e) => handleEditFieldChange('is_popular', e.target.checked)} 
                      className="w-4 h-4 accent-purple-600 rounded cursor-pointer"
                    />
                    <label htmlFor="is_popular_checkbox" className="text-xs font-bold text-amber-400 cursor-pointer select-none">
                      🔥 بازی پرطرفدار (Popular)
                    </label>
                  </div>

                  <div className="flex items-center gap-2 pt-6">
                    <input 
                      type="checkbox" 
                      id="is_coop_checkbox" 
                      checked={!!editingGame.is_coop} 
                      onChange={(e) => handleEditFieldChange('is_coop', e.target.checked)} 
                      className="w-4 h-4 accent-purple-600 rounded cursor-pointer"
                    />
                    <label htmlFor="is_coop_checkbox" className="text-xs font-bold text-emerald-400 cursor-pointer select-none">
                      👥 چندنفره / کوآپ (Co-op)
                    </label>
                  </div>
                </div>

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

                <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-800/60 pt-4">
                  <div>
                    <label className="block text-xs text-purple-400 font-bold mb-1.5">🎥 لینک تریلر مستقیم (فایل MP4):</label>
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
                    <label className="block text-xs text-red-400 font-bold mb-1.5">🔻 ویدیوهای یوتیوب (هر لینک در یک خط):</label>
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
                  <label className="block text-xs text-slate-400 font-bold mb-1.5">توضیحات انگلیسی:</label>
                  <textarea rows={4} value={editingGame.description_en || ''} onChange={(e) => handleEditFieldChange('description_en', e.target.value)} className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs outline-none leading-6 text-slate-400 text-left" dir="ltr" />
                </div>
              </div>

              <div className="border-t border-slate-800 pt-4">
                <label className="block text-xs text-purple-400 font-bold mb-3">📸 مدیریت گالری تصاویر آرشیو:</label>
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
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-800 pt-4">
                <button onClick={() => setEditingGame(null)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition">انصراف</button>
                <button onClick={handleSaveFullEdit} className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-purple-900/30">✔ ذخیره در مرورگر</button>
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
              <button onClick={handleSearch} disabled={loading} className="px-6 bg-purple-600 hover:bg-purple-700 rounded-xl text-sm font-bold disabled:opacity-50">
                {loading ? '...' : 'جستجو'}
              </button>
            </div>
          )}

          {message.text && <div className={`p-3 rounded-lg text-xs font-bold mb-6 text-center ${message.isError ? 'bg-red-500/10 text-red-400 border border-red-900/30' : 'bg-green-500/10 text-green-400 border border-green-900/30'}`}>{message.text}</div>}

          {viewMode === 'ARCHIVE' && displayedGames.length === 0 && (
            <div className="text-center py-12 text-slate-500 font-bold text-sm bg-slate-900/30 rounded-2xl border border-slate-800/50">
              بازی‌ای در آرشیو موجود نیست.
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayedGames.map((game) => {
              const isAlreadyAdded = myGames.some((g) => g.id === game.id);
              const savedGameData = myGames.find((g) => g.id === game.id) || game;
              
              return (
                <div key={game.id} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex flex-col justify-between shadow-lg relative">
                  <div className="relative">
                    <img 
                      src={getOptimizedUrl(game.background_image, 400)} 
                      alt={game.name} 
                      onError={(e) => { e.currentTarget.src = '/placeholder.jpg'; }}
                      className="w-full h-40 object-cover" 
                    />
                    
                    {isAlreadyAdded && (
                      <div className="absolute top-2 right-2 flex flex-wrap gap-1">
                        {savedGameData.size_gb ? (
                          <span className="bg-purple-900/90 text-purple-200 text-[10px] font-bold px-2 py-0.5 rounded-full border border-purple-500/50 backdrop-blur-sm">
                            💾 {savedGameData.size_gb} GB
                          </span>
                        ) : null}
                        {savedGameData.is_popular && (
                          <span className="bg-amber-900/90 text-amber-200 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-500/50 backdrop-blur-sm">
                            🔥 پرطرفدار
                          </span>
                        )}
                        {savedGameData.is_coop && (
                          <span className="bg-emerald-900/90 text-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/50 backdrop-blur-sm">
                            👥 کوآپ
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="p-4 flex flex-col justify-between flex-1 space-y-4">
                    <h3 className="font-bold text-sm text-white text-left truncate" dir="ltr">{game.name}</h3>
                    
                    {isAlreadyAdded ? (
                      <div className="flex flex-col gap-2 w-full">
                        <div className="flex gap-2 w-full">
                          <button onClick={() => handleRemoveGame(game.id, game.name)} className="w-full py-2 bg-red-950/40 border border-red-900 text-red-400 hover:bg-red-600 hover:text-white rounded-xl text-xs transition font-bold">❌ حذف از آرشیو</button>
                        </div>
                        <button onClick={() => handleEditGame(game)} className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-xl text-[11px] transition font-bold">✏️ ویرایش کامل اطلاعات و مدیریت تصاویر</button>
                      </div>
                    ) : (
                      <button onClick={() => handleAddGame(game)} disabled={loading} className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs transition font-bold disabled:opacity-50">＋ افزودن به آرشیو محلی</button>
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
