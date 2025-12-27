export interface TrafficVehicleData {
  vehicle_type: string;
  no_of_vehicles: number;
  avg_waiting_time: number;
}

export interface TrafficData {
  traffic_data: TrafficVehicleData[];
}
