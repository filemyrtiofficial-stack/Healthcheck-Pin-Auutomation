const axios = require('axios');
const https = require('https');

// Copy the simplified canUserApplyRTI function
function canUserApplyRTI(html, statusCode) {
  if (!html || typeof html !== 'string') {
    return false;
  }

  const lowerHtml = html.toLowerCase();

  // CRITICAL: Check for blocking errors that make the site unusable
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

  // Check title and body content for blocking errors
  const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  if (titleMatch) {
    const title = titleMatch[1].toLowerCase();
    for (const error of blockingErrors) {
      if (title.includes(error)) {
        return false; // Title shows blocking error
      }
    }
  }

  // Check visible body text for blocking errors
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (bodyMatch) {
    const bodyText = bodyMatch[1]
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .toLowerCase();

    for (const error of blockingErrors) {
      if (bodyText.includes(error)) {
        return false; // Blocking error found in visible content
      }
    }
  }

  // PRIMARY CHECK: Must have RTI-related content
  const rtiKeywords = [
    'rti',
    'right to information',
    'information commission',
    'public authority'
  ];

  const hasRtiContent = rtiKeywords.some(keyword => lowerHtml.includes(keyword));
  if (!hasRtiContent) {
    return false; // Not an RTI portal
  }

  // STATUS CODE CHECKS
  if (statusCode >= 400) {
    // 4xx/5xx errors - only consider working if it has login functionality
    const hasLogin = lowerHtml.includes('login') ||
      lowerHtml.includes('sign in') ||
      /<input[^>]*type=["\']password["\'][^>]*>/i.test(html);

    return hasLogin; // Login page might still be accessible
  }

  // SUCCESS STATUS (2xx/3xx)
  if (statusCode >= 200 && statusCode < 400) {
    // For government RTI portals, be lenient:
    // If it loads successfully and has RTI content, consider it working
    // Many government sites are informational/static but still provide RTI info

    // Additional positive indicators (optional)
    const applicationKeywords = [
      'application', 'apply', 'submit', 'file application',
      'online application', 'application form', 'citizen charter'
    ];

    const hasApplicationFeatures = applicationKeywords.some(keyword => lowerHtml.includes(keyword));
    const hasForms = /<form[^>]*>/i.test(html) || /<input[^>]*>/i.test(html);
    const isGovernmentDomain = /gov\.in/i.test(html);

    // Consider working if:
    // 1. Has RTI content + loads successfully (basic requirement)
    // 2. OR has government domain + substantial content
    // 3. OR has application features + forms

    if (hasApplicationFeatures && hasForms) {
      return true; // Full application functionality
    }

    if (isGovernmentDomain && html.length > 1000) {
      return true; // Government RTI portal with content
    }

    // Basic RTI portal - has RTI content and loads
    return html.length > 500;
  }

  // Unknown status - check for basic content
  return html.length > 500 && hasRtiContent;
}

// Test websites with expected outcomes
const testCases = [
  {
    url: 'https://rtionline.gov.in/',
    name: 'Central RTI',
    expected: true,
    reason: 'Should work - functional RTI portal'
  },
  {
    url: 'https://rti.punjab.gov.in/',
    name: 'Punjab RTI',
    expected: false,
    reason: 'Should fail - under maintenance'
  },
  {
    url: 'https://rtionline.kerala.gov.in/',
    name: 'Kerala RTI (invalid URL)',
    expected: false,
    reason: 'Should fail - domain doesn\'t exist'
  },
  {
    url: 'https://httpstat.us/404',
    name: '404 Test Page',
    expected: false,
    reason: 'Should fail - 404 error'
  },
  {
    url: 'https://httpstat.us/500',
    name: '500 Test Page',
    expected: false,
    reason: 'Should fail - 500 error'
  }
];

async function testWebsite(testCase) {
  console.log(`\n=== Testing ${testCase.name} ===`);
  console.log(`URL: ${testCase.url}`);
  console.log(`Expected: ${testCase.expected ? 'WORKING' : 'NOT WORKING'}`);
  console.log(`Reason: ${testCase.reason}`);

  const httpsAgent = new https.Agent({ rejectUnauthorized: false });

  try {
    const response = await axios.get(testCase.url, {
      timeout: 15000,
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

    const result = canApply === testCase.expected ? '✅ PASS' : '❌ FAIL';
    console.log(`Result: ${result}`);

    // Additional analysis
    const lowerHtml = response.data.toLowerCase();
    const hasRti = ['rti', 'right to information'].some(k => lowerHtml.includes(k));
    const hasMaintenance = lowerHtml.includes('maintenance');
    const hasForms = /<form[^>]*>/i.test(response.data);

    console.log(`Analysis: RTI content: ${hasRti}, Maintenance: ${hasMaintenance}, Forms: ${hasForms}`);

    return { testCase, status: response.status, canApply, passed: canApply === testCase.expected };

  } catch (error) {
    console.log(`Error: ${error.message}`);
    const canApply = false;
    const result = canApply === testCase.expected ? '✅ PASS' : '❌ FAIL';
    console.log(`Result: ${result} (connection failed)`);

    return { testCase, error: error.message, canApply, passed: canApply === testCase.expected };
  }
}

async function runComprehensiveTest() {
  console.log('=== COMPREHENSIVE WEBSITE CHECKING TEST ===\n');

  const results = [];

  for (const testCase of testCases) {
    const result = await testWebsite(testCase);
    results.push(result);
  }

  console.log('\n=== SUMMARY ===');
  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  console.log(`Passed: ${passed}/${total}`);

  results.forEach(result => {
    const status = result.status || 'ERROR';
    const outcome = result.canApply ? 'WORKING' : 'NOT WORKING';
    console.log(`${result.testCase.name}: ${status} → ${outcome} (${result.passed ? 'PASS' : 'FAIL'})`);
  });

  if (passed === total) {
    console.log('\n🎉 All tests passed!');
  } else {
    console.log(`\n⚠️  ${total - passed} test(s) failed.`);
  }
}

runComprehensiveTest().catch(console.error);
