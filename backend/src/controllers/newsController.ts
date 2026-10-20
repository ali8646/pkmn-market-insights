import { Request, Response } from 'express';

export type NewsItem = {
  title: string;
  link: string;
  date: string;
  formattedDate: string;
};

const FALLBACK_NEWS: NewsItem[] = [
  {
    title: '“Gem Pack Vol 7” to Release in China Featuring Exclusive Misty’s Psyduck!',
    link: 'https://www.pokebeach.com/forums/threads/%E2%80%9Cgem-pack-vol-7%E2%80%9D-to-release-in-china-featuring-exclusive-misty%E2%80%99s-psyduck.157096/',
    date: 'Mon, 19 Oct 2026 16:35:15 +0000',
    formattedDate: 'Oct 19, 2026',
  },
  {
    title: 'Mega Heatran ex, Lebanne, Gastly, and Other Gym Promos Revealed for November!',
    link: 'https://www.pokebeach.com/forums/threads/mega-heatran-ex-lebanne-gastly-and-other-gym-promos-revealed-for-november.157094/',
    date: 'Sun, 18 Oct 2026 14:24:18 +0000',
    formattedDate: 'Oct 18, 2026',
  },
  {
    title: 'Exclusive N’s Plan and Hilda to Release in China for “Black Bolt” and “White Flare!”',
    link: 'https://www.pokebeach.com/forums/threads/exclusive-n%E2%80%99s-plan-and-hilda-to-release-in-china-for-%E2%80%9Cblack-bolt%E2%80%9D-and-%E2%80%9Cwhite-flare-%E2%80%9D.157097/',
    date: 'Sun, 18 Oct 2026 00:45:50 +0000',
    formattedDate: 'Oct 18, 2026',
  },
  {
    title: 'Mega Dragonite ex, Mega Gengar ex, and Mega Feraligatr ex “Special Deck Set” Revealed for November',
    link: 'https://www.pokebeach.com/forums/threads/mega-dragonite-ex-mega-gengar-ex-and-mega-feraligatr-ex-%E2%80%9Cspecial-deck-set%E2%80%9D-revealed-for-november.157093/',
    date: 'Fri, 16 Oct 2026 22:11:40 +0000',
    formattedDate: 'Oct 16, 2026',
  },
  {
    title: 'More “Delta Reign” English Cards Revealed, Including Legendary Pyroduct!',
    link: 'https://www.pokebeach.com/forums/threads/more-%E2%80%9Cdelta-reign%E2%80%9D-english-cards-revealed-including-legendary-pyroduct.157075/',
    date: 'Thu, 15 Oct 2026 19:05:05 +0000',
    formattedDate: 'Oct 15, 2026',
  },
  {
    title: 'Pokemon Cards Sent to Space for the First Time!',
    link: 'https://www.pokebeach.com/forums/threads/pokemon-cards-sent-to-space-for-the-first-time.157078/',
    date: 'Thu, 15 Oct 2026 16:53:25 +0000',
    formattedDate: 'Oct 15, 2026',
  },
];

let cachedNews: NewsItem[] = [...FALLBACK_NEWS];
let lastFetchedAt = 0;
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&quot;/g, '"')
    .replace(/&#039;|&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ');
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export async function fetchPokeBeachFeed(): Promise<NewsItem[]> {
  const feedUrl = 'https://www.pokebeach.com/forums/forum/front-page-news.18/index.rss';
  const response = await fetch(feedUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko)',
      Accept: 'application/rss+xml, application/xml, text/xml, */*',
    },
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch PokéBeach feed: HTTP ${response.status}`);
  }

  const xml = await response.text();
  const items: NewsItem[] = [];
  const itemMatches = xml.match(/<item>([\s\S]*?)<\/item>/g) || [];

  for (const block of itemMatches) {
    const titleMatch = block.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/);
    const linkMatch = block.match(/<link>([\s\S]*?)<\/link>/);
    const dateMatch = block.match(/<pubDate>([\s\S]*?)<\/pubDate>/);

    if (titleMatch && linkMatch) {
      const rawTitle = titleMatch[1].trim();
      const rawDate = dateMatch ? dateMatch[1].trim() : '';
      items.push({
        title: decodeHtmlEntities(rawTitle),
        link: linkMatch[1].trim(),
        date: rawDate,
        formattedDate: formatDate(rawDate),
      });
    }
  }

  return items;
}

export const getNews = async (_req: Request, res: Response) => {
  const isCacheFresh = Date.now() - lastFetchedAt < CACHE_TTL_MS && cachedNews.length > 0;

  if (isCacheFresh) {
    res.json({ source: 'cache', data: cachedNews });
    return;
  }

  try {
    const freshItems = await fetchPokeBeachFeed();
    if (freshItems.length > 0) {
      cachedNews = freshItems;
      lastFetchedAt = Date.now();
      res.json({ source: 'live', data: cachedNews });
      return;
    }
  } catch (error) {
    console.warn('Unable to refresh PokéBeach RSS feed, using cached/fallback news:', error);
  }

  res.json({ source: 'fallback', data: cachedNews });
};
