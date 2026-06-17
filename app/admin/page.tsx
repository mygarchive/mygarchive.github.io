/* eslint-disable @next/next/no-img-element */
'use client';

import { useState, useEffect } from 'react';
import Link from 'react';

const GITHUB_OWNER = 'mygarchive'; 
const GITHUB_REPO = 'mygarchive.github.io'; 
const RAWG_API_KEY = '8ceb3ebba03c4ddca51106af23868263';

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

  // استیت‌های مربوط به مدال ویرایش پیشرفته اطلاعات قبل از ذخیره
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGame, setEditingGame] = useState<any>(null);
  const [customSteamLink, setCustomSteamLink] = useState('');
  const [customYoutubeVideos, setCustomYoutubeVideos] = useState<string[]>(['']);
  const [customGallery, setCustomGallery] = useState<string[]>([]);

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
      console.warn("پروکسی اول ناموفق بود، سوئیچ به پروکسی دوم...", e);
    }

    try {
      const res = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`);
      if (res.ok) {
        const jsonWrapper = await res.json();
        return parseAllOrigins ? JSON.parse(jsonWrapper.contents) : jsonWrapper;
      }
    } catch (e) {
      console.warn("پروکسی دوم هم ناموفق بود، سوئیچ به اتصال مستقیم...", e);
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
    try {
      const targetUrl = `https://api.rawg.io/api/games?key=${RAWG_API_KEY}&search=${encodeURIComponent(searchQuery)}&page_size=24`;
      const data = await fetchSmartRoute(targetUrl, true);
      setSearchResults(data.results || []);
    } catch (err) { 
      console.error("خطای جامع در سیستم جستجو:", err); 
      setMessage({ text: 'خطا در برقراری ارتباط. اگر وی‌پی‌ان دارید روشن کنید.', isError: true });
    }
    setLoading(false);
  };

  // گام اول: واکشی اطلاعات اولیه و باز کردن مدال برای شخصی‌سازی عکس‌ها و یوتیوب
  const handleFetchAndPrepare = async (game: any) => {
    setLoading(true);
    setMessage({ text: 'در حال دریافت اطلاعات و آماده‌سازی فرم ویرایش پیشرفته...', isError: false });
    
    try {
      const detailsTarget = `https://api.rawg.io/api/games/${game.id}?key=${RAWG_API_KEY}`;
      const moviesTarget = `https://api.rawg.io/api/games/${game.id}/movies?key=${RAWG_API_KEY}`;
      const screenshotsTarget = `https://api.rawg.io/api/games/${game.id}/screenshots?key=${RAWG_API_KEY}`;

      const [details, movieData, screenshots] = await Promise.all([
        fetchSmartRoute(detailsTarget, true),
        fetchSmartRoute(moviesTarget, true),
        fetchSmartRoute(screenshotsTarget, true)
      ]);
      
      const descriptionFa = await translateToPersian((details.description_raw || "").substring(0, 1500));
      
      let minReq = '';
      let recReq = '';
      const pcPlatformData = details.platforms?.find((p: any) => p.platform.slug === 'pc');
      if (pcPlatformData?.requirements) {
        if (pcPlatformData.requirements.minimum) minReq = pcPlatformData.requirements.minimum;
        if (pcPlatformData.requirements.recommended) recReq = pcPlatformData.requirements.recommended;
      }
      if (!minReq && pcPlatformData?.requirements_minimum) minReq = pcPlatformData.requirements_minimum;
      if (!recReq && pcPlatformData?.requirements_recommended) recReq = pcPlatformData.requirements_recommended;

      let finalAge = '---';
      const rawEsrb = details.esrb_rating?.slug || '';
      if (rawEsrb === 'mature') finalAge = '+17';
      else if (rawEsrb === 'adults-only') finalAge = '+18';
      else if (rawEsrb === 'teen') finalAge = '+13';
      else if (rawEsrb === 'everyone-10-plus') finalAge = '+10';
      else if (rawEsrb === 'everyone') finalAge = 'همه سنین';

      // استخراج هوشمند آیدی و لینک مستقیم بازی در استیم
      let steamUrl = '';
      if (details.stores && details.stores.length > 0) {
        const steamStore = details.stores.find((s: any) => s.store?.slug === 'steam');
        if (steamStore && steamStore.url) {
          const match = steamStore.url.match(/\/app\/(\d+)/);
          steamUrl = match && match[1] ? `https://store.steampowered.com/app/${match[1]}` : steamStore.url;
        }
      }
      if (!steamUrl && game.name) {
        steamUrl = `https://store.steampowered.com/search/?term=${encodeURIComponent(game.name)}`;
      }

      // گرفتن لیست شات‌ها تا سقف ۱۰ عدد برای گالری
      const apiGallery = screenshots.results?.map((s: any) => s.image) || [];
      const limitedGallery = apiGallery.slice(0, 10);
      
      // بررسی وجود ویدیو پیش‌فرض در تریلر RAWG
      const defaultTrailer = movieData.results?.[0]?.data?.max || '';

      // بررسی دیتای موجود در آرشیو محلی گیت‌هاب (اگر قبلاً ذخیره شده باشد اطلاعات قدیمی را می‌آورد)
      const existingGame = myGames.find((g) => g.id === game.id);

      setEditingGame({
        id: game.id,
        name: game.name,
        background_image: game.background_image,
        rating: game.rating,
        released: game.released,
        genres: game.genres || [],
        esrb_rating: finalAge,
        playtime: details.playtime || 0,
        developers: details.developers?.map((d: any) => d.name).join(', ') || '---',
        minReq,
        recReq,
        description_en: (details.description_raw || "No description available.").substring(0, 1500),
        description_fa: existingGame?.description_fa || descriptionFa,
        trailer_url: defaultTrailer
      });

      setCustomSteamLink(existingGame?.steam_link || steamUrl);
      setCustomGallery(existingGame?.gallery?.length ? existingGame.gallery.slice(0, 10) : limitedGallery);
      setCustomYoutubeVideos(existingGame?.youtube_videos?.length ? existingGame.youtube_videos : [defaultTrailer].filter(Boolean));
      
      setIsModalOpen(true);
      setMessage({ text: '', isError: false });
    } catch (err) {
      console.error(err);
      setMessage({ text: 'خطا در جمع‌آوری اطلاعات اولیه بازی از API.', isError: true });
    }
    setLoading(false);
  };

  // گام دوم: تایید اطلاعات نهایی در فرم و آپلود روی سرور گیت‌هاب
  const handleSaveFinalGame = async () => {
    setLoading(true);
    setIsModalOpen(false);
    setMessage({ text: 'در حال ارسال و ثبت دیتای نهایی در فایل گیت‌هاب...', isError: false });

    try {
      const latestRepoState = await fetchMyGames(githubToken);
      let currentGamesList = latestRepoState ? latestRepoState.games : [...myGames];
      let currentSha = latestRepoState ? latestRepoState.sha : fileSha;

      const cleanReq = (text: string, fallback: string) => {
        if (!text) return fallback;
        return text.replace(/Minimum:|Recommended:|⚙️/gi, '').replace(/<\/?b>/g, '').replace(/<\/?p>/g, '').replace(/<\/?br\s*\/?>/g, '\n').trim();
      };

      // فیلتر کردن فیلدهای خالی ویدیوهای یوتیوب
      const filteredVideos = customYoutubeVideos.map(v => v.trim()).filter(v => v !== '');

      const finalGameObj = {
        id: editingGame.id,
        name: editingGame.name,
        background_image: editingGame.background_image,
        rating: editingGame.rating,
        released: editingGame.released,
        genres: editingGame.genres,
        esrb_rating: editingGame.esrb_rating,
        playtime: editingGame.playtime,
        developers: editingGame.developers,
        steam_link: customSteamLink.trim(), 
        trailer_url: editingGame.trailer_url,
        youtube_videos: filteredVideos, // ذخیره رسمی فیلد آرایه ویدیوها
        gallery: customGallery.map(img => img.trim()).filter(img => img !== ''), // ذخیره رسمی گالری توسعه‌یافته
        requirements: { 
          minimum: cleanReq(editingGame.minReq, 'مشخصات حداقل سخت‌افزار ثبت نشده است.'), 
          recommended: cleanReq(editingGame.recReq, 'مشخصات سیستم پیشنهادی ثبت نشده است.') 
        },
        description_en: editingGame.description_en,
        description_fa: editingGame.description_fa
      };

      const cleanGamesList = currentGamesList.filter((g: any) => g.id !== editingGame.id);
      cleanGamesList.push(finalGameObj);

      const res = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/data/games.json`, {
        method: 'PUT',
        headers: { 'Authorization': `token ${githubToken}`, 'Content-Type': 'application/json', 'Accept': 'application/vnd.github.v3+json' },
        body: JSON.stringify({ message: `Add/Update ${editingGame.name} with Advanced Data`, content: safeBtoa(JSON.stringify(cleanGamesList, null, 2)), sha: currentSha })
      });

      if (res.status === 200 || res.status === 201) {
        const resData = await res.json();
        setFileSha(resData.content.sha);
        setMyGames(cleanGamesList);
        setMessage({ text: `بازی "${editingGame.name}" با موفقیت همراه با ویدیوها و گالری دلخواه ذخیره شد.`, isError: false });
      } else { 
        setMessage({ text: 'خطا در ثبت اطلاعات نهایی روی گیت‌هاب.', isError: true }); 
      }
    } catch (err) {
      console.error(err);
      setMessage({ text: 'خطا در پردازش و ذخیره دیتابیس.', isError: true });
    }
    setLoading(false);
  };

  const handleRemoveGame = async (gameId: number, gameName: string) => {
    if (!window.confirm(`آیا از حذف بازی "${gameName}" مطمئن هستید؟`)) return;
    setLoading(true);
    try {
      const latestRepoState = await fetchMyGames(githubToken);
      let currentGamesList = latestRepoState ? latestRepoState.games : [...myGames];
      let currentSha = latestRepoState ? latestRepoState.sha : fileSha;

      const updatedGames = currentGamesList.filter((g: any) => g.id !== gameId);
      const res = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/data/games.json`, {
        method: 'PUT',
        headers: { 'Authorization': `token ${githubToken}`, 'Content-Type': 'application/json', 'Accept': 'application/vnd.github.v3+json' },
        body: JSON.stringify({ message: `Remove ${gameName}`, content: safeBtoa(JSON.stringify(updatedGames, null, 2)), sha: currentSha })
      });

      if (res.status === 200 || res.status === 201) {
        const resData = await res.json();
        setFileSha(resData.content.sha);
        setMyGames(updatedGames);
        setMessage({ text: `بازی "${gameName}" با موفقیت حذف گردید.`, isError: false });
      }
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-12" dir="rtl">
      {/* هدر و بخش لاگین بدون تغییر باقی می‌ماند */}
      {!isLoggedIn ? (
        <div className="min-h-screen text-slate-100 flex items-center justify-center p-6">
          <form onSubmit={handleLogin} className="bg-slate-900 border border-slate-800 p-8 rounded-2xl w-full max-w-md space-y-5">
            <div className="text-center space-y-2 mb-4">
              <h2 className="text-xl font-black text-white">🔒 ورود به پنل مدیریت آرشیو</h2>
              <p className="text-[11px] text-slate-400 font-medium">جهت ورود، کلید دسترسی (Token) اختصاصی گیت‌هاب خود را وارد کنید.</p>
            </div>
            {loginError && <div className="p-3 bg-red-500/10 text-red-400 text-xs font-bold rounded-xl text-center border border-red-900/30">{loginError}</div>}
            <div className="space-y-1.5">
              <label className="text-xs text-slate-400 font-bold">توکن گیت‌هاب:</label>
              <input type="password" value={githubToken} onChange={(e) => setGithubToken(e.target.value)} className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs outline-none text-left tracking-wider text-purple-400 focus:border-purple-600 transition" dir="ltr" placeholder="ghp_..." required />
            </div>
            <button type="submit" disabled={loading} className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-sm transition disabled:opacity-50">
              {loading ? 'در حال بررسی...' : 'ورود به ادمین'}
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
            <Link href="/" className="text-xs text-purple-400 bg-purple-950/40 border border-purple-900/60 px-4 py-2 rounded-xl">➔ نمایش صفحه اصلی سایت</Link>
          </header>

          <div className="bg-slate-900/50 border border-slate-900 p-4 rounded-xl mb-6 flex gap-2">
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch()} placeholder="نام بازی..." className="flex-1 p-3 bg-slate-950 border border-slate-800 rounded-xl text-sm outline-none text-left" dir="ltr" />
            <button onClick={handleSearch} className="px-6 bg-purple-600 hover:bg-purple-700 rounded-xl text-sm font-bold">جستجو</button>
          </div>

          {message.text && <div className={`p-3 rounded-lg text-xs font-bold mb-6 text-center ${message.isError ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'}`}>{message.text}</div>}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {searchResults.map((game) => {
              const isAlreadyAdded = myGames.some((g) => g.id === game.id);
              return (
                <div key={game.id} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex flex-col justify-between shadow-lg">
                  <img src={getOptimizedUrl(game.background_image, 400)} alt={game.name} className="w-full h-40 object-cover" />
                  <div className="p-4 flex flex-col justify-between flex-1 space-y-4">
                    <h3 className="font-bold text-sm text-white text-left truncate" dir="ltr">{game.name}</h3>
                    {isAlreadyAdded ? (
                      <div className="flex gap-2 w-full">
                        <button onClick={() => handleFetchAndPrepare(game)} className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs transition font-bold">🔄 ویرایش و فیکس</button>
                        <button onClick={() => handleRemoveGame(game.id, game.name)} className="px-3 py-2 bg-red-950/40 border border-red-900 text-red-400 hover:bg-red-600 hover:text-white rounded-xl text-xs transition font-bold">❌ حذف</button>
                      </div>
                    ) : (
                      <button onClick={() => handleFetchAndPrepare(game)} disabled={loading} className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs transition font-bold disabled:opacity-50">＋ افزودن پیشرفته</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 🛠️ مدال یا فرم پاپ‌آپ ویرایش پیشرفته گالری و لینک‌های یوتیوب قبل از آپلود نهایی */}
      {isModalOpen && editingGame && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-6 shadow-2xl" dir="rtl">
            <div className="flex justify-between items-center pb-3 border-b border-slate-800">
              <h2 className="text-md font-black text-purple-400">🛠️ تنظیمات نهایی بازی: {editingGame.name}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white text-sm font-bold">انصراف ×</button>
            </div>

            {/* بخش لینک اختصاصی استیم */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300">🎮 لینک مستقیم استیم (Steam App URL):</label>
              <input type="text" value={customSteamLink} onChange={(e) => setCustomSteamLink(e.target.value)} className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-left text-blue-400 font-mono outline-none focus:border-blue-600 transition" dir="ltr" />
            </div>

            {/* بخش افزودن چند لینک ویدیو یوتیوب */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-slate-300">🎬 لینک ویدیوها یا گیم‌پلی‌های یوتیوب:</label>
                <button type="button" onClick={() => setCustomYoutubeVideos([...customYoutubeVideos, ''])} className="text-[10px] bg-purple-950 text-purple-400 px-2.5 py-1 rounded-md border border-purple-900/60 font-bold hover:bg-purple-900 transition">＋ ویدیو جدید</button>
              </div>
              <div className="space-y-2 max-h-32 overflow-y-auto p-1">
                {customYoutubeVideos.map((video, index) => (
                  <div key={index} className="flex gap-2">
                    <input type="text" value={video} onChange={(e) => {
                      const updated = [...customYoutubeVideos];
                      updated[index] = e.target.value;
                      setCustomYoutubeVideos(updated);
                    }} placeholder="https://www.youtube.com/watch?v=..." className="flex-1 p-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-left font-mono outline-none" dir="ltr" />
                    <button type="button" onClick={() => setCustomYoutubeVideos(customYoutubeVideos.filter((_, i) => i !== index))} className="px-2.5 bg-red-950/40 text-red-400 border border-red-900 rounded-xl text-xs">حذف</button>
                  </div>
                ))}
              </div>
            </div>

            {/* بخش مدیریت گالری تصاویر (تا ۱۰ عدد عکس) */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-slate-300">📸 آدرس تصاویر گالری (حداکثر ۱۰ عدد):</label>
                <button type="button" onClick={() => { if(customGallery.length < 10) setCustomGallery([...customGallery, '']); }} disabled={customGallery.length >= 10} className="text-[10px] bg-blue-950 text-blue-400 px-2.5 py-1 rounded-md border border-blue-900/60 font-bold hover:bg-blue-900 disabled:opacity-40 transition">＋ افزودن عکس</button>
              </div>
              <div className="space-y-2 max-h-44 overflow-y-auto p-1 border border-slate-800/40 rounded-xl bg-slate-950/30">
                {customGallery.map((imgUrl, index) => (
                  <div key={index} className="flex gap-2 items-center">
                    <span className="text-[10px] text-slate-500 font-mono w-4">{index + 1}</span>
                    <input type="text" value={imgUrl} onChange={(e) => {
                      const updated = [...customGallery];
                      updated[index] = e.target.value;
                      setCustomGallery(updated);
                    }} className="flex-1 p-2 bg-slate-950 border border-slate-800 rounded-xl text-[11px] text-left font-mono outline-none" dir="ltr" />
                    <button type="button" onClick={() => setCustomGallery(customGallery.filter((_, i) => i !== index))} className="px-2 bg-red-950/40 text-red-400 border border-red-900 rounded-xl text-xs">حذف</button>
                  </div>
                ))}
              </div>
            </div>

            {/* دکمه نهایی ثبت نهایی آرشیو در گیت‌هاب */}
            <div className="flex gap-2 pt-2 border-top border-slate-800">
              <button onClick={handleSaveFinalGame} className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-bold shadow-lg transition">
                💾 تایید و ذخیره نهایی در گیت‌هاب
              </button>
              <button onClick={() => setIsModalOpen(false)} className="px-5 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition">
                بستن فرم
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
