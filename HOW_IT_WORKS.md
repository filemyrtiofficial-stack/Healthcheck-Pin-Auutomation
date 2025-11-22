# How Website Checking Works

## What We Check

The system makes an HTTP GET request to each website URL and checks:

1. **Can we connect?** - Does the server respond?
2. **What HTTP status code do we get?**
3. **Any errors?** - Timeout, SSL, connection failures, etc.

## How We Determine UP vs DOWN

### Website is UP if:
- HTTP status code is **200-399** (2xx or 3xx)
- Server responds successfully, even with redirects

### Website is DOWN if:
- **Timeout** - Server doesn't respond within 30 seconds
- **Connection failed** - Can't reach the server
- **SSL Certificate error** - After trying with relaxed SSL verification, still fails
- **Malformed HTTP response** - Server sends invalid HTTP headers
- **HTTP 4xx or 5xx** - Client errors (404, 403) or server errors (500, 503)
- **Any other error** - Network issues, DNS problems, etc.

## Current Checking Logic

```javascript
// 1. Make HTTP GET request
const response = await axios.get(website.url, {
  timeout: 30000,  // 30 second timeout
  validateStatus: () => true,  // Accept any status code
  maxRedirects: 5  // Follow up to 5 redirects
});

// 2. Check status code
if (response.status >= 200 && response.status < 400) {
  // UP - 2xx (success) or 3xx (redirect)
} else {
  // DOWN - 4xx or 5xx
}
```

## Error Handling

1. **SSL Errors**: First tries normal request, if SSL error occurs, retries with `rejectUnauthorized: false`
2. **Timeouts**: Retries 3 times with 5 second delay between attempts
3. **Parse Errors**: If server sends malformed HTTP headers, marks as DOWN
4. **Connection Errors**: Immediate DOWN (DNS failure, connection refused)

## What Might Be Wrong?

If you're seeing incorrect results, possible issues:

1. **Server responds but with errors** - Some sites might return 200 but show error pages
2. **SSL issues** - Site might be accessible but SSL verification fails
3. **Timeout too short** - Slow sites might timeout but still be working
4. **Redirects** - Some sites redirect multiple times, might fail on redirect chain
5. **Malformed headers** - Some servers send invalid HTTP headers that axios can't parse

## How to Verify

To manually check a website:
```bash
# Check HTTP status
curl -I https://example.com

# Check with SSL verification disabled
curl -k -I https://example.com
```


