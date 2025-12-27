import { NextRequest, NextResponse } from 'next/server';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { eventName, startDate, endDate, routeIds } = body;

    // Validate required fields
    if (!eventName || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Path to events.json
    const filePath = join(process.cwd(), 'public', 'data', 'events.json');
    
    // Read existing events
    const fileContents = readFileSync(filePath, 'utf8');
    const eventsData = JSON.parse(fileContents);

    // Generate new event ID
    const newId = `E${String(eventsData.events.length + 1).padStart(3, '0')}`;

    // Create new event object
    const newEvent = {
      id: newId,
      title: eventName,
      description: `Event created on ${new Date().toLocaleDateString()}`,
      type: 'custom',
      severity: 'medium',
      location: {
        route_id: routeIds[0] || '',
        description: `Affected routes: ${routeIds.join(', ')}`
      },
      start_time: new Date(startDate).toISOString(),
      end_time: new Date(endDate).toISOString(),
      status: 'scheduled',
      impact: {
        affected_routes: routeIds,
        estimated_delay_min: 0,
        lanes_blocked: 0,
        diverted_traffic: false
      },
      authorities: ['Traffic Management System'],
      created_by: 'system_user',
      created_at: new Date().toISOString(),
      last_modified: new Date().toISOString()
    };

    // Add new event to the array
    eventsData.events.push(newEvent);

    // Write back to file
    writeFileSync(filePath, JSON.stringify(eventsData, null, 2), 'utf8');

    return NextResponse.json({
      success: true,
      event: newEvent,
      message: 'Event added successfully'
    });
  } catch (error) {
    console.error('Error adding event:', error);
    return NextResponse.json(
      { error: 'Failed to add event' },
      { status: 500 }
    );
  }
}
