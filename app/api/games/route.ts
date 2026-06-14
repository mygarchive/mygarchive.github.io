import { NextRequest, NextResponse } from 'next/server';

// خواندن دیتابیس برای صفحه اصلی
export async function GET(request: NextRequest) {
  try {
    const myKv = (process.env as any).GAME_KV;
    if (!myKv) return NextResponse.json([]);

    const gamesData = await myKv.get("games_list");
    return NextResponse.json(gamesData ? JSON.parse(gamesData) : []);
  } catch (error) {
    return NextResponse.json([]);
  }
}

// ذخیره کردن بازی جدید در دیتابیس
export async function POST(request: Request) {
  try {
    const myKv = (process.env as any).GAME_KV;
    if (!myKv) {
      return NextResponse.json({ error: "دیتابیس KV کلودفلر متصل نیست!" }, { status: 500 });
    }

    const gameData = await request.json();
    const gamesData = await myKv.get("games_list");
    const games = gamesData ? JSON.parse(gamesData) : [];
    
    // جلوگیری از تکراری شدن
    if (games.some((g: any) => g.id.toString() === gameData.id.toString())) {
      return NextResponse.json({ error: 'این بازی قبلاً در لیست شما موجود است.' }, { status: 400 });
    }
    
    games.push(gameData);
    await myKv.put("games_list", JSON.stringify(games));
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
