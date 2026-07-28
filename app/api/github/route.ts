import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { token, action } = await request.json();

    // بررسی صحت توکن و لاگین گیت‌هاب
    if (action === 'checkUser') {
      const res = await fetch('https://api.github.com/user', {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });
      
      return NextResponse.json({ status: res.status });
    }

    // جایگاهی برای اضافه کردن درخواست‌های بعدی مثل دریافت و ذخیره لیست بازی‌ها
    // if (action === 'fetchMyGames') { ... }

    return NextResponse.json({ error: 'Action not found' }, { status: 404 });

  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
