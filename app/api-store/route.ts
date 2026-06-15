import { NextResponse } from 'next/server';

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL || '';
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || '';

// تابع ارتباطی کاملاً استاندارد با آپستاش
async function runRedisCommand(command: string[]) {
  if (!UPSTASH_URL || !UPSTASH_TOKEN) {
    console.error('تنظیمات آپستاش در متغیرهای محیطی ست نشده است!');
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

    if (!res.ok) return null;
    const data = await res.json();
    return data.result;
  } catch (err) {
    console.error('Upstash Fetch Error:', err);
    return null;
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search');
  const id = searchParams.get('id');

  // ۱. بخش جستجوی بازی از API اصلی RAWG برای ادمین
  if (search) {
    try {
      const apiKey = '68b92b6794614ffcb7d091e0a9d80fc4';
      const res = await fetch(`https://api.rawg.io/api/games?key=${apiKey}&search=${encodeURIComponent(search)}&page_size=12`);
      if (!res.ok) throw new Error('RAWG API Error');
      const data = await res.json();
      return NextResponse.json(data.results || []);
    } catch (err) {
      return NextResponse.json({ error: 'خطا در ارتباط با سرور اصلی بازی‌ها' }, { status: 500 });
    }
  }

  // ۲. بخش حذف بازی از دیتابیس
  if (id) {
    try {
      await runRedisCommand(['HDEL', 'my_games_dict', id.toString()]);
      return NextResponse.json({ success: true });
    } catch (err) {
      return NextResponse.json({ error: 'خطا در حذف' }, { status: 500 });
    }
  }

  // ۳. لود کردن بازی‌های ذخیره‌شده در صفحه اصلی سایت (استفاده از HVALS به جای HGETALL برای سرعت و راحتی بیشتر)
  try {
    // دستور HVALS مستقیماً فقط مقادیر (دیتای جیسون بازی‌ها) را به صورت یک آرایه تمیز برمی‌گرداند
    const rawValues = await runRedisCommand(['HVALS', 'my_games_dict']);
    
    if (!rawValues || !Array.isArray(rawValues) || rawValues.length === 0) {
      return NextResponse.json([]);
    }

    const gamesList = rawValues.map((item: any) => {
      try {
        return typeof item === 'string' ? JSON.parse(item) : item;
      } catch (e) {
        return null;
      }
    }).filter(Boolean);

    return NextResponse.json(gamesList);
  } catch (err) {
    return NextResponse.json([]);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.id) return NextResponse.json({ error: 'شناسه بازی معتبر نیست' }, { status: 400 });

    await runRedisCommand(['HSET', 'my_games_dict', body.id.toString(), JSON.stringify(body)]);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: 'خطا در ذخیره‌سازی دیتابیس' }, { status: 500 });
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
 
