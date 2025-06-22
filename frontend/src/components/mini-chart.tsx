import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

type DataPoint = {
  date: string;
  price: number;
};

type MiniChartProps = {
  data: DataPoint[];
};



export default function Chart({ data }: MiniChartProps) {
    const minY = Math.floor(Math.min(...data.map(d => d.price)));
    const maxY = Math.ceil(Math.max(...data.map(d => d.price)));

    return (
        <div className="w-full h-32">
        <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
            <XAxis hide/>
            <YAxis hide domain={[minY, maxY]}/>
            {/* add a conditional to change color if %change is pos or neg*/}
            <Line type="monotone" dataKey="price" stroke="#21db1a" strokeWidth={3} dot={false} />
            </LineChart>
        </ResponsiveContainer>
        </div>
    );
}