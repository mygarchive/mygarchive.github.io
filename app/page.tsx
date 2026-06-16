'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function Home() {
  const [games, setGames] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetch('https://api.github.com/repos/mygarchive/mygarchive.github.io/contents/data/games.json?v=' + Date.now())
      .then((res) => res.json())
      .then((repoData) => {
        if (repoData && repoData.content) {
          const content = decodeURIComponent(atob(repoData.content).split('').map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
          const data = JSON.parse(content);
          if (Array.isArray(data)) {
            const sorted = data.sort((a, b) => a.name.localeCompare(b.name));
            setGames(sorted);
          }
        }
      })
      .catch((err) => console.error('Error loading games:', err));
  }, []);

  const filteredGames = games.filter((game) =>
    game.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getOptimizedUrl = (url: string, width = 300) => {
    if (!url) return '';
    const cleanUrl = url.replace(/^https?:\/\//i, '');
    return `https://images.weserv.nl/?url=${encodeURIComponent(cleanUrl)}&w=${width}&q=75`;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-12" dir="rtl">
      <div className="max-w-6xl mx-auto">
        <header className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-12 border-b border-slate-900 pb-6">
          <div>
            <h1 className="text-3xl font-black text-white">آرشیو تخصصی بازی‌ها</h1>
            <p className="text-xs text-slate-400 mt-1">تعداد بازی‌های موجود در سایت: <span className="text-purple-400 font-bold">{games.length}</span> بازی</p>
          </div>
          <a 
            href="https://t.me/mygarchive" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="flex items-center gap-2 px-4 py-2 bg-blue-950/50 border border-blue-900/60 rounded-xl text-xs text-blue-400 hover:bg-blue-600 hover:text-white transition"
          >
            ✈️ کانال تلگرام ما: @mygarchive
          </a>
        </header>

        <div className="bg-slate-900/40 border border-slate-900 p-4 rounded-2xl mb-8">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="جستجو در بین بازی‌های آرشیو (به انگلیسی)..."
            className="w-full p-3.5 bg-slate-950 border border-slate-800 rounded-xl text-sm outline-none focus:border-purple-500 transition text-left"
            dir="ltr"
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
          {filteredGames.map((game) => (
            <Link key={game.id} href={`/game/?id=${game.id}`} className="group">
              <div className="bg-slate-900 border border-slate-900 rounded-2xl overflow-hidden shadow-lg group-hover:border-slate-800 transition flex flex-col h-full">
                <div className="relative aspect-[16/10] overflow-hidden bg-slate-950">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={getOptimizedUrl(game.background_image, 400)}
                    alt={game.name}
                    className="w-full h-full object-cover transition duration-300 group-hover:scale-105"
                    loading="lazy"
                  />
                </div>
                <div className="p-3 flex-1 flex flex-col justify-between">
                  <h3 className="font-bold text-sm text-white text-left tracking-tight line-clamp-1" dir="ltr">
                    {game.name}
                  </h3>
                  <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-950 text-[10px] text-slate-500">
                    <span>{game.released?.split('-')[0] || '---'}</span>
                    <span className="text-purple-400 font-medium">★ {game.rating || '0'}</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
