// import pkmn-card as a button that spawns a modal
// modals, state management, conditional rendering
import { PkmnCardProps } from './pkmn-card';
import Chart from './chart';
import { useEffect, useState } from 'react';
import { apiFetch } from '../lib/auth';

type CardDetailProps = {
  card: PkmnCardProps;
  onClose: () => void;
};

const createPlaceholderHistory = (productId: number, price: number | null) => {
    const baseline = price ?? 25;
    return Array.from({ length: 30 }, (_, index) => {
        const wave = Math.sin((index + productId % 7) * 0.62) * 0.045;
        const drift = ((index - 15) / 15) * 0.025;
        return {
            date: `Day ${index + 1}`,
            price: Math.max(0.01, baseline * (1 + wave + drift)),
        };
    });
};

export default function CardDetail({ card, onClose }: CardDetailProps) {
    const [history, setHistory] = useState<{ date: string; price: number }[]>([]);
    const [historyError, setHistoryError] = useState(false);

    useEffect(() => {
        const loadHistory = async () => {
            try {
                const response = await apiFetch(`/api/tracked-cards/${card.productId}/history`);
                if (!response.ok) {
                    throw new Error('History unavailable');
                }
                const data: { date: string; price: number | null }[] = await response.json();
                setHistory(data.filter((point): point is { date: string; price: number } =>
                    point.price !== null
                ));
            } catch {
                setHistoryError(true);
            }
        };

        void loadHistory();
    }, [card.productId]);
    const chartData = history.length >= 2
        ? history
        : createPlaceholderHistory(card.productId, card.price);
    const chartIsPlaceholder = history.length < 2;
    const handleBackgroundClick = () => onClose();
    const stopPropagation = (e: React.MouseEvent) => e.stopPropagation();

    return (
        <div className="card-modal-backdrop"
            onClick={handleBackgroundClick}>
            <div className="card-modal"
                onClick={stopPropagation}>
                <div className="card-modal-header">
                    <div>
                        <p className="eyebrow">CARD DETAILS</p>
                        <h2>{card.name}</h2>
                        <p>{card.set}</p>
                    </div>
                    <button className="modal-close" onClick={onClose} aria-label="Close card details">✕</button>
                </div>
                <div className="card-modal-grid">
                    <div className="modal-image-wrap">
                        <img src={card.imageHires} alt={card.name} />
                    </div>
                    <div className="modal-chart-panel">
                        <div className="chart-heading">
                            <div>
                                <span>Price trend</span>
                                <strong>{card.price === null ? 'Price unavailable' : `$${card.price.toFixed(2)}`}</strong>
                            </div>
                            <span className={chartIsPlaceholder ? 'chart-status placeholder' : 'chart-status'}>
                                {chartIsPlaceholder ? 'Illustrative' : 'Live history'}
                            </span>
                        </div>
                        <Chart data={chartData} placeholder={chartIsPlaceholder} />
                        {chartIsPlaceholder && (
                            <p className="chart-disclaimer">
                                Placeholder trend for layout preview. Historical data is not available yet.
                            </p>
                        )}
                    </div>
                </div>
                <div className="modal-summary-grid">
                    <div><span>Current price</span><strong>{card.price === null ? '—' : `$${card.price.toFixed(2)}`}</strong></div>
                    <div><span>7-day change</span><strong className={card.percentChange === null ? 'muted' : card.percentChange >= 0 ? 'change-up' : 'change-down'}>
                        {card.percentChange === null ? '—' : `${card.percentChange >= 0 ? '+' : ''}${card.percentChange.toFixed(2)}%`}
                    </strong></div>
                    <div><span>Volume</span><strong>{card.volume === null ? '—' : card.volume.toLocaleString()}</strong></div>
                    <div><span>Data status</span><strong>{historyError || history.length < 2 ? 'Awaiting history' : 'Tracked'}</strong></div>
                </div>
            </div>
        </div>
    );
}