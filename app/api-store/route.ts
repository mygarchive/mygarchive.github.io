import { NextRequest, NextResponse } from 'next/server';

const API_KEY = '8ceb3ebba03c4ddca51106af23868263';
const corsHeaders = {
  'Cache-Control': 'no-cache, no-transform, max-age=0, must-revalidate',
  'Content-Type': 'application/json',
};

// تابع کمکی اصلاح‌شده با حروف بزرگ برای سازگاری کامل با Upstash REST API
async function upstashFetch(command: string, ...args: any[]) {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    throw new Error("تنظیمات دیتابیس (Environment Variables) در نتلیفای ست نشده است.");
  }

  const response = await fetch(`${url}/${command}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(args),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Upstash Error: ${response.statusText} - ${errorText}`);
  }

  const data = await response.json();
  return data.result;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');

    // ۱. سرچ بازی از API خارجی
    if (search) {
      const url = `https://api.rawg.io/api/games?key=${API_KEY}&search=${encodeURIComponent(search)}`;
      const rawgRes = await fetch(url);
      if (!rawgRes.ok) return NextResponse.json({ error: 'خطای سرور مرجع' }, { status: rawgRes.status, headers: corsHeaders });
      const rawgData = await rawgRes.json();
      return NextResponse.json(rawgData.results || [], { headers: corsHeaders });
    }

    // ۲. خواندن لیست بازی‌ها از دیتابیس آپستاش با دستور GET (حروف بزرگ)
    const gamesData = await upstashFetch('GET', 'games_list');
    return NextResponse.json(gamesData || [], { headers: corsHeaders });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders });
  }
}

export async function POST(request: NextRequest) {
  try {
    const gameData = await request.json();
    
    // خواندن لیست فعلی بازی‌ها با دستور GET
    const games: any[] = (await upstashFetch('GET', 'games_list')) || [];
    
    // جلوگیری از ثبت بازی تکراری
    if (games.some((g: any) => g.id.toString() === gameData.id.toString())) {
      return NextResponse.json({ error: 'این بازی قبلاً اضافه شده است.' }, { status: 400, headers: corsHeaders });
    }
    
    // اضافه کردن بازی جدید و ذخیره نهایی با دستور SET (حروف بزرگ)
    games.push(gameData);
    await upstashFetch('SET', 'games_list', games);
    
    return NextResponse.json({ success: true }, { headers: corsHeaders });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders });
  }
}
