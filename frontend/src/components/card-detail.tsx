// import pkmn-card as a button that spawns a modal
// modals, state management, conditional rendering
import { PkmnCardProps } from './pkmn-card';

type CardDetailProps = {
  card: PkmnCardProps;
  onClose: () => void;
};

export default function CardDetail({ card, onClose }: CardDetailProps) {
  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center">
      <div className="bg-white dark:bg-zinc-800 rounded-xl p-6 w-full max-w-md relative">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-zinc-500 hover:text-zinc-800"
        >
          ✕
        </button>
        <img src={card.imageHires} alt={card.name} className="w-full rounded mb-4" />
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