import { NextRequest, NextResponse } from 'next/server';

const API_KEY = '8ceb3ebba03c4ddca51106af23868263';

// ۱. دریافت بازی‌ها از دیتابیس یا سرچ هوشمند از RAWG
export async function GET(request: NextRequest) {
  try {
    const myKv = (process.env as any).GAME_KV;
    if (!myKv) {
      return NextResponse.json({ error: "دیتابیس KV یافت نشد." }, { status: 500 });
    }

    // بررسی اینکه آیا درخواست سرور برای لود لیست است یا سرچ هوشمند ادمین
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');

    if (search) {
      // اگر پارامتر سرچ وجود داشت، مستقیم و امن از بک‌مستقیم به RAWG وصل می‌شویم
      const rawgRes = await fetch(`https://api.rawg.io/api/games?key=${API_KEY}&search=${encodeURIComponent(search)}`);
      const rawgData = await rawgRes.json();
      return NextResponse.json(rawgData.results || []);
    }

    // در غیر این صورت، لیست بازی‌های ذخیره شده در دیتابیس خودت را برگردان
    const gamesData = await myKv.get("games_list");
    const games = gamesData ? JSON.parse(gamesData) : [];
    return NextResponse.json(games);
  } catch (error) {
    return NextResponse.json({ error: 'خطا در پردازش اطلاعات سرور' }, { status: 500 });
  }
}

// ۲. ذخیره بازی جدید در دیتابیس کلودفلر
export async function POST(request: Request) {
  try {
    const myKv = (process.env as any).GAME_KV;
    if (!myKv) {
      return NextResponse.json({ error: "دیتابیس KV یافت نشد." }, { status: 500 });
    }

    const gameData = await request.json();
    
    const gamesData = await myKv.get("games_list");
    const games = gamesData ? JSON.parse(gamesData) : [];
    
    const exists = games.some((g: any) => g.id.toString() === gameData.id.toString());
    if (exists) {
      return NextResponse.json({ error: 'این بازی قبلاً به دیتابیس اصلی اضافه شده است' }, { status: 400 });
    }
    
    games.push(gameData);
    await myKv.put("games_list", JSON.stringify(games));
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'خطا در ثبت داده‌ها در سرور' }, { status: 500 });
  }
}
