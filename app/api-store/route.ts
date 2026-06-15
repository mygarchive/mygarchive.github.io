import { NextResponse } from 'next/server';

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL || '';
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || '';

// تابع استاندارد و مستقیم برای ارتباط با آپستاش (بدون خط لوله اضافی)
async function runRedisCommand(command: string[]) {
  if (!UPSTASH_URL || !UPSTASH_TOKEN) {
    console.error('Upstash credentials are missing!');
    return null;
  }

  try {
    const cleanUrl = UPSTASH_URL.trim().replace(/\/$/, '');
    
    // ارسال مستقیم دستور به URL اصلی آپستاش
    const res = await fetch(cleanUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${UPSTASH_TOKEN.trim()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(command),
    });

    if (!res.ok) {
      console.error(`Upstash Error: ${res.status}`);
      return null;
    }
    
    const data = await res.json();
    return data.result; // بازگرداندن مستقیم نتیجه دستور
  } catch (err) {
    console.error('Upstash execution error:', err);
    return null;
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const id = searchParams.get('id');

    // ۱. بخش جستجوی بازی از API اصلی RAWG
    if (search) {
      const apiKey = '8ceb3ebba03c4ddca51106af23868263';
      const apiUrl = `https://api.rawg.io/api/games?key=${apiKey}&search=${encodeURIComponent(search)}&page_size=12`;
      
      const res = await fetch(apiUrl);
      if (!res.ok) {
        return NextResponse.json({ error: 'خطا در دریافت اطلاعات از RAWG' }, { status: res.status });
      }
      
      const data = await res.json();
      return NextResponse.json(data.results || []);
    }

    // ۲. دریافت اطلاعات کل بازی‌ها از دیتابیس آپستاش
    const rawValues = await runRedisCommand(['HVALS', 'my_games_dict']);
    
    if (!rawValues || !Array.isArray(rawValues) || rawValues.length === 0) {
      return NextResponse.json([]);
    }

    const gamesList = rawValues
      .map((item: any) => {
        try {
          return typeof item === 'string' ? JSON.parse(item) : item;
        } catch (e) {
          return null;
        }
      })
      .filter(Boolean);

    // اگر آیدی خاصی فرستاده شده بود، فقط همان بازی را برگردان
    if (id) {
      const singleGame = gamesList.find((g: any) => g.id.toString() === id.toString());
      return NextResponse.json(singleGame || null);
    }

    return NextResponse.json(gamesList);

  } catch (globalError: any) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body || !body.id) {
      return NextResponse.json({ error: 'دیتا یا شناسه بازی معتبر نیست' }, { status: 400 });
    }

    // ذخیره مستقیم در دیتابیس
    const result = await runRedisCommand(['HSET', 'my_games_dict', body.id.toString(), JSON.stringify(body)]);
    
    if (result === null) {
      return NextResponse.json({ error: 'خطا در ذخیره در دیتابیس' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'شناسه الزامی است' }, { status: 400 });

    await runRedisCommand(['HDEL', 'my_games_dict', id.toString()]);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'خطا در حذف' }, { status: 500 });
  }
}
