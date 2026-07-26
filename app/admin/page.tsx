'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

const GITHUB_OWNER = 'YOUR_GITHUB_USERNAME';
const GITHUB_REPO = 'YOUR_REPO_NAME';

const safeBtoa = (str: string) => {
  return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, p1) => String.fromCharCode(parseInt(p1, 16))));
};

const getOptimizedUrl = (url: string, width = 400) => {
  if (!url) return '/placeholder.jpg';
  return `https://media.rawg.io/media/resize/${width}/-/${url.replace('https://media.rawg.io/media/', '')}`;
};

export default function AdminCMS() {
  const [githubToken, setGithubToken] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [myGames, setMyGames] = useState<any[]>([]);
  const [fileSha, setFileSha] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<'SEARCH' | 'ARCHIVE'>('ARCHIVE');
  const [editingGame, setEditingGame] = useState<any | null>(null);
  const [message, setMessage] = useState({ text: '', isError: false });
  const [queue, setQueue] = useState<any[]>([]);
  const [isProcessingQueue, setIsProcessingQueue] = useState(false);

  useEffect(() => {
    const savedToken = localStorage.getItem('gh_token');
    if (savedToken) {
      setGithubToken(savedToken);
      fetchInitialData(savedToken);
    }
  }, []);

  const fetchInitialData = async (token: string) => {
    setLoading(true);
    try {
      const res = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/data/games.json`, {
        headers: { 
          'Authorization': `token ${token}`, 
          'Accept': 'application/vnd.github.v3+json' 
        }
      });
      if (res.ok) {
        const data = await res.json();
        const content = JSON.parse(decodeURIComponent(escape(atob(data.content))));
        setMyGames(content);
        setFileSha(data.sha);
        setIsLoggedIn(true);
        localStorage.setItem('gh_token', token);
      } else {
        setLoginError('توکن معتبر نیست یا دسترسی به ریپازیتوری وجود ندارد.');
      }
    } catch {
      setLoginError('خطا در ارتباط با گیت‌هاب.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (githubToken.trim()) {
      fetchInitialData(githubToken.trim());
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('gh_token');
    setIsLoggedIn(false);
    setGithubToken('');
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setMessage({ text: '⏳ در حال جستجو در RAWG...', isError: false });
    try {
      const res = await fetch(`https://api.rawg.io/api/games?key=YOUR_RAWG_API_KEY&search=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      setSearchResults(data.results || []);
      setMessage({ text: '', isError: false });
    } catch {
      setMessage({ text: '❌ خطا در دریافت اطلاعات از RAWG.', isError: true });
    }
  };

  const handleEditFieldChange = (field: string, value: any) => {
    setEditingGame((prev: any) => ({
      ...prev,
      [field]: value
    }));
  };

  const handleNestedRequirementChange = (type: 'minimum' | 'recommended', value: string) => {
    setEditingGame((prev: any) => ({
      ...prev,
      requirements: {
        ...(prev?.requirements || {}),
        [type]: value
      }
    }));
  };

  const handleRemoveGalleryImage = (imgUrl: string) => {
    setEditingGame((prev: any) => ({
      ...prev,
      gallery: Array.isArray(prev?.gallery) 
        ? prev.gallery.filter((url: string) => url !== imgUrl) 
        : []
    }));
  };

  const handleEditGame = (game: any) => {
    setEditingGame(JSON.parse(JSON.stringify(game)));
  };

  const handleFixGame = (game: any) => {
    setQueue((prev) => [...prev, { type: 'UPDATE', game, overrideData: game }]);
    setMessage({ text: `📥 درخواست فیکس مجدد "${game.name}" در صف قرار گرفت.`, isError: false });
  };

  const handleSaveFullEdit = () => {
    if (!editingGame) return;
    setQueue((prev) => [...prev, { type: 'UPDATE', game: editingGame, overrideData: editingGame }]);
    setEditingGame(null);
    setMessage({ text: '📥 تغییرات در صف پردازش قرار گرفت.', isError: false });
  };

  const handleAddGame = (game: any) => {
    setQueue((prev) => [...prev, { type: 'ADD', game }]);
  };

  const handleRemoveGame = (gameId: number, gameName: string) => {
    setQueue((prev) => [...prev, { type: 'REMOVE', gameId, gameName }]);
  };

  const processNextQueueTask = useCallback(async () => {
    if (queue.length === 0 || isProcessingQueue) return;

    setIsProcessingQueue(true);
    const currentTask = queue[0];
    const { type, game, overrideData, gameId, gameName } = currentTask;

    try {
      const getShaRes = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/data/games.json`, {
        headers: {
          'Authorization': `token ${githubToken}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });
      const getShaData = await getShaRes.json();
      const currentSha = getShaData.sha || fileSha;

      let currentGamesList = [...myGames];

      if (type === 'ADD') {
        setMessage({ text: `⏳ در حال افزودن "${game.name}"...`, isError: false });
        
        const cleanList = [game, ...currentGamesList];
        const res = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/data/games.json`, {
          method: 'PUT',
          headers: {
            'Authorization': `token ${githubToken}`,
            'Content-Type': 'application/json',
            'Accept': 'application/vnd.github.v3+json'
          },
          body: JSON.stringify({
            message: `Add ${game.name}`,
            content: safeBtoa(JSON.stringify(cleanList, null, 2)),
            sha: currentSha
          })
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
            headers: {
              'Authorization': `token ${githubToken}`,
              'Content-Type': 'application/json',
              'Accept': 'application/vnd.github.v3+json'
            },
            body: JSON.stringify({
              message: `CMS Manual Edit ${game.name}`,
              content: safeBtoa(JSON.stringify(currentGamesList, null, 2)),
              sha: currentSha
            })
          });

          if (res.status === 200 || res.status === 201) {
            const resData = await res.json();
            setFileSha(resData.content.sha);
            setMyGames([...currentGamesList]);
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
          headers: {
            'Authorization': `token ${githubToken}`,
            'Content-Type': 'application/json',
            'Accept': 'application/vnd.github.v3+json'
          },
          body: JSON.stringify({
            message: `Remove ${gameName}`,
            content: safeBtoa(JSON.stringify(updated, null, 2)),
            sha: currentSha
          })
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
      console.error("خطا در پردازش صف گیت‌هاب:", err);
      setMessage({ text: '❌ خطا در ارتباط با سرورهای گیت‌هاب.', isError: true });
    } finally {
      setQueue((prev) => prev.slice(1));
      setIsProcessingQueue(false);
    }
  }, [githubToken, myGames, fileSha, queue, isProcessingQueue]);

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

              {/* 🎯 تگ‌ها و فیلدهای جدید مربوط به صفحه اصلی */}
              <div className="p-4 bg-slate-950/80 border border-purple-900/40 rounded-xl grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-cyan-400 font-bold mb-1.5">💾 حجم دقیق بازی (Size GB):</label>
                  <input 
                    type="number" 
                    step="0.1"
                    value={editingGame.size_gb || ''} 
                    onChange={(e) => handleEditFieldChange('size_gb', parseFloat(e.target.value) || 0)} 
                    className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs outline-none text-left text-cyan-300 font-bold" 
                    placeholder="مثال: 45.5"
                    dir="ltr" 
                  />
                </div>

                <div>
                  <label className="block text-xs text-amber-400 font-bold mb-1.5">⚡ سطح سیستم مورد نیاز:</label>
                  <select 
                    value={editingGame.system_tier || 'normal'} 
                    onChange={(e) => handleEditFieldChange('system_tier', e.target.value)} 
                    className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs outline-none text-slate-200 font-bold"
                  >
                    <option value="light">⚡ سبک (Light Systems)</option>
                    <option value="normal">💻 معمولی (Normal Systems)</option>
                    <option value="heavy">🐘 سنگین (Heavy Systems)</option>
                  </select>
                </div>

                <div className="flex items-center gap-6 pt-5">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-rose-400">
                    <input 
                      type="checkbox" 
                      checked={!!editingGame.is_popular} 
                      onChange={(e) => handleEditFieldChange('is_popular', e.target.checked)} 
                      className="w-4 h-4 rounded accent-rose-500" 
                    />
                    🔥 پرطرفدار (Popular)
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-emerald-400">
                    <input 
                      type="checkbox" 
                      checked={!!editingGame.is_coop} 
                      onChange={(e) => handleEditFieldChange('is_coop', e.target.checked)} 
                      className="w-4 h-4 rounded accent-emerald-500" 
                    />
                    👥 کوآپ / چندنفره (Co-op)
                  </label>
                </div>
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
                <div>
                  <label className="block text-xs text-slate-400 font-bold mb-1.5">ناشر (Publisher):</label>
                  <input type="text" value={editingGame.publishers || ''} onChange={(e) => handleEditFieldChange('publishers', e.target.value)} className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs outline-none" placeholder="مثال: Sony Interactive" />
                </div>

                <div>
                  <label className="block text-xs text-slate-400 font-bold mb-1.5">تاریخ انتشار (Release Date):</label>
                  <input type="text" value={editingGame.released || ''} onChange={(e) => handleEditFieldChange('released', e.target.value)} className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs outline-none text-left" dir="ltr" placeholder="YYYY-MM-DD" />
                </div>

                <div className="md:col-span-3">
                  <label className="block text-xs text-slate-400 font-bold mb-1.5">لینک صفحه استیم (Steam URL):</label>
                  <input type="text" value={editingGame.steam_link || ''} onChange={(e) => handleEditFieldChange('steam_link', e.target.value)} className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs outline-none text-left text-blue-400 font-mono" dir="ltr" />
                </div>

                {/* 🎬 بخش تریلر و ویدیوهای یوتیوب */}
                <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-800/60 pt-4">
                  <div>
                    <label className="block text-xs text-purple-400 font-bold mb-1.5">🎥 لینک تریلر مستقیم (MP4):</label>
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
                    <label className="block text-xs text-red-400 font-bold mb-1.5">🔻 ویدیوهای یوتیوب (لینک‌ها را با اینتر جدا کنید):</label>
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

                {/* ⚙️ متون سیستم مورد نیاز */}
                <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-800/60 pt-4">
                  <div>
                    <label className="block text-xs text-red-400 font-bold mb-1.5">⚙️ حداقل سیستم مورد نیاز (Minimum):</label>
                    <textarea 
                      rows={5} 
                      value={editingGame.requirements?.minimum || ''} 
                      onChange={(e) => handleNestedRequirementChange('minimum', e.target.value)} 
                      className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs outline-none leading-6 text-slate-300 text-left font-mono" 
                      dir="ltr"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-green-400 font-bold mb-1.5">⚙️ سیستم پیشنهادی (Recommended):</label>
                    <textarea 
                      rows={5} 
                      value={editingGame.requirements?.recommended || ''} 
                      onChange={(e) => handleNestedRequirementChange('recommended', e.target.value)} 
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

              {/* 📸 گالری عکس */}
              <div className="border-t border-slate-800 pt-4">
                <label className="block text-xs text-purple-400 font-bold mb-3">📸 مدیریت گالری تصاویر (کلیک روی ✕ جهت حذف):</label>
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
                    <p className="text-xs text-slate-500 col-span-full">عکسی در گالری ثبت نشده است.</p>
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

          {/* 🎴 نمایش لیست کارت‌های بازی */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayedGames.map((game) => {
              const isAlreadyAdded = myGames.some((g) => g.id === game.id);
              const isTaskInQueue = queue.some((q) => q.game?.id === game.id || q.gameId === game.id);
              
              return (
                <div key={game.id} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex flex-col justify-between shadow-lg relative">
                  
                  {/* نمایش تگ‌های سریع روی کارت ادمین جهت تایید */}
                  <div className="absolute top-2 left-2 z-10 flex flex-wrap gap-1">
                    {game.size_gb && (
                      <span className="bg-cyan-950/90 text-cyan-300 border border-cyan-800 px-2 py-0.5 rounded-md text-[10px] font-bold">
                        💾 {game.size_gb} GB
                      </span>
                    )}
                    {game.is_popular && (
                      <span className="bg-rose-950/90 text-rose-300 border border-rose-800 px-2 py-0.5 rounded-md text-[10px] font-bold">
                        🔥 Popular
                      </span>
                    )}
                    {game.is_coop && (
                      <span className="bg-emerald-950/90 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded-md text-[10px] font-bold">
                        👥 Co-op
                      </span>
                    )}
                  </div>

                  <img 
                    src={getOptimizedUrl(game.background_image, 400)} 
                    alt={game.name} 
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = `https://rawg-proxy.hossein-hf273.workers.dev/?url=${encodeURIComponent(game.background_image)}`;
                    }}
                    className="w-full h-40 object-cover opacity-90" 
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
                        <button onClick={() => handleEditGame(game)} className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-xl text-[11px] transition font-bold">✏️ ویرایش کامل اطلاعات و تگ‌ها</button>
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
