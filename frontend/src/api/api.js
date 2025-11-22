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
    const response = await api.get('/website-statuses')
    return response.data
  } catch (error) {
    console.error('Error fetching website statuses:', error)
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
