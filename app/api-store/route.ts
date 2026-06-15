import { NextResponse } from 'next/server';

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL || '';
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || '';

async function runRedisCommand(command: string[]) {
  if (!UPSTASH_URL || !UPSTASH_TOKEN) {
    return { error: "EMPTY_ENV", url: !!UPSTASH_URL, token: !!UPSTASH_TOKEN };
  }

  try {
    const baseUrl = UPSTASH_URL.trim().replace(/\/$/, '');
    const finalUrl = `${baseUrl}/pipeline`;

    const res = await fetch(finalUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${UPSTASH_TOKEN.trim()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([command]),
    });

    if (!res.ok) {
      return { 
        error: "UPSTASH_ERROR", 
        status: res.status,
        urlSnippet: UPSTASH_URL.substring(0, 20),
        tokenLength: UPSTASH_TOKEN.trim().length,
        tokenFirstChars: UPSTASH_TOKEN.trim().substring(0, 5)
      };
    }
    
    const data = await res.json();
    return { success: true, result: data[0]?.result };
  } catch (err: any) {
    return { error: "FETCH_FAILED", message: err.message };
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const id = searchParams.get('id');

    // تست وضعیت دیتابیس قبل از هر کاری
    const redisTest = await runRedisCommand(['EXISTS', 'my_games_dict']);
    
    if (redisTest.error) {
      return NextResponse.json({ 
        error: 'Authentication or Connection Error with Database', 
        debugInfo: redisTest 
      }, { status: 401 });
    }

    // ۱. بخش جستجوی بازی از API اصلی RAWG با کلید اختصاصی جدید حسین
    if (search) {
      const apiKey = '8ceb3ebba03c4ddca51106af23868263'; // 🔑 کلید جدید و پرامتیاز شما جایگزین شد
      const apiUrl = `https://api.rawg.io/api/games?key=${apiKey}&search=${encodeURIComponent(search)}&page_size=12`;
      
      const res = await fetch(apiUrl);
      
      if (!res.ok) {
        const rawgErrorText = await res.text();
        return NextResponse.json({ 
          error: 'RAWG Error', 
          statusCode: res.status,
          rawgMessage: rawgErrorText 
        }, { status: res.status });
      }
      
      const data = await res.json();
      return NextResponse.json(data.results || []);
    }

    // ۲. دریافت اطلاعات کل بازی‌ها از دیتابیس آپستاش
    const rawValues = redisTest.result;
    if (!rawValues || !Array.isArray(rawValues) || rawValues.length === 0) {
      return NextResponse.json([]);
    }

    const gamesList = rawValues
      .map((item: any) => {
        try { return typeof item === 'string' ? JSON.parse(item) : item; } catch (e) { return null; }
      })
      .filter(Boolean);

    if (id) {
      const singleGame = gamesList.find((g: any) => g.id.toString() === id.toString());
      return NextResponse.json(singleGame || null);
    }

    return NextResponse.json(gamesList);

  } catch (globalError: any) {
    return NextResponse.json({ error: 'Internal Server Error', details: globalError.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body || !body.id) return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
    const res = await runRedisCommand(['HSET', 'my_games_dict', body.id.toString(), JSON.stringify(body)]);
    if (res.error) return NextResponse.json({ error: res.error }, { status: 401 });
    return NextResponse.json({ success: true });
  } catch (err) { return NextResponse.json({ status: 500 }); }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ status: 400 });
    const res = await runRedisCommand(['HDEL', 'my_games_dict', id.toString()]);
    if (res.error) return NextResponse.json({ error: res.error }, { status: 401 });
    return NextResponse.json({ success: true });
  } catch (err) { return NextResponse.json({ status: 500 }); }
}
