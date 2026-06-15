import { NextResponse } from 'next/server';

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL || '';
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || '';

// تابع کمکی برای فرستادن مستقیم دستورات به آپستاش بدون نیاز به پکیج اضافی
async function runRedisCommand(command: string[]) {
  const res = await fetch(`${UPSTASH_URL}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${UPSTASH_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(command),
  });
  if (!res.ok) throw new Error('Upstash Redis Error');
  const data = await res.json();
  return data.result;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search');
  const id = searchParams.get('id');

  // اگر ادمین در حال سرچ بازی جدید است
  if (search) {
    try {
      const apiKey = '68b92b6794614ffcb7d091e0a9d80fc4';
      const res = await fetch(`https://api.rawg.io/api/games?key=${apiKey}&search=${encodeURIComponent(search)}&page_size=12`);
      if (!res.ok) throw new Error('RAWG API Error');
      const data = await res.json();
      return NextResponse.json(data.results || []);
    } catch (err) {
      return NextResponse.json({ error: 'خطا در ارتباط با سرور اصلی' }, { status: 500 });
    }
  }

  // حذف بازی خاص
  if (id) {
    try {
      await runRedisCommand(['HDEL', 'my_games_dict', id.toString()]);
      return NextResponse.json({ success: true });
    } catch (err) {
      return NextResponse.json({ error: 'خطا در حذف' }, { status: 500 });
    }
  }

  // دریافت تمام بازی‌های ذخیره شده
  try {
    const rawResult = await runRedisCommand(['HGETALL', 'my_games_dict']);
    if (!rawResult || rawResult.length === 0) return NextResponse.json([]);
    
    // لایه پردازش خروجی HGETALL در حالت عادی (آرایه‌ای از کلید-مقدار متناوب)
    const gamesList: any[] = [];
    for (let i = 1; i < rawResult.length; i += 2) {
      try {
        const item = rawResult[i];
        gamesList.push(typeof item === 'string' ? JSON.parse(item) : item);
      } catch (e) {}
    }
    return NextResponse.json(gamesList);
  } catch (err) {
    return NextResponse.json([]);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.id) return NextResponse.json({ error: 'شناسه معتبر نیست' }, { status: 400 });

    await runRedisCommand(['HSET', 'my_games_dict', body.id.toString(), JSON.stringify(body)]);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'خطا در ذخیره‌سازی' }, { status: 500 });
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
