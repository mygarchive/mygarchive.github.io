import { NextResponse } from 'next/server';

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL || '';
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || '';

async function runRedisCommand(command: string[]) {
  if (!UPSTASH_URL || !UPSTASH_TOKEN) {
    console.error('Upstash credentials are missing!');
    return null;
  }

  try {
    const cleanUrl = UPSTASH_URL.trim().replace(/\/$/, '');
    
    const res = await fetch(cleanUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${UPSTASH_TOKEN.trim()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(command),
    });

    if (!res.ok) {
      console.error(`Upstash Error Status: ${res.status}`);
      return null;
    }
    
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

    if (id) {
      const singleGame = gamesList.find((g: any) => g.id.toString() === id.toString());
      return NextResponse.json(singleGame || null);
    }

    return NextResponse.json(gamesList);

  } catch (globalError: any) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// 🚀 اصلاح شده: فرآیند استخراج مستقیم دیتای RAWG و استیم کاملاً به بک‌اند منتقل شد
export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body || !body.id) {
      return NextResponse.json({ error: 'دیتا یا شناسه بازی معتبر نیست' }, { status: 400 });
    }

    const apiKey = '8ceb3ebba03c4ddca51106af23868263';
    let steamUrl = null;
    let developers = body.developers || [];
    let publishers = body.publishers || [];
    let platforms = body.platforms || [];
    let clip = body.clip || null;

    // 🌐 این درخواست‌ها به جای مرورگر شما، روی سرور خارج از کشور اجرا شده و فیلترینگ را دور می‌زنند
    try {
      // ۱. دریافت جزییات تکمیلی
      const detailRes = await fetch(`https://api.rawg.io/api/games/${body.id}?key=${apiKey}`);
      if (detailRes.ok) {
        const detailData = await detailRes.json();
        developers = detailData.developers || developers;
        publishers = detailData.publishers || publishers;
        platforms = detailData.platforms || platforms;
        clip = detailData.clip || clip;
      }

      // ۲. دریافت استیم استور و استخراج هوشمند لینک
      const storesRes = await fetch(`https://api.rawg.io/api/games/${body.id}/stores?key=${apiKey}`);
      if (storesRes.ok) {
        const storesData = await storesRes.json();
        const steamStore = storesData.results?.find(
          (s: any) => s.store_id === 1 || s.url?.includes('store.steampowered.com')
        );
        if (steamStore?.url) {
          steamUrl = steamStore.url;
        }
      }
    } catch (apiErr) {
      console.error('خطای بک‌اند در ارتباط با API های جانبی RAWG:', apiErr);
    }

    // ادغام دیتای دریافتی اولیه با اطلاعات استخراج شده از سرور
    const finalGameObject = {
      ...body,
      developers,
      publishers,
      platforms,
      clip,
      steam_url: steamUrl
    };

    // ذخیره کپسول نهایی و کامل در Upstash
    const result = await runRedisCommand(['HSET', 'my_games_dict', body.id.toString(), JSON.stringify(finalGameObject)]);
    
    if (result === null) {
      return NextResponse.json({ error: 'خطا در ذخیره‌سازی در دیتابیس' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
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
    return NextResponse.json({ error: 'خطا در حذف از دیتابیس' }, { status: 500 });
  }
}
