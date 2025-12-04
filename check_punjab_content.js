const axios = require('axios');
const https = require('https');

async function checkPunjabContent() {
  console.log('=== Checking Punjab RTI Website Content ===');

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
    console.log('\n=== FIRST 1000 CHARACTERS ===');
    console.log(response.data.substring(0, 1000));
    console.log('\n=== TITLE ===');
    const titleMatch = response.data.match(/<title[^>]*>([^<]*)<\/title>/i);
    if (titleMatch) {
      console.log('Title:', titleMatch[1]);
    }
    console.log('\n=== CHECKING FOR FORMS ===');
    const hasForm = /<form[^>]*>/i.test(response.data);
    const hasInput = /<input[^>]*>/i.test(response.data);
    console.log(`Has form: ${hasForm}`);
    console.log(`Has input: ${hasInput}`);

    console.log('\n=== CHECKING FOR RTI KEYWORDS ===');
    const lowerHtml = response.data.toLowerCase();
    const rtiKeywords = ['rti', 'right to information', 'application', 'apply', 'submit'];
    rtiKeywords.forEach(keyword => {
      if (lowerHtml.includes(keyword)) {
        console.log(`Found: "${keyword}"`);
      }
    });

    console.log('\n=== CHECKING FOR ERROR INDICATORS ===');
    const blockingErrors = ['404', 'not found', 'server error', 'maintenance'];
    blockingErrors.forEach(error => {
      if (lowerHtml.includes(error)) {
        console.log(`Found blocking error: "${error}"`);
      }
    });

  } catch (error) {
    console.log(`Error: ${error.message}`);
  }
}

checkPunjabContent();
