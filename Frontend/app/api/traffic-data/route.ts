import { NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';

export async function GET() {
  try {
    // Path to the RL results JSON file
    const filePath = join(process.cwd(), '..', 'FDRL', 'inference_results', 'rl_results.json');
    
    // Read the JSON file
    const fileContents = readFileSync(filePath, 'utf8');
    const data = JSON.parse(fileContents);
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error reading RL results:', error);
    
    // Return fallback data if file doesn't exist or has errors
    return NextResponse.json({
      traffic_data: [
        {
          vehicle_type: "private",
          no_of_vehicles: 0,
          avg_waiting_time: 0
        },
        {
          vehicle_type: "public",
          no_of_vehicles: 0,
          avg_waiting_time: 0
        },
        {
          vehicle_type: "emergency",
          no_of_vehicles: 0,
          avg_waiting_time: 0
        }
      ]
    });
  }
}
