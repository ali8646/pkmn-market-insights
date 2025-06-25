// list of card-details
// list rendering with map(), responsive grids, lifting state
import PkmnCard, { PkmnCardProps } from "./pkmn-card";

export default function CardList () {
    const cardData: PkmnCardProps[] = [
        {
            imageLowres: 'https://images.pokemontcg.io/xy1/1_hires.png',
            imageHires: 'https://images.pokemontcg.io/xy1/1_hires.png',
            name: 'Venusaur-EX',
            set: 'XY',
            price: 4.17,
            percentChange: 1.3,
            volume: 100,
        },
        {
            imageLowres: 'https://images.pokemontcg.io/xy1/1_hires.png',
            imageHires: 'https://images.pokemontcg.io/xy1/1_hires.png',
            name: 'Blastoise',
            set: 'Base Set',
            price: 10.5,
            percentChange: -2.1,
            volume: 85,
        }
        // ...more cards
    ];

    return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 justify-center">
                {cardData.map((card) => 
                    <PkmnCard key={card.price}
                        imageLowres={card.imageLowres}
                        imageHires={card.imageHires}
                        name={card.name}
                        set={card.set}
                        price={card.price}
                        percentChange={card.percentChange}
                        volume={card.volume}
                    />
                )}
            </div>
    )
}