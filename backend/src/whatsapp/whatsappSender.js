const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const { logger } = require('../utils/logger');

const WHATSAPP_URL = 'https://web.whatsapp.com';
const SESSION_DIR = path.join(__dirname, '../../whatsapp-session');
const HEADLESS = process.env.HEADLESS !== 'false';
const WHATSAPP_TIMEOUT = parseInt(process.env.WHATSAPP_TIMEOUT) || 60000;

let browser = null;
let page = null;
let whatsappInitialized = false;

// Ensure session directory exists
if (!fs.existsSync(SESSION_DIR)) {
  fs.mkdirSync(SESSION_DIR, { recursive: true });
}

/**
 * Initialize browser with persistent context for session
 */
async function initBrowser() {
  if (browser) {
    return browser;
  }

  const userDataDir = path.join(SESSION_DIR, 'browser-data');

  const launchOptions = {
    headless: HEADLESS,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-blink-features=AutomationControlled',
      '--disable-features=IsolateOrigins,site-per-process',
      '--disable-web-security',
      '--disable-features=VizDisplayCompositor'
    ]
  };

  // On Windows, try to use system Chrome
  if (process.platform === 'win32') {
    const possibleChromePaths = [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      (process.env.LOCALAPPDATA || '') + '\\Google\\Chrome\\Application\\chrome.exe',
      (process.env.PROGRAMFILES || 'C:\\Program Files') + '\\Google\\Chrome\\Application\\chrome.exe',
      (process.env['PROGRAMFILES(X86)'] || 'C:\\Program Files (x86)') + '\\Google\\Chrome\\Application\\chrome.exe'
    ];

    // Try to find Chrome executable
    for (const chromePath of possibleChromePaths) {
      if (chromePath && fs.existsSync(chromePath)) {
        launchOptions.executablePath = chromePath;
        break;
      }
    }

    // If Chrome not found in standard locations, try registry
    if (!launchOptions.executablePath) {
      try {
        const { execSync } = require('child_process');
        const regPath = execSync('reg query "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths\\chrome.exe" /ve', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
        const match = regPath.match(/REG_SZ\s+(.+)/);
        if (match && fs.existsSync(match[1].trim())) {
          launchOptions.executablePath = match[1].trim();
        }
      } catch (e) {
        // Registry query failed, continue without it
      }
    }
  }

  // Try with userDataDir first
  try {
    launchOptions.userDataDir = userDataDir;
    browser = await puppeteer.launch(launchOptions);
    return browser;
  } catch (error) {
    // If launch fails with userDataDir, try without it
    if (error.message.includes('userDataDir') || error.message.includes('browser process')) {
      delete launchOptions.userDataDir;
      try {
        browser = await puppeteer.launch(launchOptions);
        return browser;
      } catch (error2) {
        // If still fails, try with default executable (Puppeteer's bundled Chromium)
        delete launchOptions.executablePath;
        browser = await puppeteer.launch(launchOptions);
        return browser;
      }
    }
    throw error;
  }
}

/**
 * Initialize WhatsApp - check login status and wait for QR scan if needed
 * This should be called FIRST before checking websites
 */
async function initWhatsApp() {
  if (whatsappInitialized) {
    return true;
  }

  const contactName = process.env.WHATSAPP_ADMIN_NUMBER || process.env.WHATSAPP_CONTACT_NAME;

  if (!contactName) {
    return false;
  }

  try {
    console.log('   Opening WhatsApp Web...');

    // Initialize browser
    try {
      await initBrowser();
    } catch (browserError) {
      console.log(`   ✗ Failed to launch browser: ${browserError.message}`);
      console.log(`   💡 Troubleshooting:`);
      console.log(`      - Make sure Chrome/Chromium is installed`);
      console.log(`      - Try running: npm install puppeteer --force`);
      console.log(`      - Or install Chrome from: https://www.google.com/chrome/`);
      return false;
    }

    // Get or create page
    const pages = await browser.pages();
    if (pages.length > 0) {
      page = pages[0];
    } else {
      page = await browser.newPage();
    }

    console.log('   Loading WhatsApp Web...');

    // Navigate to WhatsApp Web
    await page.goto(WHATSAPP_URL, {
      waitUntil: 'networkidle2',
      timeout: WHATSAPP_TIMEOUT
    });

    console.log('   Checking login status...');

    // Wait for WhatsApp to be ready and check login
    await waitForWhatsAppReady(page);

    // Verify we can search for contact (confirms we're logged in)
    console.log('   Verifying WhatsApp is ready...');
    await page.waitForSelector('div[data-testid="chatlist"]', { timeout: 10000 });

    whatsappInitialized = true;
    return true;
  } catch (error) {
    console.log(`   ✗ Error: ${error.message}`);
    if (error.message.includes('browser') || error.message.includes('launch')) {
      console.log(`   💡 Browser launch failed. Check if Chrome is installed.`);
    }
    return false;
  }
}

