import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export type DataPoint = {
  date: string;
  price: number;
};

type ChartProps = {
  data: DataPoint[];
  positive?: boolean;
  placeholder?: boolean;
};

interface TooltipPayloadItem {
  value?: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (active && payload && payload.length && typeof payload[0].value === 'number') {
    return (
      <div className="chart-tooltip-wrap">
        <span className="chart-tooltip-date">{label}</span>
        <strong className="chart-tooltip-price">${payload[0].value.toFixed(2)}</strong>
      </div>
    );
  }
  return null;
}

export default function Chart({ data, positive = true, placeholder = false }: ChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="detail-chart chart-empty-state">
        <span>No price data available</span>
      </div>
    );
  }

  const prices = data.map((point) => point.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const padding = Math.max((maxPrice - minPrice) * 0.12, 0.05);

  const strokeColor = placeholder
    ? '#71717a'
    : positive
      ? '#70d6a0'
      : '#f1848c';

  const gradientId = `chartGradient-${placeholder ? 'gray' : positive ? 'green' : 'red'}`;

  return (
    <div className="detail-chart">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 6, left: 6, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={strokeColor} stopOpacity={placeholder ? 0.08 : 0.22} />
              <stop offset="95%" stopColor={strokeColor} stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="date"
            tick={{ fill: 'var(--text-muted, #71717a)', fontSize: 10 }}
            axisLine={{ stroke: 'var(--border-subtle, #18181b)' }}
            tickLine={false}
            dy={6}
          />
          <YAxis hide domain={[minPrice - padding, maxPrice + padding]} />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="price"
            stroke={strokeColor}
            strokeWidth={2}
            strokeDasharray={placeholder ? '4 3' : undefined}
            fill={`url(#${gradientId})`}
            dot={false}
            activeDot={{
              r: 4,
              fill: strokeColor,
              stroke: 'var(--bg-surface, #0d0d0f)',
              strokeWidth: 2,
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
