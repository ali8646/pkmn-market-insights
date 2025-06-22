import MiniChart from './mini-chart';
import Details from './card-detail'
import { useState } from 'react';
import { createPortal } from 'react-dom';
// all the data for a pokemon card is here
// JSX, props, Tailwind, onClick, conditional styling

export type PkmnCardProps = {
  imageLowres: string;
  imageHires: string;
  name: string;
  set: string;
  price: number;
  percentChange: number;
  volume: number;
};

export default function PkmnCard({
    imageLowres,
    imageHires,
    name,
    set,
    price,
    percentChange,
    volume,
}: PkmnCardProps) {
    const [showModal, setShowModal] = useState(false);
    const isPositive = percentChange > 1;
    const mockData = [
        { date: '2024-06-01', price: 3.1 },
        { date: '2024-06-08', price: 3.5 },
        { date: '2024-06-15', price: 4.0 },
        { date: '2024-06-22', price: 4.2 },
        { date: '2024-06-29', price: 2.4 },
    ];

    return (
        <>
            <div
                className="card-container cursor-pointer"
                onClick={() => setShowModal(true)}
            >
                <img
                    src={imageLowres}
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
                <MiniChart 
                    data={mockData}
                />
                <p className="text-xs text-zinc-400 mt-1">
                    {volume.toLocaleString()} traded
                </p>
            </div>
            {showModal &&
                createPortal(
                    <Details
                        card={{
                            imageLowres,
                            imageHires,
                            name,
                            set,
                            price,
                            percentChange,
                            volume,
                        }}
                        onClose={() => setShowModal(false)}
                    />,
                    document.body
                )
            }
        </>
    );
}