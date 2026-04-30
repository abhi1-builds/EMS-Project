import type { ChartDataPoint } from '../types/sensors';

interface ChartProps {
  data: ChartDataPoint[];
  label: string;
  color: string;
  unit: string;
  maxDataPoints?: number;
}

export default function Chart({ data, label, color, unit, maxDataPoints = 50 }: ChartProps) {
  const displayData = data.slice(-maxDataPoints);

  if (displayData.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-shadow duration-300">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">{label}</h3>
        <div className="h-48 flex items-center justify-center text-gray-400">
          Waiting for data...
        </div>
      </div>
    );
  }

  const values = displayData.map(d => d.value);
  const maxValue = Math.max(...values);
  const minValue = Math.min(...values);
  const range = maxValue - minValue || 1;
  const padding = range * 0.1;

  const chartHeight = 160;
  const chartWidth = 600;

  const points = displayData
    .map((point, index) => {
      const x = (index / (displayData.length - 1 || 1)) * chartWidth;
      const y =
        chartHeight -
        ((point.value - minValue + padding) / (range + 2 * padding)) * chartHeight;
      return `${x},${y}`;
    })
    .join(' ');

  const areaPoints = `0,${chartHeight} ${points} ${chartWidth},${chartHeight}`;

  const gradientColor = color.includes('blue')
    ? '#3b82f6'
    : color.includes('green')
    ? '#10b981'
    : color.includes('yellow')
    ? '#f59e0b'
    : '#ef4444';

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-shadow duration-300">

      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-800">{label}</h3>

        <div className="text-sm text-gray-500">
          Latest:{' '}
          <span className="font-bold" style={{ color: gradientColor }}>
            {displayData[displayData.length - 1]?.value.toFixed(1)} {unit}
          </span>
        </div>
      </div>

      <div className="relative w-full overflow-hidden">
        <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-48" preserveAspectRatio="none">

          <defs>
            <linearGradient id={`area-gradient-${label}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={gradientColor} stopOpacity="0.3" />
              <stop offset="100%" stopColor={gradientColor} stopOpacity="0.05" />
            </linearGradient>
          </defs>

          <polygon
            points={areaPoints}
            fill={`url(#area-gradient-${label})`}
            className="transition-all duration-300"
          />

          <polyline
            points={points}
            fill="none"
            stroke={gradientColor}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="transition-all duration-300"
          />

          {displayData.map((point, index) => {
            const x = (index / (displayData.length - 1 || 1)) * chartWidth;
            const y =
              chartHeight -
              ((point.value - minValue + padding) / (range + 2 * padding)) * chartHeight;

            return (
              <circle
                key={index}
                cx={x}
                cy={y}
                r="3"
                fill={gradientColor}
                className="transition-all duration-300 hover:r-5"
              />
            );
          })}
        </svg>
      </div>

      <div className="flex justify-between text-xs text-gray-400 mt-2">
        <span>Min: {minValue.toFixed(1)}</span>
        <span>Max: {maxValue.toFixed(1)}</span>
      </div>

    </div>
  );
}