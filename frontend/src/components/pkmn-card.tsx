import MiniChart, { createPlaceholderTrend } from './mini-chart';
import Details from './card-detail';
import { useState } from 'react';
import { createPortal } from 'react-dom';
// all the data for a pokemon card is here
// JSX, props, Tailwind, onClick, conditional styling

export type PkmnCardProps = {
  productId: number;
  imageLowres: string;
  imageHires: string;
  name: string;
  set: string;
  price: number | null;
  percentChange: number | null;
  volume: number | null;
  onRemoveWatchlist?: () => void;
};

export default function PkmnCard({
    productId: _productId,
    imageLowres,
    imageHires,
    name,
    set,
    price,
    percentChange,
    volume,
    onRemoveWatchlist,
}: PkmnCardProps) {
    const [showModal, setShowModal] = useState(false);
    const isPositive = percentChange === null || percentChange >= 0;
    return (
        <>
            <div
                className="card-container cursor-pointer"
                onClick={() => setShowModal(true)}
            >
                <div className="watchlist-card-main">
                    <img src={imageLowres} alt={name} />
                    <div className="watchlist-card-copy">
                        <h2>{name}</h2>
                        <p>{set}</p>
                        <span className="watchlist-product-id">#{_productId}</span>
                    </div>
                    {onRemoveWatchlist && (
                        <button
                            type="button"
                            className="watchlist-remove"
                            aria-label={`Remove ${name} from watchlist`}
                            onClick={(event) => {
                                event.stopPropagation();
                                onRemoveWatchlist();
                            }}
                        >
                            ✕
                        </button>
                    )}
                </div>
                <div className="watchlist-card-values">
                    <strong>{price === null ? '—' : `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}</strong>
                    <span className={percentChange === null ? 'muted' : isPositive ? 'change-up' : 'change-down'}>
                        {percentChange === null ? 'No change' : `${isPositive ? '+' : ''}${percentChange.toFixed(2)}%`}
                    </span>
                </div>
                <MiniChart
                    data={createPlaceholderTrend(_productId, price)}
                    positive={isPositive}
                    placeholder
                />
            </div>
            {showModal &&
                createPortal(
                    <Details
                        card={{
                            productId: _productId,
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