import React, { useState, useEffect } from 'react';

export default function Dashboard() {
  const [data, setData] = useState({ temp: 25, humidity: 45, pressure: 1013 });

  // Update numbers every 2 seconds to show it's alive!
  useEffect(() => {
    const timer = setInterval(() => {
      setData({
        temp: +(25 + Math.random() * 2).toFixed(1),
        humidity: +(45 + Math.random() * 5).toFixed(0),
        pressure: +(1013 + Math.random() * 2).toFixed(0)
      });
    }, 2000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div style={{ padding: '40px', backgroundColor: '#0f172a', color: 'white', minHeight: '100vh', fontFamily: 'system-ui' }}>
      <header style={{ borderBottom: '2px solid #334155', marginBottom: '30px', paddingBottom: '10px' }}>
        <h1 style={{ margin: 0, color: '#38bdf8' }}>ESP32 LIVE TELEMETRY</h1>
        <span style={{ color: '#4ade80', fontSize: '14px' }}>● SYSTEM ONLINE (DEMO MODE)</span>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
        {/* Temperature Card */}
        <div style={{ background: '#1e293b', padding: '25px', borderRadius: '15px', border: '1px solid #334155' }}>
          <h3 style={{ color: '#94a3b8', marginTop: 0 }}>Temperature</h3>
          <div style={{ fontSize: '3rem', fontWeight: 'bold', color: '#f87171' }}>{data.temp}°C</div>
          <div style={{ width: '100%', height: '8px', background: '#334155', borderRadius: '4px', marginTop: '10px' }}>
            <div style={{ width: `${(data.temp/50)*100}%`, height: '100%', background: '#f87171', borderRadius: '4px' }}></div>
          </div>
        </div>

        {/* Humidity Card */}
        <div style={{ background: '#1e293b', padding: '25px', borderRadius: '15px', border: '1px solid #334155' }}>
          <h3 style={{ color: '#94a3b8', marginTop: 0 }}>Humidity</h3>
          <div style={{ fontSize: '3rem', fontWeight: 'bold', color: '#34d399' }}>{data.humidity}%</div>
          <div style={{ width: '100%', height: '8px', background: '#334155', borderRadius: '4px', marginTop: '10px' }}>
            <div style={{ width: `${data.humidity}%`, height: '100%', background: '#34d399', borderRadius: '4px' }}></div>
          </div>
        </div>

        {/* Pressure Card */}
        <div style={{ background: '#1e293b', padding: '25px', borderRadius: '15px', border: '1px solid #334155' }}>
          <h3 style={{ color: '#94a3b8', marginTop: 0 }}>Pressure</h3>
          <div style={{ fontSize: '3rem', fontWeight: 'bold', color: '#60a5fa' }}>{data.pressure}</div>
          <p style={{ color: '#94a3b8', margin: '5px 0 0 0' }}>hPa (Stable)</p>
        </div>
      </div>

      <footer style={{ marginTop: '40px', color: '#475569', fontSize: '12px' }}>
        Connected to: http://localhost:5173/esp32
      </footer>
    </div>
  );
}