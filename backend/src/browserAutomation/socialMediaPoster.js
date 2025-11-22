const puppeteer = require('puppeteer');
const { logger, setSuppressConsole } = require('../utils/logger');

// Suppress Puppeteer warnings
process.env.PUPPETEER_SKIP_DOWNLOAD = 'false';
// Suppress console warnings
const originalWarn = console.warn;
console.warn = () => { };

const HEADLESS = process.env.HEADLESS !== 'false';
const BROWSER_TIMEOUT = parseInt(process.env.BROWSER_TIMEOUT) || 30000;
const SOCIAL_MEDIA_TIMEOUT = parseInt(process.env.SOCIAL_MEDIA_TIMEOUT) || 60000;

let browser = null;

async function getBrowser() {
  if (!browser) {
    browser = await puppeteer.launch({
      headless: HEADLESS === 'true' ? 'new' : HEADLESS,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--disable-logging',
        '--log-level=3'
      ]
    });
  }
  return browser;
}

async function closeBrowser() {
  if (browser) {
    await browser.close();
    browser = null;
  }
}

async function postToTwitter(message, website) {
  const browserInstance = await getBrowser();
  const page = await browserInstance.newPage();

  try {
    // Silent - no console output

    await page.setViewport({ width: 1280, height: 720 });
    await page.goto('https://twitter.com/login', { waitUntil: 'networkidle2', timeout: SOCIAL_MEDIA_TIMEOUT });

    // Wait for login form
    await page.waitForSelector('input[autocomplete="username"]', { timeout: BROWSER_TIMEOUT });

    // Enter username/email
    await page.type('input[autocomplete="username"]', process.env.TWITTER_EMAIL || process.env.TWITTER_USERNAME, { delay: 50 });
    await page.keyboard.press('Enter');

    await page.waitForTimeout(2000);

    // Check if password field appears or if we need to enter username again
    const passwordField = await page.$('input[type="password"]');
    if (!passwordField) {
      // Might need to enter username again
      const usernameField = await page.$('input[autocomplete="username"]');
      if (usernameField) {
        await usernameField.type(process.env.TWITTER_USERNAME || process.env.TWITTER_EMAIL, { delay: 50 });
        await page.keyboard.press('Enter');
        await page.waitForTimeout(2000);
      }
    }

    // Enter password
    await page.waitForSelector('input[type="password"]', { timeout: BROWSER_TIMEOUT });
    await page.type('input[type="password"]', process.env.TWITTER_PASSWORD, { delay: 50 });
    await page.keyboard.press('Enter');

    // Wait for login to complete
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: SOCIAL_MEDIA_TIMEOUT });
    await page.waitForTimeout(3000);

    // Navigate to compose tweet
    await page.goto('https://twitter.com/compose/tweet', { waitUntil: 'networkidle2', timeout: SOCIAL_MEDIA_TIMEOUT });

    // Wait for tweet composer
    await page.waitForSelector('div[data-testid="tweetTextarea_0"]', { timeout: BROWSER_TIMEOUT });
    await page.waitForTimeout(1000);

    // Type the message
    const tweetBox = await page.$('div[data-testid="tweetTextarea_0"]');
    await tweetBox.click();
    await page.keyboard.type(message, { delay: 30 });

    await page.waitForTimeout(1000);

    // Click tweet button
    await page.waitForSelector('button[data-testid="tweetButton"]', { timeout: BROWSER_TIMEOUT });
    const tweetButton = await page.$('button[data-testid="tweetButton"]');
    await tweetButton.click();

    // Wait for tweet to be posted
    await page.waitForTimeout(3000);

    // Success - no console output
  } catch (error) {
    // Error logged to file only
    throw error;
  } finally {
    await page.close();
  }
}

async function postToFacebook(message, website) {
  const browserInstance = await getBrowser();
  const page = await browserInstance.newPage();

  try {
    // Silent - no console output

    await page.setViewport({ width: 1280, height: 720 });
    await page.goto('https://www.facebook.com/login', { waitUntil: 'networkidle2', timeout: SOCIAL_MEDIA_TIMEOUT });

    // Enter email
    await page.waitForSelector('input[type="text"]', { timeout: BROWSER_TIMEOUT });
    await page.type('input[type="text"]', process.env.FACEBOOK_EMAIL, { delay: 50 });

    // Enter password
    await page.waitForSelector('input[type="password"]', { timeout: BROWSER_TIMEOUT });
    await page.type('input[type="password"]', process.env.FACEBOOK_PASSWORD, { delay: 50 });

    // Click login button
    await page.click('button[type="submit"]');

    // Wait for login to complete
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: SOCIAL_MEDIA_TIMEOUT });
    await page.waitForTimeout(3000);

    // Navigate to home/feed
    await page.goto('https://www.facebook.com/', { waitUntil: 'networkidle2', timeout: SOCIAL_MEDIA_TIMEOUT });
    await page.waitForTimeout(2000);

    // Find the post composer (usually has placeholder "What's on your mind?")
    const composerSelectors = [
      'div[data-testid="status-attachment-mentions-input"]',
      'div[contenteditable="true"][role="textbox"]',
      'div[aria-label*="What\'s on your mind"]',
      'div[aria-label*="What\'s on your mind?"]',
      'div[data-contents="true"]'
    ];

    let composerFound = false;
    for (const selector of composerSelectors) {
      try {
        await page.waitForSelector(selector, { timeout: 5000 });
        const composer = await page.$(selector);
        if (composer) {
          await composer.click();
          await page.waitForTimeout(1000);
          await page.keyboard.type(message, { delay: 30 });
          composerFound = true;
          break;
        }
      } catch (e) {
        continue;
      }
    }

    if (!composerFound) {
      throw new Error('Could not find Facebook post composer');
    }

    await page.waitForTimeout(1000);

    // Find and click post button
    const postButtonSelectors = [
      'div[aria-label="Post"]',
      'button[data-testid="react-composer-post-button"]',
      'button[type="submit"]'
    ];

    let postButtonFound = false;
    for (const selector of postButtonSelectors) {
      try {
        const postButton = await page.$(selector);
        if (postButton) {
          await postButton.click();
          postButtonFound = true;
          break;
        }
      } catch (e) {
        continue;
      }
    }

    if (!postButtonFound) {
      // Try pressing Enter as fallback
      await page.keyboard.press('Enter');
    }

    await page.waitForTimeout(3000);

    // Success - no console output
  } catch (error) {
    // Error logged to file only
    throw error;
  } finally {
    await page.close();
  }
}

