#!/bin/bash

# Test script for Arcjet Shell Rate Limiting
# This script sends 60 requests to the local server to verify rate limiting.

echo "🚀 Starting load test (60 requests)..."
echo "Note: The first 50 should be 200, the last 10 should be 429."

for i in {1..60}
do
  # Send request and capture just the HTTP status code
  status_code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/matches)
  
  if [ "$status_code" == "200" ]; then
    echo "Request $i: ✅ $status_code"
  elif [ "$status_code" == "429" ]; then
    echo "Request $i: 🛡️ $status_code (Rate Limited!)"
  else
    echo "Request $i: ❌ $status_code (Error)"
  fi
done

echo "✅ Load test complete."
