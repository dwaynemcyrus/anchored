#!/bin/bash

# Seed script for Anchored database
# Usage: ./scripts/seed.sh [seed|clean]
# Note: You must be logged in via the app for this to work

BASE_URL="${BASE_URL:-http://localhost:3000}"

case "${1:-seed}" in
  seed)
    echo "Seeding database..."
    curl -X POST "$BASE_URL/api/seed" \
      -H "Content-Type: application/json" \
      --cookie-jar /tmp/anchored-cookies.txt \
      --cookie /tmp/anchored-cookies.txt \
      2>/dev/null | jq .
    ;;
  clean)
    echo "Cleaning database..."
    curl -X DELETE "$BASE_URL/api/seed" \
      -H "Content-Type: application/json" \
      --cookie-jar /tmp/anchored-cookies.txt \
      --cookie /tmp/anchored-cookies.txt \
      2>/dev/null | jq .
    ;;
  *)
    echo "Usage: $0 [seed|clean]"
    exit 1
    ;;
esac
