export interface SensorData {
  temperature: number;
  humidity: number;
  air_quality: number;
  co2: number;
}

export interface ChartDataPoint {
  timestamp: number;
  value: number;
}