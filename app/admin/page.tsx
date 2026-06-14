'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function AdminPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('سیستم آماده کار است.');

  // اتصال دکمه سرچ مستقیم به RAWG
  const startSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setMsg('در حال دریافت دیتای زنده از RAWG...');
    
    try {
      const apiKey = '8ceb3ebba03c4ddca51106af23868263';
      const res = await fetch(`https://api.rawg.io/api/games?key=${apiKey}&search=${encodeURIComponent(query.trim())}`);
      const data = await res.json();
      
      if (data && data.results) {
        setResults(data.results);
        setMsg(`موفقیت‌آمیز: ${data.results.length} بازی پیدا شد.`);
      } else {
        setMsg('پاسخی از سرور دریافت نشد.');
      }
    } catch (e: any) {
      setMsg('خطا در اتصال مستقیم: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  // ذخیره بازی در دیتابیس کلودفلر
  const saveGame = async (game: any) => {
    setMsg(`در حال ذخیره ${game.name}...`);
    try {
      const res = await fetch('/api/games', {
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
      
      if (res.ok) {
        alert(`✅ بازی "${game.name}" با موفقیت به صفحه اصلی سایتت اضافه شد!`);
        setMsg('ذخیره شد.');
      } else {
        const err = await res.json();
        alert(`❌ خطا: ${err.error}`);
      }
    } catch (err) {
      alert('خطا در شبکه');
    }
  };

  return (
    <div style={{ backgroundColor: '#030712', color: '#fff', minHeight: '100vh', padding: '20px', fontFamily: 'sans-serif', direction: 'rtl' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto', backgroundColor: '#111827', padding: '20px', borderRadius: '15px', border: '1px solid #1f2937' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', alignItems: 'center' }}>
          <h2 style={{ color: '#3b82f6', margin: 0 }}>🛠️ پنل مدیریت مخفی بازی‌ها</h2>
          <Link href="/" style={{ color: '#9ca3af', textDecoration: 'none', fontSize: '14px', border: '1px solid #374151', padding: '5px 10px', borderRadius: '8px' }}>
            مشاهده سایت اصلی
          </Link>
        </div>

        <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
          <input 
            type="text" 
            placeholder="نام بازی به انگلیسی..." 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && startSearch()}
            style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '1px solid #374151', backgroundColor: '#030712', color: '#fff', direction: 'ltr' }}
          />
          <button 
            onClick={startSearch}
            style={{ padding: '12px 20px', borderRadius: '10px', border: 'none', backgroundColor: '#2563eb', color: '#fff', cursor: 'pointer', fontWeight: 'bold' }}
          >
            {loading ? 'صبر کنید...' : 'جستجو'}
          </button>
        </div>

        <div style={{ padding: '10px', backgroundColor: '#030712', borderRadius: '8px', fontSize: '13px', color: '#9ca3af', marginBottom: '15px' }}>
          وضعیت سیستم: {msg}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {results.map((game) => (
            <div key={game.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px', backgroundColor: '#1f2937', borderRadius: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {game.background_image && (
                  <img 
                    src={game.background_image} 
                    alt="" 
                    style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '5px' }} 
                  />
                )}
                <span style={{ fontSize: '14px' }}>{game.name}</span>
              </div>
              <button 
                onClick={() => saveGame(game)}
                style={{ backgroundColor: '#16a34a', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}
              >
                ➕ اضافه به سایت
              </button>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