async function postToLinkedIn(message, website) {
  const browserInstance = await getBrowser();
  const page = await browserInstance.newPage();

  try {
    // Silent - no console output

    await page.setViewport({ width: 1280, height: 720 });
    await page.goto('https://www.linkedin.com/login', { waitUntil: 'networkidle2', timeout: SOCIAL_MEDIA_TIMEOUT });

    // Enter email
    await page.waitForSelector('input[id="username"]', { timeout: BROWSER_TIMEOUT });
    await page.type('input[id="username"]', process.env.LINKEDIN_EMAIL, { delay: 50 });

    // Enter password
    await page.waitForSelector('input[id="password"]', { timeout: BROWSER_TIMEOUT });
    await page.type('input[id="password"]', process.env.LINKEDIN_PASSWORD, { delay: 50 });

    // Click login button
    await page.click('button[type="submit"]');

    // Wait for login to complete
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: SOCIAL_MEDIA_TIMEOUT });
    await page.waitForTimeout(3000);

    // Navigate to feed
    await page.goto('https://www.linkedin.com/feed/', { waitUntil: 'networkidle2', timeout: SOCIAL_MEDIA_TIMEOUT });
    await page.waitForTimeout(2000);

    // Find the post composer
    const composerSelectors = [
      'div[data-placeholder*="What do you want to talk about?"]',
      'div[aria-label*="What do you want to talk about?"]',
      'div[contenteditable="true"][role="textbox"]',
      'div[data-test-id="post-composer-text-editor"]'
    ];

    let composerFound = false;
    for (const selector of composerSelectors) {
      try {
        await page.waitForSelector(selector, { timeout: 5000 });
        const composer = await page.$(selector);
        if (composer) {
          await composer.click();
          await page.waitForTimeout(1000);
          await page.keyboard.type(message, { delay: 30 });
          composerFound = true;
          break;
        }
      } catch (e) {
        continue;
      }
    }

    if (!composerFound) {
      throw new Error('Could not find LinkedIn post composer');
    }

    await page.waitForTimeout(1000);

    // Find and click post button
    const postButtonSelectors = [
      'button[data-control-name="share.post"]',
      'button[aria-label="Post"]',
      'button[type="submit"]'
    ];

    let postButtonFound = false;
    for (const selector of postButtonSelectors) {
      try {
        const postButton = await page.$(selector);
        if (postButton && await postButton.isEnabled()) {
          await postButton.click();
          postButtonFound = true;
          break;
        }
      } catch (e) {
        continue;
      }
    }

    if (!postButtonFound) {
      throw new Error('Could not find LinkedIn post button');
    }

    await page.waitForTimeout(3000);

    // Success - no console output
  } catch (error) {
    // Error logged to file only
    throw error;
  } finally {
    await page.close();
  }
}

async function postToSocialMedia(message, website) {
  // Suppress all console output during social media posting
  setSuppressConsole(true);

  const platforms = [];

  // Check which platforms have credentials
  if (process.env.TWITTER_EMAIL && process.env.TWITTER_PASSWORD) {
    platforms.push({ name: 'Twitter', func: postToTwitter });
  }

  if (process.env.FACEBOOK_EMAIL && process.env.FACEBOOK_PASSWORD) {
    platforms.push({ name: 'Facebook', func: postToFacebook });
  }

  if (process.env.LINKEDIN_EMAIL && process.env.LINKEDIN_PASSWORD) {
    platforms.push({ name: 'LinkedIn', func: postToLinkedIn });
  }

  if (platforms.length === 0) {
    setSuppressConsole(false);
    throw new Error('No social media credentials configured');
  }

  // Post to all platforms (silently)
  const results = [];
  for (const platform of platforms) {
    try {
      await platform.func(message, website);
      results.push({ platform: platform.name, success: true });
    } catch (error) {
      results.push({ platform: platform.name, success: false, error: error.message });
    }
  }

  // Close browser after all posts
  await closeBrowser();

  // Re-enable console output
  setSuppressConsole(false);

  // Check if at least one post succeeded
  const hasSuccess = results.some(r => r.success);
  if (!hasSuccess) {
    throw new Error('All social media posts failed');
  }

  return results;
}

// Handle process termination
process.on('SIGINT', async () => {
  await closeBrowser();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await closeBrowser();
  process.exit(0);
});

module.exports = {
  postToSocialMedia
};



