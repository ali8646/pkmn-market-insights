// import pkmn-card as a button that spawns a modal
// modals, state management, conditional rendering
import { PkmnCardProps } from './pkmn-card';
import Chart from './chart';

type CardDetailProps = {
  card: PkmnCardProps;
  onClose: () => void;
};

export default function CardDetail({ card, onClose }: CardDetailProps) {

    const isPositive = card.percentChange > 1;
    const mockData = [
        { date: '2024-06-01', price: 3.1 },
        { date: '2024-06-08', price: 3.5 },
        { date: '2024-06-15', price: 4.0 },
        { date: '2024-06-22', price: 4.2 },
        { date: '2024-06-29', price: 2.4 },
    ];
    const handleBackgroundClick = () => onClose();
    const stopPropagation = (e: React.MouseEvent) => e.stopPropagation();

    return (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center"
            onClick={handleBackgroundClick}>
            <div 
                className="bg-white dark:bg-zinc-800 rounded-xl p-6 relative max-w-[90vw] max-h-[90vh] overflow-auto"
                onClick={stopPropagation}>
                <button
                    onClick={onClose}
                    className="absolute top-2 right-2 text-zinc-500 hover:text-zinc-800"
                >
                    ✕
                </button>
            <div className="flex flex-col md:flex-row gap-4 mb-4">
                <img
                    src={card.imageHires}
                    alt={card.name}
                    className="w-full h-128 md:w-1/2 object-contain rounded"
                />
                <div className="w-full md:w-1/2">
                    <Chart data={mockData} />
                </div>
            </div>
                <h2 className="text-2xl font-bold">{card.name}</h2>
                <p className="text-sm text-zinc-400 mb-2">{card.set}</p>
                <div className="text-lg font-semibold">${card.price.toFixed(2)}</div>
                <div className={`text-sm ${card.percentChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {card.percentChange >= 0 ? '+' : ''}
                    {card.percentChange.toFixed(2)}%
                </div>
                <p className="mt-4 text-sm text-zinc-400">{card.volume} traded</p>
            </div>
        </div>
    );
}