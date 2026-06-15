'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

export default function GameDetails() {
  const { id } = useParams();
  const [game, setGame] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    // فراخوانی مستقیم از سورپرایز کلاودفلر KV
    fetch('/api-store/')
      .then((res) => res.json())
      .then((data) => {
        const found = Array.isArray(data) ? data.find((g: any) => g.id.toString() === id.toString()) : null;
        setGame(found || null);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching game details:', err);
        setLoading(false);
      });
  }, [id]);

  if (loading) return <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">در حال دریافت مشخصات بازی...</div>;
  if (!game) return <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">بازی مورد نظر یافت نشد. <Link href="/" className="text-blue-400 mr-2 hover:underline">بازگشت به خانه</Link></div>;

  const pcPlatform = game.platforms?.find((p: any) => p.platform?.name?.toLowerCase() === 'pc');
  const reqs = pcPlatform?.requirements_en || null;

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4 md:p-8" dir="rtl">
      <div className="max-w-5xl mx-auto bg-gray-900 rounded-3xl p-4 md:p-8 border border-gray-800 shadow-2xl">
        <Link href="/" className="mb-6 text-sm text-blue-400 hover:text-blue-300 flex items-center gap-2 bg-gray-800 px-4 py-2 rounded-xl w-fit transition">
          ← بازگشت به لیست اصلی
        </Link>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          <div className="lg:col-span-1">
            {game.background_image ? (
              <img src={game.background_image} alt={game.name} className="w-full h-64 md:h-80 object-cover rounded-2xl shadow-xl border border-gray-800" />
            ) : (
              <div className="w-full h-64 md:h-80 bg-gray-800 rounded-2xl flex items-center justify-center text-gray-600">بدون تصویر</div>
            )}
          </div>
          
          <div className="lg:col-span-2 text-right flex flex-col justify-between">
            <div>
              <h2 className="text-2xl md:text-3xl font-black mb-4 text-white">{game.name}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-gray-950 p-4 rounded-xl border border-gray-800 text-sm">
                <p className="text-gray-400">🕒 زمان اتمام: <span className="text-white font-bold">{game.playtime || '---'} ساعت</span></p>
                <p className="text-gray-400">📅 انتشار: <span className="text-white font-bold">{game.released || '---'}</span></p>
                <p className="text-gray-400">⭐ امتیاز: <span className="text-yellow-500 font-bold">{game.rating || '0'} / 5</span></p>
                <p className="text-gray-400">🏷️ ژانرها: <span className="text-blue-400 font-bold">{game.genres?.map((g: any) => g.name).join(', ') || '---'}</span></p>
              </div>
            </div>

            <div className="mt-6 bg-gray-950 p-4 rounded-xl border border-gray-800 text-left" dir="ltr">
              <h3 className="text-sm font-bold text-gray-400 text-right mb-2">🖥️ سیستم مورد نیاز (PC)</h3>
              {reqs ? (
                <div className="text-xs text-gray-300 space-y-2 max-h-40 overflow-y-auto pr-2 text-right">
                  {reqs.minimum && <p className="bg-gray-900 p-2 rounded"><strong className="text-red-400">Minimum:</strong> {reqs.minimum}</p>}
                  {reqs.recommended && <p className="bg-gray-900 p-2 rounded"><strong className="text-green-400">Recommended:</strong> {reqs.recommended}</p>}
                </div>
              ) : (
                <p className="text-xs text-gray-500 text-center py-2" dir="rtl">اطلاعات سیستم مورد نیاز برای این بازی ثبت نشده است.</p>
              )}
            </div>
          </div>
        </div>

        {game.short_screenshots && game.short_screenshots.length > 1 && (
          <div className="mt-8 pt-6 border-t border-gray-800">
            <h3 className="text-lg font-bold mb-4 text-gray-300 text-right">📸 گالری تصاویر بازی</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {game.short_screenshots.slice(1).map((img: any) => (
                <a href={img.image} target="_blank" rel="noreferrer" key={img.id || img.image} className="overflow-hidden rounded-xl border border-gray-800 hover:border-gray-600 transition">
                  <img src={img.image} alt="screenshot" className="w-full h-32 md:h-40 object-cover" />
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
