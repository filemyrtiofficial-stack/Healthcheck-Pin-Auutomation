/**
 * Input validation middleware
 */

/**
 * Validate URL format
 */
function isValidUrl(url) {
  if (!url || typeof url !== 'string') {
    return false;
  }

  try {
    const urlObj = new URL(url.trim());
    // Only allow http and https protocols
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch (error) {
    return false;
  }
}

/**
 * Sanitize string input
 */
function sanitizeString(input, maxLength = 255) {
  if (typeof input !== 'string') {
    return '';
  }

  // Remove leading/trailing whitespace
  let sanitized = input.trim();

  // Limit length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  // Remove potentially dangerous characters (basic XSS prevention)
  sanitized = sanitized.replace(/[<>]/g, '');

  return sanitized;
}

/**
 * Validate website name
 */
function validateWebsiteName(name) {
  if (!name || typeof name !== 'string') {
    return { valid: false, error: 'Website name is required' };
  }

  const sanitized = sanitizeString(name, 100);

  if (sanitized.length === 0) {
    return { valid: false, error: 'Website name cannot be empty' };
  }

  if (sanitized.length < 2) {
    return { valid: false, error: 'Website name must be at least 2 characters' };
  }

  return { valid: true, value: sanitized };
}

/**
 * Validate website URL
 */
function validateWebsiteUrl(url) {
  if (!url || typeof url !== 'string') {
    return { valid: false, error: 'Website URL is required' };
  }

  const trimmed = url.trim();

  if (trimmed.length === 0) {
    return { valid: false, error: 'Website URL cannot be empty' };
  }

  if (!isValidUrl(trimmed)) {
    return { valid: false, error: 'Invalid URL format. URL must start with http:// or https://' };
  }

  // Additional security: prevent localhost/internal IPs in production
  if (process.env.NODE_ENV === 'production') {
    try {
      const urlObj = new URL(trimmed);
      const hostname = urlObj.hostname.toLowerCase();

      // Block localhost and private IPs
      if (hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        hostname.startsWith('192.168.') ||
        hostname.startsWith('10.') ||
        hostname.startsWith('172.16.') ||
        hostname.startsWith('172.17.') ||
        hostname.startsWith('172.18.') ||
        hostname.startsWith('172.19.') ||
        hostname.startsWith('172.20.') ||
        hostname.startsWith('172.21.') ||
        hostname.startsWith('172.22.') ||
        hostname.startsWith('172.23.') ||
        hostname.startsWith('172.24.') ||
        hostname.startsWith('172.25.') ||
        hostname.startsWith('172.26.') ||
        hostname.startsWith('172.27.') ||
        hostname.startsWith('172.28.') ||
        hostname.startsWith('172.29.') ||
        hostname.startsWith('172.30.') ||
        hostname.startsWith('172.31.')) {
        return { valid: false, error: 'Localhost and private IP addresses are not allowed in production' };
      }
    } catch (error) {
      return { valid: false, error: 'Invalid URL format' };
    }
  }

  return { valid: true, value: trimmed };
}

/**
 * Validate website ID (for delete operations)
 */
function validateWebsiteId(id) {
  const numId = parseInt(id, 10);

  if (isNaN(numId) || numId < 0) {
    return { valid: false, error: 'Invalid website ID' };
  }

  return { valid: true, value: numId };
}

module.exports = {
  isValidUrl,
  sanitizeString,
  validateWebsiteName,
  validateWebsiteUrl,
  validateWebsiteId
};

