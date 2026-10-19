import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import Details from './card-detail';
import MiniChart, { createPlaceholderTrend } from './mini-chart';
import PkmnCard, { PkmnCardProps } from './pkmn-card';
import { apiFetch, authClient } from '../lib/auth';
import AuthScreen from './auth-screen';

type ApiCard = {
    productId: number;
    name: string;
    set: string;
    imageUrl: string | null;
    price: number | null;
    percentChange: number | null;
};

type MarketResponse = {
    data: ApiCard[];
    pagination: { total: number; limit: number; offset: number; hasMore: boolean };
};

type HistoryPoint = { date: string; price: number };
type SortSelection =
    | 'current_price:desc'
    | 'current_price:asc'
    | 'price_change:desc'
    | 'price_change:asc'
    | 'percentage_change:desc'
    | 'percentage_change:asc';

const sortOptions: { value: SortSelection; label: string }[] = [
    { value: 'current_price:desc', label: 'Highest price' },
    { value: 'current_price:asc', label: 'Lowest price' },
    { value: 'price_change:desc', label: 'Largest dollar gain' },
    { value: 'price_change:asc', label: 'Largest dollar drop' },
    { value: 'percentage_change:desc', label: 'Largest percentage gain' },
    { value: 'percentage_change:asc', label: 'Largest percentage drop' },
];

const toCard = (card: ApiCard): PkmnCardProps => ({
    productId: card.productId,
    imageLowres: card.imageUrl ?? '/vite.svg',
    imageHires: card.imageUrl ?? '/vite.svg',
    name: card.name,
    set: card.set,
    price: card.price,
    percentChange: card.percentChange,
    volume: null,
});

function Change({ value }: { value: number | null }) {
    if (value === null) return <span className="muted">—</span>;
    return <span className={value >= 0 ? 'change-up' : 'change-down'}>
        {value >= 0 ? '+' : ''}{value.toFixed(2)}%
    </span>;
}

function MarketTableRow({
    card,
    history,
    isWatched,
    onToggleWatchlist,
}: {
    card: PkmnCardProps;
    history: HistoryPoint[];
    isWatched: boolean;
    onToggleWatchlist: (card: PkmnCardProps) => void;
}) {
    const [showModal, setShowModal] = useState(false);
    const isPositive = card.percentChange === null || card.percentChange >= 0;
    const hasHistory = history.length >= 2;

    return (
        <>
            <tr
                key={card.productId}
                className="market-table-row"
                onClick={() => setShowModal(true)}
            >
                <td>
                    <div className="table-card-name">
                        <img src={card.imageLowres} alt="" />
                        <div>
                            <strong>{card.name}</strong>
                            <span>{card.productId}</span>
                        </div>
                    </div>
                </td>
                <td className="muted">{card.set}</td>
                <td className="price-cell">
                    {card.price === null
                        ? '—'
                        : `$${card.price.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                        })}`}
                </td>
                <td>
                    <MiniChart
                        data={hasHistory ? history : createPlaceholderTrend(card.productId, card.price)}
                        positive={isPositive}
                        placeholder={!hasHistory}
                    />
                </td>
                <td><Change value={card.percentChange} /></td>
                <td className="muted">{card.volume === null ? '—' : card.volume.toLocaleString()}</td>
                <td>
                    <button
                        type="button"
                        className={`watchlist-toggle${isWatched ? ' active' : ''}`}
                        aria-label={isWatched ? `Remove ${card.name} from watchlist` : `Add ${card.name} to watchlist`}
                        onClick={(event) => {
                            event.stopPropagation();
                            onToggleWatchlist(card);
                        }}
                    >
                        {isWatched ? '★' : '☆'}
                    </button>
                </td>
                <td className="row-arrow">→</td>
            </tr>
            {showModal && createPortal(
                <Details card={card} onClose={() => setShowModal(false)} />,
                document.body,
            )}
        </>
    );
}

