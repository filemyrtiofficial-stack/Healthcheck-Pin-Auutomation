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

const WEBSITES = require('../config/websites.json');

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



