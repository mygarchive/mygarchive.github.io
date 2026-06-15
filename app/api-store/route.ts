import { NextRequest, NextResponse } from 'next/server';

const API_KEY = '8ceb3ebba03c4ddca51106af23868263';

const corsHeaders = {
  'Cache-Control': 'no-cache, no-transform, max-age=0, must-revalidate',
  'Content-Type': 'application/json',
};

// تابع هوشمند برای استخراج دسترسی به KV (پشتیبانی از هر دو نام GAME_KV و game-db)
function getCloudflareKV(request: any) {
  try {
    const globalThisAny = globalThis as any;
    
    // ۱. بررسی نام متغیر محیطی (Variable Name تعریف شده در بایندینگ)
    if (globalThisAny.GAME_KV) return globalThisAny.GAME_KV;
    if (globalThisAny.__cloudflare_env__?.GAME_KV) return globalThisAny.__cloudflare_env__.GAME_KV;
    
    // ۲. بررسی نام خود دیتابیس (برای اطمینان بیشتر در لایه ورکر)
    if (globalThisAny['game-db']) return globalThisAny['game-db'];
    if (globalThisAny.game_db) return globalThisAny.game_db;
    if (globalThisAny.__cloudflare_env__?.['game-db']) return globalThisAny.__cloudflare_env__['game-db'];

    // ۳. بررسی متغیرهای پروسس سیستم
    if (process.env.GAME_KV) return process.env.GAME_KV;
    if (process.env['game-db']) return process.env['game-db'];

    // ۴. بررسی از روی کانتکست و پلتفرم درخواست ورکر
    if (request?.context?.env?.GAME_KV) return request.context.env.GAME_KV;
    if (request?.env?.GAME_KV) return request.env.GAME_KV;
    if (request?.context?.env?.['game-db']) return request.context.env['game-db'];

    // ۵. اسکن عمیق آبجکت درخواست برای پیدا کردن ران‌تایم ابری
    if (request && typeof request === 'object') {
      for (const key of Object.keys(request)) {
        if (request[key]?.env?.GAME_KV) return request[key].env.GAME_KV;
        if (request[key]?.env?.['game-db']) return request[key].env['game-db'];
        if (request[key]?.context?.env?.GAME_KV) return request[key].context.env.GAME_KV;
        if (request[key]?.context?.env?.['game-db']) return request[key].context.env['game-db'];
      }
    }
  } catch (e) {
    console.error("Error finding KV namespace:", e);
  }
  return null;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');

    // بخش اول: جستجوی بازی از API خارجی (RAWG)
    if (search) {
      const url = `https://api.rawg.io/api/games?key=${API_KEY}&search=${encodeURIComponent(search)}`;
      const rawgRes = await fetch(url);
      
      if (!rawgRes.ok) {
        return NextResponse.json(
          { error: `خطای سرور مرجع: ${rawgRes.status}` }, 
          { status: rawgRes.status, headers: corsHeaders }
        );
      }

      const rawgData = await rawgRes.json();
      return NextResponse.json(rawgData.results || [], { headers: corsHeaders });
    }

    // بخش دوم: خواندن لیست بازی‌های ذخیره شده از دیتابیس KV کلودفلر
    const myKv = getCloudflareKV(request);
    if (!myKv) {
      return NextResponse.json([], { headers: corsHeaders });
    }

    const gamesData = await myKv.get("games_list");
    return NextResponse.json(gamesData ? JSON.parse(gamesData) : [], { headers: corsHeaders });

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'خطای ناشناخته در سرور ابری' }, 
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const myKv = getCloudflareKV(request);

    // اگر هیچکدام از راه‌ها به دیتابیس وصل نشد، خطای راهنما را بفرستد
    if (!myKv) {
      return NextResponse.json(
        { error: "اتصال به دیتابیس (KV) برقرار نیست. لطفا مطمئن شوید اتصال Variable Name روی GAME_KV ست شده باشد." }, 
        { status: 500, headers: corsHeaders }
      );
    }

    const gameData = await request.json();
    const gamesData = await myKv.get("games_list");
    const games = gamesData ? JSON.parse(gamesData) : [];
    
    // جلوگیری از ذخیره بازی تکراری
    if (games.some((g: any) => g.id.toString() === gameData.id.toString())) {
      return NextResponse.json(
        { error: 'این بازی قبلاً به لیست شما اضافه شده است.' }, 
        { status: 400, headers: corsHeaders }
      );
    }
    
    // اضافه کردن بازی جدید و ذخیره در کلاودفلر
    games.push(gameData);
    await myKv.put("games_list", JSON.stringify(games));
    
    return NextResponse.json({ success: true }, { headers: corsHeaders });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message }, 
      { status: 500, headers: corsHeaders }
    );
  }
}
