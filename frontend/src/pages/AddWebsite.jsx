import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import Button from '../components/Button'
import { addWebsite } from '../api/api'

export default function AddWebsite() {
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [bulkMode, setBulkMode] = useState(false)
  const [bulkText, setBulkText] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (bulkMode) {
      // Handle bulk addition
      const lines = bulkText.trim().split('\n').filter(line => line.trim() !== '')
      if (lines.length === 0) {
        toast.error('Please enter at least one website')
        return
      }

      const websites = []
      for (const line of lines) {
        const parts = line.split(',').map(part => part.trim())
        if (parts.length === 2) {
          websites.push({ name: parts[0], url: parts[1] })
        } else {
          // Try to extract URL and create name from domain
          const urlMatch = line.match(/https?:\/\/([^\/]+)/)
          if (urlMatch) {
            const domain = urlMatch[1].replace(/^www\./, '')
            websites.push({ name: domain, url: line.trim() })
          }
        }
      }

      if (websites.length === 0) {
        toast.error('No valid websites found. Please use format: Name,URL or just URLs')
        return
      }

      setLoading(true)
      try {
        let successCount = 0
        let errorCount = 0
        console.log(`[BULK ADD] Starting bulk addition of ${websites.length} websites`)

        for (let i = 0; i < websites.length; i++) {
          const website = websites[i]
          try {
            console.log(`[BULK ADD] Adding website ${i + 1}/${websites.length}: ${website.name} (${website.url})`)
            const data = await addWebsite(website.name, website.url)
            if (data.success) {
              successCount++
              console.log(`[BULK ADD] ✓ Success: ${website.name}`)
            } else {
              errorCount++
              console.log(`[BULK ADD] ✗ Failed: ${website.name} - ${data.error}`)
            }
          } catch (error) {
            errorCount++
            console.log(`[BULK ADD] ✗ Error: ${website.name} - ${error.message}`)
          }
        }

        if (successCount > 0) {
          toast.success(`Successfully added ${successCount} website${successCount > 1 ? 's' : ''}!`)
          if (errorCount > 0) {
            toast.error(`Failed to add ${errorCount} website${errorCount > 1 ? 's' : ''}`)
          }
          setBulkText('')
          // Small delay to ensure backend has saved, then navigate
          setTimeout(() => {
            navigate('/', { state: { refresh: true } })
          }, 500)
        } else {
          toast.error('Failed to add any websites')
        }
      } catch (error) {
        toast.error('Bulk addition failed')
      } finally {
        setLoading(false)
      }
    } else {
      // Handle single addition
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
  }

  return (
    <div>
      <div className="bg-white rounded-2xl shadow-2xl p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-6">Add Websites</h2>

        {/* Mode Toggle */}
        <div className="flex justify-center mb-6">
          <div className="bg-gray-100 p-1 rounded-lg">
            <button
              type="button"
              onClick={() => setBulkMode(false)}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${!bulkMode
                  ? 'bg-white text-purple-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
                }`}
            >
              Single Website
            </button>
            <button
              type="button"
              onClick={() => setBulkMode(true)}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${bulkMode
                  ? 'bg-white text-purple-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
                }`}
            >
              Bulk Add
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {bulkMode ? (
            // Bulk mode
            <div>
              <label htmlFor="bulkText" className="block text-sm font-medium text-gray-700 mb-2">
                Websites (One per line)
              </label>
              <textarea
                id="bulkText"
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                placeholder={`Format 1: Name,URL
Kerala RTI Portal,https://rtiportal.kerala.gov.in/
Chhattisgarh RTI,https://rtionline.cg.gov.in/

Format 2: Just URLs (name auto-generated)
https://rtionline.goa.gov.in/
https://rtionline.haryana.gov.in/`}
                rows={10}
                disabled={loading}
              />
              <p className="text-sm text-gray-500 mt-2">
                Enter websites one per line. You can use "Name,URL" format or just URLs (names will be auto-generated).
              </p>
            </div>
          ) : (
            // Single mode
            <>
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
                  disabled={loading}
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
                  disabled={loading}
                />
              </div>
            </>
          )}

          <div className="flex flex-col sm:flex-row gap-4">
            <Button
              type="submit"
              variant="success"
              disabled={loading}
              className="flex-1 w-full sm:w-auto"
            >
              {loading
                ? (bulkMode ? 'Adding Websites...' : 'Adding...')
                : (bulkMode ? '➕ Add Websites' : '➕ Add Website')
              }
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
