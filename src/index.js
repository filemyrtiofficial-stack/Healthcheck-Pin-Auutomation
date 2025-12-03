#!/usr/bin/env node

require('dotenv').config();
const { checkWebsites } = require('./checker/websiteChecker');
const { generatePost } = require('./postGenerator/postGenerator');
const { postToSocialMedia } = require('./browserAutomation/socialMediaPoster');
const whatsappService = require('./whatsapp/whatsappService');
const { saveStatus, getLastPostTime, savePostLog } = require('./utils/database');
const { logger, setSuppressConsole } = require('./utils/logger');

const WEBSITES = [
  { url: 'https://rti.rajasthan.gov.in/', name: 'Rajasthan RTI' },
  { url: 'https://rtionline.sikkim.gov.in/auth/login', name: 'Sikkim RTI' },
  { url: 'https://rtionline.tripura.gov.in/', name: 'Tripura RTI' },
  { url: 'https://rtionline.up.gov.in/', name: 'Uttar Pradesh RTI' },
  { url: 'https://rtionline.uk.gov.in/', name: 'Uttarakhand RTI' },
  { url: 'https://par.wb.gov.in/rtilogin.php', name: 'West Bengal RTI' },
  { url: 'https://chandigarh.gov.in/submit-rti-application', name: 'Chandigarh RTI' },
  { url: 'https://rtionline.delhi.gov.in/', name: 'Delhi RTI' },
  { url: 'https://rtionline.jk.gov.in/', name: 'Jammu & Kashmir RTI' },
  { url: 'https://rtionline.ladakh.gov.in/index.php', name: 'Ladakh RTI' },
  { url: 'https://abcd.com', name: 'ABCD' }
];

const POST_COOLDOWN_HOURS = 24; // Don't post about the same website more than once per 24 hours

async function main() {
  try {
    // Suppress logger console output for clean display
    setSuppressConsole(true);

    // First: Check and initialize WhatsApp (if configured)
    const whatsappContact = process.env.WHATSAPP_ADMIN_NUMBER || process.env.ADMIN_PHONE_NUMBER;
    let whatsappReady = false;

    if (whatsappContact) {
      console.log('\n' + '='.repeat(60));
      console.log('INITIALIZING WHATSAPP');
      console.log('='.repeat(60));

      try {
        await whatsappService.initialize();

        // Wait for connection with longer timeout (10 minutes for QR scan)
        let attempts = 0;
        const maxAttempts = 600; // 10 minutes

        while (!whatsappService.getConnectionStatus() && attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          attempts++;

          // Show progress every 30 seconds (less spam)
          if (attempts % 30 === 0 && attempts > 0) {
            const minutes = Math.floor(attempts / 60);
            const seconds = attempts % 60;
            console.log(`⏳ Still waiting for QR scan... (${minutes}m ${seconds}s)`);
            console.log('💡 Make sure to scan the QR code shown above with your phone\n');
          }
        }

        whatsappReady = whatsappService.getConnectionStatus();

        if (whatsappReady) {
          // Already logged in message is shown by whatsappService
        } else {
          console.log('\n⚠️ WhatsApp connection timeout after 10 minutes.');
          console.log('💡 Please scan the QR code shown above and run the script again.\n');
        }
      } catch (whatsappError) {
        console.log(`\n✗ WhatsApp initialization failed: ${whatsappError.message}`);
        console.log('💡 Make sure WhatsApp is properly configured in .env file\n');
      }
    } else {
      console.log('\n⚠️ WhatsApp not configured. Add WHATSAPP_ADMIN_NUMBER to .env file\n');
    }

    // Now check all websites
    console.log('Checking websites...\n');
    const results = await checkWebsites(WEBSITES);

    // Display results in terminal
    console.log('\n' + '='.repeat(60));
    console.log('RTI WEBSITE HEALTH CHECK RESULTS');
    console.log('='.repeat(60) + '\n');

    const summary = { up: 0, down: 0 };

    // Process each result
    for (const result of results) {
      const { website, status, error, screenshot } = result;

      // Save status to database
      await saveStatus(website.url, status, error);

      // Display simple status
      const isUp = (status !== null && status >= 200 && status < 400) || (status === null && !error);

      if (isUp) {
        console.log(`✓ ${website.name.padEnd(30)} - UP`);
        summary.up++;
        // Skip social media posting for UP sites
        continue;
      } else {
        let downMessage = `✗ ${website.name.padEnd(30)} - DOWN (${error || 'ERROR'})`;
        if (screenshot) {
          const path = require('path');
          const relativePath = path.relative(process.cwd(), screenshot);
          downMessage += ` [Screenshot: ${relativePath}]`;
        }
        console.log(downMessage);
        summary.down++;
      }

      // Check if we've posted about this website recently
      const lastPostTime = await getLastPostTime(website.url);
      const now = new Date();
      const hoursSinceLastPost = lastPostTime
        ? (now - new Date(lastPostTime)) / (1000 * 60 * 60)
        : Infinity;

      if (hoursSinceLastPost < POST_COOLDOWN_HOURS) {
        continue;
      }

      // Send WhatsApp alert (WhatsApp is already initialized)
      if (whatsappReady && whatsappContact) {
        try {
          console.log(`📱 Sending WhatsApp notification to ${whatsappContact}...`);
          // Use the new social media post generator with screenshot
          const { generateSocialMediaPost } = require('./postGenerator/postGenerator');
          const whatsappMessage = generateSocialMediaPost(website, status, error, screenshot, 'whatsapp');
          await whatsappService.sendMessage(whatsappMessage, screenshot);
          console.log(`✓ WhatsApp notification with screenshot sent!\n`);
        } catch (whatsappError) {
          console.log(`✗ WhatsApp error: ${whatsappError.message}\n`);
        }
      }

      // Skip social media posting if DISABLE_POSTING is set or no credentials
      const hasCredentials = (process.env.TWITTER_EMAIL || process.env.FACEBOOK_EMAIL || process.env.LINKEDIN_EMAIL);
      const disablePosting = process.env.DISABLE_POSTING === 'true' || !hasCredentials;

      if (!disablePosting) {
        // Generate post message and post to social media (silently in background)
        const postMessage = generatePost(website, status, error);

        // Post to social media in background (completely silent - no console output)
        setImmediate(() => {
          // Suppress all output during posting
          const originalLog = console.log;
          const originalError = console.error;
          const originalWarn = console.warn;
          const originalInfo = console.info;

          console.log = () => { };
          console.error = () => { };
          console.warn = () => { };
          console.info = () => { };

          postToSocialMedia(postMessage, website)
            .then(() => {
              savePostLog(website.url, postMessage, 'success');
              // Restore console
              console.log = originalLog;
              console.error = originalError;
              console.warn = originalWarn;
              console.info = originalInfo;
            })
            .catch((postError) => {
              savePostLog(website.url, postMessage, 'failed', postError.message);
              // Restore console
              console.log = originalLog;
              console.error = originalError;
              console.warn = originalWarn;
              console.info = originalInfo;
            })
            .catch(() => { }); // Ignore any errors
        });
      }
    }

    // Display summary
    console.log('\n' + '-'.repeat(60));
    console.log(`SUMMARY: ${summary.up} UP | ${summary.down} DOWN`);
    console.log('='.repeat(60) + '\n');

    // Re-enable console logging for errors
    setSuppressConsole(false);
  } catch (error) {
    logger.error(`Fatal error in main process: ${error.message}`, error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    logger.error(`Unhandled error: ${error.message}`, error);
    process.exit(1);
  });
}

module.exports = { main };


