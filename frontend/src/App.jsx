import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import AddWebsite from './pages/AddWebsite'
import DownWebsites from './pages/DownWebsites'
import Login from './pages/Login'

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    // Check if user is already authenticated
    const authStatus = localStorage.getItem('authenticated')
    if (authStatus === 'true') {
      setIsAuthenticated(true)
    }
  }, [])

  const handleLogin = (username, password) => {
    // Hardcoded credentials
    if (username === 'syed123' && password === 'FileMyRTI@50cr') {
      setIsAuthenticated(true)
      localStorage.setItem('authenticated', 'true')
      return true
    }
    return false
  }

  const handleLogout = () => {
    setIsAuthenticated(false)
    localStorage.removeItem('authenticated')
  }

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />
  }

  return (
    <Router>
      <div className="min-h-screen bg-gradient-to-br from-purple-500 via-purple-600 to-indigo-700">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} onLogout={handleLogout} />

        {/* Hamburger menu button for mobile */}
        <button
          onClick={() => setSidebarOpen(true)}
          className="lg:hidden fixed top-4 left-4 z-30 bg-white p-2 rounded-lg shadow-lg text-gray-700 hover:bg-gray-100 transition-colors"
          aria-label="Open menu"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <main className="lg:ml-64 p-4 lg:p-8 pt-16 lg:pt-8">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/add" element={<AddWebsite />} />
            <Route path="/down" element={<DownWebsites />} />
          </Routes>
        </main>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              background: '#363636',
              color: '#fff',
            },
            success: {
              duration: 3000,
              iconTheme: {
                primary: '#4ade80',
                secondary: '#fff',
              },
            },
            error: {
              duration: 4000,
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
            },
          }}
        />
      </div>
    </Router>
  )
}

export default App


