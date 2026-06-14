'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function AdminPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('🟢 سیستم آماده کار است.');

  const startSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setMsg('⏳ در حال ارسال درخواست به سرور خودتان برای سرچ...');
    
    try {
      // 🚀 اتصال به مسیر جدید و مستقل سرچ
      const res = await fetch(`/store-api?search=${encodeURIComponent(query.trim())}`);
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || `خطای سرور با کد ${res.status}`);
      }

      const data = await res.json();
      
      if (Array.isArray(data)) {
        setResults(data);
        setMsg(`✅ موفقیت‌آمیز: تعداد ${data.length} بازی یافت شد.`);
        if (data.length === 0) {
          alert('هیچ بازی با این نام پیدا نشد. نام انگلیسی را بررسی کنید.');
        }
      } else {
        setMsg('❌ فرمت پاسخ دریافتی از سرور معتبر نیست.');
      }
    } catch (e: any) {
      setMsg(`❌ خطا: ${e.message}`);
      alert(`خطا در سیستم سرچ: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const saveGame = async (game: any) => {
    setMsg(`⏳ در حال ذخیره بازی "${game.name}"...`);
    try {
      // 🚀 اتصال متد POST به مسیر جدید دیتابیس بدون تداخل فرانت‌آند
      const res = await fetch('/store-api', {
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
        alert(`✅ بازی "${game.name}" با موفقیت ذخیره شد و به صفحه اصلی رفت!`);
        setMsg('✅ ذخیره با موفقیت انجام شد.');
      } else {
        const err = await res.json();
        alert(`❌ خطا در ذخیره: ${err.error}`);
      }
    } catch (err) {
      alert('❌ خطا در شبکه یا دیتابیس');
    }
  };

  return (
    <div style={{ backgroundColor: '#030712', color: '#fff', minHeight: '100vh', padding: '20px', fontFamily: 'sans-serif', direction: 'rtl' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto', backgroundColor: '#111827', padding: '20px', borderRadius: '15px', border: '1px solid #1f2937' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', alignItems: 'center' }}>
          <h2 style={{ color: '#3b82f6', margin: 0 }}>🛠️ منوی کنترل ابری بازی‌ها</h2>
          <Link href="/" style={{ color: '#9ca3af', textDecoration: 'none', fontSize: '14px', border: '1px solid #374151', padding: '5px
