import { Suspense, lazy } from 'react'
import PkmnCard from './components/pkmn-card'


function App() {
  return (
    <>
      <p>
        <PkmnCard
          image="https://images.pokemontcg.io/xy1/1_hires.png"
          name="Venusaur-EX"
          set="XY"
          price={4.17}
          percentChange={1.3}
          volume={100}
        />
      </p>
    </>
  )
}

export default App
