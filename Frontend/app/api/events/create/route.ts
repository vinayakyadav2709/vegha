import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log('📥 Received from frontend:', body);

    const sumoUrl = process.env.NEXT_PUBLIC_SUMO_SERVER_URL || 'http://localhost:3200';
    const target = `${sumoUrl.replace(/\/$/, '')}/api/events/create`;

    const payload: {
      title: string;
      streets: string[];
      id?: string;
    } = {
      title: body.title || body.eventName || body.name || 'Untitled Event',
      streets: body.streets || body.routeIds || body.streetsList || [],
    };

    if (body.id && typeof body.id === 'string' && body.id.trim()) {
      payload.id = body.id.trim();
    }

    console.log('📤 Sending to Flask backend:', payload);
    console.log('🎯 Target URL:', target);

    if (!payload.title || !payload.streets || payload.streets.length === 0) {
      console.error('❌ Validation failed:', payload);
      return NextResponse.json(
        { 
          error: 'Missing required fields (title and streets)',
          received: payload 
        },
        { status: 400 }
      );
    }

    const res = await fetch(target, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    // ✅ Check content-type BEFORE parsing
    const contentType = res.headers.get('content-type');
    console.log('📦 Response status:', res.status);
    console.log('📦 Response content-type:', contentType);

    // ✅ If HTML response, get the text first
    if (!contentType?.includes('application/json')) {
      const text = await res.text();
      console.error('❌ Flask returned HTML instead of JSON:');
      console.error('First 500 chars:', text.substring(0, 500));
      
      return NextResponse.json(
        { 
          error: 'Flask backend error',
          details: 'Server returned HTML error page instead of JSON',
          status: res.status,
          preview: text.substring(0, 300),
          hint: 'Check Flask terminal for error details'
        },
        { status: res.status || 500 }
      );
    }

    // ✅ Safe to parse JSON now
    const data = await res.json();
    
    if (res.ok) {
      console.log('✅ Flask backend response:', data);
    } else {
      console.error('❌ Flask backend error:', data);
    }

    return NextResponse.json(data, { status: res.status });
    
  } catch (error: any) {
    console.error('❌ Error in API route:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create event',
        details: error.message 
      }, 
      { status: 500 }
    );
  }
}
