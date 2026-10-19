import { LineChart, Line, XAxis, YAxis, ResponsiveContainer } from 'recharts';

type DataPoint = {
  date: string;
  price: number;
};

export const createPlaceholderTrend = (productId: number, price: number | null): DataPoint[] => {
  const baseline = price ?? 25;
  return Array.from({ length: 14 }, (_, index) => {
    const wave = Math.sin((index + productId % 7) * 0.62) * 0.045;
    const drift = ((index - 7) / 7) * 0.025;
    return {
      date: `Day ${index + 1}`,
      price: Math.max(0.01, baseline * (1 + wave + drift)),
    };
  });
};

type MiniChartProps = {
  data: DataPoint[];
  positive?: boolean;
  placeholder?: boolean;
};

export default function MiniChart({
  data,
  positive = true,
  placeholder = false,
}: MiniChartProps) {
  if (data.length < 2) {
      return <span className="trend-unavailable">—</span>;
  }
  const prices = data.map((point) => point.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const padding = Math.max((maxPrice - minPrice) * 0.12, 0.01);

  return (
      <div className="mini-chart">
      <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
          <XAxis hide/>
          <YAxis hide domain={[minPrice - padding, maxPrice + padding]}/>
          <Line
              type="monotone"
              dataKey="price"
              stroke={placeholder ? '#71717a' : positive ? '#70d6a0' : '#f1848c'}
              strokeWidth={2}
              strokeDasharray={placeholder ? '4 3' : undefined}
              dot={false}
          />
          </LineChart>
      </ResponsiveContainer>
      </div>
    );
}