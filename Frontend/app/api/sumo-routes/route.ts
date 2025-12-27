import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Fetch routes from SUMO server
    const sumoServerUrl = '192.168.0.107:5000';
    
    const response = await fetch(`${sumoServerUrl}/api/streets`, {
      cache: 'no-store'
    });

    if (!response.ok) {
      throw new Error('Failed to fetch routes from SUMO server');
    }

    const data = await response.json();
    
    // Return street/edge IDs as routes
    return NextResponse.json({
      routes: data.streets || [],
      total: data.total || 0
    });
  } catch (error) {
    console.error('Error fetching SUMO routes:', error);
    
    // Return fallback empty routes
    return NextResponse.json({
      routes: [],
      total: 0,
      error: 'Failed to fetch routes from SUMO simulation'
    }, { status: 500 });
  }
}
