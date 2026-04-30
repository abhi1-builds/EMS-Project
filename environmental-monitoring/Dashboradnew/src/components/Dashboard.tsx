import { useState, useEffect } from 'react';
import { Thermometer, Droplets, Wind, Cloud, Activity, RefreshCw } from 'lucide-react';
import Gauge from './Gauge';
import Chart from './Chart';
import { SensorData, ChartDataPoint } from '../types/sensors';

const ESP32_IP = '/esp32/data'; 
const UPDATE_INTERVAL = 3000;

export default function Dashboard() {
  const [sensorData, setSensorData] = useState<SensorData>({
    temperature: 0,
    humidity: 0,
    air_quality: 0,
    co2: 0,
  });

  const [tempHistory, setTempHistory] = useState<ChartDataPoint[]>([]);
  const [humHistory, setHumHistory] = useState<ChartDataPoint[]>([]);
  const [aqiHistory, setAqiHistory] = useState<ChartDataPoint[]>([]);
  const [co2History, setCo2History] = useState<ChartDataPoint[]>([]);
  
  const [isOnline, setIsOnline] = useState(false);
  const [isFetching, setIsFetching] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setIsFetching(true);
      try {
        const response = await fetch(ESP32_IP);
        if (!response.ok) throw new Error('Offline');
        const data: SensorData = await response.json();
        const timestamp = Date.now();

        setSensorData(data);
        setIsOnline(true);

        // Update Histories (Last 20 points)
        setTempHistory(p => [...p.slice(-19), { timestamp, value: data.temperature }]);
        setHumHistory(p => [...p.slice(-19), { timestamp, value: data.humidity }]);
        setAqiHistory(p => [...p.slice(-19), { timestamp, value: data.air_quality }]);
        setCo2History(p => [...p.slice(-19), { timestamp, value: data.co2 }]);
      } catch (e) {
        setIsOnline(false);
      } finally {
        setTimeout(() => setIsFetching(false), 500);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, UPDATE_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans selection:bg-blue-100">
      <div className="max-w-7xl mx-auto">
        
        {/* Animated Header using your config 'gradient' animation */}
        <header className="mb-10 p-8 rounded-[2rem] bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 animate-gradient text-white shadow-2xl shadow-blue-200 border border-white/20">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="animate-float">
              <h1 className="text-4xl font-black tracking-tighter flex items-center gap-3">
                <Activity className="w-10 h-10 text-blue-200" /> 
                EcoMonitor <span className="text-blue-200/50 text-xl font-light italic">Live</span>
              </h1>
              <p className="text-blue-50/80 mt-2 font-medium flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-300 animate-pulse" />
                ESP32 Sensor Cluster Active
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              <div className={`flex items-center gap-3 px-6 py-3 rounded-2xl text-sm font-bold backdrop-blur-xl border transition-all ${
                isOnline ? 'bg-white/10 border-white/20 text-white' : 'bg-red-500/20 border-red-500/40 text-red-100'
              }`}>
                <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
                {isOnline ? 'SYSTEM CONNECTED' : 'OFFLINE - RETRYING'}
              </div>
            </div>
          </div>
        </header>

        {/* Gauges Grid with Hover Effects */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          <div className="hover:scale-[1.02] transition-transform duration-300 cursor-default">
            <Gauge value={sensorData.temperature} max={50} label="Temperature" unit="°C" color="#f43f5e" icon={<Thermometer />} />
          </div>
          <div className="hover:scale-[1.02] transition-transform duration-300 cursor-default">
            <Gauge value={sensorData.humidity} max={100} label="Humidity" unit="%" color="#3b82f6" icon={<Droplets />} />
          </div>
          <div className="hover:scale-[1.02] transition-transform duration-300 cursor-default">
            <Gauge value={sensorData.air_quality} max={500} label="Air Quality" unit="AQI" color="#10b981" icon={<Wind />} />
          </div>
          <div className="hover:scale-[1.02] transition-transform duration-300 cursor-default">
            <Gauge value={sensorData.co2} max={2000} label="CO2 Level" unit="ppm" color="#f59e0b" icon={<Cloud />} />
          </div>
        </div>

        {/* Charts Section with Glassmorphism styles */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/50">
            <Chart data={tempHistory} label="Temperature Analytics" color="#f43f5e" />
          </div>
          <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/50">
            <Chart data={humHistory} label="Humidity Analytics" color="#3b82f6" />
          </div>
        </div>
        
        <footer className="mt-12 text-center text-slate-400 text-sm font-medium">
          Last sync: {new Date().toLocaleTimeString()}
        </footer>
      </div>
    </div>
  );
}