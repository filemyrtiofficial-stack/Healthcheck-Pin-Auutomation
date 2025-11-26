import axios from 'axios'

const API_BASE = '/api'

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Helper to create axios instance for website endpoints
const websiteApi = axios.create({
  baseURL: '',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 600000, // 10 minutes timeout for website checks (can take a while)
})

// New endpoints matching specification
export const getWebsites = async () => {
  try {
    const response = await websiteApi.get('/website/list')
    return response.data
  } catch (error) {
    console.error('Error fetching websites:', error)
    throw error
  }
}

export const addWebsite = async (name, url) => {
  try {
    // Ensure both name and url are provided and trimmed
    if (!name || !url) {
      throw new Error('Name and URL are required')
    }

    const response = await websiteApi.post('/website/add', {
      name: name.trim(),
      url: url.trim()
    })
    return response.data
  } catch (error) {
    console.error('Error adding website:', error)
    // Log more details for debugging
    if (error.response) {
      console.error('Response error:', error.response.data)
    }
    throw error
  }
}

export const deleteWebsite = async (id) => {
  try {
    const response = await websiteApi.delete(`/website/${id}`)
    return response.data
  } catch (error) {
    console.error('Error deleting website:', error)
    throw error
  }
}

export const checkNow = async () => {
  try {
    const response = await websiteApi.get('/website/check')
    return response.data
  } catch (error) {
    console.error('Error checking websites:', error)
    throw error
  }
}

// Get all website statuses
export const getWebsiteStatuses = async () => {
  try {
    console.log('[API DEBUG] ========== getWebsiteStatuses() called ==========')
    console.log('[API DEBUG] Making request to /api/website-statuses')
    console.log('[API DEBUG] API base URL:', api.defaults.baseURL)

    const response = await api.get('/website-statuses')

    console.log('[API DEBUG] ========== RESPONSE RECEIVED ==========')
    console.log('[API DEBUG] Response status:', response.status)
    console.log('[API DEBUG] Response headers:', response.headers)
    console.log('[API DEBUG] Response data type:', typeof response.data)
    console.log('[API DEBUG] Response data keys:', Object.keys(response.data || {}))
    console.log('[API DEBUG] Response success:', response.data?.success)
    console.log('[API DEBUG] Response has websiteStatuses:', !!response.data?.websiteStatuses)
    console.log('[API DEBUG] websiteStatuses is array:', Array.isArray(response.data?.websiteStatuses))

    if (response.data?.websiteStatuses) {
      console.log('[API DEBUG] websiteStatuses length:', response.data.websiteStatuses.length)
      console.log('[API DEBUG] First 3 statuses:')
      response.data.websiteStatuses.slice(0, 3).forEach((ws, idx) => {
        console.log(`[API DEBUG]   [${idx + 1}] ${ws.name} (${ws.url}):`, {
          status: ws.status,
          statusType: typeof ws.status,
          checked_at: ws.checked_at,
          checked_atType: typeof ws.checked_at,
          statusCode: ws.statusCode,
          error: ws.error
        })
      })
    }

    console.log('[API DEBUG] Full response data:', JSON.stringify(response.data, null, 2))
    console.log('[API DEBUG] ========== Returning response.data ==========')

    return response.data
  } catch (error) {
    console.error('[API DEBUG] ========== ERROR in getWebsiteStatuses() ==========')
    console.error('[API DEBUG] Error type:', error.constructor.name)
    console.error('[API DEBUG] Error message:', error.message)
    console.error('[API DEBUG] Error response:', error.response)
    if (error.response) {
      console.error('[API DEBUG] Response status:', error.response.status)
      console.error('[API DEBUG] Response data:', error.response.data)
      console.error('[API DEBUG] Response headers:', error.response.headers)
    }
    console.error('[API DEBUG] Error stack:', error.stack)
    throw error
  }
}

// Legacy endpoint for down websites (still using /api)
export const getDownWebsites = async () => {
  try {
    const response = await api.get('/down-websites')
    return response.data
  } catch (error) {
    console.error('Error fetching down websites:', error)
    throw error
  }
}
