#!/bin/bash
# Validate that the service is running
response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/api/health)

if [ $response -eq 200 ]; then
    echo "Service is running successfully"
    exit 0
else
    echo "Service validation failed with status code: $response"
    exit 1
fi