// all the data for a pokemon card is here
// JSX, props, Tailwind, onClick, conditional styling

type PkmnCardProps = {
  image: string;
  name: string;
  set: string;
  price: number;
  percentChange: number;
  volume: number;
};

export default function PkmnCard({
    image,
    name,
    set,
    price,
    percentChange,
    volume,
}: PkmnCardProps) {
    const isPositive = percentChange > 1;

    return (
        <div className="card-container" >
            <img
                src={image}
                alt={name}
                className="w-full h-100 object-contain mb-2 rounded-lg bg-zinc-100"
            />
            <h2 className="font-sans text-sm font-semibold">{name}</h2>
            <p className="text-xs text-zinc-500">{set}</p>
            <div className="mt-2 flex justify-between text-sm">
                <span className="font-bold">${price.toFixed(2)}</span>
                <span className={`font-medium ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
                    {isPositive ? '+' : ''}
                    {percentChange.toFixed(2)}%
                </span>
            </div>
            <p className="text-xs text-zinc-400 mt-1">
                {volume.toLocaleString()} traded
            </p>
        </div>
  );
}