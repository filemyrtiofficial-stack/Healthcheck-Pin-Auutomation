import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import Button from '../components/Button'
import { getDownWebsites, checkNow } from '../api/api'

export default function DownWebsites() {
  const [downWebsites, setDownWebsites] = useState([])
  const [loading, setLoading] = useState(true)
  const [checking, setChecking] = useState(false)

  useEffect(() => {
    loadDownWebsites()
  }, [])

  const loadDownWebsites = async () => {
    try {
      setLoading(true)
      const data = await getDownWebsites()
      if (data.success && data.downWebsites) {
        setDownWebsites(data.downWebsites)
      } else {
        setDownWebsites([])
      }
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message || 'Failed to load down websites'
      toast.error(`Error loading down websites: ${errorMessage}`)
      setDownWebsites([])
    } finally {
      setLoading(false)
    }
  }

  const handleRunCheck = async () => {
    try {
      setChecking(true)
      toast.loading('Checking all websites...', { id: 'checking' })

      const data = await checkNow()

      if (data.success) {
        // Wait a moment for backend to save statuses
        await new Promise(resolve => setTimeout(resolve, 500))

        // Reload down websites to get updated list
        await loadDownWebsites()

        toast.success(
          `Check completed! UP: ${data.summary.up} | DOWN: ${data.summary.down}`,
          { id: 'checking' }
        )

        // If there are down websites, show a message
        if (data.summary.down > 0) {
          setTimeout(() => {
            toast.info(`Found ${data.summary.down} down website(s). Check the list below.`, {
              duration: 5000
            })
          }, 1000)
        }
      } else {
        toast.error(`Error: ${data.error || 'Failed to check websites'}`, { id: 'checking' })
      }
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message || 'Failed to check websites'
      toast.error(`Error: ${errorMessage}`, { id: 'checking' })
    } finally {
      setChecking(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-white text-xl">Loading down websites...</div>
      </div>
    )
  }

  return (
    <div>
      <div className="bg-white rounded-2xl shadow-2xl p-4 sm:p-6 lg:p-8 mb-8 border-4 border-red-500">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6 gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-red-600 mb-2">⚠️ Down Websites</h2>
            <p className="text-gray-600 text-sm sm:text-base">
              {downWebsites.length === 0
                ? 'All websites are UP! No issues detected.'
                : `${downWebsites.length} website${downWebsites.length > 1 ? 's' : ''} currently down`}
            </p>
          </div>
          <Button
            variant="success"
            onClick={handleRunCheck}
            disabled={checking}
            className="w-full sm:w-auto"
          >
            {checking ? '⏳ Checking...' : '🔄 Refresh Status'}
          </Button>
        </div>

        {downWebsites.length === 0 ? (
          <div className="text-center py-12 bg-green-50 rounded-xl">
            <div className="text-4xl sm:text-6xl mb-4">✅</div>
            <p className="text-green-700 text-lg sm:text-xl font-semibold px-4">
              All websites are UP! No issues detected.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {downWebsites.map((website, index) => (
              <div
                key={`${website.url}-${index}`}
                className="bg-gradient-to-r from-red-500 to-pink-500 rounded-xl p-4 sm:p-6 text-white shadow-lg hover:shadow-xl transition-all duration-200 border-l-4 border-red-700"
              >
                <div className="flex items-start space-x-3 sm:space-x-4">
                  <div className="text-2xl sm:text-4xl flex-shrink-0">🚨</div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xl sm:text-2xl font-bold mb-3 break-words">{website.name}</h3>
                    <div className="space-y-2 text-xs sm:text-sm">
                      <p className="break-all"><strong>URL:</strong> {website.url}</p>
                      <p><strong>Status:</strong> {website.status ?? 'UNKNOWN'}</p>
                      <p><strong>Error:</strong> {website.error || 'Unknown error'}</p>
                      <p>
                        <strong>Last Checked:</strong>{' '}
                        {website.checked_at ? new Date(website.checked_at).toLocaleString() : 'Not checked yet'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
