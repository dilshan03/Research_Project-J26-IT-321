import { useState } from 'react'
import HomePage from './pages/public/HomePage'
import AgentTestPage from './pages/test/AgentTestPage'

function App() {
  // සරලව pages අතර මාරු වෙන්න state එකක් හදාගමු
  const [currentRoute, setCurrentRoute] = useState('home')

  // Agent Test Page එක පෙන්වීම
  if (currentRoute === 'agent-test') {
    return (
      <div className="relative w-screen h-screen">
        <button 
          onClick={() => setCurrentRoute('home')}
          className="absolute top-4 left-4 z-50 px-4 py-2 bg-gray-800 text-white rounded shadow hover:bg-gray-700 transition cursor-pointer"
        >
          ← Back to Home
        </button>
        <AgentTestPage />
      </div>
    )
  }

  // සාමාන්‍ය Home Page එක පෙන්වීම (Button එකත් එක්ක)
  return (
    <div className="relative">
      <button 
        onClick={() => setCurrentRoute('agent-test')}
        className="fixed top-24 right-8 z-50 px-4 py-2 bg-green-500 text-white font-bold rounded-lg shadow-lg hover:bg-green-600 transition cursor-pointer"
      >
        Test 3D Agent →
      </button>
      <HomePage />
    </div>
  )
}

export default App
