import { NextResponse } from 'next/server';

// ۱. متد دریافت بازی‌ها از دیتابیس واقعی کلودفلر (KV)
export async function GET() {
  try {
    // اتصال به دیتابیس KV که با نام GAME_KV در wrangler معرفی کردیم
    const myKv = (process.env as any).GAME_KV;
    
    if (!myKv) {
      return NextResponse.json({ error: "دیتابیس KV یافت نشد." }, { status: 500 });
    }

    // خواندن دیتای بازی‌ها از کلید "games_list"
    const gamesData = await myKv.get("games_list");
    const games = gamesData ? JSON.parse(gamesData) : [];
    
    return NextResponse.json(games);
  } catch (error) {
    return NextResponse.json({ error: 'خطا در دریافت اطلاعات از سرور' }, { status: 500 });
  }
}

// ۲. متد ذخیره بازی جدید در دیتابیس واقعی کلودفلر (KV)
export async function POST(request: Request) {
  try {
    const myKv = (process.env as any).GAME_KV;
    
    if (!myKv) {
      return NextResponse.json({ error: "دیتابیس KV یافت نشد." }, { status: 500 });
    }

    const gameData = await request.json();
    
    // دریافت لیست فعلی بازی‌ها از KV
    const gamesData = await myKv.get("games_list");
    const games = gamesData ? JSON.parse(gamesData) : [];
    
    // بررسی تکراری نبودن بازی بر اساس ID
    const exists = games.some((g: any) => g.id === gameData.id);
    if (exists) {
      return NextResponse.json({ error: 'این بازی قبلاً اضافه شده است' }, { status: 400 });
    }
    
    // اضافه کردن بازی جدید به لیست
    games.push(gameData);
    
    // ذخیره کردن لیست آپدیت شده در دیتابیس کلودفلر
    await myKv.put("games_list", JSON.stringify(games));
    
    return NextResponse.json({ success: true, message: 'بازی با موفقیت در دیتابیس ابری ذخیره شد' });
  } catch (error) {
    return NextResponse.json({ error: 'خطا در ثبت داده‌ها در سرور' }, { status: 500 });
  }
}
