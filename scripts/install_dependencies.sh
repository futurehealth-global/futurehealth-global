#!/bin/bash
cd /home/ubuntu/future-health/backend

# Install dependencies
npm install --production

# Create uploads directory if it doesn't exist
mkdir -p uploads

# Set proper permissions
chmod -R 755 uploads