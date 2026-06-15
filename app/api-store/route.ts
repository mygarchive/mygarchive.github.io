import { NextResponse } from 'next/server';

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL || '';
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || '';

// تابع ارتباط با آپستاش با مدیریت خطای کامل
async function runRedisCommand(command: string[]) {
  if (!UPSTASH_URL || !UPSTASH_TOKEN) {
    console.error('Upstash credentials are missing!');
    return null;
  }

  try {
    const res = await fetch(`${UPSTASH_URL.trim()}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${UPSTASH_TOKEN.trim()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(command),
    });

    if (!res.ok) return null;
    const data = await res.json();
    return data.result;
  } catch (err) {
    console.error('Upstash communication error:', err);
    return null;
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const id = searchParams.get('id');

    // ۱. بخش جستجوی بازی از API اصلی RAWG (کاملاً مستقل و بدون درگیری با دیتابیس)
    if (search) {
      const apiKey = '68b92b6794614ffcb7d091e0a9d80fc4';
      const apiUrl = `https://api.rawg.io/api/games?key=${apiKey}&search=${encodeURIComponent(search)}&page_size=12`;
      
      const res = await fetch(apiUrl);
      if (!res.ok) {
        return NextResponse.json({ error: 'خطا در دریافت اطلاعات از RAWG' }, { status: res.status });
      }
      
      const data = await res.json();
      return NextResponse.json(data.results || []);
    }

    // ۲. بخش حذف بازی از دیتابیس
    if (id) {
      await runRedisCommand(['HDEL', 'my_games_dict', id.toString()]);
      return NextResponse.json({ success: true });
    }

    // ۳. لود کردن بازی‌ها در صفحه اصلی با دستور امن HVALS
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

    return NextResponse.json(gamesList);

  } catch (globalError: any) {
    console.error('Global API Error:', globalError);
    return NextResponse.json({ error: 'Internal Server Error', details: globalError.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body || !body.id) {
      return NextResponse.json({ error: 'دیتا یا شناسه بازی معتبر نیست' }, { status: 400 });
    }

    await runRedisCommand(['HSET', 'my_games_dict', body.id.toString(), JSON.stringify(body)]);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: 'خطا در ذخیره‌سازی دیتابیس' }, { status: 500 });
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
