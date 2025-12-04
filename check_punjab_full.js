const axios = require('axios');
const https = require('https');

async function checkPunjabFullContent() {
  console.log('=== Checking Punjab RTI Website Full Content ===');

  const httpsAgent = new https.Agent({ rejectUnauthorized: false });

  try {
    const response = await axios.get('https://rti.punjab.gov.in/', {
      timeout: 30000,
      validateStatus: () => true,
      maxRedirects: 5,
      httpsAgent: httpsAgent,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Connection': 'keep-alive'
      },
      responseType: 'text'
    });

    console.log(`Status: ${response.status}`);
    console.log(`Content length: ${response.data.length} characters`);

    const lowerHtml = response.data.toLowerCase();

    // Find all occurrences of "maintenance"
    const maintenanceMatches = [];
    let index = lowerHtml.indexOf('maintenance');
    while (index !== -1) {
      const start = Math.max(0, index - 50);
      const end = Math.min(response.data.length, index + 100);
      const context = response.data.substring(start, end);
      maintenanceMatches.push({ index, context });
      index = lowerHtml.indexOf('maintenance', index + 1);
    }

    console.log(`\n=== FOUND ${maintenanceMatches.length} occurrences of "maintenance" ===`);
    maintenanceMatches.forEach((match, i) => {
      console.log(`\n[${i + 1}] Context around position ${match.index}:`);
      console.log(match.context);
    });

    // Check if it's actually under maintenance by looking for common maintenance indicators
    const maintenanceIndicators = [
      'under maintenance',
      'maintenance mode',
      'site under maintenance',
      'temporarily unavailable',
      'coming soon',
      'work in progress'
    ];

    console.log('\n=== CHECKING FOR MAINTENANCE INDICATORS ===');
    maintenanceIndicators.forEach(indicator => {
      if (lowerHtml.includes(indicator)) {
        console.log(`Found maintenance indicator: "${indicator}"`);
      }
    });

    // Check the body content for user-visible maintenance messages
    const bodyMatch = response.data.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    if (bodyMatch) {
      const bodyText = bodyMatch[1]
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .toLowerCase();

      console.log('\n=== BODY TEXT CONTENT (first 500 chars) ===');
      console.log(bodyText.substring(0, 500));

      if (bodyText.includes('maintenance')) {
        console.log('\n*** MAINTENANCE FOUND IN VISIBLE BODY TEXT ***');
        console.log('This suggests the site is actually under maintenance');
      } else {
        console.log('\n*** MAINTENANCE NOT FOUND IN VISIBLE BODY TEXT ***');
        console.log('Maintenance might be in CSS/JS files only');
      }
    }

  } catch (error) {
    console.log(`Error: ${error.message}`);
  }
}

checkPunjabFullContent();
