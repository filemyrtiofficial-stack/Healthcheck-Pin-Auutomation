import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import Button from '../components/Button'
import { addWebsite } from '../api/api'

export default function AddWebsite() {
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!name.trim() || !url.trim()) {
      toast.error('Please fill in all fields')
      return
    }

    // Validate URL
    try {
      new URL(url)
    } catch {
      toast.error('Please enter a valid URL')
      return
    }

    try {
      setLoading(true)
      const data = await addWebsite(name.trim(), url.trim())

      if (data.success) {
        toast.success('Website added successfully!')
        setName('')
        setUrl('')
        // Small delay to ensure backend has saved, then navigate
        setTimeout(() => {
          navigate('/', { state: { refresh: true } })
        }, 500)
      } else {
        toast.error(`Error: ${data.error}`)
      }
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message || 'Failed to add website'
      toast.error(`Error: ${errorMessage}`)
      console.error('Add website error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="bg-white rounded-2xl shadow-2xl p-4 sm:p-6 lg:p-8 max-w-2xl mx-auto">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-6">Add New Website</h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              Website Name
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Rajasthan RTI"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
              required
            />
          </div>

          <div>
            <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-2">
              Website URL
            </label>
            <input
              type="url"
              id="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
              required
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <Button
              type="submit"
              variant="success"
              disabled={loading}
              className="flex-1 w-full sm:w-auto"
            >
              {loading ? 'Adding...' : '➕ Add Website'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate('/')}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

