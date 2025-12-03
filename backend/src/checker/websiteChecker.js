const axios = require('axios');
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const { logger } = require('../utils/logger');

const MAX_RETRIES = parseInt(process.env.MAX_RETRIES) || 2; // Reduced from 3 to 2 for faster checks
const RETRY_DELAY = parseInt(process.env.RETRY_DELAY) || 3000; // Reduced from 5000 to 3000ms
const REQUEST_TIMEOUT = 15000; // Reduced from 30 seconds to 15 seconds for faster checks

// Ensure screenshots directory exists
const screenshotsDir = path.join(__dirname, '../../logs/screenshots');
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

/**
 * Take a screenshot of a website
 */
async function takeScreenshot(website, error) {
  let browser = null;
  try {
    const launchOptions = {
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ]
    };

    // On Windows, try to use system Chrome if Puppeteer's Chromium fails
    if (process.platform === 'win32') {
      const possibleChromePaths = [
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        process.env.LOCALAPPDATA + '\\Google\\Chrome\\Application\\chrome.exe',
        process.env.PROGRAMFILES + '\\Google\\Chrome\\Application\\chrome.exe',
        process.env['PROGRAMFILES(X86)'] + '\\Google\\Chrome\\Application\\chrome.exe'
      ];

      for (const chromePath of possibleChromePaths) {
        if (fs.existsSync(chromePath)) {
          launchOptions.executablePath = chromePath;
          break;
        }
      }
    }

    browser = await puppeteer.launch(launchOptions);

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });

    // Set a reasonable timeout (reduced for faster checks)
    await page.goto(website.url, {
      waitUntil: 'networkidle0',
      timeout: 15000 // Reduced from 30000 to 15000ms for faster checks
    }).catch(() => {
      // Continue even if page doesn't fully load
    });

    // Wait a bit for any dynamic content
    await page.waitForTimeout(2000);

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const safeName = website.name.replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `${safeName}_${timestamp}.png`;
    const filepath = path.join(screenshotsDir, filename);

    // Take screenshot
    await page.screenshot({
      path: filepath,
      fullPage: true
    });

    await browser.close();
    return filepath;
  } catch (screenshotError) {
    if (browser) {
      await browser.close();
    }
    logger.error(`Failed to take screenshot for ${website.name}: ${screenshotError.message}`);
    return null;
  }
}

/**
 * Check if page allows users to APPLY for RTI
 * Focus: Can users actually submit RTI applications?
 */
