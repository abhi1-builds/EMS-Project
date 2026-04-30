import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface ChartProps {
  data: any[];
  label: string;
  color: string;
}

export default function Chart({ data, label, color }: ChartProps) {
  return (
    <div className="h-72 w-full">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-sm font-bold text-slate-800 tracking-tight">{label}</h3>
        <span className="text-[10px] bg-slate-100 px-2 py-1 rounded-md text-slate-500 font-bold uppercase">Last 60s</span>
      </div>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id={`color-${label}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.3}/>
              <stop offset="95%" stopColor={color} stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis dataKey="timestamp" hide />
          <YAxis 
            stroke="#cbd5e1" 
            fontSize={10} 
            tickLine={false} 
            axisLine={false}
            tickFormatter={(val) => val.toFixed(1)}
          />
          <Tooltip 
            contentStyle={{ backgroundColor: '#fff', borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
          />
          <Area 
            type="monotone" 
            dataKey="value" 
            stroke={color} 
            strokeWidth={4} 
            fillOpacity={1} 
            fill={`url(#color-${label})`}
            animationDuration={1000}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}