import { useEffect, useState } from 'react';
import { apiFetch } from '../lib/auth';

type NewsArticle = {
    title: string;
    link: string;
    date: string;
    formattedDate?: string;
};

const initialFallbackNews: NewsArticle[] = [
    {
        title: '“Gem Pack Vol 7” to Release in China Featuring Exclusive Misty’s Psyduck!',
        link: 'https://www.pokebeach.com/forums/threads/%E2%80%9Cgem-pack-vol-7%E2%80%9D-to-release-in-china-featuring-exclusive-misty%E2%80%99s-psyduck.157096/',
        date: 'Mon, 19 Oct 2026',
        formattedDate: 'Oct 19, 2026',
    },
    {
        title: 'Mega Heatran ex, Lebanne, Gastly, and Other Gym Promos Revealed for November!',
        link: 'https://www.pokebeach.com/forums/threads/mega-heatran-ex-lebanne-gastly-and-other-gym-promos-revealed-for-november.157094/',
        date: 'Sun, 18 Oct 2026',
        formattedDate: 'Oct 18, 2026',
    },
    {
        title: 'Exclusive N’s Plan and Hilda to Release in China for “Black Bolt” and “White Flare!”',
        link: 'https://www.pokebeach.com/forums/threads/exclusive-n%E2%80%99s-plan-and-hilda-to-release-in-china-for-%E2%80%9Cblack-bolt%E2%80%9D-and-%E2%80%9Cwhite-flare-%E2%80%9D.157097/',
        date: 'Sun, 18 Oct 2026',
        formattedDate: 'Oct 18, 2026',
    },
    {
        title: 'Mega Dragonite ex, Mega Gengar ex, and Mega Feraligatr ex “Special Deck Set” Revealed for November',
        link: 'https://www.pokebeach.com/forums/threads/mega-dragonite-ex-mega-gengar-ex-and-mega-feraligatr-ex-%E2%80%9Cspecial-deck-set%E2%80%9D-revealed-for-november.157093/',
        date: 'Fri, 16 Oct 2026',
        formattedDate: 'Oct 16, 2026',
    },
    {
        title: 'More “Delta Reign” English Cards Revealed, Including Legendary Pyroduct!',
        link: 'https://www.pokebeach.com/forums/threads/more-%E2%80%9Cdelta-reign%E2%80%9D-english-cards-revealed-including-legendary-pyroduct.157075/',
        date: 'Thu, 15 Oct 2026',
        formattedDate: 'Oct 15, 2026',
    },
    {
        title: 'Pokemon Cards Sent to Space for the First Time!',
        link: 'https://www.pokebeach.com/forums/threads/pokemon-cards-sent-to-space-for-the-first-time.157078/',
        date: 'Thu, 15 Oct 2026',
        formattedDate: 'Oct 15, 2026',
    },
];

export default function NewsFeed() {
    const [news, setNews] = useState<NewsArticle[]>(initialFallbackNews);

    useEffect(() => {
        let isMounted = true;
        const loadNews = async () => {
            try {
                const response = await apiFetch('/api/news');
                if (!response.ok) return;
                const result = await response.json();
                if (isMounted && Array.isArray(result.data) && result.data.length > 0) {
                    setNews(result.data);
                }
            } catch {
                // Keep initial fallback news on error
            }
        };

        void loadNews();
        return () => {
            isMounted = false;
        };
    }, []);

    return (
        <section className="news-feed">
            <div className="section-heading">
                <div>
                    <h2>News &amp; Updates</h2>
                    <p>Latest stories from PokéBeach</p>
                </div>
                <a
                    href="https://www.pokebeach.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="section-action"
                    aria-label="Visit PokéBeach"
                >
                    PokéBeach ↗
                </a>
            </div>
            <div className="news-feed-list">
                {news.map((item, index) => (
                    <a
                        key={item.link || index}
                        href={item.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="news-feed-item"
                    >
                        <div className="news-feed-meta">
                            <span className="news-feed-date">{item.formattedDate || item.date}</span>
                            <span className="news-feed-arrow">↗</span>
                        </div>
                        <span className="news-feed-title">{item.title}</span>
                    </a>
                ))}
            </div>
        </section>
    );
}
