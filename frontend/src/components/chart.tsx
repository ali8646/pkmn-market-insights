import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

type DataPoint = {
  date: string;
  price: number;
};

type ChartProps = {
  data: DataPoint[];
};



export default function Chart({ data }: ChartProps) {
    const minY = Math.floor(Math.min(...data.map(d => d.price)));
    const maxY = Math.ceil(Math.max(...data.map(d => d.price)));

    return (
        <div className="w-1/2 h-128">
        <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
            <XAxis dataKey="date"/>
            <YAxis  domain={[minY, maxY]}/>
            <Tooltip
              contentStyle={{
                  backgroundColor: '#1f2937',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '0.875rem',
              }}
              labelStyle={{ color: '#9ca3af' }} // Lighter gray for labels
              formatter={(value: number) => [`$${value.toFixed(2)}`, 'Price']}
            />
            {/* add a conditional to change color if %change is pos or neg*/}
            <Line type="monotone" dataKey="price" stroke="#21db1a" strokeWidth={3} dot={false}  />
            </LineChart>
        </ResponsiveContainer>
        </div>
    );
}