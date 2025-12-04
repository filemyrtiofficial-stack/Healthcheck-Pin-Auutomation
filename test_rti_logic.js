const axios = require('axios');
const https = require('https');

// Copy the canUserApplyRTI function from websiteChecker.js
function canUserApplyRTI(html, statusCode) {
  if (!html || typeof html !== 'string') {
    return false;
  }

  const lowerHtml = html.toLowerCase();

  // Critical errors that prevent application submission
  const blockingErrors = [
    '404',
    'not found',
    'page not found',
    'server error',
    'server down',
    'service unavailable',
    'internal server error',
    '502 bad gateway',
    '503 service unavailable',
    '504 gateway timeout',
    'this site can\'t be reached',
    'connection refused',
    'access denied',
    'forbidden',
    'error 404',
    'error 500',
    'error 502',
    'error 503',
    'maintenance mode',
    'under maintenance',
    'site is down',
    'temporarily unavailable',
    'database error',
    'connection error',
    'application not available',
    'service temporarily unavailable',
    'server maintenance'
  ];

  // Check title for blocking errors
  const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  if (titleMatch) {
    const title = titleMatch[1].toLowerCase();
    for (const error of blockingErrors) {
      if (title.includes(error)) {
        return false; // Title shows blocking error
      }
    }
  }

  // Check body content for blocking errors
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (bodyMatch) {
    const bodyText = bodyMatch[1]
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .toLowerCase();

    // Check for blocking errors in visible text
    for (const error of blockingErrors) {
      if (bodyText.includes(error)) {
        const errorCount = (bodyText.match(new RegExp(error, 'g')) || []).length;
        if (errorCount >= 1) {
          return false; // Blocking error found
        }
      }
    }
  }

  // Check for RTI application functionality - more lenient approach
  const rtiApplicationKeywords = [
    'rti',
    'right to information',
    'application',
    'apply',
    'submit',
    'file application',
    'new application',
    'rti application',
    'online application',
    'application form',
    'information commission',
    'public authority',
    'citizen charter'
  ];

  let rtiKeywordCount = 0;
  for (const keyword of rtiApplicationKeywords) {
    if (lowerHtml.includes(keyword)) {
      rtiKeywordCount++;
    }
  }

  // Must have some RTI-related content to be considered an RTI portal
  if (rtiKeywordCount === 0) {
    return false; // No RTI content found
  }

  // Check for form elements - OPTIONAL but good indicators
  const hasForm = /<form[^>]*>/i.test(html);
  const hasInput = /<input[^>]*>/i.test(html);
  const hasTextarea = /<textarea[^>]*>/i.test(html);
  const hasSelect = /<select[^>]*>/i.test(html);
  const hasSubmitButton = /<button[^>]*type=["\']submit["\'][^>]*>/i.test(html) ||
    /<input[^>]*type=["\']submit["\'][^>]*>/i.test(html) ||
    /<button[^>]*>[\s\S]*?submit[\s\S]*?<\/button>/i.test(html);

  // Check for login/authentication (some RTI sites require login first)
  const hasLogin = lowerHtml.includes('login') ||
    lowerHtml.includes('sign in') ||
    lowerHtml.includes('user name') ||
    lowerHtml.includes('password') ||
    /<input[^>]*type=["\']password["\'][^>]*>/i.test(html);

  // If status is 4xx or 5xx, likely can't apply
  if (statusCode >= 400) {
    // Only consider working if it has login page (user can at least try to login)
    if (hasLogin && rtiKeywordCount >= 1) {
      return true; // Login page exists - user can attempt to access
    }
    return false; // Error status without login option
  }

  // For 2xx/3xx status codes - be much more lenient with RTI portals
  if (statusCode >= 200 && statusCode < 400) {
    // Government RTI portals should be considered working if they:
    // 1. Have RTI-related content
    // 2. Load successfully (HTTP 2xx/3xx)
    // 3. Don't have clear error indicators

    // Very lenient: if it has RTI content and loads, consider it working
    if (rtiKeywordCount >= 1) {
      return true; // Has RTI content - consider it a working RTI portal
    }

    // Even more lenient: if it has substantial content and no blocking errors were found above,
    // and it's a government domain (.gov.in), consider it working
    if (html.length > 1000 && /gov\.in/i.test(html)) {
      return true; // Government domain with content
    }

    // Fallback: any page that loads without blocking errors and has some content
    return html.length > 500; // Basic content check
  }

  // Default: if we got HTML with RTI content, likely working
  return rtiKeywordCount >= 1 && html.length > 500;
}

// Test function
async function testWebsite(url, name) {
  console.log(`\n=== Testing ${name} ===`);
  console.log(`URL: ${url}`);

  const httpsAgent = new https.Agent({ rejectUnauthorized: false });

  try {
    const response = await axios.get(url, {
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

    const canApply = canUserApplyRTI(response.data, response.status);
    console.log(`Can apply RTI: ${canApply}`);

    // Show some content analysis
    const lowerHtml = response.data.toLowerCase();
    const rtiKeywords = ['rti', 'right to information', 'application', 'apply'];
    const foundKeywords = rtiKeywords.filter(k => lowerHtml.includes(k));
    console.log(`RTI keywords found: ${foundKeywords.join(', ')}`);

    const hasForm = /<form[^>]*>/i.test(response.data);
    const hasInput = /<input[^>]*>/i.test(response.data);
    console.log(`Has form: ${hasForm}, Has input: ${hasInput}`);

    return { url, status: response.status, canApply };

  } catch (error) {
    console.log(`Error: ${error.message}`);
    return { url, error: error.message, canApply: false };
  }
}

// Test some websites
async function runTests() {
  const testSites = [
    { url: 'https://rtionline.gov.in/', name: 'Central RTI' },
    { url: 'https://rti.punjab.gov.in/', name: 'Punjab RTI' },
    { url: 'https://rtionline.haryana.gov.in/', name: 'Haryana RTI' },
    { url: 'https://rtionline.kerala.gov.in/', name: 'Kerala RTI (wrong URL)' }
  ];

  for (const site of testSites) {
    await testWebsite(site.url, site.name);
  }
}

runTests().catch(console.error);
