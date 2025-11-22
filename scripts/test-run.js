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
  { url: 'https://rtionline.sikkim.gov.in/auth/login', name: 'Sikkim RTI' }
];

async function test() {
  logger.info('Running test check (2 websites only)...');

  try {
    const results = await checkWebsites(WEBSITES);

    for (const result of results) {
      const { website, status, error } = result;
      await saveStatus(website.url, status, error);

      if (status === 200) {
        logger.info(`✓ ${website.name} is UP (${status})`);
      } else {
        logger.warn(`✗ ${website.name} is DOWN (${status || 'ERROR'}) - ${error || 'Unknown error'}`);
        const postMessage = generatePost(website, status, error);
        logger.info(`Generated post would be: ${postMessage.substring(0, 150)}...`);
      }
    }

    logger.info('Test completed successfully!');
    process.exit(0);
  } catch (error) {
    logger.error(`Test failed: ${error.message}`, error);
    process.exit(1);
  }
}

test();



