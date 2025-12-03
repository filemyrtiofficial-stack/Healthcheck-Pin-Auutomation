#!/usr/bin/env node

/**
 * Test script to verify the automation system is working correctly
 * This runs a single check without posting to social media
 */

require('dotenv').config();
const { checkWebsites } = require('../src/checker/websiteChecker');
const { generatePost } = require('../src/postGenerator/postGenerator');
const { saveStatus } = require('../src/utils/database');
const { logger } = require('../src/utils/logger');

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
  { url: 'https://rtionline.ladakh.gov.in/index.php', name: 'Ladakh RTI' }
];

async function test() {
  logger.info('Running comprehensive test check (10 RTI websites)...');

  try {
    const results = await checkWebsites(WEBSITES);

    let upCount = 0;
    let downCount = 0;

    for (const result of results) {
      const { website, status, error } = result;
      await saveStatus(website.url, status, error);

      if (status === 200 && !error) {
        logger.info(`✓ ${website.name} is UP (${status})`);
        upCount++;
      } else {
        logger.warn(`✗ ${website.name} is DOWN (${status || 'ERROR'}) - ${error || 'Unknown error'}`);
        downCount++;

        // Debug problematic sites
        if (website.name === 'Rajasthan RTI' || website.name === 'Sikkim RTI') {
          logger.info(`🔍 Debug: ${website.name} - Status: ${status}, Error: ${error}`);
        }

        const postMessage = generatePost(website, status, error);
        logger.info(`Generated post would be: ${postMessage.substring(0, 150)}...`);
      }
    }

    logger.info(`Test completed! UP: ${upCount} | DOWN: ${3}`);
    process.exit(0);
  } catch (error) {
    logger.error(`Test failed: ${error.message}`, error);
    process.exit(1);
  }
}

test();