export default function CardList({
    userName,
    authError,
}: {
    userName?: string;
    authError?: string;
}) {
    const [cards, setCards] = useState<PkmnCardProps[]>([]);
    const [watchlist, setWatchlist] = useState<PkmnCardProps[]>(() => {
        if (typeof window === 'undefined') return [];
        try {
            const savedWatchlist = window.localStorage.getItem('pkmn-market-watchlist');
            return savedWatchlist ? JSON.parse(savedWatchlist) as PkmnCardProps[] : [];
        } catch {
            return [];
        }
    });
    const [query, setQuery] = useState('');
    const [sortSelection, setSortSelection] = useState<SortSelection>('current_price:desc');
    const [headerOpacity, setHeaderOpacity] = useState(1);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [historyByProductId, setHistoryByProductId] = useState<Record<number, HistoryPoint[]>>({});
    const [page, setPage] = useState(0);
    const pageSize = 25;
    const [marketPagination, setMarketPagination] = useState<MarketResponse['pagination']>({
        total: 0,
        limit: pageSize,
        offset: 0,
        hasMore: false,
    });
    const [showAuth, setShowAuth] = useState(false);

    useEffect(() => {
        window.localStorage.setItem('pkmn-market-watchlist', JSON.stringify(watchlist));
    }, [watchlist]);

    useEffect(() => {
        const handleScroll = () => {
            const fadeDistance = 240;
            setHeaderOpacity(Math.max(0, 1 - window.scrollY / fadeDistance));
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        handleScroll();
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        const load = async () => {
            try {
                const marketParams = new URLSearchParams({
                    limit: String(pageSize),
                    offset: String(page * pageSize),
                });
                const [sortColumn, sortOrder] = sortSelection.split(':');
                marketParams.set('column', sortColumn);
                marketParams.set('sort', sortOrder);
                const normalizedQuery = query.trim();
                if (normalizedQuery) marketParams.set('search', normalizedQuery);
                const [marketResponse, trackedResponse] = await Promise.all([
                    apiFetch(`/api/price_change/top-bottom?${marketParams}`),
                    apiFetch('/api/tracked-cards'),
                ]);
                if (!marketResponse.ok || !trackedResponse.ok) {
                    throw new Error('The market data service is unavailable');
                }
                const marketData: MarketResponse = await marketResponse.json();
                const trackedData: ApiCard[] = await trackedResponse.json();
                setCards(marketData.data.map(toCard));
                setMarketPagination(marketData.pagination);
                const historyEntries = await Promise.all(trackedData.map(async (card) => {
                    try {
                        const response = await apiFetch(`/api/tracked-cards/${card.productId}/history`);
                        if (!response.ok) return [card.productId, []] as const;
                        const data: { date: string; price: number | null }[] = await response.json();
                        return [
                            card.productId,
                            data.filter((point): point is HistoryPoint => point.price !== null),
                        ] as const;
                    } catch {
                        return [card.productId, []] as const;
                    }
                }));
                setHistoryByProductId(Object.fromEntries(historyEntries));
            } catch (requestError) {
                setError(requestError instanceof Error ? requestError.message : 'Unable to load market data');
            } finally {
                setIsLoading(false);
            }
        };
        void load();
    }, [page, query, sortSelection]);

    const filteredCards = useMemo(() => {
        return cards;
    }, [cards]);

    const toggleWatchlist = (card: PkmnCardProps) => {
        setWatchlist((current) =>
            current.some((item) => item.productId === card.productId)
                ? current.filter((item) => item.productId !== card.productId)
                : [...current, card],
        );
    };

    if (isLoading) return <div className="dashboard-message">Loading market data...</div>;
    if (error) {
        return <div className="dashboard-message error-message">
            <strong>Market data unavailable</strong>
            <span>{error}</span>
        </div>;
    }

    const pricedCards = cards.filter((card) => card.price !== null);
    const highestPrice = pricedCards.reduce((highest, card) =>
        Math.max(highest, card.price ?? 0), 0);
    const averagePrice = pricedCards.length
        ? pricedCards.reduce((sum, card) => sum + (card.price ?? 0), 0) / pricedCards.length
        : 0;
    const activeSortLabel = sortOptions.find((option) => option.value === sortSelection)?.label ?? 'Highest price';

    return (
        <main className="dashboard-shell">
            <header className="market-header" style={{ opacity: headerOpacity }}>
                <div className="brand-lockup">
                    <div>
                        <div className="brand-name">CardSight</div>
                        <div className="brand-subtitle">Pokémon market insights</div>
                    </div>
                </div>
                <div className="market-account">
                    {authError && <span className="auth-status">{authError}</span>}
                    {userName ? (
                        <>
                            <span>{userName}</span>
                            <button type="button" onClick={() => void authClient?.signOut()}>Sign out</button>
                        </>
                    ) : (
                        <button type="button" className="login-banner-button" onClick={() => setShowAuth(true)}>
                            Sign in
                        </button>
                    )}
                </div>
            </header>

            <section className="dashboard-content">
                <div className="market-context">
                    <span><i /> Live catalog</span>
                    <span>Updated today</span>
                    <span>Sorted by {activeSortLabel.toLowerCase()}</span>
                </div>
                <section className="watchlist-section">
                    <div className="section-heading">
                        <div><h2>Your watchlist</h2></div>
                        {watchlist.length > 0 && <button className="section-action section-action-button" onClick={() => setWatchlist([])}>Clear all</button>}
                    </div>
                    {watchlist.length > 0 ? (
                        <div className="watchlist-grid">
                            {watchlist.map((card) => (
                                <PkmnCard
                                    key={card.productId}
                                    {...card}
                                    onRemoveWatchlist={() => toggleWatchlist(card)}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="watchlist-empty">
                            <strong>Your watchlist is empty</strong>
                            <span>Use the star in the market table to add cards here.</span>
                        </div>
                    )}
                </section>

                <section className="metric-grid" aria-label="Market summary">
                    <div className="metric-card"><span>Catalog cards</span><strong>{marketPagination.total.toLocaleString()}</strong><small>Available in the live catalog</small></div>
                    <div className="metric-card"><span>Your watchlist</span><strong>{watchlist.length}</strong><small>Cards saved in this browser</small></div>
                    <div className="metric-card"><span>Highest listed price</span><strong>${highestPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}</strong><small>Across current results</small></div>
                    <div className="metric-card"><span>Average listed price</span><strong>${averagePrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}</strong><small>Across current results</small></div>
                </section>

                <section className="market-table-section">
                    <div className="section-heading market-table-heading">
                        <div><h2>Market movers</h2><p>Live catalog sorted by {activeSortLabel.toLowerCase()}.</p></div>
                        <div className="market-table-tools">
                            <label className="search-box">
                                <span>⌕</span>
                                <input
                                    value={query}
                                    onChange={(event) => {
                                        setQuery(event.target.value);
                                        setPage(0);
                                    }}
                                    placeholder="Search cards or sets"
                                    aria-label="Search cards or sets"
                                />
                            </label>
                            <label className="sort-box">
                                <span>Sort by</span>
                                <select
                                    value={sortSelection}
                                    onChange={(event) => {
                                        setSortSelection(event.target.value as SortSelection);
                                        setPage(0);
                                    }}
                                    aria-label="Sort market movers"
                                >
                                    {sortOptions.map((option) => (
                                        <option key={option.value} value={option.value}>{option.label}</option>
                                    ))}
                                </select>
                            </label>
                        </div>
                    </div>
                    <div className="market-table-wrap">
                        <table className="market-table">
                            <thead>
                                <tr>
                                    <th>Card</th>
                                    <th>Set</th>
                                    <th>Price</th>
                                    <th>Trend</th>
                                    <th>Change</th>
                                    <th>Volume</th>
                                    <th>Watchlist</th>
                                    <th />
                                </tr>
                            </thead>
                            <tbody>
                                {filteredCards.map((card) => (
                                    <MarketTableRow
                                        key={card.productId}
                                        card={card}
                                        history={historyByProductId[card.productId] ?? []}
                                        isWatched={watchlist.some((item) => item.productId === card.productId)}
                                        onToggleWatchlist={toggleWatchlist}
                                    />
                                ))}
                            </tbody>
                        </table>
                        {filteredCards.length === 0 && <div className="empty-table">No cards match “{query}”.</div>}
                    </div>
                    <div className="pagination-controls" aria-label="Market table pagination">
                        <span>
                            {marketPagination.total === 0
                                ? 'No results'
                                : `${marketPagination.offset + 1}–${marketPagination.offset + filteredCards.length} of ${marketPagination.total.toLocaleString()}`}
                        </span>
                        <div>
                            <button
                                type="button"
                                disabled={page === 0}
                                onClick={() => setPage((current) => Math.max(0, current - 1))}
                            >
                                Previous
                            </button>
                            <button
                                type="button"
                                disabled={!marketPagination.hasMore}
                                onClick={() => setPage((current) => current + 1)}
                            >
                                Next
                            </button>
                        </div>
                    </div>
                </section>
            </section>
            {showAuth && (
                <div className="auth-modal-backdrop" onClick={() => setShowAuth(false)}>
                    <div onClick={(event) => event.stopPropagation()}>
                        <AuthScreen onClose={() => setShowAuth(false)} />
                    </div>
                </div>
            )}
        </main>
    );
}
