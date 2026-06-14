'use client';

import { useState } from 'react';
import Link from 'next/link';

interface Game {
  id: any;
  name: string;
  background_image: string;
  rating: number;
  released: string;
  playtime: number;
  genres: { name: string }[];
  platforms?: { platform: { name: string }; requirements_en?: { minimum?: string; recommended?: string } | null }[];
  short_screenshots?: { id: number; image: string }[];
}

const API_KEY = '8ceb3ebba03c4ddca51106af23868263';

export default function AdminPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Game[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<any>(null);
  const [debugMessage, setDebugMessage] = useState<string>(''); // نمایش خطاها روی صفحه

  const searchGames = async () => {
    if (!searchQuery.trim()) {
      setDebugMessage('⚠️ لطفاً ابتدا نام بازی را وارد کنید.');
      return;
    }
    
    setLoading(true);
    setSearchResults([]);
    setDebugMessage('🔍 در حال ارسال درخواست مستقیم به سرور مرجع (RAWG)...');
    
    try {
      const url = `https://api.rawg.io/api/games?key=${API_KEY}&search=${encodeURIComponent(searchQuery.trim())}`;
      
      const res = await fetch(url);
      
      if (!res.ok) {
        throw new Error(`پاسخ ناموفق سرور RAWG با کد خطا: ${res.status}`);
      }
      
      const data = await res.json();
      
      if (data && Array.isArray(data.results)) {
        setSearchResults(data.results);
        if (data.results.length === 0) {
          setDebugMessage('❌ جستجو موفق بود اما هیچ بازی‌ای با این نام پیدا نشد.');
        } else {
          setDebugMessage(`✅ تعداد ${data.results.length} بازی با موفقیت یافت شد.`);
        }
      } else {
        throw new Error('فرمت دیتای دریافتی از RAWG ساختار آرایه‌ای ندارد.');
      }
      
    } catch (err: any) {
      // چاپ مستقیم خطا روی صفحه برای ادمین
      setDebugMessage(`❌ خطای جاوااسکریپت: ${err.message || 'ارور ناشناخته'}`);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const addGameToSite = async (game: Game) => {
    setSavingId(game.id);
    try {
      const optimizedGame = {
        id: game.id.toString(),
        name: game.name,
        background_image: game.background_image || 'https://placehold.co/600x400?text=No+Image',
        rating: game.rating || 0,
        released: game.released || '---',
        playtime: game.playtime || 0,
        genres: game.genres ? game.genres.map(g => ({ name: g.name })) : [],
        platforms: game.platforms ? game.platforms.map(p => ({
          platform: { name: p.platform.name },
          requirements_en: p.requirements_en ? {
            minimum: p.requirements_en.minimum || '',
            recommended: p.requirements_en.recommended || ''
          } : null
        })) : [],
        short_screenshots: game.short_screenshots ? game.short_screenshots.map(s => ({ id: s.id, image: s.image })) : []
      };

      const res = await fetch('/api/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(optimizedGame)
      });
      
      const result = await res.json();
      
      if (res.ok) {
        alert(`✅ بازی "${game.name}" با موفقیت به سرور اصلی اضافه شد!`);
      } else {
        alert(`❌ خطا در ذخیره دیتابیس: ${result.error || 'خطای ناشناخته'}`);
      }
    } catch (err) {
      alert('❌ خطا در برقراری ارتباط با دیتابیس کلودفلر');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4 md:p-8" dir="rtl">
      <div className="max-w-2xl mx-auto bg-gray-900 rounded-2xl p-6 shadow-2xl border border-gray-800">
        <div className="flex justify-between items-center mb-6 border-b border-gray-800 pb-4">
          <h1 className="text-xl font-bold text-blue-500">🛠️ مدیریت ابری مخفی بازی‌ها</h1>
          <Link href="/" className="bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-xl text-xs transition border border-gray-700">
            مشاهده سایت اصلی
          </Link>
        </div>

        <div className="flex gap-2 mb-4">
          <input 
            type="text" 
            placeholder="نام بازی را انگلیسی بنویسید (مثلا: Cyberpunk 2077)" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && searchGames()}
            className="flex-1 bg-gray-950 text-white px-4 py-3 rounded-xl border border-gray-800 focus:outline-none focus:border-blue-500 text-left text-sm"
            dir="ltr"
          />
          <button 
            onClick={searchGames} 
            disabled={loading} 
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 px-6 py-3 rounded-xl font-bold transition text-sm"
          >
            {loading ? 'در حال سرچ...' : 'جستجوی مستقیم'}
          </button>
        </div>

        {/* بخش نمایش گزارش زنده وضعیت سرچ */}
        {debugMessage && (
          <div className="mb-4 p-3 rounded-xl bg-gray-950 border border-gray-800 text-xs text-gray-300 text-right font-mono">
            {debugMessage}
          </div>
        )}

        {searchResults.length > 0 && (
          <div className="grid grid-cols-1 gap-3 bg-gray-950 p-3 rounded-xl max-h-96 overflow-y-auto border border-gray-800">
            {searchResults.map(game => (
              <div key={game.id} className="flex items-center justify-between bg-gray-900 p-3 rounded-lg border border-gray-800">
                <div className="flex items-center gap-3">
                  <img src={game.background_image} alt={game.name} className="w-12 h-12 object-cover rounded-lg" />
                  <span className="text-sm font-semibold text-gray-200">{game.name}</span>
                </div>
                <button 
                  disabled={savingId !== null}
                  onClick={() => addGameToSite(game)} 
                  className="bg-green-600 hover:bg-green-700 text-xs px-3 py-1.5 rounded-lg font-medium transition disabled:bg-gray-600"
                >
                  {savingId === game.id ? 'در حال ذخیره روی ابر...' : '➕ اضافه به دیتابیس اصلی'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
