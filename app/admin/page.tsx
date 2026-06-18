'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface QueueItem {
  id: string;
  timestamp: number;
  gameData: any;
  status: 'pending' | 'processing' | 'success' | 'failed';
  error?: string;
}

export default function AdminPanel() {
  const [rawgUrl, setRawgUrl] = useState('');
  const [fetchingRawg, setFetchingRawg] = useState(false);
  const [ghToken, setGhToken] = useState('');
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [isProcessingQueue, setIsProcessingQueue] = useState(false);
  
  // فیلدهای اصلی فرم بازی
  const [id, setId] = useState('');
  const [name, setName] = useState('');
  const [released, setReleased] = useState('');
  const [rating, setRating] = useState('');
  const [esrb, setEsrb] = useState('---');
  const [developers, setDevelopers] = useState('');
  const [playtime, setPlaytime] = useState('');
  const [bgImage, setBgImage] = useState('');
  const [steamLink, setSteamLink] = useState('');
  const [trailerUrl, setTrailerUrl] = useState('');
  const [descFa, setDescFa] = useState('');
  const [descEn, setDescEn] = useState('');
  const [genres, setGenres] = useState('');
  const [gallery, setGallery] = useState<string[]>(Array(10).fill(''));
  const [reqMin, setReqMin] = useState('');
  const [reqRec, setReqRec] = useState('');

  useEffect(() => {
    const savedToken = localStorage.getItem('gh_token') || '';
    setGhToken(savedToken);
    loadQueue();
  }, []);

  const loadQueue = () => {
    const savedQueue = JSON.parse(localStorage.getItem('game_commit_queue') || '[]');
    setQueue(savedQueue);
  };

  const saveToken = (token: string) => {
    setGhToken(token);
    localStorage.setItem('gh_token', token);
  };

  // واکشی خودکار اطلاعات بازی از API عمومی RAWG و استخراج هوشمند دیتای استیم و تصاویر
  const handleFetchRawg = async () => {
    if (!rawgUrl.trim()) return alert('لطفاً آدرس بازی از سایت RAWG را وارد کنید.');
    
    const match = rawgUrl.match(/games\/([^/?]+)/);
    if (!match) return alert('آدرس وارد شده معتبر نیست. باید ساختاری شبیه به rawg.io/games/name داشته باشد.');
    
    const slug = match[1];
    setFetchingRawg(true);
    
    try {
      // استفاده از دیتای خام عمومی بدون نیاز به API Key اختصاصی در فرانت‌اند
      const res = await fetch(`https://api.rawg.io/api/games/${slug}?key=c53796a7c36a4341aeb3212cbbd85918`);
      if (!res.ok) throw new Error('بازی در دیتابیس RAWG یافت نشد.');
      const data = await res.json();
      
      setId(data.id?.toString() || Date.now().toString());
      setName(data.name || '');
      setReleased(data.released || '');
      setRating(data.rating?.toString() || '');
      setEsrb(data.esrb_rating?.name || '---');
      setPlaytime(data.playtime?.toString() || '');
      setBgImage(data.background_image || '');
      setDescEn(data.description_raw || '');
      setDevelopers(data.developers?.map((d: any) => d.name).join(', ') || '');
      setGenres(data.genres?.map((g: any) => g.name).join(', ') || '');
      
      // استخراج صددرصد دقیق AppID استیم مستقیماً از پلتفرم‌های دیتای بازی در RAWG
      const steamPlatform = data.platforms?.find((p: any) => p.platform?.slug === 'pc');
      if (data.stores) {
        const steamStore = data.stores.find((s: any) => s.store?.slug === 'steam');
        if (steamStore && steamStore.url) {
          const appIdMatch = steamStore.url.match(/app\/(\d+)/);
          if (appIdMatch) setSteamLink(`https://store.steampowered.com/app/${appIdMatch[1]}`);
        }
      }

      // دریافت تریلر رسمی در صورت وجود
      if (data.clip?.clips?.max) {
        setTrailerUrl(data.clip.clips.max);
      }

      // دریافت تصاویر گالری فرعی (تا ۱۰ عکس)
      const screenshotsRes = await fetch(`https://api.rawg.io/api/games/${slug}/screenshots?key=c53796a7c36a4341aeb3212cbbd85918`);
      if (screenshotsRes.ok) {
        const scrData = await screenshotsRes.json();
        const scrUrls = scrData.results?.map((r: any) => r.image) || [];
        const newGallery = [...Array(10)].map((_, i) => scrUrls[i] || '');
        setGallery(newGallery);
      }
      
      alert('اطلاعات اولیه بازی با موفقیت از RAWG استخراج شد! فیلدها را بازبینی و کامل کنید.');
    } catch (err: any) {
      alert(err.message || 'خطا در برقراری ارتباط با سرور دیتابیس');
    } finally {
      setFetchingRawg(false);
    }
  };

  const handleGalleryChange = (index: number, value: string) => {
    const updated = [...gallery];
    updated[index] = value;
    setGallery(updated);
  };

  // اضافه کردن کار جاری به صف محلی داخل localStorage جهت تضمین عدم تداخل مخزن گیت‌هاب
  const handleAddToQueue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !name) return alert('شناسه بازی و نام بازی الزامی هستند.');
    if (!ghToken) return alert('لطفاً قبل از ارسال، توکن دسترسی گیت‌هاب خود را تنظیم کنید.');

    const formattedGenres = genres.split(',').map(g => ({ name: g.trim() })).filter(g => g.name);

    const gameData = {
      id: parseInt(id),
      name,
      released,
      rating,
      esrb_rating: esrb,
      developers,
      playtime,
      background_image: bgImage,
      steam_link: steamLink || '#',
      trailer_url: trailerUrl,
      description_fa: descFa,
      description_en: descEn,
      genres: formattedGenres,
      gallery: gallery.filter(url => url.trim() !== ''),
      requirements: {
        minimum: reqMin,
        recommended: reqRec
      }
    };

    const newQueueItem: QueueItem = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      gameData,
      status: 'pending'
    };

    const currentQueue = JSON.parse(localStorage.getItem('game_commit_queue') || '[]');
    currentQueue.push(newQueueItem);
    localStorage.setItem('game_commit_queue', JSON.stringify(currentQueue));
    setQueue(currentQueue);

    // ریست کردن فرم بعد از قرارگیری موفق در صف
    setId(''); setName(''); setReleased(''); setRating(''); setBgImage('');
    setSteamLink(''); setTrailerUrl(''); setDescFa(''); setDescEn('');
    setGenres(''); setDevelopers(''); setReqMin(''); setReqRec('');
    setGallery(Array(10).fill(''));

    triggerQueueProcessor();
  };

  // پردازشگر ترتیبی و گام‌به‌گام صف برای مدیریت کامیت‌ها بدون خطا و مسابقه کانفلیکت (Race Conditions)
  const triggerQueueProcessor = async () => {
    if (isProcessingQueue) return;
    setIsProcessingQueue(true);

    const currentToken = localStorage.getItem('gh_token');
    if (!currentToken) {
      setIsProcessingQueue(false);
      return;
    }

    let localQueue: QueueItem[] = JSON.parse(localStorage.getItem('game_commit_queue') || '[]');
    
    while (localQueue.some(item => item.status === 'pending')) {
      const nextIndex = localQueue.findIndex(item => item.status === 'pending');
      if (nextIndex === -1) break;

      localQueue[nextIndex].status = 'processing';
      localStorage.setItem('game_commit_queue', JSON.stringify(localQueue));
      setQueue([...localQueue]);

      const activeItem = localQueue[nextIndex];

      try {
        const repoOwner = "mygarchive";
        const repoName = "mygarchive.github.io";
        const filePath = "data/games.json";
        const url = `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${filePath}`;

        // مرحله ۱: دریافت آخرین نسخه فایل همراه با SHA معتبر برای تایید هویت گیت
        const getRes = await fetch(url, {
          headers: { 'Authorization': `token ${currentToken}` },
          cache: 'no-store'
        });

        let currentData: any[] = [];
        let sha = "";

        if (getRes.ok) {
          const fileInfo = await getRes.json();
          sha = fileInfo.sha;
          const decodedContent = decodeURIComponent(atob(fileInfo.content).split('').map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
          currentData = JSON.parse(decodedContent);
        }

        // مرحله ۲: ادغام داده جدید یا ویرایش داده قدیمی درون آرایه اصلی دیتابیس
        const existingIdx = currentData.findIndex((g: any) => g.id === activeItem.gameData.id);
        if (existingIdx !== -1) {
          currentData[existingIdx] = activeItem.gameData;
        } else {
          currentData.push(activeItem.gameData);
        }

        // مرحله ۳: تبدیل به فرمت انکود ایمن Base64 UTF-8 بدون به هم ریختگی کاراکترهای فارسی
        const finalJsonString = JSON.stringify(currentData, null, 2);
        const encodedContent = btoa(encodeURIComponent(finalJsonString).replace(/%([0-9A-F]{2})/g, (_, p1) => String.fromCharCode(parseInt(p1, 16))));

        // مرحله ۴: کامیت امن نهایی به سمت گیت‌هاب API
        const putRes = await fetch(url, {
          method: 'PUT',
          headers: {
            'Authorization': `token ${currentToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            message: `📦 ادمین‌پنل: ثبت/بروزرسانی خودکار بازی ${activeItem.gameData.name}`,
            content: encodedContent,
            sha: sha || undefined
          })
        });

        if (!putRes.ok) throw new Error(`پاسخ ناموفق سرور گیت‌هاب: ${putRes.status}`);

        localQueue[nextIndex].status = 'success';
      } catch (err: any) {
        console.error(err);
        localQueue[nextIndex].status = 'failed';
        localQueue[nextIndex].error = err.message || 'خطای شبکه ناشناخته';
      }

      localStorage.setItem('game_commit_queue', JSON.stringify(localQueue));
      setQueue([...localQueue]);
      // یک مکث کوتاه نیم‌ثانیه‌ای برای همگام‌سازی کلاک سرورهای گیت‌هاب
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    setIsProcessingQueue(false);
  };

  const clearQueueHistory = () => {
    const activeQueue = queue.filter(item => item.status === 'pending' || item.status === 'processing');
    localStorage.setItem('game_commit_queue', JSON.stringify(activeQueue));
    setQueue(activeQueue);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 font-sans flex flex-col items-center" dir="rtl">
      <div className="w-full max-w-5xl space-y-6">
        
        <header className="flex justify-between items-center bg-slate-900 p-5 rounded-2xl border border-slate-800">
          <div>
            <h1 className="text-xl font-black text-purple-400">⚙️ اتاق فرمان و کنترل آرشیو</h1>
            <p className="text-xs text-slate-400 mt-1">مدیریت دیتابیس هوشمند بازی‌ها و صف ارسال کامیت‌های گیت‌هاب</p>
          </div>
          <Link href="/" className="text-xs px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl transition border border-slate-700">
            ➔ بازگشت به آرشیو اصلی
          </Link>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            
            {/* بخش اسکراپر سریع داده‌ها از سایت RAWG */}
            <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-3">
              <h3 className="text-sm font-bold text-slate-200">🔍 دریافت هوشمند اطلاعات از سیستم مرجع RAWG</h3>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={rawgUrl}
                  onChange={(e) => setRawgUrl(e.target.value)}
                  placeholder="https://rawg.io/games/cyberpunk-2077" 
                  className="flex-1 p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono outline-none text-left" 
                  dir="ltr"
                />
                <button 
                  onClick={handleFetchRawg}
                  disabled={fetchingRawg}
                  className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 text-white rounded-xl text-xs font-bold transition whitespace-nowrap animate-none"
                >
                  {fetchingRawg ? 'در حال استخراج...' : '🚀 استخراج سریع'}
                </button>
              </div>
            </div>

            {/* فرم جامع ورود یا ویرایش اطلاعات آرشیو */}
            <form onSubmit={handleAddToQueue} className="bg-slate-900 p-6 rounded-2xl border border-slate-800 space-y-5">
              <h3 className="text-sm font-bold text-purple-400 pb-2 border-b border-slate-800">📝 فیلدهای اطلاعاتی شناسنامه بازی</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div className="space-y-1.5">
                  <label className="text-slate-400 font-bold">🆔 شناسه بازی (RAWG ID / عددی):</label>
                  <input type="number" value={id} onChange={(e) => setId(e.target.value)} required className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 outline-none text-center font-mono text-purple-400 font-bold" />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-slate-400 font-bold">🎮 نام کامل بازی (انگلیسی):</label>
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)} required className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 outline-none text-left font-mono font-bold" dir="ltr" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
                <div className="space-y-1.5">
                  <label className="text-slate-400 font-bold">🗓️ تاریخ انتشار:</label>
                  <input type="text" value={released} onChange={(e) => setReleased(e.target.value)} placeholder="YYYY-MM-DD" className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 outline-none text-center font-mono" dir="ltr" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-slate-400 font-bold">⭐ امتیاز منتقدین:</label>
                  <input type="text" value={rating} onChange={(e) => setRating(e.target.value)} placeholder="4.5" className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 outline-none text-center font-mono" dir="ltr" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-slate-400 font-bold">🔞 رده سنی (ESRB):</label>
                  <input type="text" value={esrb} onChange={(e) => setEsrb(e.target.value)} placeholder="Mature" className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 outline-none text-center font-mono" dir="ltr" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-slate-400 font-bold">⏱️ زمان اتمام (ساعت):</label>
                  <input type="number" value={playtime} onChange={(e) => setPlaytime(e.target.value)} placeholder="45" className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 outline-none text-center font-mono" dir="ltr" />
                </div>
              </div>

              <div className="space-y-1.5 text-xs">
                <label className="text-slate-400 font-bold">🏢 سازنده / ناشر بازی:</label>
                <input type="text" value={developers} onChange={(e) => setDevelopers(e.target.value)} placeholder="CD Projekt Red" className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 outline-none text-left" dir="ltr" />
              </div>

              <div className="space-y-1.5 text-xs">
                <label className="text-slate-400 font-bold">👁️ سبک‌ها (ژانرها - با کاما جدا کنید):</label>
                <input type="text" value={genres} onChange={(e) => setGenres(e.target.value)} placeholder="Action, RPG, Open World" className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 outline-none text-left" dir="ltr" />
              </div>

              <div className="space-y-1.5 text-xs">
                <label className="text-slate-400 font-bold">🖼️ لینک تصویر پس‌زمینه اصلی (Background Image URL):</label>
                <input type="text" value={bgImage} onChange={(e) => setBgImage(e.target.value)} className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 outline-none text-left font-mono text-[11px]" dir="ltr" />
              </div>

              <div className="space-y-1.5 text-xs">
                <label className="text-slate-400 font-bold">🎮 لینک مستقیم استیم (یا آدرس خام حاوی AppID):</label>
                <input type="text" value={steamLink} onChange={(e) => setSteamLink(e.target.value)} placeholder="https://store.steampowered.com/app/1091500" className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 outline-none text-left font-mono text-[11px]" dir="ltr" />
              </div>

              <div className="space-y-1.5 text-xs">
                <label className="text-slate-400 font-bold">🎬 آدرس ویدیو تریلر یوتیوب (YouTube Trailer URL):</label>
                <input type="text" value={trailerUrl} onChange={(e) => setTrailerUrl(e.target.value)} placeholder="https://www.youtube.com/watch?v=..." className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 outline-none text-left font-mono text-[11px]" dir="ltr" />
              </div>

              <div className="space-y-1.5 text-xs">
                <label className="text-slate-400 font-bold">✍️ توضیحات اختصاصی بازی به زبان فارسی:</label>
                <textarea value={descFa} onChange={(e) => setDescFa(e.target.value)} rows={4} className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 outline-none text-justify leading-7" />
              </div>

              <div className="space-y-1.5 text-xs" dir="ltr">
                <label className="text-slate-400 font-bold block text-right">📄 Original English Description:</label>
                <textarea value={descEn} onChange={(e) => setDescEn(e.target.value)} rows={4} className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 outline-none text-left font-serif leading-6" />
              </div>

              {/* فیلد داینامیک گالری تصاویر مجلل تا حداکثر ۱۰ عکس بر اساس استانداردهای فرانت */}
              <div className="space-y-2 text-xs">
                <label className="text-slate-400 font-bold block">📸 گالری تصاویر فرعی بازی (حداکثر ۱۰ اسکرین‌شات):</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {gallery.map((url, idx) => (
                    <input 
                      key={idx}
                      type="text"
                      value={url}
                      onChange={(e) => handleGalleryChange(idx, e.target.value)}
                      placeholder={`آدرس تصویر شماره ${idx + 1}`}
                      className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 font-mono text-[10px]"
                      dir="ltr"
                    />
                  ))}
                </div>
              </div>

              {/* مشخصات سخت افزاری سیستم مورد نیاز */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="space-y-1.5">
                  <label className="text-red-400 font-bold">⚠️ حداقل سیستم مورد نیاز (Minimum Requirements):</label>
                  <textarea value={reqMin} onChange={(e) => setReqMin(e.target.value)} rows={5} placeholder="OS: Windows 10&#10;Processor: Core i5&#10;Memory: 8 GB RAM&#10;Graphics: GTX 1060" className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 outline-none font-mono text-left" dir="ltr" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-green-400 font-bold">✅ سیستم پیشنهادی (Recommended Requirements):</label>
                  <textarea value={reqRec} onChange={(e) => setReqRec(e.target.value)} rows={5} placeholder="OS: Windows 11&#10;Processor: Core i7&#10;Memory: 16 GB RAM&#10;Graphics: RTX 3070" className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 outline-none font-mono text-left" dir="ltr" />
                </div>
              </div>

              <button 
                type="submit"
                className="w-full py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl font-black text-sm transition shadow-xl shadow-purple-900/30"
              >
                📥 ثبت در صف انتظار و ارسال هوشمند به گیت‌هاب
              </button>
            </form>
          </div>

          {/* سایدبار سمت راست: تنظیمات امنیتی توکن و نمایش مانیتورینگ صف لوکال استوریج */}
          <div className="space-y-6">
            
            <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-3 text-xs">
              <h3 className="font-bold text-slate-200">🔐 کلید دسترسی مخزن (GitHub Private Token)</h3>
              <input 
                type="password" 
                value={ghToken}
                onChange={(e) => saveToken(e.target.value)}
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxx" 
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 font-mono text-center tracking-widest outline-none" 
                dir="ltr"
              />
              <p className="text-[10px] text-slate-500 leading-5">توکن شما به صورت کاملاً امن و محلی تنها در مرورگر خودتان (localStorage) ذخیره شده و مستقیماً به سرورهای رسمی گیت‌هاب فرستاده می‌شود.</p>
            </div>

            <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-4 text-xs">
              <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                <h3 className="font-bold text-purple-400">📊 مانیتورینگ وضعیت صف کامیت‌ها</h3>
                {queue.length > 0 && (
                  <button onClick={clearQueueHistory} className="text-[10px] text-red-400 hover:underline">پاکسازی تاریخچه</button>
                )}
              </div>

              {queue.length === 0 ? (
                <div className="text-center py-6 text-slate-500">صف انتظار در حال حاضر خالی است.</div>
              ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                  {queue.map((item) => (
                    <div key={item.id} className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                      <div className="flex justify-between items-center font-bold">
                        <span className="truncate max-w-[120px]" dir="ltr">{item.gameData.name}</span>
                        {item.status === 'pending' && <span className="text-amber-500 text-[10px] bg-amber-500/10 px-2 py-0.5 rounded">در صف انتظار</span>}
                        {item.status === 'processing' && <span className="text-sky-400 text-[10px] bg-sky-400/10 px-2 py-0.5 rounded animate-pulse">در حال کامیت...</span>}
                        {item.status === 'success' && <span className="text-green-500 text-[10px] bg-green-500/10 px-2 py-0.5 rounded">✓ با موفقیت ثبت شد</span>}
                        {item.status === 'failed' && <span className="text-red-500 text-[10px] bg-red-500/10 px-2 py-0.5 rounded">❌ خطا در ارسال</span>}
                      </div>
                      <div className="text-[9px] text-slate-500 font-mono text-left">ID: {item.gameData.id}</div>
                      {item.error && <div className="text-[9px] text-red-400 bg-red-950/30 p-1.5 rounded border border-red-900/40 mt-1" dir="ltr">{item.error}</div>}
                    </div>
                  ))}
                </div>
              )}

              {isProcessingQueue && (
                <div className="p-2.5 bg-purple-950/40 border border-purple-800/60 rounded-xl text-center text-purple-400 font-bold animate-pulse text-[11px]">
                  ⚙️ پردازشگر صف فعال است؛ لطفاً تب مرورگر را نبندید.
                </div>
              )}
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
