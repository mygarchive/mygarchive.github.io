import { NextRequest, NextResponse } from 'next/server';

const API_KEY = '8ceb3ebba03c4ddca51106af23868263';

// ۱. هندل کردن درخواست‌های دریافت لیست بازی‌ها و جستجوی هوشمند از RAWG
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');

    // سناریوی اول: درخواست جستجوی هوشمند بازی از سمت پنل ادمین
    if (search) {
      const url = `https://api.rawg.io/api/games?key=${API_KEY}&search=${encodeURIComponent(search)}`;
      
      const rawgRes = await fetch(url, {
        headers: { 'User-Agent': 'TVTime-GameList-App' }
      });
      
      if (!rawgRes.ok) {
        return NextResponse.json({ error: `خطا از سمت سرور مرجع: ${rawgRes.status}` }, { status: rawgRes.status });
      }

      const rawgData = await rawgRes.json();
      return NextResponse.json(rawgData.results || []);
    }

    // سناریوی دوم: لود کردن بازی‌های ذخیره شده در دیتابیس خودت (صفحه اصلی)
    const myKv = (process.env as any).GAME_KV;
    if (!myKv) {
      // برای اینکه فرانت‌اند کرش نکند، اگر دیتابیس هنوز وصل نیست آرایه خالی برمی‌گردانیم
      return NextResponse.json([]);
    }

    const gamesData = await myKv.get("games_list");
    const games = gamesData ? JSON.parse(gamesData) : [];
    return NextResponse.json(games);

  } catch (error: any) {
    return NextResponse.json({ error: `خطای داخلی سرور: ${error.message || 'ناشناخته'}` }, { status: 500 });
  }
}

// ۲. هندل کردن درخواست ذخیره بازی جدید در دیتابیس ابری
export async function POST(request: Request) {
  try {
    const myKv = (process.env as any).GAME_KV;
    if (!myKv) {
      return NextResponse.json({ error: "اتصال به دیتابیس KV برقرار نیست. لطفاً بایندینگ کلودفلر را چک کنید." }, { status: 500 });
    }

    const gameData = await request.json();
    
    const gamesData = await myKv.get("games_list");
    const games = gamesData ? JSON.parse(gamesData) : [];
    
    // جلوگیری از ثبت بازی تکراری
    const exists = games.some((g: any) => g.id.toString() === gameData.id.toString());
    if (exists) {
      return NextResponse.json({ error: 'این بازی قبلاً در لیست دیتابیس شما ذخیره شده است.' }, { status: 400 });
    }
    
    games.push(gameData);
    await myKv.put("games_list", JSON.stringify(games));
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: `خطا در ثبت اطلاعات: ${error.message}` }, { status: 500 });
  }
}
