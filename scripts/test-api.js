#!/usr/bin/env node

const http = require('http');

const req = http.request({
  hostname: 'localhost',
  port: 3000,
  path: '/api/website-statuses',
  method: 'GET',
  headers: { 'Content-Type': 'application/json' }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      const up = json.websiteStatuses.filter(w => w.status === 'UP').length;
      const down = json.websiteStatuses.filter(w => w.status === 'DOWN').length;
      const unknown = json.websiteStatuses.filter(w => w.status === 'UNKNOWN').length;
      console.log(`UP: ${up}, DOWN: ${down}, UNKNOWN: ${unknown}`);
      console.log('First 10 websites:');
      json.websiteStatuses.slice(0, 10).forEach(w => {
        console.log(`${w.status}: ${w.name} - ${w.error}`);
      });
    } catch(e) {
      console.log('Error:', e.message);
      console.log('Raw data:', data.substring(0, 500));
    }
  });
});

req.on('error', (err) => {
  console.error('Request error:', err.message);
});

req.end();

