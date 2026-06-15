import { NextRequest, NextResponse } from 'next/server';

const API_KEY = '8ceb3ebba03c4ddca51106af23868263';
const corsHeaders = {
  'Cache-Control': 'no-cache, no-transform, max-age=0, must-revalidate',
  'Content-Type': 'application/json',
};

async function upstashFetch(command: string, key: string, value?: any) {
  const baseUrl = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!baseUrl || !token) throw new Error("تنظیمات دیتابیس ست نشده است.");

  const url = `${baseUrl}/${command}/${key}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: value !== undefined ? JSON.stringify(value) : undefined,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Upstash Error: ${response.statusText} - ${errorText}`);
  }

  const data = await response.json();
  if (command === 'GET' && data.result) {
    try { return JSON.parse(data.result); } catch { return data.result; }
  }
  return data.result;
}

// تابع کمکی برای مرتب‌سازی حروف الفبا (اعداد اول می‌آیند)
function sortGamesAlphabetically(games: any[]) {
  return games.sort((a, b) => {
    const nameA = (a.name || '').toLowerCase();
    const nameB = (b.name || '').toLowerCase();
    return nameA.localeCompare(nameB, 'en', { numeric: true, sensitivity: 'base' });
  });
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const id = searchParams.get('id');

    // ۱. دریافت اطلاعات کامل یک بازی خاص بر اساس ID از RAWG (برای فاز ۳)
    if (id) {
      const url = `https://api.rawg.io/api/games/${id}?key=${API_KEY}`;
      const res = await fetch(url);
      if (!res.ok) return NextResponse.json({ error: 'بازی پیدا نشد' }, { status: 404, headers: corsHeaders });
      const data = await res.json();
      return NextResponse.json(data, { headers: corsHeaders });
    }

    // ۲. سرچ بازی از API خارجی
    if (search) {
      const url = `https://api.rawg.io/api/games?key=${API_KEY}&search=${encodeURIComponent(search)}`;
      const rawgRes = await fetch(url);
      if (!rawgRes.ok) return NextResponse.json({ error: 'خطای سرور مرجع' }, { status: rawgRes.status, headers: corsHeaders });
      const rawgData = await rawgRes.json();
      return NextResponse.json(rawgData.results || [], { headers: corsHeaders });
    }

    // ۳. خواندن لیست بازی‌ها و مرتب‌سازی الفبایی
    const gamesData = await upstashFetch('GET', 'games_list');
    const sortedGames = sortGamesAlphabetically(gamesData || []);
    return NextResponse.json(sortedGames, { headers: corsHeaders });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders });
  }
}

export async function POST(request: NextRequest) {
  try {
    const gameData = await request.json();
    let games: any[] = (await upstashFetch('GET', 'games_list')) || [];
    
    if (games.some((g: any) => g.id.toString() === gameData.id.toString())) {
      return NextResponse.json({ error: 'این بازی قبلاً در لیست شما موجود است!' }, { status: 400, headers: corsHeaders });
    }
    
    games.push(gameData);
    games = sortGamesAlphabetically(games);
    await upstashFetch('SET', 'games_list', games);
    
    return NextResponse.json({ success: true }, { headers: corsHeaders });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders });
  }
}

// متد جدید برای حذف بازی از لیست دیتابیس
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const idToDelete = searchParams.get('id');

    if (!idToDelete) {
      return NextResponse.json({ error: 'شناسه بازی ارسال نشده است' }, { status: 400, headers: corsHeaders });
    }

    let games: any[] = (await upstashFetch('GET', 'games_list')) || [];
    const initialLength = games.length;
    
    // فیلتر کردن و حذف بازی مورد نظر
    games = games.filter((g: any) => g.id.toString() !== idToDelete.toString());

    if (games.length === initialLength) {
      return NextResponse.json({ error: 'بازی جهت حذف پیدا نشد' }, { status: 404, headers: corsHeaders });
    }

    games = sortGamesAlphabetically(games);
    await upstashFetch('SET', 'games_list', games);

    return NextResponse.json({ success: true, message: 'بازی با موفقیت حذف شد' }, { headers: corsHeaders });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders });
  }
}