/**
 * Check if WhatsApp is already logged in
 */
async function isLoggedIn(page) {
  try {
    // Wait for either QR code (not logged in) or chat list (logged in)
    await Promise.race([
      page.waitForSelector('div[data-testid="chatlist"]', { timeout: 5000 }).then(() => true),
      page.waitForSelector('canvas', { timeout: 5000 }).then(() => false)
    ]);

    // Check if chat list exists (means logged in)
    const chatList = await page.$('div[data-testid="chatlist"]');
    return chatList !== null;
  } catch (error) {
    return false;
  }
}

/**
 * Wait for WhatsApp to load and be ready
 */
async function waitForWhatsAppReady(page) {
  try {
    // Wait for main WhatsApp interface
    await page.waitForSelector('div[data-testid="chatlist"], canvas', {
      timeout: WHATSAPP_TIMEOUT
    });

    // Check if logged in
    const loggedIn = await isLoggedIn(page);

    if (!loggedIn) {
      console.log('\n' + '='.repeat(60));
      console.log('WHATSAPP QR CODE SCAN REQUIRED');
      console.log('='.repeat(60));
      console.log('1. Open WhatsApp on your phone');
      console.log('2. Go to Settings → Linked Devices');
      console.log('3. Tap "Link a Device"');
      console.log('4. Scan the QR code shown in the browser window');
      console.log('='.repeat(60) + '\n');

      // Wait for user to scan QR code (check every 2 seconds)
      let attempts = 0;
      const maxAttempts = 300; // 10 minutes max wait

      while (attempts < maxAttempts) {
        await page.waitForTimeout(2000);
        const nowLoggedIn = await isLoggedIn(page);

        if (nowLoggedIn) {
          console.log('\n✓ WhatsApp login successful! Session saved.\n');
          // Wait a bit more for full load
          await page.waitForTimeout(3000);
          return true;
        }

        attempts++;
        if (attempts % 15 === 0) {
          console.log(`⏳ Still waiting for QR scan... (${Math.floor(attempts * 2 / 60)}m ${(attempts * 2) % 60}s)`);
        }
      }

      throw new Error('QR code scan timeout. Please scan QR code and try again.');
    }

    // Wait for chat list to be fully loaded
    await page.waitForSelector('div[data-testid="chatlist"]', { timeout: 10000 });
    await page.waitForTimeout(2000); // Additional wait for stability

    return true;
  } catch (error) {
    logger.error(`Error waiting for WhatsApp: ${error.message}`);
    throw error;
  }
}

/**
 * Search for a contact by phone number or name
 */
async function searchContact(page, phoneNumberOrName) {
  try {
    // Click on search box
    const searchSelectors = [
      'div[data-testid="chat"]',
      'div[contenteditable="true"][data-tab="3"]',
      'div[contenteditable="true"][role="textbox"]',
      'div[title="Search input textbox"]'
    ];

    let searchBox = null;
    for (const selector of searchSelectors) {
      try {
        await page.waitForSelector(selector, { timeout: 5000 });
        searchBox = await page.$(selector);
        if (searchBox) {
          await searchBox.click();
          await page.waitForTimeout(500);
          break;
        }
      } catch (e) {
        continue;
      }
    }

    if (!searchBox) {
      // Try keyboard shortcut Ctrl+K or Cmd+K
      await page.keyboard.down('Control');
      await page.keyboard.press('KeyK');
      await page.keyboard.up('Control');
      await page.waitForTimeout(1000);
    }

    // Type phone number or contact name
    await page.keyboard.type(phoneNumberOrName, { delay: 100 });
    await page.waitForTimeout(2000); // Wait for search results

    // Click on the first result
    const resultSelectors = [
      `span[title*="${phoneNumberOrName}"]`,
      `div[title*="${phoneNumberOrName}"]`,
      'div[role="listitem"]',
      'div[data-testid="cell-frame-container"]'
    ];

    for (const selector of resultSelectors) {
      try {
        const result = await page.$(selector);
        if (result) {
          await result.click();
          await page.waitForTimeout(2000);
          return true;
        }
      } catch (e) {
        continue;
      }
    }

    // If no exact match, try clicking first search result
    const firstResult = await page.$('div[role="listitem"]');
    if (firstResult) {
      await firstResult.click();
      await page.waitForTimeout(2000);
      return true;
    }

    throw new Error(`Contact "${phoneNumberOrName}" not found`);
  } catch (error) {
    logger.error(`Error searching for contact: ${error.message}`);
    throw error;
  }
}

