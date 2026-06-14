'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function AdminPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusText, setStatusText] = useState('🟢 سیستم آماده جستجو است.');

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setStatusText('⚠️ لطفا نام بازی را بنویسید.');
      return;
    }

    setLoading(true);
    setSearchResults([]);
    setStatusText('🔍 در حال ارتباط مستقیم با بانک اطلاعاتی RAWG...');

    try {
      const apiKey = '8ceb3ebba03c4ddca51106af23868263';
      const response = await fetch(`https://api.rawg.io/api/games?key=${apiKey}&search=${encodeURIComponent(searchQuery.trim())}`);
      
      if (!response.ok) {
        throw new Error(`خطای سایت مرجع: ${response.status}`);
      }

      const data = await response.json();
      
      if (data && data.results) {
        setSearchResults(data.results);
        setStatusText(`✅ یافت شد! تعداد ${data.results.length} بازی لود شد.`);
      } else {
        setStatusText('❌ دیتایی یافت نشد یا فرمت پاسخ تغییر کرده است.');
      }
    } catch (error: any) {
      setStatusText(`❌ خطا در اتصال: ${error.message || 'مشکل شبکه یا مسدود بودن دسترسی'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAddGame = async (game: any) => {
    setStatusText(`⏳ در حال ارسال بازی "${game.name}" به دیتابیس اصلی سایت...`);
    try {
      const response = await fetch('/api/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: game.id.toString(),
          name: game.name,
          background_image: game.background_image || '',
          rating: game.rating || 0,
          released: game.released || '---',
          playtime: game.playtime || 0,
          genres: game.genres || [],
          platforms: game.platforms || [],
          short_screenshots: game.short_screenshots || []
        })
      });

      const result = await response.json();
      if (response.ok) {
        alert(`✅ بازی "${game.name}" با موفقیت ذخیره شد و به صفحه اصلی رفت!`);
        setStatusText('✅ ذخیره‌سازی موفقیت‌آمیز بود.');
      } else {
        alert(`❌ خطا: ${result.error}`);
        setStatusText(`❌ خطا در ذخیره: ${result.error}`);
      }
    } catch (err) {
      alert('❌ خطا در شبکه یا دیتابیس کلودفلر');
      setStatusText('❌ خطا در برقراری ارتباط با سرور سایت خودتان.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4 md:p-8" dir="rtl">
      <div className="max-w-2xl mx-auto bg-gray-900 rounded-2xl p-6 border border-gray-800 shadow-2xl">
        
        <div className="flex justify-between items-center mb-6 border-b border-gray-800 pb-4">
          <h1 className="text-lg font-bold text-blue-500">🛠️ منوی مدیریت و کنترل بازی‌ها</h1>
          <Link href="/" className="bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-xl text-xs border border-gray-700 transition">
            بازگشت به سایت اصلی
          </Link>
        </div>

        <div className="flex gap-2 mb-4">
          <input 
            type="text" 
            placeholder="نام بازی را انگلیسی بنویسید (مثال: GTA V)" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="flex-1 bg-gray-950 text-white px-4 py-3 rounded-xl border border-gray-800 focus:outline-none focus:border-blue-500 text-left text-sm"
            dir="ltr"
          />
          <button 
            onClick={handleSearch} 
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 px-6 py-3 rounded-xl font-bold text-sm transition"
          >
            {loading ? 'صبر کنید...' : 'جستجوی هوشمند'}
          </button>
        </div>

        {/* جعبه گزارش زنده وضعیت */}
        <div className="mb-6 p-3 rounded-xl bg-gray-950 border border-gray-800 text-xs text-gray-400 font-mono text-right">
          {statusText}
        </div>

        {searchResults.length > 0 && (
          <div className="space-y-2 max-h-96 overflow-y-auto bg-gray-950 p-2 rounded-xl border border-gray-800">
            {searchResults.map((game) => (
              <div key={game.id} className="flex items-center justify-between bg-gray-900 p-3 rounded-lg border border-gray-800">
                <div className="flex items-center gap-3">
                  {game.background_image && (
                    <img src={game.background_image} alt="" className="w-10 h-10 object-cover rounded" />
                  )}
                  <span className="text-sm font-medium text-gray-200">{game.name}</span>
                </div>
                <button 
                  onClick={() => handleAddGame(game)}
                  className="bg-green-600 hover:bg-green-700 text-xs px-3 py-2 rounded-lg transition"
                >
                  ➕ اضافه کردن به سایت
                </button>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
