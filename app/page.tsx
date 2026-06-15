"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function Home() {
  const [games, setGames] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchGames() {
      try {
        const res = await fetch('/api-store');
        if (res.ok) {
          const data = await res.json();
          setGames(data);
        }
      } catch (err) {
        console.error('خطا در بارگذاری لیست بازی‌ها:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchGames();
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between" dir="rtl">
      
      <main className="max-w-6xl w-full mx-auto p-6 flex-1">
        
        <header className="text-center my-12">
          <h1 className="text-4xl font-black text-white tracking-tight sm:text-5xl bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-500 to-red-500">
            لیست بازی‌های من
          </h1>
          <p className="mt-3 text-slate-400 text-sm sm:text-base">
            آرشیو شخصی تمام بازی‌هایی که تا کنون به اتمام رسانده‌ام
          </p>
        </header>

        {loading && (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
          </div>
        )}

        {!loading && games.length === 0 && (
          <div className="text-center text-slate-500 my-20">
            <p className="text-lg">هنوز هیچ بازی به لیست اضافه نشده است.</p>
          </div>
        )}

        {!loading && games.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
            {games.map((game) => (
              <Link 
                href={`/game/${game.id}`} 
                key={game.id}
                className="bg-slate-900 border border-slate-800/80 rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl hover:border-slate-700/50 flex flex-col justify-between group transition duration-300 transform hover:-translate-y-1"
              >
                <div className="relative aspect-[4/3] w-full bg-slate-950 overflow-hidden">
                  {game.background_image ? (
                    <img
                      src={game.background_image}
                      alt={game.name}
                      className="object-cover w-full h-full group-hover:scale-105 transition duration-500"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-600 text-xs">بدون تصویر</div>
                  )}
                </div>
                
                <div className="p-4 flex-1 flex flex-col justify-between bg-slate-900/60">
                  <h2 className="font-bold text-white text-sm sm:text-base line-clamp-1 group-hover:text-purple-400 transition mb-2" title={game.name}>
                    {game.name}
                  </h2>
                  
                  <div className="flex justify-between items-center text-xs text-slate-400 border-t border-slate-800/60 pt-2 mt-auto">
                    <span>سال: {game.released ? game.released.split('-')[0] : 'نامشخص'}</span>
                    <div className="flex items-center gap-0.5 text-amber-400 font-medium">
                      <span>★</span>
                      <span>{game.rating ? game.rating.toFixed(1) : '0'}</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

      </main>

      <footer className="w-full border-t border-slate-900 bg-slate-950/80 py-6 text-center text-xs text-slate-500 tracking-wide">
        <p>
          Powered by{' '}
          <a 
            href="https://gemini.google.com" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-purple-400/80 hover:text-purple-400 font-medium transition"
          >
            AI Technology
          </a>
        </p>
      </footer>

    </div>
  );
}
