import Button from './Button'

export default function WebsiteCard({ website, index, onDelete, status, lastChecked }) {
  // Normalize status to uppercase for comparison
  const normalizedStatus = status ? String(status).toUpperCase().trim() : 'UNKNOWN'
  const isUp = normalizedStatus === 'UP'
  const isDown = normalizedStatus === 'DOWN'
  const isUnknown = normalizedStatus === 'UNKNOWN'

  // Debug logging
  console.log(`[FRONTEND DEBUG] WebsiteCard ${website.name}:`, {
    rawStatus: status,
    normalizedStatus: normalizedStatus,
    isUp: isUp,
    isDown: isDown,
    isUnknown: isUnknown,
    lastChecked: lastChecked
  })

  // Determine border color and badge color
  let borderColor = 'border-red-500' // Default to red for DOWN/UNKNOWN
  let badgeBg = 'bg-red-100'
  let badgeText = 'text-red-800'
  let displayStatus = normalizedStatus

  if (isUp) {
    borderColor = 'border-green-500'
    badgeBg = 'bg-green-100'
    badgeText = 'text-green-800'
  } else if (isUnknown) {
    borderColor = 'border-gray-400'
    badgeBg = 'bg-gray-100'
    badgeText = 'text-gray-800'
  }

  return (
    <div className={`bg-white rounded-xl shadow-lg p-6 transition-all duration-200 hover:shadow-xl border-l-4 ${borderColor}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-3 mb-2">
            <h3 className="text-xl font-bold text-gray-800">{website.name}</h3>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${badgeBg} ${badgeText}`}>
              {displayStatus}
            </span>
          </div>
          <p className="text-gray-600 text-sm mb-3 break-all">{website.url}</p>
          {lastChecked && (
            <p className="text-gray-500 text-xs">
              Last checked: {new Date(lastChecked).toLocaleString()}
            </p>
          )}
        </div>
        <Button
          variant="danger"
          onClick={() => onDelete(index)}
          className="ml-4"
        >
          🗑️ Delete
        </Button>
      </div>
    </div>
  )
}



