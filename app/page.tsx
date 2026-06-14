'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Game {
  id: any;
  name: string;
  background_image: string;
  rating: number;
  released: string;
  playtime: number;
  genres: { name: string }[];
  platforms?: { platform: { name: string } }[];
  short_screenshots?: { id: number; image: string }[];
}

export default function Home() {
  const [myGames, setMyGames] = useState<Game[]>([]);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);

  useEffect(() => {
    fetchGamesFromDatabase();
  }, []);

  const fetchGamesFromDatabase = async () => {
    try {
      const res = await fetch('/api/games');
      const data = await res.json();
      setMyGames(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('خطا در دریافت بازی‌ها از دیتابیس');
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white font-sans p-4 md:p-8" dir="rtl">
      <header className="flex justify-between items-center border-b border-gray-800 pb-4 mb-8">
        <h1 className="text-xl md:text-2xl font-bold text-blue-500 flex items-center gap-2">🕹️ TVTime بازی‌های من</h1>
        <Link 
          href="/admin" 
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs md:text-sm font-bold transition shadow-lg shadow-blue-500/20"
        >
          🛠️ پنل ادمین
        </Link>
      </header>

      {!selectedGame ? (
        <div>
          <h2 className="text-lg font-bold mb-6 text-gray-400 mr-2">بازی‌های موجود در دیتاسنتر ({myGames.length})</h2>
          {myGames.length === 0 ? (
            <div className="text-center py-20 bg-gray-900/50 rounded-2xl border border-dashed border-gray-800">
              <p className="text-gray-500">دیتابیس خالی است. از پنل ادمین بازی اضافه کنید تا در سرور ذخیره شود.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
              {myGames.map(game => (
                <div 
                  key={game.id} 
                  onClick={() => setSelectedGame(game)}
                  className="bg-gray-900 rounded-2xl overflow-hidden cursor-pointer hover:scale-[1.03] transition-all duration-200 border border-gray-800 hover:border-gray-700 shadow-lg group"
                >
                  <div className="relative overflow-hidden">
                    <img src={game.background_image} alt={game.name} className="w-full h-44 md:h-52 object-cover group-hover:scale-105 transition-transform duration-300" />
                  </div>
                  <div className="p-4">
                    <h3 className="font-bold text-sm truncate text-right text-gray-200">{game.name}</h3>
                    <div className="flex justify-between items-center mt-2" dir="ltr">
                      <span className="text-xs text-gray-400">{game.released?.split('-')[0] || '---'}</span>
                      <span className="text-xs bg-gray-800 text-yellow-500 px-2 py-0.5 rounded-md font-bold">⭐ {game.rating}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="bg-gray-900 rounded-3xl p-4 md:p-8 max-w-5xl mx-auto border border-gray-800 shadow-2xl">
          <button 
            onClick={() => setSelectedGame(null)} 
            className="mb-6 text-sm text-blue-400 hover:text-blue-300 flex items-center gap-2 transition bg-gray-800 px-4 py-2 rounded-xl"
          >
            ← بازگشت به لیست اصلی
          </button>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
            <div className="lg:col-span-1">
              <img src={selectedGame.background_image} alt={selectedGame.name} className="w-full h-64 md:h-80 object-cover rounded-2xl shadow-xl border border-gray-800" />
            </div>
            
            <div className="lg:col-span-2 text-right flex flex-col justify-between">
              <div>
                <h2 className="text-2xl md:text-3xl font-black mb-4 text-white">{selectedGame.name}</h2>
                <div className="grid grid-cols-2 gap-4 bg-gray-950 p-4 rounded-xl border border-gray-800 text-sm">
                  <p className="text-gray-400">🕒 مدت زمان اتمام: <span className="text-white font-bold">{selectedGame.playtime || '---'} ساعت</span></p>
                  <p className="text-gray-400">📅 تاریخ انتشار: <span className="text-white font-bold">{selectedGame.released}</span></p>
                  <p className="text-gray-400">⭐ امتیاز منتقدین: <span className="text-yellow-500 font-bold">{selectedGame.rating} / 5</span></p>
                  <p className="text-gray-400">🏷️ ژانرها: <span className="text-blue-400 font-bold">{selectedGame.genres?.map(g => g.name).join(', ') || 'نامشخص'}</span></p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
