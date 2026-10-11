import { useEffect, useState } from 'react'
import HomePage from './pages/public/HomePage'
import ContentAdaptationPage from './features/content-adaptation/ContentAdaptationPage'

function useHashRoute() {
  const [hash, setHash] = useState(window.location.hash)
  useEffect(() => {
    const onChange = () => setHash(window.location.hash)
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return hash
}

function App() {
  const hash = useHashRoute()
  if (hash.startsWith('#/adapt')) return <ContentAdaptationPage mode="studio" />
  if (hash.startsWith('#/play')) return <ContentAdaptationPage mode="play" />
  return (
    <HomePage />
  )
}

export default App
