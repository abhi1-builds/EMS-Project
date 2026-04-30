interface GaugeProps {
  value: number;
  max: number;
  min?: number;
  label: string;
  unit: string;
  color: string;
  icon: React.ReactNode;
}

export default function Gauge({ value, max, min = 0, label, unit, color, icon }: GaugeProps) {
  const percentage = ((value - min) / (max - min)) * 100;
  const clampedPercentage = Math.min(Math.max(percentage, 0), 100);
  const rotation = (clampedPercentage / 100) * 180 - 90;

  const getStatusColor = () => {
    if (percentage < 33) return 'text-green-500';
    if (percentage < 66) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-shadow duration-300">
      <div className="flex items-center gap-3 mb-4">
        <div className={`${color} p-2 rounded-lg`}>
          {icon}
        </div>
        <h3 className="text-lg font-semibold text-gray-800">{label}</h3>
      </div>

      <div className="relative w-full aspect-square max-w-[200px] mx-auto">
        <svg viewBox="0 0 200 120" className="w-full">

          <defs>
            <linearGradient id={`gradient-${label}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#e5e7eb" />
              <stop
                offset={`${clampedPercentage}%`}
                stopColor={
                  color.includes('blue')
                    ? '#3b82f6'
                    : color.includes('green')
                    ? '#10b981'
                    : color.includes('yellow')
                    ? '#f59e0b'
                    : '#ef4444'
                }
              />
              <stop offset="100%" stopColor="#e5e7eb" />
            </linearGradient>
          </defs>

          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="12"
            strokeLinecap="round"
          />

          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke={`url(#gradient-${label})`}
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={`${(clampedPercentage / 100) * 251.2} 251.2`}
            className="transition-all duration-700 ease-out"
          />

          <line
            x1="100"
            y1="100"
            x2="100"
            y2="30"
            stroke="#374151"
            strokeWidth="3"
            strokeLinecap="round"
            transform={`rotate(${rotation} 100 100)`}
            className="transition-transform duration-700 ease-out"
          />

          <circle cx="100" cy="100" r="8" fill="#374151" />
        </svg>
      </div>

      <div className="text-center mt-4">
        <div className={`text-4xl font-bold ${getStatusColor()}`}>
          {value.toFixed(1)}
        </div>
        <div className="text-sm text-gray-500 mt-1">{unit}</div>
      </div>

      <div className="flex justify-between text-xs text-gray-400 mt-4 px-2">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}