/**
 * Send a message to the current chat
 */
async function sendMessage(page, message) {
  try {
    // Find message input box
    const messageInputSelectors = [
      'div[contenteditable="true"][data-tab="10"]',
      'div[contenteditable="true"][data-tab="9"]',
      'div[contenteditable="true"][role="textbox"]',
      'div[title="Type a message"]',
      'p[class*="selectable-text"]'
    ];

    let messageBox = null;
    for (const selector of messageInputSelectors) {
      try {
        await page.waitForSelector(selector, { timeout: 5000 });
        messageBox = await page.$(selector);
        if (messageBox) {
          break;
        }
      } catch (e) {
        continue;
      }
    }

    if (!messageBox) {
      throw new Error('Could not find message input box');
    }

    // Click on message box
    await messageBox.click();
    await page.waitForTimeout(500);

    // Type the message
    await page.keyboard.type(message, { delay: 30 });
    await page.waitForTimeout(1500);

    // Send message (Enter key)
    await page.keyboard.press('Enter');
    await page.waitForTimeout(3000);

    // Verify message was sent by checking if input box is cleared
    const inputValue = await messageBox.evaluate(el => el.textContent || el.innerText).catch(() => '');
    if (inputValue.trim().length === 0) {
      return true; // Message sent successfully
    }

    // Try sending again if first attempt failed
    await page.keyboard.press('Enter');
    await page.waitForTimeout(2000);

    return true;
  } catch (error) {
    logger.error(`Error sending message: ${error.message}`);
    throw error;
  }
}

/**
 * Send WhatsApp alert message
 * Note: WhatsApp should be initialized first using initWhatsApp()
 */
async function sendWhatsAppAlert(message, website) {
  // Support both phone number and contact name
  const contactName = process.env.WHATSAPP_ADMIN_NUMBER || process.env.WHATSAPP_CONTACT_NAME;

  if (!contactName) {
    return false;
  }

  if (!whatsappInitialized) {
    console.log('   ⚠️ WhatsApp not initialized. Initializing now...');
    const initialized = await initWhatsApp();
    if (!initialized) {
      return false;
    }
  }

  try {
    // Make sure page is still valid
    if (!page || page.isClosed()) {
      const pages = await browser.pages();
      if (pages.length > 0) {
        page = pages[0];
      } else {
        page = await browser.newPage();
        await page.goto(WHATSAPP_URL, { waitUntil: 'networkidle2', timeout: WHATSAPP_TIMEOUT });
        await waitForWhatsAppReady(page);
      }
    }

    // Refresh WhatsApp page to ensure it's active
    try {
      await page.reload({ waitUntil: 'networkidle2', timeout: 10000 });
      await page.waitForSelector('div[data-testid="chatlist"]', { timeout: 10000 });
    } catch (e) {
      // If reload fails, just continue
    }

    console.log(`   Searching for contact: ${contactName}...`);

    // Search for contact/group
    await searchContact(page, contactName);

    console.log(`   Sending message...`);

    // Send message
    await sendMessage(page, message);

    console.log(`   ✓ Message sent!`);

    return true;
  } catch (error) {
    console.log(`   ✗ Error: ${error.message}`);
    logger.error(`Failed to send WhatsApp alert: ${error.message}`);

    // Reset initialization if session expired
    if (error.message.includes('QR code') || error.message.includes('not logged in')) {
      whatsappInitialized = false;
      console.log(`   ⚠️ WhatsApp session expired. Please run again to scan QR code.`);
    }

    return false;
  }
}

/**
 * Force close browser (use when session needs reset)
 */
async function forceCloseBrowser() {
  if (browser) {
    await browser.close();
    browser = null;
    page = null;
  }
}

// Handle process termination (only when run directly, not when imported as module)
if (require.main === module) {
  process.on('SIGINT', async () => {
    await forceCloseBrowser();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    await forceCloseBrowser();
    process.exit(0);
  });
}

module.exports = {
  sendWhatsAppAlert,
  initWhatsApp
};


