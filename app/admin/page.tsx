"use client";

import { useState } from "react";
import Link from "next/link";

export default function AdminPage() {
  const [title, setTitle] = useState("");
  const [genre, setGenre] = useState("");
  const [platform, setPlatform] = useState("");
  const [image, setImage] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !genre || !platform) {
      setMessage("❌ لطفاً فیلدهای ستاره‌دار را پر کنید.");
      return;
    }

    setLoading(true);
    setMessage("");

    const gameId = title.toLowerCase().replace(/[^a-z0-9]/g, "-");
    const newGame = { id: gameId, title, genre, platform, image: image || "https://placehold.co/600x400?text=No+Image" };

    try {
      const res = await fetch("/api/games", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newGame),
      });

      const data = await res.json();
      if (res.ok) {
        setMessage("✅ بازی با موفقیت در دیتابیس ابری ذخیره شد!");
        setTitle(""); setGenre(""); setPlatform(""); setImage("");
      } else {
        setMessage(`❌ خطا: ${data.error}`);
      }
    } catch (err) {
      setMessage("❌ خطا در برقراری ارتباط با سرور");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6" dir="rtl">
      <div className="max-w-md mx-auto bg-gray-800 rounded-lg p-6 shadow-xl border border-gray-700">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">🛠️ پنل مدیریت بازی‌ها</h1>
          <Link href="/" className="bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded text-sm transition">
            بازگشت به سایت
          </Link>
        </div>

        {message && <div className="mb-4 p-3 rounded bg-gray-700 text-center text-sm font-semibold">{message}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm mb-1">نام بازی *</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white focus:outline-none focus:border-blue-500" placeholder="مثلا: GTA V" />
          </div>
          <div>
            <label className="block text-sm mb-1">ژانر *</label>
            <input type="text" value={genre} onChange={(e) => setGenre(e.target.value)} className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white focus:outline-none focus:border-blue-500" placeholder="مثلا: اکشن، جهان باز" />
          </div>
          <div>
            <label className="block text-sm mb-1">پلتفرم *</label>
            <input type="text" value={platform} onChange={(e) => setPlatform(e.target.value)} className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white focus:outline-none focus:border-blue-500" placeholder="مثلا: PC, PS5" />
          </div>
          <div>
            <label className="block text-sm mb-1">لینک کاور/عکس (اختیاری)</label>
            <input type="text" value={image} onChange={(e) => setImage(e.target.value)} className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-left text-white focus:outline-none focus:border-blue-500" placeholder="https://example.com/image.jpg" dir="ltr" />
          </div>
          <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white font-bold py-2 px-4 rounded transition mt-4">
            {loading ? "در حال ذخیره..." : "➕ افزودن به دیتابیس کلودفلر"}
          </button>
        </form>
      </div>
    </div>
  );
}
