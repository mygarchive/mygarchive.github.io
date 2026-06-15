'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Game {
  id: string;
  name: string;
  background_image: string;
  rating: number;
  released: string;
}

export default function Home() {
  const [myGames, setMyGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // هماهنگ‌شده با آدرس دیتابیس ابری کلودفلر
    fetch('/api-store/')
      .then((res) => res.json())
      .then((data) => {
        setMyGames(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching games:', err);
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen bg-gray-950 text-white font-sans p-4 md:p-8" dir="rtl">
      <header className="border-b border-gray-800 pb-4 mb-8 flex justify-between items-center">
        <h1 className="text-xl md:text-2xl font-black text-blue-500 flex items-center gap-2">
          🕹️ TVTime لیست بازی‌های من
        </h1>
        <Link 
          href="/admin" 
          className="bg-gray-900 border border-gray-800 text-gray-400 text-xs px-3 py-2 rounded-xl hover:text-white hover:border-gray-700 transition"
        >
          ⚙️ مدیریت ابری
        </Link>
      </header>

      {loading ? (
        <div className="text-center py-20 text-gray-400">در حال بارگذاری لیست بازی‌ها...</div>
      ) : myGames.length === 0 ? (
        <div className="text-center py-20 bg-gray-900/40 rounded-2xl border border-dashed border-gray-800 max-w-xl mx-auto">
          <p className="text-gray-500">هنوز هیچ بازی به لیست اضافه نشده است.</p>
          <Link href="/admin" className="text-blue-500 text-sm mt-2 inline-block hover:underline">
            ورود به بخش مدیریت و افزودن اولین بازی ←
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
          {myGames.map((game) => (
            <Link 
              href={`/games/${game.id}`}
              key={game.id} 
              className="bg-gray-900 rounded-2xl overflow-hidden border border-gray-800 hover:border-gray-700 hover:scale-[1.03] transition-all duration-200 shadow-lg group block"
            >
              <div className="relative overflow-hidden">
                {game.background_image ? (
                  <img src={game.background_image} alt={game.name} className="w-full h-44 md:h-52 object-cover group-hover:scale-105 transition-transform duration-300" />
                ) : (
                  <div className="w-full h-44 md:h-52 bg-gray-800 flex items-center justify-center text-gray-600">بدون تصویر</div>
                )}
              </div>
              <div className="p-4">
                <h3 className="font-bold text-sm truncate text-right text-gray-200">{game.name}</h3>
                <div className="flex justify-between items-center mt-2" dir="ltr">
                  <span className="text-xs text-gray-400">{game.released?.split('-')[0] || '---'}</span>
                  <span className="text-xs bg-gray-800 text-yellow-500 px-2 py-0.5 rounded-md font-bold">⭐ {game.rating}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