function canUserApplyRTI(html, statusCode) {
  if (!html || typeof html !== 'string') {
    return false;
  }

  const lowerHtml = html.toLowerCase();

  // Critical errors that prevent application submission
  const blockingErrors = [
    '404',
    'not found',
    'page not found',
    'server error',
    'server down',
    'service unavailable',
    'internal server error',
    '502 bad gateway',
    '503 service unavailable',
    '504 gateway timeout',
    'this site can\'t be reached',
    'connection refused',
    'access denied',
    'forbidden',
    'error 404',
    'error 500',
    'error 502',
    'error 503',
    'maintenance mode',
    'under maintenance',
    'site is down',
    'temporarily unavailable',
    'database error',
    'connection error',
    'application not available',
    'service temporarily unavailable',
    'server maintenance'
  ];

  // Check title for blocking errors
  const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  if (titleMatch) {
    const title = titleMatch[1].toLowerCase();
    for (const error of blockingErrors) {
      if (title.includes(error)) {
        return false; // Title shows blocking error
      }
    }
  }

  // Check body content for blocking errors
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (bodyMatch) {
    const bodyText = bodyMatch[1]
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .toLowerCase();

    // Check for blocking errors in visible text
    for (const error of blockingErrors) {
      if (bodyText.includes(error)) {
        const errorCount = (bodyText.match(new RegExp(error, 'g')) || []).length;
        if (errorCount >= 1) {
          return false; // Blocking error found
        }
      }
    }
  }

  // Check for RTI application functionality - more lenient approach
  const rtiApplicationKeywords = [
    'rti',
    'right to information',
    'application',
    'apply',
    'submit',
    'file application',
    'new application',
    'rti application',
    'online application',
    'application form',
    'information commission',
    'public authority',
    'citizen charter'
  ];

  let rtiKeywordCount = 0;
  for (const keyword of rtiApplicationKeywords) {
    if (lowerHtml.includes(keyword)) {
      rtiKeywordCount++;
    }
  }

  // Must have some RTI-related content to be considered an RTI portal
  if (rtiKeywordCount === 0) {
    return false; // No RTI content found
  }

  // Check for form elements - OPTIONAL but good indicators
  const hasForm = /<form[^>]*>/i.test(html);
  const hasInput = /<input[^>]*>/i.test(html);
  const hasTextarea = /<textarea[^>]*>/i.test(html);
  const hasSelect = /<select[^>]*>/i.test(html);
  const hasSubmitButton = /<button[^>]*type=["\']submit["\'][^>]*>/i.test(html) ||
    /<input[^>]*type=["\']submit["\'][^>]*>/i.test(html) ||
    /<button[^>]*>[\s\S]*?submit[\s\S]*?<\/button>/i.test(html);

  // Check for login/authentication (some RTI sites require login first)
  const hasLogin = lowerHtml.includes('login') ||
    lowerHtml.includes('sign in') ||
    lowerHtml.includes('user name') ||
    lowerHtml.includes('password') ||
    /<input[^>]*type=["\']password["\'][^>]*>/i.test(html);

  // If status is 4xx or 5xx, likely can't apply
  if (statusCode >= 400) {
    // Only consider working if it has login page (user can at least try to login)
    if (hasLogin && rtiKeywordCount >= 1) {
      return true; // Login page exists - user can attempt to access
    }
    return false; // Error status without login option
  }

  // For 2xx/3xx status codes - be much more lenient with RTI portals
  if (statusCode >= 200 && statusCode < 400) {
    // Government RTI portals should be considered working if they:
    // 1. Have RTI-related content
    // 2. Load successfully (HTTP 2xx/3xx)
    // 3. Don't have clear error indicators

    // Very lenient: if it has RTI content and loads, consider it working
    if (rtiKeywordCount >= 1) {
      return true; // Has RTI content - consider it a working RTI portal
    }

    // Even more lenient: if it has substantial content and no blocking errors were found above,
    // and it's a government domain (.gov.in), consider it working
    if (html.length > 1000 && /gov\.in/i.test(html)) {
      return true; // Government domain with content
    }

    // Fallback: any page that loads without blocking errors and has some content
    return html.length > 500; // Basic content check
  }

  // Default: if we got HTML with RTI content, likely working
  return rtiKeywordCount >= 1 && html.length > 500;
}

async function checkWebsite(website, retries = MAX_RETRIES) {
  // Always use relaxed SSL verification - ignore certificate errors
  const https = require('https');
  const httpsAgent = new https.Agent({ rejectUnauthorized: false });

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await axios.get(website.url, {
        timeout: REQUEST_TIMEOUT,
        validateStatus: () => true, // Don't throw on any status code
        maxRedirects: 5,
        httpsAgent: httpsAgent, // Ignore SSL certificate errors
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Connection': 'keep-alive'
        },
        // Get the actual HTML content
        responseType: 'text'
      });

      // Check both status code AND if users can actually APPLY for RTI
      const html = response.data || '';
      const canApply = canUserApplyRTI(html, response.status);

      if (canApply) {
        return {
          website,
          status: response.status,
          error: null,
          screenshot: null
        };
      } else {
        // Determine the specific error
        let errorMsg = `HTTP ${response.status}`;
        if (response.status === 404) {
          errorMsg = '404 - Page Not Found';
        } else if (response.status === 500) {
          errorMsg = '500 - Server Error';
        } else if (response.status === 503) {
          errorMsg = '503 - Service Unavailable';
        } else if (response.status >= 400 && response.status < 500) {
          errorMsg = `${response.status} - Client Error`;
        } else if (response.status >= 500) {
          errorMsg = `${response.status} - Server Error`;
        } else {
          // Check content for error messages
          const lowerHtml = html.toLowerCase();
          if (lowerHtml.includes('404') || lowerHtml.includes('not found')) {
            errorMsg = '404 - Page Not Found';
          } else if (lowerHtml.includes('server error') || lowerHtml.includes('500')) {
            errorMsg = 'Server Error';
          } else if (lowerHtml.includes('server down') || lowerHtml.includes('service unavailable')) {
            errorMsg = 'Server Down';
          } else if (lowerHtml.includes('maintenance')) {
            errorMsg = 'Under Maintenance';
          } else {
            errorMsg = 'Page Not Functional';
          }
        }

        // Take screenshot of the down website
        const screenshotPath = await takeScreenshot(website, errorMsg);

        return {
          website,
          status: response.status,
          error: errorMsg,
          screenshot: screenshotPath
        };
      }
    } catch (error) {
      const isLastAttempt = attempt === retries;

      if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
        if (isLastAttempt) {
          const screenshotPath = await takeScreenshot(website, 'Timeout');
          return {
            website,
            status: null,
            error: 'Timeout',
            screenshot: screenshotPath
          };
        }
        // Silent retry for cleaner output
      } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        const screenshotPath = await takeScreenshot(website, 'Connection failed');
        return {
          website,
          status: null,
          error: 'Connection failed',
          screenshot: screenshotPath
        };
      } else if (error.code === 'CERT_HAS_EXPIRED' || error.code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE' || error.message.includes('SSL') || error.code === 'UNABLE_TO_GET_ISSUER_CERT' || error.code === 'DEPTH_ZERO_SELF_SIGNED_CERT') {
        // SSL error - but we already use relaxed SSL, so this shouldn't happen
        // If it does, just retry (SSL errors are ignored)
        if (!isLastAttempt) {
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
          continue;
        }
        // If still failing on last attempt, try with Puppeteer to check if page loads
        try {
          const browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--ignore-certificate-errors', '--ignore-ssl-errors']
          });
          const page = await browser.newPage();
          await page.goto(website.url, { waitUntil: 'domcontentloaded', timeout: REQUEST_TIMEOUT });
          const html = await page.content();
          await browser.close();

          const canApply = canUserApplyRTI(html, 200);
          if (canApply) {
            return {
              website,
              status: 200,
              error: null,
              screenshot: null
            };
          }
        } catch (puppeteerError) {
          // Continue to mark as down
        }

        // If we get here, page didn't load even with SSL ignored
        const screenshotPath = await takeScreenshot(website, 'Page Not Loading');
        return {
          website,
          status: null,
          error: 'Page Not Loading',
          screenshot: screenshotPath
        };
      } else if (error.message && (error.message.includes('Parse Error') || error.message.includes('Invalid') || error.message.includes('malformed'))) {
        // Malformed HTTP response - but page might still work
        // Use Puppeteer to actually check if page loads and is functional
        if (isLastAttempt) {
          try {
            const browser = await puppeteer.launch({
              headless: 'new',
              args: ['--no-sandbox', '--disable-setuid-sandbox', '--ignore-certificate-errors', '--ignore-ssl-errors']
            });
            const page = await browser.newPage();

            try {
              await page.goto(website.url, {
                waitUntil: 'domcontentloaded',
                timeout: REQUEST_TIMEOUT
              });

              // Get page content
              const html = await page.content();
              const title = await page.title().catch(() => '');

              await browser.close();

              // Check if page is actually functional for RTI applications
              const canApply = canUserApplyRTI(html, 200);

              if (canApply) {
                // Page works despite malformed HTTP headers
                return {
                  website,
                  status: 200,
                  error: null,
                  screenshot: null
                };
              } else {
                // Page loaded but not functional
                const screenshotPath = await takeScreenshot(website, 'Page Not Functional');
                return {
                  website,
                  status: 200,
                  error: 'Page Not Functional',
                  screenshot: screenshotPath
                };
              }
            } catch (pageError) {
              await browser.close();
              // Page didn't load at all
              const screenshotPath = await takeScreenshot(website, 'Page Not Loading');
              return {
                website,
                status: null,
                error: 'Page Not Loading',
                screenshot: screenshotPath
              };
            }
          } catch (puppeteerError) {
            // Puppeteer failed
            const screenshotPath = await takeScreenshot(website, 'Malformed HTTP response');
            return {
              website,
              status: null,
              error: 'Malformed HTTP response',
              screenshot: screenshotPath
            };
          }
        }
        // Retry for cleaner output
      } else {
        if (isLastAttempt) {
          const screenshotPath = await takeScreenshot(website, error.message || 'Unknown error');
          return {
            website,
            status: null,
            error: error.message || 'Unknown error',
            screenshot: screenshotPath
          };
        }
        // Silent retry for cleaner output
      }

      // Wait before retry
      if (!isLastAttempt) {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      }
    }
  }
}

/**
 * Check multiple websites
 */
async function checkWebsites(websites) {
  const results = await Promise.all(
    websites.map(website => checkWebsite(website))
  );

  return results;
}

module.exports = {
  checkWebsites
};



