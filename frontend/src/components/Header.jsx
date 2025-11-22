import { Link, useLocation } from 'react-router-dom'

export default function Header() {
  const location = useLocation()

  const isActive = (path) => location.pathname === path

  return (
    <header className="bg-white shadow-lg">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-2">
            <span className="text-2xl">🚨</span>
            <h1 className="text-2xl font-bold text-gray-800">RTI Health Check</h1>
          </Link>
          <nav className="flex space-x-4">
            <Link
              to="/"
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                isActive('/')
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-700 hover:bg-purple-100'
              }`}
            >
              Dashboard
            </Link>
            <Link
              to="/add"
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                isActive('/add')
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-700 hover:bg-purple-100'
              }`}
            >
              Add Website
            </Link>
            <Link
              to="/down"
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                isActive('/down')
                  ? 'bg-red-600 text-white'
                  : 'text-gray-700 hover:bg-red-100'
              }`}
            >
              Down Websites
            </Link>
          </nav>
        </div>
      </div>
    </header>
  )
}





