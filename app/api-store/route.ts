import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

// اتصال خودکار به دیتابیس آپستاش از طریق متغیرهای نتلیفای
const kv = Redis.fromEnv();

const API_KEY = '8ceb3ebba03c4ddca51106af23868263';
const corsHeaders = {
  'Cache-Control': 'no-cache, no-transform, max-age=0, must-revalidate',
  'Content-Type': 'application/json',
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');

    if (search) {
      const url = `https://api.rawg.io/api/games?key=${API_KEY}&search=${encodeURIComponent(search)}`;
      const rawgRes = await fetch(url);
      if (!rawgRes.ok) return NextResponse.json({ error: 'خطای سرور مرجع' }, { status: rawgRes.status, headers: corsHeaders });
      const rawgData = await rawgRes.json();
      return NextResponse.json(rawgData.results || [], { headers: corsHeaders });
    }

    const gamesData = await kv.get("games_list");
    return NextResponse.json(gamesData || [], { headers: corsHeaders });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders });
  }
}

export async function POST(request: NextRequest) {
  try {
    const gameData = await request.json();
    const games: any[] = (await kv.get("games_list")) || [];
    
    if (games.some((g: any) => g.id.toString() === gameData.id.toString())) {
      return NextResponse.json({ error: 'این بازی قبلاً اضافه شده است.' }, { status: 400, headers: corsHeaders });
    }
    
    games.push(gameData);
    await kv.set("games_list", games);
    return NextResponse.json({ success: true }, { headers: corsHeaders });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders });
  }
}
