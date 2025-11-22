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

// Request logging middleware (only in development)
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    logger.debug(`${req.method} ${req.path}`);
    next();
  });
}

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
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
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

// GET /website/check → manually triggered check
app.get('/website/check', async (req, res) => {
  // Set a longer timeout for this endpoint (10 minutes)
  req.setTimeout(600000);

  try {
    const websites = loadWebsites();
    logger.info(`Starting website check for ${websites.length} websites`);

    const whatsappContact = process.env.WHATSAPP_ADMIN_NUMBER || process.env.ADMIN_PHONE_NUMBER;

    // Initialize WhatsApp if configured (but don't wait too long - max 2 minutes)
    let whatsappReady = false;
    if (whatsappContact) {
      try {
        logger.info('Initializing WhatsApp...');
        await whatsappService.initialize();
        // Wait for connection but with a shorter timeout for API requests (2 minutes max)
        let attempts = 0;
        const maxAttempts = 240; // 2 minutes (240 * 500ms = 2 minutes) - shorter for API
        let lastStatus = false;

        while (!whatsappService.getConnectionStatus() && attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 500));
          attempts++;
          const currentStatus = whatsappService.getConnectionStatus();
          if (currentStatus !== lastStatus && currentStatus) {
            logger.info('WhatsApp connection established!');
            break;
          }
          lastStatus = currentStatus;
        }
        whatsappReady = whatsappService.getConnectionStatus();
        if (whatsappReady) {
          logger.info('WhatsApp connected successfully!');
        } else {
          logger.warn('WhatsApp connection timeout after 2 minutes. Continuing without WhatsApp.');
        }
      } catch (error) {
        logger.error(`WhatsApp initialization error: ${error.message}`, error);
        // Continue without WhatsApp - don't fail the entire check
      }
    }

    // Check all websites
    logger.info('Starting to check websites...');
    const results = await checkWebsites(websites);
    logger.info(`Completed checking ${results.length} websites`);

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

// Helper function to get latest statuses for all websites
function getLatestStatuses() {
  // Use the same path resolution as database.js
  const { getStatusFilePath } = require('./src/utils/database');
  const statusFile = getStatusFilePath();
  let statuses = [];

  if (fs.existsSync(statusFile)) {
    try {
      const data = fs.readFileSync(statusFile, 'utf8');
      statuses = JSON.parse(data);
      logger.debug(`Loaded ${statuses.length} status entries from file: ${statusFile}`);
      // Ensure statuses is an array
      if (!Array.isArray(statuses)) {
        logger.warn('Status file is not an array, resetting to empty array');
        statuses = [];
      }
    } catch (error) {
      logger.error(`Error reading status file ${statusFile}: ${error.message}`, error);
      statuses = [];
    }
  } else {
    logger.debug(`Status file not found at: ${statusFile}. No status data available.`);
  }

  const websites = loadWebsites();
  const latestStatuses = {};

  statuses.forEach((status) => {
    if (status && status.url) {
      // Include status even if checked_at is missing (for backward compatibility)
      const existingStatus = latestStatuses[status.url];
      const statusCheckedAt = status.checked_at || new Date().toISOString(); // Default to now if missing
      const existingCheckedAt = existingStatus?.checked_at || new Date(0).toISOString();

      if (!existingStatus || new Date(statusCheckedAt) > new Date(existingCheckedAt)) {
        // Ensure checked_at exists
        latestStatuses[status.url] = {
          ...status,
          checked_at: status.checked_at || statusCheckedAt
        };
      }
    }
  });

  logger.debug(`Processed ${Object.keys(latestStatuses).length} unique website statuses from ${statuses.length} total entries`);
  return { websites, latestStatuses };
}

// Get all website statuses (latest status for each website)
app.get('/api/website-statuses', (req, res) => {
  try {
    const { websites, latestStatuses } = getLatestStatuses();

    logger.debug(`[API] Fetching statuses for ${websites.length} websites`);
    logger.debug(`[API] Found ${Object.keys(latestStatuses).length} status entries`);

    const websiteStatuses = websites.map(website => {
      const status = latestStatuses[website.url];

      if (!status) {
        logger.debug(`[API] No status found for ${website.name} (${website.url})`);
        return {
          name: website.name,
          url: website.url,
          status: 'UNKNOWN',
          statusCode: null,
          error: null,
          checked_at: null
        };
      }

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

      logger.debug(`[API] Status for ${website.name}: ${websiteStatus}, checked_at: ${result.checked_at}`);
      return result;
    });

    logger.info(`[API /website-statuses] Returning ${websiteStatuses.length} website statuses. Statuses found: ${Object.keys(latestStatuses).length}`);
    logger.debug(`[API /website-statuses] Sample response:`, websiteStatuses.slice(0, 2));

    res.json({ success: true, websiteStatuses });
  } catch (error) {
    logger.error(`Error fetching website statuses: ${error.message}`, error);
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
const frontendDist = path.join(__dirname, '../frontend/dist');
const frontendSrc = path.join(__dirname, '../frontend');

if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
} else {
  // For development: serve source files with proper MIME types
  app.use((req, res, next) => {
    // Set correct MIME type for JSX files
    if (req.path.endsWith('.jsx')) {
      res.type('application/javascript');
    }
    // Set correct MIME type for JS files
    if (req.path.endsWith('.js')) {
      res.type('application/javascript');
    }
    // Set correct MIME type for TSX files
    if (req.path.endsWith('.tsx')) {
      res.type('application/javascript');
    }
    // Set correct MIME type for TS files
    if (req.path.endsWith('.ts')) {
      res.type('application/javascript');
    }
    next();
  }, express.static(frontendSrc));
}

// Serve frontend - prefer dist, fallback to source
// This catch-all must be LAST
app.get('*', (req, res) => {
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

