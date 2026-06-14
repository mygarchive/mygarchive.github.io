import { NextRequest, NextResponse } from 'next/server';

const API_KEY = '8ceb3ebba03c4ddca51106af23868263';

const corsHeaders = {
  'Cache-Control': 'no-cache, no-transform, max-age=0, must-revalidate',
  'Content-Type': 'application/json',
};

// تابع پیشرفته برای استخراج دسترسی KV در محیط OpenNext
function getCloudflareKV(request: any) {
  try {
    if (request.context?.runtime?.env?.GAME_KV) return request.context.runtime.env.GAME_KV;
    if (request.context?.env?.GAME_KV) return request.context.env.GAME_KV;
    
    const processEnv = process.env as any;
    if (processEnv.GAME_KV) return processEnv.GAME_KV;
    
    const globalThisAny = globalThis as any;
    if (globalThisAny.__cloudflare_env__?.GAME_KV) return globalThisAny.__cloudflare_env__.GAME_KV;
    if (globalThisAny.GAME_KV) return globalThisAny.GAME_KV;
    
    if (typeof request === 'object' && request !== null) {
      for (const key of Object.keys(request)) {
        if (request[key]?.env?.GAME_KV) return request[key].env.GAME_KV;
      }
    }
  } catch (e) {
    console.error("Error finding KV:", e);
  }
  return null;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');

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

    const myKv = getCloudflareKV(request);
    if (!myKv) return NextResponse.json([], { headers: corsHeaders });

    const gamesData = await myKv.get("games_list");
    return NextResponse.json(gamesData ? JSON.parse(gamesData) : [], { headers: corsHeaders });

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'خطای ناشناخته' }, 
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const myKv = getCloudflareKV(request);

    if (!myKv) {
      return NextResponse.json(
        { error: "اتصال به دیتابیس (KV) برقرار نیست. لطفاً فایل wrangler.toml را در پروژه چک کنید." }, 
        { status: 500, headers: corsHeaders }
      );
    }

    const gameData = await request.json();
    const gamesData = await myKv.get("games_list");
    const games = gamesData ? JSON.parse(gamesData) : [];
    
    if (games.some((g: any) => g.id.toString() === gameData.id.toString())) {
      return NextResponse.json(
        { error: 'این بازی قبلاً اضافه شده است.' }, 
        { status: 400, headers: corsHeaders }
      );
    }
    
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
