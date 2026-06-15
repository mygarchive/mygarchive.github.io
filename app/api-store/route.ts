import { NextResponse } from 'next/server';

// گرفتن متغیرهای محیطی آپستاش
const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL || '';
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || '';

// تابع کمکی استاندارد برای ارسال دستورات REST به آپستاش
async function runRedisCommand(command: string[]) {
  if (!UPSTASH_URL || !UPSTASH_TOKEN) {
    console.error('Upstash credentials are missing!');
    return null;
  }
  
  try {
    const res = await fetch(`${UPSTASH_URL}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${UPSTASH_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(command),
    });
    
    if (!res.ok) {
      console.error('Upstash response error status:', res.status);
      return null;
    }
    
    const data = await res.json();
    return data.result;
  } catch (err) {
    console.error('Upstash Fetch Exception:', err);
    return null;
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search');
  const id = searchParams.get('id');

  // ۱. اگر ادمین در حال سرچ بازی جدید است (کاملاً مجزا شده تا ارور دیتابیس خرابش نکند)
  if (search) {
    try {
      const apiKey = '68b92b6794614ffcb7d091e0a9d80fc4';
      const apiUrl = `https://api.rawg.io/api/games?key=${apiKey}&search=${encodeURIComponent(search)}&page_size=12`;
      
      const res = await fetch(apiUrl);
      if (!res.ok) throw new Error('RAWG API Bad Response');
      
      const data = await res.json();
      return NextResponse.json(data.results || []);
    } catch (err) {
      console.error('Error searching game from RAWG:', err);
      return NextResponse.json({ error: 'خطا در دریافت اطلاعات از سرور اصلی بازی‌ها' }, { status: 500 });
    }
  }

  // ۲. حذف بازی خاص از دیتابیس
  if (id) {
    try {
      await runRedisCommand(['HDEL', 'my_games_dict', id.toString()]);
      return NextResponse.json({ success: true });
    } catch (err) {
      return NextResponse.json({ error: 'خطا در حذف از دیتابیس' }, { status: 500 });
    }
  }

  // ۳. در حالت عادی: دریافت لیست بازی‌های ذخیره شده روی سایت
  try {
    const rawResult = await runRedisCommand(['HGETALL', 'my_games_dict']);
    
    // اگر دیتابیس کلاً خالی بود یا خطایی رخ داد، آرایه خالی برگردان تا سایت کرش نکند
    if (!rawResult || !Array.isArray(rawResult) || rawResult.length === 0) {
      return NextResponse.json([]);
    }
    
    const gamesList: any[] = [];
    // پردازش امن پاسخ به صورت جفت‌های کلید و مقدار
    for (let i = 1; i < rawResult.length; i += 2) {
      try {
        const item = rawResult[i];
        if (item) {
          gamesList.push(typeof item === 'string' ? JSON.parse(item) : item);
        }
      } catch (e) {
        console.error('Error parsing individual game json:', e);
      }
    }
    return NextResponse.json(gamesList);
  } catch (err) {
    console.error('Error fetching all games:', err);
    return NextResponse.json([]);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.id) {
      return NextResponse.json({ error: 'شناسه بازی معتبر نیست' }, { status: 400 });
    }

    const result = await runRedisCommand(['HSET', 'my_games_dict', body.id.toString(), JSON.stringify(body)]);
    if (result === null) {
      throw new Error('Failed to write to Upstash');
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'خطا در ذخیره‌سازی دیتابیس' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'شناسه الزامی است' }, { status: 400 });

  try {
    await runRedisCommand(['HDEL', 'my_games_dict', id.toString()]);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'خطا در حذف' }, { status: 400 });
  }
}
