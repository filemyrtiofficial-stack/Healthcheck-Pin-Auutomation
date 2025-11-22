#!/bin/bash

# Script to set up cron job for RTI Health Check Automation
# This script adds a cron job that runs every hour

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
NODE_PATH=$(which node)

if [ -z "$NODE_PATH" ]; then
    echo "Error: Node.js is not installed or not in PATH"
    exit 1
fi

CRON_JOB="0 * * * * cd $PROJECT_DIR && $NODE_PATH src/index.js >> logs/cron.log 2>&1"

# Check if cron job already exists
if crontab -l 2>/dev/null | grep -q "$PROJECT_DIR/src/index.js"; then
    echo "Cron job already exists. Removing old entry..."
    crontab -l 2>/dev/null | grep -v "$PROJECT_DIR/src/index.js" | crontab -
fi

# Add new cron job
(crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -

echo "Cron job successfully installed!"
echo "The automation will run every hour at minute 0."
echo ""
echo "To view your cron jobs, run: crontab -l"
echo "To remove the cron job, run: crontab -e (then delete the line)"
echo ""
echo "Logs will be written to: $PROJECT_DIR/logs/cron.log"



