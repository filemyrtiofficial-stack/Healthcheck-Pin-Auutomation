#!/usr/bin/env node

const fs = require('fs');

try {
  const data = fs.readFileSync('backend/logs/website_status.json', 'utf8');
  const statuses = JSON.parse(data);
  console.log('First 10 statuses:');
  statuses.slice(0, 10).forEach((s, i) => {
    console.log(`${i+1}. ${s.url}: status=${s.status} (${typeof s.status}), error='${s.error}' (${typeof s.error})`);
  });

  const upCount = statuses.filter(s => s.status === 200 && s.error === null).length;
  const downCount = statuses.filter(s => s.error !== null).length;
  console.log(`\nSummary: ${upCount} UP (status=200, error=null), ${downCount} DOWN (have errors)`);

} catch(e) {
  console.log('Error:', e.message);
}
