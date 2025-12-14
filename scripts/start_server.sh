#!/bin/bash
cd /home/ubuntu/future-health/backend

# Install PM2 if not installed
if ! command -v pm2 &> /dev/null; then
    npm install -g pm2
fi

# Start the application
pm2 start server.js --name "future-health" -i max

# Save PM2 configuration
pm2 save
pm2 startup