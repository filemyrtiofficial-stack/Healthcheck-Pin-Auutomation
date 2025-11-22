import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import toast from 'react-hot-toast'
import Button from '../components/Button'
import { getWebsites, checkNow, getDownWebsites, deleteWebsite, getWebsiteStatuses } from '../api/api'

export default function Dashboard() {
  const [websites, setWebsites] = useState([])
  const [websiteStatuses, setWebsiteStatuses] = useState({})
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  // Reload when component mounts or when navigating back from other pages
  useEffect(() => {
    loadWebsites()
  }, [location.key]) // Reload when route changes

  useEffect(() => {
    if (websites.length > 0) {
      loadStatuses()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [websites])

  // Reload when navigating back from AddWebsite page
  useEffect(() => {
    if (location.state?.refresh) {
      loadWebsites()
      // Clear the refresh flag
      window.history.replaceState({}, document.title)
    }
  }, [location.state])

  const loadWebsites = async () => {
    try {
      setLoading(true)
      const data = await getWebsites()
      if (data.success && data.websites) {
        setWebsites(data.websites)
      } else {
        toast.error(data.error || 'Failed to load websites')
      }
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message || 'Failed to load websites'
      toast.error(`Error loading websites: ${errorMessage}`)
    } finally {
      setLoading(false)
    }
  }

  const loadStatuses = async () => {
    try {
      console.log('[FRONTEND DEBUG] ========== loadStatuses called ==========')
      console.log('[FRONTEND DEBUG] Current websites:', websites.map(w => ({ name: w.name, url: w.url })))

      const data = await getWebsiteStatuses()
      console.log('[FRONTEND DEBUG] API response:', data)

      if (data.success && data.websiteStatuses) {
        console.log('[FRONTEND DEBUG] Received', data.websiteStatuses.length, 'statuses from API')
        console.log('[FRONTEND DEBUG] Statuses:', data.websiteStatuses.map(ws => ({
          name: ws.name,
          url: ws.url,
          status: ws.status,
          statusCode: ws.statusCode,
          error: ws.error
        })))

        const statusMap = {}

        // First, initialize all websites as UNKNOWN
        websites.forEach(w => {
          statusMap[w.url] = {
            status: 'UNKNOWN',
            lastChecked: null,
            error: null
          }
          console.log(`[FRONTEND DEBUG] Initialized ${w.name} (${w.url}) as UNKNOWN`)
        })

        // Then update with actual statuses from API
        data.websiteStatuses.forEach(ws => {
          console.log(`[FRONTEND DEBUG] Processing status for ${ws.name} (${ws.url}):`, {
            rawStatus: ws.status,
            statusType: typeof ws.status,
            statusCode: ws.statusCode,
            error: ws.error
          })

          // Normalize status to uppercase string
          let normalizedStatus = 'UNKNOWN'
          if (ws.status) {
            normalizedStatus = String(ws.status).toUpperCase().trim()
            // Ensure it's one of the valid statuses (UP, DOWN, or UNKNOWN)
            if (normalizedStatus !== 'UP' && normalizedStatus !== 'DOWN' && normalizedStatus !== 'UNKNOWN') {
              console.log(`[FRONTEND DEBUG]   → Invalid status "${normalizedStatus}", defaulting to UNKNOWN`)
              normalizedStatus = 'UNKNOWN'
            } else {
              console.log(`[FRONTEND DEBUG]   → Normalized status: ${normalizedStatus}`)
            }
          } else {
            console.log(`[FRONTEND DEBUG]   → No status provided, using UNKNOWN`)
          }

          if (statusMap[ws.url]) {
            statusMap[ws.url] = {
              status: normalizedStatus,
              lastChecked: ws.checked_at,
              error: ws.error
            }
            console.log(`[FRONTEND DEBUG]   → Updated ${ws.name} status to: ${normalizedStatus}`)
          } else {
            // Website not in current list but has status
            statusMap[ws.url] = {
              status: normalizedStatus,
              lastChecked: ws.checked_at,
              error: ws.error
            }
            console.log(`[FRONTEND DEBUG]   → Added new website ${ws.name} with status: ${normalizedStatus}`)
          }
        })

        console.log('[FRONTEND DEBUG] Final statusMap:', statusMap)
        setWebsiteStatuses(statusMap)
        console.log('[FRONTEND DEBUG] Status map set in state')
      } else {
        console.log('[FRONTEND DEBUG] API response not successful or no websiteStatuses')
        console.log('[FRONTEND DEBUG] Response:', data)
        // If API fails, initialize all as UNKNOWN
        const statusMap = {}
        websites.forEach(w => {
          statusMap[w.url] = {
            status: 'UNKNOWN',
            lastChecked: null,
            error: null
          }
        })
        setWebsiteStatuses(statusMap)
      }
    } catch (error) {
      console.error('[FRONTEND DEBUG] ERROR loading statuses:', error)
      console.error('[FRONTEND DEBUG] Error details:', {
        message: error.message,
        response: error.response?.data,
        stack: error.stack
      })
      // Fallback: Initialize all as UNKNOWN
      const statusMap = {}
      websites.forEach(w => {
        statusMap[w.url] = {
          status: 'UNKNOWN',
          lastChecked: null,
          error: null
        }
      })
      setWebsiteStatuses(statusMap)

      // Try fallback to down websites only
      try {
        const downData = await getDownWebsites()
        if (downData.success && downData.downWebsites) {
          downData.downWebsites.forEach(down => {
            if (statusMap[down.url]) {
              statusMap[down.url] = {
                status: 'DOWN',
                lastChecked: down.checked_at,
                error: down.error
              }
            }
          })
          setWebsiteStatuses(statusMap)
        }
      } catch (fallbackError) {
        console.error('Error loading down websites:', fallbackError)
      }
    }
  }

  const handleRunNow = async () => {
    try {
      setChecking(true)
      toast.loading('Checking all websites...', { id: 'checking' })

      const data = await checkNow()

      if (data.success) {
        // Reload statuses to get the latest for all websites
        await loadStatuses()

        toast.success(
          `Check completed! UP: ${data.summary.up} | DOWN: ${data.summary.down}`,
          { id: 'checking' }
        )

        if (data.summary.down > 0) {
          setTimeout(() => {
            navigate('/down')
          }, 2000)
        }
      } else {
        toast.error(`Error: ${data.error}`, { id: 'checking' })
      }
    } catch (error) {
      toast.error(`Error: ${error.message}`, { id: 'checking' })
    } finally {
      setChecking(false)
    }
  }

  const handleDelete = async (index) => {
    if (!window.confirm('Are you sure you want to delete this website?')) {
      return
    }

    try {
      const data = await deleteWebsite(index)
      if (data.success) {
        toast.success('Website deleted successfully')
        // Reload websites and statuses after deletion
        await loadWebsites()
        // loadStatuses will be called automatically via useEffect when websites change
      } else {
        toast.error(`Error: ${data.error || 'Failed to delete website'}`)
      }
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message || 'Failed to delete website'
      toast.error(`Error: ${errorMessage}`)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-white text-xl">Loading websites...</div>
      </div>
    )
  }

  const getStatusColor = (status) => {
    const normalizedStatus = status ? String(status).toUpperCase().trim() : 'UNKNOWN'
    if (normalizedStatus === 'UP') return 'text-green-600 bg-green-100'
    if (normalizedStatus === 'DOWN') return 'text-red-600 bg-red-100'
    return 'text-gray-600 bg-gray-100'
  }

  const getStatusBorder = (status) => {
    const normalizedStatus = status ? String(status).toUpperCase().trim() : 'UNKNOWN'
    if (normalizedStatus === 'UP') return 'border-l-4 border-green-500'
    if (normalizedStatus === 'DOWN') return 'border-l-4 border-red-500'
    return 'border-l-4 border-gray-400'
  }

  return (
    <div>
      <div className="bg-white rounded-2xl shadow-2xl p-4 sm:p-6 lg:p-8 mb-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6 gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">Dashboard</h2>
            <p className="text-gray-600 text-sm sm:text-base">Monitor all your RTI portal websites</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 w-full sm:w-auto">
            <Button
              variant="success"
              onClick={handleRunNow}
              disabled={checking}
              className="w-full sm:w-auto"
            >
              {checking ? '⏳ Checking...' : '▶️ Run Now'}
            </Button>
            <Button
              variant="primary"
              onClick={() => navigate('/add')}
              className="w-full sm:w-auto"
            >
              ➕ Add Website
            </Button>
          </div>
        </div>

        {websites.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg mb-4">No websites configured yet.</p>
            <Button variant="primary" onClick={() => navigate('/add')}>
              Add Your First Website
            </Button>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b-2 border-gray-200">
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">URL</th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Last Checked</th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {websites.map((website, index) => {
                    const status = websiteStatuses[website.url]?.status || 'UNKNOWN'
                    const lastChecked = websiteStatuses[website.url]?.lastChecked
                    const normalizedStatus = status ? String(status).toUpperCase().trim() : 'UNKNOWN'

                    return (
                      <tr
                        key={`${website.url}-${index}`}
                        className={`hover:bg-gray-50 transition-colors ${getStatusBorder(normalizedStatus)}`}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-semibold text-gray-900">{website.name}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-600 break-all max-w-md">{website.url}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(normalizedStatus)}`}>
                            {normalizedStatus}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">
                            {lastChecked ? new Date(lastChecked).toLocaleString() : 'Never'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <Button
                            variant="danger"
                            onClick={() => handleDelete(index)}
                            className="text-sm"
                          >
                            🗑️ Delete
                          </Button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="lg:hidden space-y-4">
              {websites.map((website, index) => {
                const status = websiteStatuses[website.url]?.status || 'UNKNOWN'
                const lastChecked = websiteStatuses[website.url]?.lastChecked
                const normalizedStatus = status ? String(status).toUpperCase().trim() : 'UNKNOWN'

                return (
                  <div
                    key={`${website.url}-${index}`}
                    className={`bg-white border-l-4 rounded-lg shadow-md p-4 ${getStatusBorder(normalizedStatus)}`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="text-lg font-semibold text-gray-900 flex-1">{website.name}</h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(normalizedStatus)} ml-2`}>
                        {normalizedStatus}
                      </span>
                    </div>
                    <div className="space-y-2 mb-4">
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">URL</p>
                        <p className="text-sm text-gray-600 break-all">{website.url}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Last Checked</p>
                        <p className="text-sm text-gray-600">
                          {lastChecked ? new Date(lastChecked).toLocaleString() : 'Never'}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="danger"
                      onClick={() => handleDelete(index)}
                      className="w-full text-sm"
                    >
                      🗑️ Delete
                    </Button>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
