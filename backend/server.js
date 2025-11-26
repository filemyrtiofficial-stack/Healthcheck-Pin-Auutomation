const express = require('express');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const { checkWebsites } = require('./src/checker/websiteChecker');
const whatsappService = require('./src/whatsapp/whatsappService');
const { generateSocialMediaPost, generateConsolidatedWhatsAppMessage, generateIndividualWhatsAppMessage } = require('./src/postGenerator/postGenerator');
const { saveStatus, getLastPostTime, savePostLog } = require('./src/utils/database');
const { logger } = require('./src/utils/logger');
const { validateEnvironment } = require('./src/utils/envValidator');
const { setupSecurityMiddleware, setupCORS } = require('./src/middleware/security');
const { validateWebsiteName, validateWebsiteUrl, validateWebsiteId } = require('./src/middleware/validation');

// Validate environment variables on startup
const envValidation = validateEnvironment();
if (!envValidation.valid && process.env.NODE_ENV === 'production') {
  logger.error('Environment validation failed. Exiting...');
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware (must be before other middleware)
setupSecurityMiddleware(app);
setupCORS(app);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Middleware to ensure API routes return JSON, not HTML
app.use((req, res, next) => {
  // Force JSON content type for all API routes
  if (req.path.startsWith('/api/') || req.path.startsWith('/website/') || req.path.startsWith('/health')) {
    res.setHeader('Content-Type', 'application/json');
  }
  next();
});

// Request logging middleware - log ALL requests to API routes
app.use((req, res, next) => {
  if (req.path.startsWith('/api/') || req.path.startsWith('/website/') || req.path.startsWith('/health')) {
    logger.info(`[REQUEST] ${req.method} ${req.path} - Headers: ${JSON.stringify(req.headers)}`);
  } else {
    logger.debug(`${req.method} ${req.path}`);
  }
  next();
});

// Note: Static file serving is moved to the end, after all API routes

// Load websites from config file
const WEBSITES_FILE = path.join(__dirname, '../config/websites.json');

function loadWebsites() {
  try {
    if (fs.existsSync(WEBSITES_FILE)) {
      const data = fs.readFileSync(WEBSITES_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    logger.error(`Error loading websites: ${error.message}`);
  }
  // Default websites if file doesn't exist
  return [
    { url: 'https://rti.rajasthan.gov.in/', name: 'Rajasthan RTI' },
    { url: 'https://rtionline.sikkim.gov.in/auth/login', name: 'Sikkim RTI' },
    { url: 'https://rtionline.tripura.gov.in/', name: 'Tripura RTI' },
    { url: 'https://rtionline.up.gov.in/', name: 'Uttar Pradesh RTI' },
    { url: 'https://rtionline.uk.gov.in/', name: 'Uttarakhand RTI' },
    { url: 'https://par.wb.gov.in/rtilogin.php', name: 'West Bengal RTI' },
    { url: 'https://chandigarh.gov.in/submit-rti-application', name: 'Chandigarh RTI' },
    { url: 'https://rtionline.delhi.gov.in/', name: 'Delhi RTI' },
    { url: 'https://rtionline.jk.gov.in/', name: 'Jammu & Kashmir RTI' },
    { url: 'https://rtionline.ladakh.gov.in/index.php', name: 'Ladakh RTI' }
  ];
}

function saveWebsites(websites) {
  try {
    const dir = path.dirname(WEBSITES_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(WEBSITES_FILE, JSON.stringify(websites, null, 2));
    return true;
  } catch (error) {
    logger.error(`Error saving websites: ${error.message}`);
    return false;
  }
}

// API Routes

// Health check endpoint
app.get('/health', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Test endpoint to verify API routing works
app.get('/api/test', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.json({ success: true, message: 'API routing is working!', path: req.path });
});

// Required endpoints matching specification
// POST /website/add
app.post('/website/add', (req, res) => {
  try {
    const { url, name } = req.body;

    // Validate input
    const nameValidation = validateWebsiteName(name);
    if (!nameValidation.valid) {
      return res.status(400).json({
        success: false,
        error: nameValidation.error
      });
    }

    const urlValidation = validateWebsiteUrl(url);
    if (!urlValidation.valid) {
      return res.status(400).json({
        success: false,
        error: urlValidation.error
      });
    }

    const trimmedUrl = urlValidation.value;
    const trimmedName = nameValidation.value;

    const websites = loadWebsites();

    // Check if website already exists (case-insensitive comparison)
    const urlExists = websites.some(w => w.url.toLowerCase() === trimmedUrl.toLowerCase());
    const nameExists = websites.some(w => w.name.toLowerCase() === trimmedName.toLowerCase());

    if (urlExists) {
      return res.status(400).json({
        success: false,
        error: `A website with URL "${trimmedUrl}" already exists`
      });
    }

    if (nameExists) {
      return res.status(400).json({
        success: false,
        error: `A website with name "${trimmedName}" already exists`
      });
    }

    websites.push({ url: trimmedUrl, name: trimmedName });
    saveWebsites(websites);

    res.json({ success: true, message: 'Website added successfully', websites });
    logger.info(`Website added: ${trimmedName} (${trimmedUrl})`);
  } catch (error) {
    logger.error(`Error adding website: ${error.message}`, error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// GET /website/list
app.get('/website/list', (req, res) => {
  try {
    const websites = loadWebsites();
    res.json({ success: true, websites });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /website/:id
app.delete('/website/:id', (req, res) => {
  try {
    const idValidation = validateWebsiteId(req.params.id);
    if (!idValidation.valid) {
      return res.status(400).json({ success: false, error: idValidation.error });
    }

    const id = idValidation.value;
    const websites = loadWebsites();

    if (id >= websites.length) {
      return res.status(404).json({ success: false, error: 'Website not found' });
    }

    const deletedWebsite = websites[id];
    websites.splice(id, 1);
    saveWebsites(websites);

    logger.info(`Website deleted: ${deletedWebsite.name} (${deletedWebsite.url})`);
    res.json({ success: true, message: 'Website deleted successfully', websites });
  } catch (error) {
    logger.error(`Error deleting website: ${error.message}`, error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// GET /website/check → manually triggered check (runs in background)
app.get('/website/check', async (req, res) => {
  try {
    const websites = loadWebsites();
    logger.info(`[API] Website check requested for ${websites.length} websites`);

    // Return immediately - process in background
    res.json({
      success: true,
      message: 'Website check started in background',
      websitesCount: websites.length,
      timestamp: new Date().toISOString()
    });

    // Process in background (don't await - fire and forget)
    setImmediate(async () => {
      try {
        const whatsappContact = process.env.WHATSAPP_ADMIN_NUMBER || process.env.ADMIN_PHONE_NUMBER;

        // Initialize WhatsApp if configured (but don't wait too long - max 30 seconds)
        let whatsappReady = false;
        if (whatsappContact) {
          try {
            logger.info('[Background] Initializing WhatsApp...');
            await whatsappService.initialize();
            // Wait for connection but with a very short timeout for API requests (30 seconds max)
            let attempts = 0;
            const maxAttempts = 60; // 30 seconds (60 * 500ms = 30 seconds)
            let lastStatus = false;

            while (!whatsappService.getConnectionStatus() && attempts < maxAttempts) {
              await new Promise(resolve => setTimeout(resolve, 500));
              attempts++;
              const currentStatus = whatsappService.getConnectionStatus();
              if (currentStatus !== lastStatus && currentStatus) {
                logger.info('[Background] WhatsApp connection established!');
                break;
              }
              lastStatus = currentStatus;
            }
            whatsappReady = whatsappService.getConnectionStatus();
            if (whatsappReady) {
              logger.info('[Background] WhatsApp connected successfully!');
            } else {
              logger.warn('[Background] WhatsApp connection timeout after 30 seconds. Continuing without WhatsApp.');
            }
          } catch (error) {
            logger.error(`[Background] WhatsApp initialization error: ${error.message}`, error);
            // Continue without WhatsApp - don't fail the entire check
          }
        }

        // Check all websites
        logger.info('[Background] Starting to check websites...');
        const results = await checkWebsites(websites);
        logger.info(`[Background] Completed checking ${results.length} websites`);

        // Process results
        const summary = { up: 0, down: 0 };
        const downWebsites = []; // Collect all down websites for consolidated message

        for (const result of results) {
          const { website, status, error, screenshot } = result;

          // Save status
          await saveStatus(website.url, status, error);

          // Determine if website is UP (only if status code is 200-399)
          // DOWN if: status code is 4xx/5xx OR status is null with an error
          const isUp = status !== null && status >= 200 && status < 400;
          // Website is DOWN if:
          // 1. Status code exists and is NOT 200-399 (i.e., 4xx or 5xx)
          // 2. Status is null BUT there's an error (connection failed, timeout, etc.)
          const isDown = (status !== null && (status < 200 || status >= 400)) ||
            (status === null && error && error.trim() !== '');

          if (isUp) {
            summary.up++;
          } else if (isDown) {
            summary.down++;
            // Add to down websites list for consolidated message
            downWebsites.push({ website, status, error, screenshot });
          }
        }

        logger.info(`[Background] Check complete: ${summary.up} UP, ${summary.down} DOWN`);

        // Send individual WhatsApp messages with screenshots for each down website
        if (downWebsites.length > 0 && whatsappReady && whatsappContact) {
          try {
            logger.info(`[Background] Sending individual WhatsApp notifications for ${downWebsites.length} down website(s)...`);

            // Send individual message with screenshot for each down website
            for (const downWebsite of downWebsites) {
              const { website, status, error, screenshot } = downWebsite;

              try {
                // Generate individual message for this website
                const message = generateIndividualWhatsAppMessage(website, status, error, screenshot);

                // Send message with screenshot if available
                if (screenshot) {
                  await whatsappService.sendMessage(message, screenshot);
                  logger.info(`[Background] WhatsApp notification with screenshot sent for ${website.name}`);
                } else {
                  await whatsappService.sendMessage(message);
                  logger.info(`[Background] WhatsApp notification sent for ${website.name} (no screenshot available)`);
                }

                // Add a small delay between messages to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 2000));
              } catch (websiteError) {
                logger.error(`[Background] Error sending WhatsApp for ${website.name}: ${websiteError.message}`);
                // Continue with next website even if one fails
              }
            }

            logger.info(`[Background] All WhatsApp notifications sent successfully!`);
          } catch (whatsappError) {
            logger.error(`[Background] WhatsApp error: ${whatsappError.message}`);
          }
        }
      } catch (error) {
        logger.error(`[Background] Error running health check: ${error.message}`, error);
      }
    });
  } catch (error) {
    logger.error(`[API] Error starting website check: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Helper function to get latest statuses for all websites
// Helper function to normalize URLs for comparison
function normalizeUrl(url) {
  if (!url) return '';
  // Remove trailing slash, convert to lowercase, trim whitespace
  return String(url).trim().toLowerCase().replace(/\/+$/, '');
}

function getLatestStatuses() {
  logger.info('[getLatestStatuses] ========== START ==========');

  // Use the same path resolution as database.js
  const { getStatusFilePath } = require('./src/utils/database');
  const statusFile = getStatusFilePath();
  logger.info(`[getLatestStatuses] Status file path: ${statusFile}`);
  logger.info(`[getLatestStatuses] Status file exists: ${fs.existsSync(statusFile)}`);

  let statuses = [];

  if (fs.existsSync(statusFile)) {
    try {
      const data = fs.readFileSync(statusFile, 'utf8');
      logger.info(`[getLatestStatuses] File size: ${data.length} bytes`);
      statuses = JSON.parse(data);
      logger.info(`[getLatestStatuses] Loaded ${statuses.length} status entries from file`);
      logger.info(`[getLatestStatuses] Statuses is array: ${Array.isArray(statuses)}`);

      // Log first few entries for debugging
      if (statuses.length > 0) {
        logger.info(`[getLatestStatuses] First 3 entries:`, JSON.stringify(statuses.slice(0, 3), null, 2));
      }

      // Ensure statuses is an array
      if (!Array.isArray(statuses)) {
        logger.warn('[getLatestStatuses] Status file is not an array, resetting to empty array');
        statuses = [];
      }
    } catch (error) {
      logger.error(`[getLatestStatuses] Error reading status file: ${error.message}`, error);
      logger.error(`[getLatestStatuses] Error stack:`, error.stack);
      statuses = [];
    }
  } else {
    logger.warn(`[getLatestStatuses] Status file not found at: ${statusFile}. No status data available.`);
  }

  const websites = loadWebsites();
  logger.info(`[getLatestStatuses] Loaded ${websites.length} websites from config`);
  logger.info(`[getLatestStatuses] Website URLs:`, websites.map(w => w.url));

  const latestStatuses = {};

  statuses.forEach((status, index) => {
    if (status && status.url) {
      const normalizedUrl = normalizeUrl(status.url);
      logger.debug(`[getLatestStatuses] Processing status entry ${index + 1}:`, {
        originalUrl: status.url,
        normalizedUrl: normalizedUrl,
        status: status.status,
        error: status.error,
        checked_at: status.checked_at,
        checked_atType: typeof status.checked_at
      });

      // Include status even if checked_at is missing (for backward compatibility)
      // Use normalized URL as key for matching
      const existingStatus = latestStatuses[normalizedUrl];
      const statusCheckedAt = status.checked_at || new Date().toISOString(); // Default to now if missing
      const existingCheckedAt = existingStatus?.checked_at || new Date(0).toISOString();

      // Validate checked_at date
      const statusDate = new Date(statusCheckedAt);
      const existingDate = new Date(existingCheckedAt);
      const isStatusValid = !isNaN(statusDate.getTime());
      const isExistingValid = !isNaN(existingDate.getTime());

      logger.debug(`[getLatestStatuses] Date comparison for ${status.url}:`, {
        statusCheckedAt,
        existingCheckedAt,
        statusDateValid: isStatusValid,
        existingDateValid: isExistingValid,
        statusDate: isStatusValid ? statusDate.toISOString() : 'INVALID',
        existingDate: isExistingValid ? existingDate.toISOString() : 'INVALID',
        isNewer: isStatusValid && isExistingValid ? statusDate > existingDate : !existingStatus
      });

      if (!existingStatus || (isStatusValid && isExistingValid && statusDate > existingDate)) {
        // Ensure checked_at exists and is valid
        const finalCheckedAt = status.checked_at && !isNaN(new Date(status.checked_at).getTime())
          ? status.checked_at
          : statusCheckedAt;

        // Store with normalized URL as key, but keep original URL in the data
        latestStatuses[normalizedUrl] = {
          ...status,
          url: status.url, // Keep original URL
          checked_at: finalCheckedAt
        };
        logger.info(`[getLatestStatuses] Added/updated status for ${normalizedUrl} (original: ${status.url}) with checked_at: ${finalCheckedAt}`);
      } else {
        logger.debug(`[getLatestStatuses] Skipped older status for ${normalizedUrl} (original: ${status.url})`);
      }
    } else {
      logger.debug(`[getLatestStatuses] Skipped invalid status entry ${index + 1}:`, status);
    }
  });

  logger.info(`[getLatestStatuses] ========== RESULT ==========`);
  logger.info(`[getLatestStatuses] Total status entries processed: ${statuses.length}`);
  logger.info(`[getLatestStatuses] Unique website statuses: ${Object.keys(latestStatuses).length}`);
  logger.info(`[getLatestStatuses] Latest status URLs (normalized keys):`, Object.keys(latestStatuses));

  // Log detailed sample with both normalized key and original URL
  logger.info(`[getLatestStatuses] Latest statuses sample:`, JSON.stringify(
    Object.entries(latestStatuses).slice(0, 5).map(([normalizedUrl, status]) => ({
      normalizedKey: normalizedUrl,
      originalUrl: status.url,
      status: status.status,
      checked_at: status.checked_at,
      error: status.error
    })),
    null,
    2
  ));

  // Check for specific URLs the user mentioned
  const testUrls = [
    'https://rtiportal.kerala.gov.in/',
    'https://rtionline.cg.gov.in/',
    'https://rtionline.goa.gov.in/',
    'https://rtionline.haryana.gov.in/',
    'https://rtionline.mizoram.gov.in/',
    'https://rtionline.odisha.gov.in/'
  ];

  logger.info(`[getLatestStatuses] ========== TEST URL MATCHING ==========`);
  testUrls.forEach(testUrl => {
    const normalized = normalizeUrl(testUrl);
    const found = latestStatuses[normalized];
    logger.info(`[getLatestStatuses] Test URL: ${testUrl}`, {
      normalized: normalized,
      found: !!found,
      status: found ? found.status : null,
      checked_at: found ? found.checked_at : null
    });
  });
  logger.info(`[getLatestStatuses] =======================================`);

  return { websites, latestStatuses };
}

// Debug endpoint to check status file directly
app.get('/api/debug/status-file', (req, res) => {
  try {
    const { getStatusFilePath } = require('./src/utils/database');
    const statusFile = getStatusFilePath();
    const exists = fs.existsSync(statusFile);

    let fileInfo = {
      path: statusFile,
      exists: exists,
      size: exists ? fs.statSync(statusFile).size : 0,
      entries: 0,
      sample: null
    };

    if (exists) {
      try {
        const data = fs.readFileSync(statusFile, 'utf8');
        const statuses = JSON.parse(data);
        fileInfo.entries = Array.isArray(statuses) ? statuses.length : 0;
        fileInfo.sample = Array.isArray(statuses) && statuses.length > 0 ? statuses.slice(0, 3) : null;
      } catch (error) {
        fileInfo.error = error.message;
      }
    }

    res.json({ success: true, fileInfo });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get all website statuses (latest status for each website)
app.get('/api/website-statuses', (req, res) => {
  // Explicitly set JSON content type
  res.setHeader('Content-Type', 'application/json');

  try {
    logger.info('[API /website-statuses] ========== REQUEST RECEIVED ==========');
    logger.info('[API /website-statuses] Request path:', req.path);
    logger.info('[API /website-statuses] Request method:', req.method);
    logger.info('[API /website-statuses] Request headers:', req.headers);

    const { websites, latestStatuses } = getLatestStatuses();

    logger.info(`[API /website-statuses] Websites to process: ${websites.length}`);
    logger.info(`[API /website-statuses] Status entries found: ${Object.keys(latestStatuses).length}`);

    // Log all website URLs (both original and normalized)
    logger.info(`[API /website-statuses] Website URLs (original):`, websites.map(w => w.url));
    logger.info(`[API /website-statuses] Website URLs (normalized):`, websites.map(w => normalizeUrl(w.url)));
    logger.info(`[API /website-statuses] Status entry URLs (normalized keys):`, Object.keys(latestStatuses));

    // Log detailed URL comparison
    logger.info(`[API /website-statuses] ========== URL MATCHING DEBUG ==========`);
    websites.forEach(w => {
      const normalized = normalizeUrl(w.url);
      const hasMatch = latestStatuses.hasOwnProperty(normalized);
      logger.info(`[API /website-statuses] ${w.name}:`, {
        originalUrl: w.url,
        normalizedUrl: normalized,
        hasMatch: hasMatch,
        matchedStatus: hasMatch ? latestStatuses[normalized] : null
      });
    });
    logger.info(`[API /website-statuses] =========================================`);

    const websiteStatuses = websites.map(website => {
      // Use normalized URL for lookup
      const normalizedWebsiteUrl = normalizeUrl(website.url);
      const status = latestStatuses[normalizedWebsiteUrl];

      if (!status) {
        logger.warn(`[API /website-statuses] No status found for ${website.name}`);
        logger.warn(`[API /website-statuses]   Original URL: ${website.url}`);
        logger.warn(`[API /website-statuses]   Normalized URL: ${normalizedWebsiteUrl}`);
        logger.warn(`[API /website-statuses]   Available normalized keys:`, Object.keys(latestStatuses));
        return {
          name: website.name,
          url: website.url,
          status: 'UNKNOWN',
          statusCode: null,
          error: null,
          checked_at: null
        };
      }

      logger.debug(`[API /website-statuses] Processing ${website.name}:`, {
        rawStatus: status.status,
        error: status.error,
        checked_at: status.checked_at
      });

      // Determine status: UP only if status code is 200-399
      // DOWN if there's an error OR status code is 4xx/5xx
      // UNKNOWN if no status check has been performed yet
      let websiteStatus = 'UNKNOWN';

      // Normalize status to number (handle string numbers, null, undefined)
      let statusCode = status.status;

      // Convert status to number if it's a string number
      if (statusCode !== null && statusCode !== undefined) {
        if (typeof statusCode === 'string' && statusCode.trim() !== '' && !isNaN(statusCode)) {
          statusCode = parseInt(statusCode.trim(), 10);
        }
      }

      // Check if we have a valid numeric status code
      if (statusCode !== null && statusCode !== undefined && typeof statusCode === 'number' && !isNaN(statusCode)) {
        // Valid status code exists
        if (statusCode >= 200 && statusCode < 400) {
          websiteStatus = 'UP';
        } else {
          // Status code is < 200 or >= 400 = DOWN
          websiteStatus = 'DOWN';
        }
      } else {
        // No valid status code - check for error
        const errorValue = status.error;
        let errorStr = '';

        if (errorValue !== null && errorValue !== undefined) {
          errorStr = String(errorValue).trim();
        }

        // If there's a non-empty error, it's DOWN
        if (errorStr !== '' && errorStr !== 'null' && errorStr !== 'undefined') {
          websiteStatus = 'DOWN';
        }
        // Otherwise it stays UNKNOWN (no check performed yet)
      }

      const result = {
        name: website.name,
        url: website.url,
        status: websiteStatus,
        statusCode: status.status,
        error: status.error || null,
        checked_at: status.checked_at || null
      };

      logger.info(`[API /website-statuses] ${website.name}: status=${websiteStatus}, checked_at=${result.checked_at}`);
      logger.info(`[API /website-statuses] ${website.name} - Full result object:`, JSON.stringify(result, null, 2));

      // Additional debug: Check if checked_at is valid
      if (result.checked_at) {
        const checkedDate = new Date(result.checked_at);
        logger.info(`[API /website-statuses] ${website.name} - checked_at is valid date: ${!isNaN(checkedDate.getTime())}, parsed: ${checkedDate.toISOString()}`);
      } else {
        logger.warn(`[API /website-statuses] ${website.name} - checked_at is NULL or MISSING!`);
        logger.warn(`[API /website-statuses] ${website.name} - Raw status object:`, JSON.stringify(status, null, 2));
      }

      return result;
    });

    logger.info(`[API /website-statuses] ========== RESPONSE SENT ==========`);
    logger.info(`[API /website-statuses] Total websites: ${websiteStatuses.length}`);
    logger.info(`[API /website-statuses] Response sample (first 3):`, JSON.stringify(websiteStatuses.slice(0, 3), null, 2));

    const response = { success: true, websiteStatuses };
    logger.info(`[API /website-statuses] Response structure:`, {
      success: response.success,
      websiteStatusesCount: response.websiteStatuses.length,
      firstWebsite: response.websiteStatuses[0] ? {
        name: response.websiteStatuses[0].name,
        url: response.websiteStatuses[0].url,
        status: response.websiteStatuses[0].status,
        checked_at: response.websiteStatuses[0].checked_at
      } : null
    });

    // Detailed logging for each website in response
    logger.info(`[API /website-statuses] ========== DETAILED RESPONSE BREAKDOWN ==========`);
    response.websiteStatuses.forEach((ws, idx) => {
      logger.info(`[API /website-statuses] [${idx + 1}] ${ws.name}:`, {
        url: ws.url,
        status: ws.status,
        statusType: typeof ws.status,
        checked_at: ws.checked_at,
        checked_atType: typeof ws.checked_at,
        checked_atValid: ws.checked_at ? !isNaN(new Date(ws.checked_at).getTime()) : false,
        statusCode: ws.statusCode,
        error: ws.error
      });
    });
    logger.info(`[API /website-statuses] ================================================`);

    // Explicitly ensure JSON response
    res.setHeader('Content-Type', 'application/json');
    res.status(200).json(response);
  } catch (error) {
    logger.error(`[API /website-statuses] ERROR: ${error.message}`, error);
    logger.error(`[API /website-statuses] Stack:`, error.stack);
    res.setHeader('Content-Type', 'application/json');
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Legacy API endpoints (for backward compatibility)
// Get all websites
app.get('/api/websites', (req, res) => {
  try {
    const websites = loadWebsites();
    res.json({ success: true, websites });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Add a website
app.post('/api/websites', (req, res) => {
  try {
    const { url, name } = req.body;

    if (!url || !name) {
      return res.status(400).json({ success: false, error: 'URL and name are required' });
    }

    // Validate URL format
    try {
      new URL(url);
    } catch (e) {
      return res.status(400).json({ success: false, error: 'Invalid URL format' });
    }

    const websites = loadWebsites();

    // Check if website already exists
    if (websites.some(w => w.url === url || w.name === name)) {
      return res.status(400).json({ success: false, error: 'Website already exists' });
    }

    websites.push({ url, name });
    saveWebsites(websites);

    res.json({ success: true, message: 'Website added successfully', websites });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete a website
app.delete('/api/websites/:index', (req, res) => {
  try {
    const index = parseInt(req.params.index);
    const websites = loadWebsites();

    if (index < 0 || index >= websites.length) {
      return res.status(400).json({ success: false, error: 'Invalid website index' });
    }

    websites.splice(index, 1);
    saveWebsites(websites);

    res.json({ success: true, message: 'Website deleted successfully', websites });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Run health check now
app.post('/api/check-now', async (req, res) => {
  try {
    logger.info('Check Now endpoint called');
    const websites = loadWebsites();
    logger.debug(`Loaded ${websites.length} websites to check`);
    const whatsappContact = process.env.WHATSAPP_ADMIN_NUMBER || process.env.ADMIN_PHONE_NUMBER;

    // Initialize WhatsApp if configured
    let whatsappReady = false;
    if (whatsappContact) {
      try {
        await whatsappService.initialize();
        // Wait a bit for connection
        let attempts = 0;
        while (!whatsappService.getConnectionStatus() && attempts < 10) {
          await new Promise(resolve => setTimeout(resolve, 500));
          attempts++;
        }
        whatsappReady = whatsappService.getConnectionStatus();
      } catch (error) {
        logger.error(`WhatsApp initialization error: ${error.message}`, error);
      }
    }

    // Check all websites
    logger.info(`Starting to check ${websites.length} websites...`);
    const results = await checkWebsites(websites);
    logger.debug(`Received ${results.length} results from checkWebsites`);

    // Process results
    const processedResults = [];
    const summary = { up: 0, down: 0 };
    const downWebsites = []; // Collect all down websites for consolidated message

    for (const result of results) {
      const { website, status, error, screenshot } = result;

      // Save status
      await saveStatus(website.url, status, error);

      // Determine if website is UP (only if status code is 200-399)
      // DOWN if: status code is 4xx/5xx OR status is null with an error
      const isUp = status !== null && status >= 200 && status < 400;
      // Website is DOWN if:
      // 1. Status code exists and is NOT 200-399 (i.e., 4xx or 5xx)
      // 2. Status is null BUT there's an error (connection failed, timeout, etc.)
      const isDown = (status !== null && (status < 200 || status >= 400)) ||
        (status === null && error && error.trim() !== '');

      if (isUp) {
        summary.up++;
      } else if (isDown) {
        summary.down++;
        // Add to down websites list for consolidated message
        downWebsites.push({ website, status, error, screenshot });
      }

      processedResults.push({
        website: website.name,
        url: website.url,
        status: isUp ? 'UP' : 'DOWN',
        statusCode: status,
        error: error || null,
        screenshot: screenshot ? path.relative(process.cwd(), screenshot) : null,
        timestamp: new Date().toISOString()
      });
    }

    // Send individual WhatsApp messages with screenshots for each down website
    if (downWebsites.length > 0 && whatsappReady && whatsappContact) {
      try {
        logger.info(`Sending individual WhatsApp notifications for ${downWebsites.length} down website(s)...`);

        // Send individual message with screenshot for each down website
        for (const downWebsite of downWebsites) {
          const { website, status, error, screenshot } = downWebsite;

          try {
            // Generate individual message for this website
            const message = generateIndividualWhatsAppMessage(website, status, error, screenshot);

            // Send message with screenshot if available
            if (screenshot) {
              await whatsappService.sendMessage(message, screenshot);
              logger.info(`WhatsApp notification with screenshot sent for ${website.name}`);
            } else {
              await whatsappService.sendMessage(message);
              logger.info(`WhatsApp notification sent for ${website.name} (no screenshot available)`);
            }

            // Add a small delay between messages to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 2000));
          } catch (websiteError) {
            logger.error(`Error sending WhatsApp for ${website.name}: ${websiteError.message}`);
            // Continue with next website even if one fails
          }
        }

        logger.info(`All WhatsApp notifications sent successfully!`);
      } catch (whatsappError) {
        logger.error(`WhatsApp error: ${whatsappError.message}`);
      }
    }

    res.json({
      success: true,
      results: processedResults,
      summary,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error(`Error running health check: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get down websites
app.get('/api/down-websites', (req, res) => {
  try {
    const statusFile = path.join(__dirname, 'logs/website_status.json');
    let statuses = [];

    if (fs.existsSync(statusFile)) {
      const data = fs.readFileSync(statusFile, 'utf8');
      statuses = JSON.parse(data);
    }

    // Get latest status for each website
    const websites = loadWebsites();
    const latestStatuses = {};

    statuses.forEach(status => {
      if (!latestStatuses[status.url] || new Date(status.checked_at) > new Date(latestStatuses[status.url].checked_at)) {
        latestStatuses[status.url] = status;
      }
    });

    // Filter down websites
    const downWebsites = websites
      .map(website => {
        const status = latestStatuses[website.url];
        if (!status) {
          // No status check yet - not considered down
          return null;
        }

        // Determine if website is DOWN
        // DOWN if: 
        // 1. Status code exists and is NOT 200-399 (i.e., < 200 or >= 400)
        // 2. Status is null/undefined BUT there's an error (connection failed, timeout, etc.)
        let statusCode = status.status;

        // Convert status to number if it's a string number
        if (statusCode !== null && statusCode !== undefined) {
          if (typeof statusCode === 'string' && statusCode.trim() !== '' && !isNaN(statusCode)) {
            statusCode = parseInt(statusCode.trim(), 10);
          }
        }

        const hasValidStatus = statusCode !== null && statusCode !== undefined && typeof statusCode === 'number' && !isNaN(statusCode);

        const errorValue = status.error;
        let errorStr = '';
        if (errorValue !== null && errorValue !== undefined) {
          errorStr = String(errorValue).trim();
        }
        const hasError = errorStr !== '' && errorStr !== 'null' && errorStr !== 'undefined';

        const isDown = (hasValidStatus && (statusCode < 200 || statusCode >= 400)) ||
          (!hasValidStatus && hasError);

        if (isDown) {
          return {
            name: website.name,
            url: website.url,
            status: status.status,
            error: status.error || 'Unknown error',
            checked_at: status.checked_at
          };
        }
        return null;
      })
      .filter(Boolean);

    res.json({ success: true, downWebsites });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Serve static files - prefer dist (built) folder, fallback to frontend (dev)
// This must come AFTER all API routes
// IMPORTANT: Only serve static files for non-API routes
const frontendDist = path.join(__dirname, '../frontend/dist');
const frontendSrc = path.join(__dirname, '../frontend');

// IMPORTANT: Do NOT use app.use(express.static()) here as it will catch API routes
// Instead, we'll only serve static files for specific file extensions
// This middleware must come AFTER all API routes
app.use((req, res, next) => {
  // CRITICAL: Skip ALL API routes - never serve static files for these
  const path = req.path.toLowerCase();
  if (path.startsWith('/api/') || path.startsWith('/website/') || path.startsWith('/health')) {
    logger.debug(`[Static Middleware] Skipping static file serving for API route: ${req.path}`);
    return next();
  }

  // Only serve actual static asset files (with extensions)
  // Don't serve anything else - let the catch-all route handle it
  if (path.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot|map)$/)) {
    logger.debug(`[Static Middleware] Serving static file: ${req.path}`);
    if (fs.existsSync(frontendDist)) {
      return express.static(frontendDist, {
        setHeaders: (res, path) => {
          // Ensure correct content types
          if (path.endsWith('.js')) res.setHeader('Content-Type', 'application/javascript');
          if (path.endsWith('.css')) res.setHeader('Content-Type', 'text/css');
        }
      })(req, res, next);
    } else {
      return express.static(frontendSrc)(req, res, next);
    }
  }

  // For all other paths, continue to next middleware (catch-all route)
  next();
});

// Serve frontend - prefer dist, fallback to source
// This catch-all must be LAST and only for non-API routes
app.get('*', (req, res) => {
  // Double check - never serve HTML for API routes
  if (req.path.startsWith('/api/') || req.path.startsWith('/website/') || req.path.startsWith('/health')) {
    return res.status(404).json({ success: false, error: 'API endpoint not found' });
  }

  const distIndex = path.join(__dirname, '../frontend/dist/index.html');
  const srcIndex = path.join(__dirname, '../frontend/index.html');

  if (fs.existsSync(distIndex)) {
    res.sendFile(distIndex);
  } else {
    res.sendFile(srcIndex);
  }
});

// Error handling middleware (must be last)
app.use((err, req, res, next) => {
  logger.error(`Unhandled error: ${err.message}`, err);
  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

// Start server
const server = app.listen(PORT, () => {
  logger.info(`Server running on http://localhost:${PORT}`);
  logger.info(`Frontend available at http://localhost:${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
const gracefulShutdown = (signal) => {
  logger.info(`${signal} received. Starting graceful shutdown...`);

  server.close(() => {
    logger.info('HTTP server closed');

    // Close WhatsApp connection if active
    try {
      if (whatsappService.getConnectionStatus()) {
        logger.info('Closing WhatsApp connection...');
        // WhatsApp service cleanup if needed
      }
    } catch (error) {
      logger.error(`Error during WhatsApp cleanup: ${error.message}`);
    }

    logger.info('Graceful shutdown complete');
    process.exit(0);
  });

  // Force shutdown after 10 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error(`Uncaught exception: ${error.message}`, error);
  gracefulShutdown('uncaughtException');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error(`Unhandled rejection at: ${promise}, reason: ${reason}`);
  gracefulShutdown('unhandledRejection');
});

