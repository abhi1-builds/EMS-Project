import React from 'react';

interface GaugeProps {
  value: number;
  max: number;
  label: string;
  unit: string;
  color: string;
  icon: React.ReactNode;
}

export default function Gauge({ value, max, label, unit, color, icon }: GaugeProps) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const percentage = Math.min((value / max) * 100, 100);
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col items-center group">
      <div className="flex items-center gap-3 mb-6">
        <div style={{ color: color }} className="p-2 bg-slate-50 rounded-xl group-hover:scale-110 transition-transform">
          {icon}
        </div>
        <span className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">{label}</span>
      </div>
      
      <div className="relative w-36 h-36 flex items-center justify-center">
        <svg className="w-full h-full transform -rotate-90">
          <circle
            cx="72" cy="72" r={radius}
            fill="transparent"
            stroke="#f8fafc"
            strokeWidth="12"
          />
          <circle
            cx="72" cy="72" r={radius}
            fill="transparent"
            stroke={color}
            strokeWidth="12"
            strokeDasharray={circumference}
            style={{ 
              strokeDashoffset: offset,
              transition: 'stroke-dashoffset 1.5s cubic-bezier(0.4, 0, 0.2, 1)' 
            }}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-black text-slate-800 tracking-tighter">{value}</span>
          <span className="text-[10px] text-slate-400 font-bold uppercase">{unit}</span>
        </div>
      </div>
    </div>
  );
}