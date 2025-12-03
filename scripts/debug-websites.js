#!/usr/bin/env node

const { checkWebsites } = require('../backend/src/checker/websiteChecker');
const websites = require('../config/websites.json').slice(0, 5); // Test first 5 websites

console.log('Testing first 5 websites...');

checkWebsites(websites).then(results => {
  results.forEach(r => {
    const status = r.error ? 'DOWN' : 'UP';
    console.log(`${status}: ${r.website.name} - Status: ${r.status}, Error: ${r.error}`);
  });
}).catch(console.error);
