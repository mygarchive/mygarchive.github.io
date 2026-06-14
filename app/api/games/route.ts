import { NextRequest, NextResponse } from 'next/server';

const API_KEY = '8ceb3ebba03c4ddca51106af23868263';

// تابع کمکی برای پیدا کردن دیتابیس از تمام لایه‌های ممکن کلودفلر
function getCloudflareKV(request: any) {
  return (
    request.context?.env?.GAME_KV || 
    (process.env as any).GAME_KV || 
    (globalThis as any).GAME_KV ||
    (globalThis as any).__cloudflare_env__?.GAME_KV
  );
}

// ۱. مدیریت هماهنگ سرچ و دریافت لیست بازی‌ها
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');

    if (search) {
      const url = `https://api.rawg.io/api/games?key=${API_KEY}&search=${encodeURIComponent(search)}`;
      const rawgRes = await fetch(url);
      
      if (!rawgRes.ok) {
        return NextResponse.json({ error: `خطای سرور مرجع: ${rawgRes.status}` }, { status: rawgRes.status });
      }

      const rawgData = await rawgRes.json();
      return NextResponse.json(rawgData.results || []);
    }

    const myKv = getCloudflareKV(request);
    if (!myKv) {
      // برای اینکه متوجه شویم دیتابیس کجاست، لیست کلیدها را برمی‌گردانیم
      const availableKeys = Object.keys(process.env || {});
      return NextResponse.json({ error: "KV یافت نشد", debug: availableKeys }, { status: 200 });
    }

    const gamesData = await myKv.get("games_list");
    return NextResponse.json(gamesData ? JSON.parse(gamesData) : []);

  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'خطای ناشناخته' }, { status: 500 });
  }
}

// ۲. ذخیره بازی جدید در دیتابیس
export async function POST(request: NextRequest) {
  try {
    const myKv = getCloudflareKV(request);

    if (!myKv) {
      return NextResponse.json({ 
        error: "اتصال به دیتابیس برقرار نیست. لطفا با ادمین تماس بگیرید." 
      }, { status: 500 });
    }

    const gameData = await request.json();
    const gamesData = await myKv.get("games_list");
    const games = gamesData ? JSON.parse(gamesData) : [];
    
    if (games.some((g: any) => g.id.toString() === gameData.id.toString())) {
      return NextResponse.json({ error: 'این بازی قبلاً اضافه شده است.' }, { status: 400 });
    }
    
    games.push(gameData);
    await myKv.put("games_list", JSON.stringify(games));
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
