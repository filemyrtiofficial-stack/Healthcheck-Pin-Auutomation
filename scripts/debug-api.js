#!/usr/bin/env node

// Test the getLatestStatuses function directly
const { getLatestStatuses } = require('../backend/server');

console.log('Testing getLatestStatuses function...');

try {
  const { websites, latestStatuses } = getLatestStatuses();

  console.log(`Websites loaded: ${websites.length}`);
  console.log(`Status entries: ${Object.keys(latestStatuses).length}`);

  let upCount = 0;
  let downCount = 0;
  let unknownCount = 0;

  websites.slice(0, 10).forEach(website => {
    const normalizedUrl = website.url.toLowerCase().replace(/\/+$/, '');
    const status = latestStatuses[normalizedUrl];

    if (!status) {
      unknownCount++;
      console.log(`UNKNOWN: ${website.name} - No status found`);
      return;
    }

    // Check status logic (same as API)
    let websiteStatus = 'UNKNOWN';
    let statusCode = status.status;

    if (typeof statusCode === 'string' && statusCode.trim() !== '' && !isNaN(statusCode)) {
      statusCode = parseInt(statusCode.trim(), 10);
    }

    if (statusCode !== null && statusCode !== undefined && typeof statusCode === 'number' && !isNaN(statusCode)) {
      if (statusCode >= 200 && statusCode < 400) {
        websiteStatus = 'UP';
        upCount++;
      } else {
        websiteStatus = 'DOWN';
        downCount++;
      }
    } else {
      const errorValue = status.error;
      let errorStr = '';

      if (errorValue !== null && errorValue !== undefined) {
        errorStr = String(errorValue).trim();
      }

      if (errorStr !== '' && errorStr !== 'null' && errorStr !== 'undefined') {
        websiteStatus = 'DOWN';
        downCount++;
      } else {
        unknownCount++;
      }
    }

    console.log(`${websiteStatus}: ${website.name} - status=${status.status}, error=${JSON.stringify(status.error)}`);
  });

  console.log(`\nSummary (first 10): UP=${upCount}, DOWN=${downCount}, UNKNOWN=${unknownCount}`);

} catch (error) {
  console.error('Error:', error.message);
}
