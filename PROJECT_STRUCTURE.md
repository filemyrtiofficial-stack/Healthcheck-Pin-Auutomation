# Project Structure

```
.
├── src/                              # Source code
│   ├── index.js                      # Main entry point - orchestrates the automation
│   ├── checker/
│   │   └── websiteChecker.js         # HTTP requests to check website status
│   ├── postGenerator/
│   │   ├── postGenerator.js          # Generates social media posts from templates
│   │   └── templates.js              # Post message templates
│   ├── browserAutomation/
│   │   └── socialMediaPoster.js      # Puppeteer automation for Twitter/FB/LinkedIn
│   └── utils/
│       ├── database.js                # JSON file-based storage
│       └── logger.js                  # Logging utility
│
├── scripts/                          # Utility scripts
│   ├── setup-cron.sh                 # Linux cron job setup
│   ├── setup-cron-windows.ps1        # Windows Task Scheduler setup
│   └── test-run.js                   # Test script (checks 2 sites, no posting)
│
├── config/                           # Configuration files
│   └── config.json                   # Website list and settings
│
├── logs/                             # Generated files (auto-created)
│   ├── .gitkeep                      # Ensures directory is tracked
│   ├── automation.log                # Application logs
│   ├── cron.log                      # Cron execution logs
│   ├── website_status.json           # Website status history (JSON)
│   └── post_logs.json                # Social media post history (JSON)
│
├── package.json                      # Node.js dependencies and scripts
├── .gitignore                        # Git ignore rules
├── README.md                         # Main documentation
├── QUICKSTART.md                     # Quick start guide
├── INSTALL.md                        # Detailed installation instructions
└── PROJECT_STRUCTURE.md              # This file
```

## File Descriptions

### Core Application Files

- **src/index.js**: Main automation script that:
  - Checks all websites
  - Logs statuses to database
  - Generates posts for down websites
  - Posts to social media (with cooldown)

- **src/checker/websiteChecker.js**: 
  - Makes HTTP requests to check website status
  - Handles timeouts, SSL errors, connection failures
  - Implements retry logic

- **src/postGenerator/postGenerator.js**:
  - Generates post messages using templates
  - Replaces placeholders with website info

- **src/postGenerator/templates.js**:
  - Collection of post message templates
  - Randomly selects template for variety

- **src/browserAutomation/socialMediaPoster.js**:
  - Uses Puppeteer to automate browser
  - Logs into Twitter/X, Facebook, LinkedIn
  - Creates and posts messages
  - Handles platform-specific UI changes

- **src/utils/database.js**:
  - JSON file-based storage (no native dependencies)
  - Stores website status checks
  - Stores post logs
  - Prevents duplicate posts

- **src/utils/logger.js**:
  - Logs to console and file
  - Configurable log levels
  - Error stack traces

### Configuration Files

- **package.json**: 
  - Node.js project metadata
  - Dependencies (puppeteer, axios, dotenv - no native dependencies)
  - npm scripts

- **config/config.json**:
  - Website list
  - Configuration settings

- **.env** (not in repo):
  - Social media credentials
  - Browser settings
  - Retry settings
  - Log level

### Scripts

- **scripts/setup-cron.sh**:
  - Bash script for Linux
  - Creates cron job to run every hour

- **scripts/setup-cron-windows.ps1**:
  - PowerShell script for Windows
  - Creates Task Scheduler task

- **scripts/test-run.js**:
  - Test script
  - Checks 2 websites only
  - No social media posting

### Documentation

- **README.md**: Complete documentation
- **QUICKSTART.md**: Quick setup guide
- **INSTALL.md**: Detailed installation steps
- **PROJECT_STRUCTURE.md**: This file

## Data Flow

1. **Cron/Task Scheduler** → Runs `src/index.js` every hour
2. **index.js** → Calls `checker/websiteChecker.js`
3. **websiteChecker.js** → Checks all websites, returns status
4. **index.js** → Saves status to database via `utils/database.js`
5. **index.js** → If website down, calls `postGenerator/postGenerator.js`
6. **postGenerator.js** → Generates message from templates
7. **index.js** → Calls `browserAutomation/socialMediaPoster.js`
8. **socialMediaPoster.js** → Uses Puppeteer to post to social media
9. **index.js** → Logs post result to database

## Data Storage (JSON Files)

### website_status.json
Array of objects with:
- `id`: Entry number
- `url`: Website URL
- `status`: HTTP status code (or null)
- `error`: Error message (or null)
- `checked_at`: ISO timestamp

### post_logs.json
Array of objects with:
- `id`: Entry number
- `url`: Website URL
- `message`: Post message text
- `status`: 'success' or 'failed'
- `error`: Error message (if failed)
- `posted_at`: ISO timestamp

## Dependencies

- **puppeteer**: Browser automation
- **axios**: HTTP requests
- **dotenv**: Environment variables

**Note**: No native dependencies - uses JSON files for storage (works on all platforms)

## Environment Variables

Required:
- `TWITTER_EMAIL`, `TWITTER_PASSWORD`, `TWITTER_USERNAME`
- `FACEBOOK_EMAIL`, `FACEBOOK_PASSWORD`
- `LINKEDIN_EMAIL`, `LINKEDIN_PASSWORD`

Optional:
- `HEADLESS`: Browser headless mode (default: true)
- `BROWSER_TIMEOUT`: Browser timeout in ms (default: 30000)
- `SOCIAL_MEDIA_TIMEOUT`: Social media timeout in ms (default: 60000)
- `MAX_RETRIES`: Max retries for website checks (default: 3)
- `RETRY_DELAY`: Delay between retries in ms (default: 5000)
- `LOG_LEVEL`: Logging level (default: info)



