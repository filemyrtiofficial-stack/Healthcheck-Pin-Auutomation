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
  const [showDebug, setShowDebug] = useState(false)
  const [lastApiResponse, setLastApiResponse] = useState(null)
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

  // Debug: Log when websiteStatuses state changes
  useEffect(() => {
    console.log('[FRONTEND DEBUG] ========== websiteStatuses STATE CHANGED ==========')
    console.log('[FRONTEND DEBUG] Current websiteStatuses:', websiteStatuses)
    console.log('[FRONTEND DEBUG] websiteStatuses keys:', Object.keys(websiteStatuses))
    console.log('[FRONTEND DEBUG] websiteStatuses entries:')
    Object.entries(websiteStatuses).forEach(([url, status]) => {
      console.log(`[FRONTEND DEBUG]   ${url}:`, {
        status: status?.status,
        lastChecked: status?.lastChecked,
        error: status?.error
      })
    })
    console.log('[FRONTEND DEBUG] ==========================================')
  }, [websiteStatuses])

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
      console.log('[FRONTEND DEBUG] Current websites count:', websites.length)
      console.log('[FRONTEND DEBUG] Current websites:', websites.map(w => ({ name: w.name, url: w.url })))
      console.log('[FRONTEND DEBUG] Current websiteStatuses state:', websiteStatuses)

      console.log('[FRONTEND DEBUG] Calling getWebsiteStatuses()...')
      const data = await getWebsiteStatuses()

      // Store last API response for debugging
      setLastApiResponse(data)

      console.log('[FRONTEND DEBUG] ========== API RESPONSE RECEIVED ==========')
      console.log('[FRONTEND DEBUG] Full API response:', JSON.stringify(data, null, 2))
      console.log('[FRONTEND DEBUG] Response success:', data?.success)
      console.log('[FRONTEND DEBUG] Response has websiteStatuses:', !!data?.websiteStatuses)
      console.log('[FRONTEND DEBUG] websiteStatuses type:', typeof data?.websiteStatuses)
      console.log('[FRONTEND DEBUG] websiteStatuses is array:', Array.isArray(data?.websiteStatuses))

      if (data?.websiteStatuses) {
        console.log('[FRONTEND DEBUG] websiteStatuses length:', data.websiteStatuses.length)
      }

      if (data && data.success && data.websiteStatuses && Array.isArray(data.websiteStatuses)) {
        console.log('[FRONTEND DEBUG] ========== PROCESSING VALID RESPONSE ==========')
        console.log('[FRONTEND DEBUG] Received', data.websiteStatuses.length, 'statuses from API')

        // Log each status entry in detail
        data.websiteStatuses.forEach((ws, index) => {
          console.log(`[FRONTEND DEBUG] Status ${index + 1}:`, {
            name: ws.name,
            url: ws.url,
            status: ws.status,
            statusType: typeof ws.status,
            statusCode: ws.statusCode,
            error: ws.error,
            checked_at: ws.checked_at,
            checked_atType: typeof ws.checked_at
          })
        })

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
        data.websiteStatuses.forEach((ws, index) => {
          console.log(`[FRONTEND DEBUG] ========== Processing status ${index + 1}/${data.websiteStatuses.length} ==========`)
          console.log(`[FRONTEND DEBUG] Website: ${ws.name} (${ws.url})`)
          console.log(`[FRONTEND DEBUG] Raw data:`, {
            status: ws.status,
            statusType: typeof ws.status,
            statusCode: ws.statusCode,
            error: ws.error,
            checked_at: ws.checked_at,
            checked_atType: typeof ws.checked_at
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

          const lastCheckedValue = ws.checked_at || null
          console.log(`[FRONTEND DEBUG]   → lastChecked value: ${lastCheckedValue} (type: ${typeof lastCheckedValue})`)

          if (statusMap[ws.url]) {
            const oldStatus = statusMap[ws.url]
            statusMap[ws.url] = {
              status: normalizedStatus,
              lastChecked: lastCheckedValue,
              error: ws.error || null
            }
            console.log(`[FRONTEND DEBUG]   → Updated ${ws.name}:`, {
              from: oldStatus,
              to: statusMap[ws.url]
            })
          } else {
            // Website not in current list but has status
            statusMap[ws.url] = {
              status: normalizedStatus,
              lastChecked: lastCheckedValue,
              error: ws.error || null
            }
            console.log(`[FRONTEND DEBUG]   → Added new website ${ws.name} with status: ${normalizedStatus}`)
          }
        })

        console.log('[FRONTEND DEBUG] ========== FINAL STATUS MAP ==========')
        console.log('[FRONTEND DEBUG] Final statusMap:', JSON.stringify(statusMap, null, 2))
        console.log('[FRONTEND DEBUG] Status map keys:', Object.keys(statusMap))
        console.log('[FRONTEND DEBUG] Status map entries:')
        Object.entries(statusMap).forEach(([url, status]) => {
          console.log(`[FRONTEND DEBUG]   ${url}:`, status)
        })

        console.log('[FRONTEND DEBUG] Calling setWebsiteStatuses()...')
        setWebsiteStatuses(statusMap)
        console.log('[FRONTEND DEBUG] Status map set in state')
        console.log('[FRONTEND DEBUG] ========== loadStatuses COMPLETED ==========')
      } else {
        console.error('[FRONTEND DEBUG] ========== INVALID RESPONSE ==========')
        console.error('[FRONTEND DEBUG] API response not successful or no websiteStatuses')
        console.error('[FRONTEND DEBUG] Response structure:', {
          hasData: !!data,
          hasSuccess: !!data?.success,
          successValue: data?.success,
          hasWebsiteStatuses: !!data?.websiteStatuses,
          websiteStatusesType: typeof data?.websiteStatuses,
          websiteStatusesIsArray: Array.isArray(data?.websiteStatuses),
          fullResponse: data
        })

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
        console.log('[FRONTEND DEBUG] Initialized all as UNKNOWN due to invalid response')
      }
    } catch (error) {
      console.error('[FRONTEND DEBUG] ========== ERROR IN loadStatuses ==========')
      console.error('[FRONTEND DEBUG] Error type:', error.constructor.name)
      console.error('[FRONTEND DEBUG] Error message:', error.message)
      console.error('[FRONTEND DEBUG] Error stack:', error.stack)
      console.error('[FRONTEND DEBUG] Error response:', error.response)
      if (error.response) {
        console.error('[FRONTEND DEBUG] Response status:', error.response.status)
        console.error('[FRONTEND DEBUG] Response data:', error.response.data)
        console.error('[FRONTEND DEBUG] Response headers:', error.response.headers)
      }

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
      console.log('[FRONTEND DEBUG] Initialized all as UNKNOWN due to error')

      // Try fallback to down websites only
      try {
        console.log('[FRONTEND DEBUG] Trying fallback: getDownWebsites()...')
        const downData = await getDownWebsites()
        console.log('[FRONTEND DEBUG] Down websites response:', downData)
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
          console.log('[FRONTEND DEBUG] Updated statuses from down websites')
        }
      } catch (fallbackError) {
        console.error('[FRONTEND DEBUG] Fallback error:', fallbackError)
      }
    }
  }

  const handleRunNow = async () => {
    try {
      setChecking(true)
      toast.loading('Starting website check... This will run in the background.', { id: 'checking' })

      const data = await checkNow()

      if (data.success) {
        toast.success(
          `Check started! Checking ${data.websitesCount || 0} websites in the background. Results will appear shortly.`,
          { id: 'checking', duration: 5000 }
        )

        // Wait a bit then reload statuses to get updated data
        setTimeout(async () => {
          await loadStatuses()
          // Keep checking every 5 seconds until we have results
          let attempts = 0
          const maxAttempts = 20 // Check for up to 100 seconds (20 * 5s = 100s)

          const checkInterval = setInterval(async () => {
            attempts++
            console.log(`[Frontend] Checking for results (attempt ${attempts}/${maxAttempts})...`)
            await loadStatuses()

            // Get fresh statuses from state (need to check after loadStatuses updates state)
            // We'll check in the next interval after state updates
            if (attempts >= maxAttempts) {
              clearInterval(checkInterval)
              setChecking(false)
              toast.success('Website check should be complete. Refreshing statuses...', { id: 'checking' })
              // Final reload
              await loadStatuses()
            }
          }, 5000)

          // Also set a timeout to stop checking after max time
          setTimeout(() => {
            clearInterval(checkInterval)
            setChecking(false)
            loadStatuses() // Final reload
          }, maxAttempts * 5000)
        }, 5000) // Wait 5 seconds before first check
      } else {
        toast.error(`Error: ${data.error}`, { id: 'checking' })
        setChecking(false)
      }
    } catch (error) {
      // Handle errors
      let errorMessage = 'Failed to start website check';

      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout') || error.response?.status === 504) {
        errorMessage = 'Request timed out, but the check may have started. Please refresh the page in a moment.';
        // Still try to reload statuses
        setTimeout(() => {
          loadStatuses()
        }, 5000)
      } else {
        errorMessage = error.response?.data?.error || error.message || 'Failed to start website check';
      }

      toast.error(errorMessage, { id: 'checking', duration: 10000 })
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
            <Button
              variant="secondary"
              onClick={loadStatuses}
              className="w-full sm:w-auto"
            >
              🔄 Refresh Status
            </Button>
            <Button
              variant="secondary"
              onClick={() => setShowDebug(!showDebug)}
              className="w-full sm:w-auto"
            >
              {showDebug ? '🔍 Hide Debug' : '🔍 Show Debug'}
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
                          {/* Enhanced Debug info */}
                          {process.env.NODE_ENV === 'development' && (
                            <div className="text-xs text-gray-400 mt-1 space-y-1">
                              <div>Status: {status || 'undefined'}</div>
                              <div>LastChecked: {lastChecked ? lastChecked : 'null/undefined'}</div>
                              <div>Raw: {JSON.stringify(websiteStatuses[website.url])}</div>
                            </div>
                          )}
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
                        {/* Enhanced Debug info */}
                        {process.env.NODE_ENV === 'development' && (
                          <div className="text-xs text-gray-400 mt-1 space-y-1">
                            <div>Status: {status || 'undefined'}</div>
                            <div>LastChecked: {lastChecked ? lastChecked : 'null/undefined'}</div>
                            <div>Raw: {JSON.stringify(websiteStatuses[website.url])}</div>
                          </div>
                        )}
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

      {/* Debug Panel */}
      {showDebug && (
        <div className="bg-white rounded-2xl shadow-2xl p-4 sm:p-6 lg:p-8 mt-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-gray-800">Debug Information</h3>
            <Button
              variant="secondary"
              onClick={() => setShowDebug(false)}
              className="text-sm"
            >
              Hide Debug
            </Button>
          </div>

          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Last API Response:</h4>
              <pre className="bg-gray-100 p-4 rounded-lg text-xs overflow-auto max-h-96">
                {lastApiResponse ? JSON.stringify(lastApiResponse, null, 2) : 'No API response yet'}
              </pre>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Current State:</h4>
              <pre className="bg-gray-100 p-4 rounded-lg text-xs overflow-auto max-h-96">
                {JSON.stringify({
                  websitesCount: websites.length,
                  websiteStatusesCount: Object.keys(websiteStatuses).length,
                  websiteStatuses: websiteStatuses
                }, null, 2)}
              </pre>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Status Mapping:</h4>
              <div className="bg-gray-100 p-4 rounded-lg text-xs space-y-2">
                {websites.map((website, idx) => {
                  const status = websiteStatuses[website.url]
                  return (
                    <div key={idx} className="border-b border-gray-300 pb-2">
                      <div className="font-semibold">{website.name}</div>
                      <div>URL: {website.url}</div>
                      <div>Status: {status?.status || 'UNKNOWN'}</div>
                      <div>LastChecked: {status?.lastChecked || 'null'}</div>
                      <div>Error: {status?.error || 'null'}</div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
