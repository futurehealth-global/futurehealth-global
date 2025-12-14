#!/bin/bash
# Stop the application using PM2
pm2 stop future-health || true
pm2 delete future-health || true