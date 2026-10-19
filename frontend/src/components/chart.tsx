import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
// import CartesianGrid maybe later

type DataPoint = {
  date: string;
  price: number;
};

type ChartProps = {
  data: DataPoint[];
  placeholder?: boolean;
};

export default function Chart({ data, placeholder = false }: ChartProps) {
    const prices = data.map((point) => point.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const padding = Math.max((maxPrice - minPrice) * 0.12, 0.01);

    return (
        <div className="detail-chart">
        <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
            <XAxis dataKey="date" tick={{ fill: '#71717a', fontSize: 10 }} />
            <YAxis hide domain={[minPrice - padding, maxPrice + padding]} />
            <Tooltip
              contentStyle={{
                  backgroundColor: '#18181b',
                  border: '1px solid #3f3f46',
                  borderRadius: '6px',
                  color: '#f4f4f5',
                  fontSize: '0.75rem',
              }}
              labelStyle={{ color: '#a1a1aa' }}
              formatter={(value: number) => [`$${value.toFixed(2)}`, 'Price']}
            />
            <Line
                type="monotone"
                dataKey="price"
                stroke={placeholder ? '#71717a' : '#70d6a0'}
                strokeWidth={2}
                strokeDasharray={placeholder ? '5 4' : undefined}
                dot={false}
            />
            </LineChart>
        </ResponsiveContainer>
        </div>
    );
}