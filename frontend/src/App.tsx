import CardList from './components/card-list'
import AuthScreen from './components/auth-screen'
import { authClient } from './lib/auth'




function App() {
  if (!authClient) {
    return <CardList />;
  }

  const { data: session, isPending, error } = authClient.useSession();

  if (isPending) {
    return <CardList />;
  }

  if (error) {
    return <CardList authError={error.message} />;
  }

  return (
    <CardList userName={session?.user?.name} />
  )
}

export default App
