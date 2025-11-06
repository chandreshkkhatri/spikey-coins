#!/bin/bash

# Test Research Trigger Script
# This script triggers the research endpoint and monitors the logs

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}   Research Trigger Test Script${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Configuration
API_URL="${API_URL:-http://localhost:8000}"
ADMIN_USERNAME="${ADMIN_USERNAME:-chandresh}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-gumboots34}"

echo -e "${YELLOW}Configuration:${NC}"
echo "  API URL: $API_URL"
echo "  Admin Username: $ADMIN_USERNAME"
echo ""

# Step 1: Login to get JWT token
echo -e "${BLUE}Step 1: Logging in as admin...${NC}"
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$ADMIN_USERNAME\",\"password\":\"$ADMIN_PASSWORD\"}")

# Extract token
TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo -e "${RED}❌ Login failed!${NC}"
  echo "Response: $LOGIN_RESPONSE"
  echo ""
  echo -e "${YELLOW}Troubleshooting:${NC}"
  echo "1. Make sure the server is running: pm2 status"
  echo "2. Check if admin user exists in database"
  echo "3. Verify ADMIN_USERNAME and ADMIN_PASSWORD are correct"
  echo "4. Try: API_URL=http://localhost:8080 ADMIN_USERNAME=admin ADMIN_PASSWORD=yourpassword ./test-research-trigger.sh"
  exit 1
fi

echo -e "${GREEN}✅ Login successful!${NC}"
echo "Token: ${TOKEN:0:20}..."
echo ""

# Step 2: Trigger research job
echo -e "${BLUE}Step 2: Triggering research job...${NC}"
echo "This will research both 24h and 7d top movers with event pre-screening"
echo ""

TRIGGER_RESPONSE=$(curl -s -X POST "$API_URL/api/admin/research/trigger" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{}')

echo "Response:"
echo "$TRIGGER_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$TRIGGER_RESPONSE"
echo ""

# Check if successful
if echo "$TRIGGER_RESPONSE" | grep -q '"success":true'; then
  echo -e "${GREEN}✅ Research job triggered successfully!${NC}"
  echo ""
  
  # Step 3: Monitor logs
  echo -e "${BLUE}Step 3: Monitoring logs for research progress...${NC}"
  echo -e "${YELLOW}(Press Ctrl+C to stop monitoring)${NC}"
  echo ""
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  
  # Wait a moment for the job to start
  sleep 2
  
  # Tail the logs
  pm2 logs spikey-coins-backend --lines 100 --nostream | grep -E "(ResearchService|ResearchCronService|Phase|Pre-screening|coins with events|Completed research)" || \
  tail -f logs/application-*.log | grep -E "(ResearchService|ResearchCronService|Phase|Pre-screening|coins with events|Completed research)"
  
else
  echo -e "${RED}❌ Failed to trigger research job${NC}"
  echo ""
  echo -e "${YELLOW}Possible issues:${NC}"
  echo "1. Gemini API key not configured"
  echo "2. Server error - check logs: pm2 logs spikey-coins-backend"
  echo "3. Database connection issue"
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}What to look for in logs:${NC}"
echo ""
echo "Phase 1 - Pre-screening:"
echo "  • 'Found X unique top movers (Y from 24h, Z from 7d)'"
echo "  • '✅ SYMBOL (+X% timeframe) - reason'"
echo "  • '❌ SYMBOL (+X% timeframe) - reason'"
echo "  • 'Pre-screening complete - X coins with events, Y without'"
echo ""
echo "Phase 2 - Full Research:"
echo "  • 'Full research for X coins with events...'"
echo "  • 'Researching SYMBOL (+X%)'"
echo "  • 'Completed research - New: X, Updated: Y, Published: Z'"
echo ""
echo "Summary:"
echo "  • 'Screened: X, With Events: Y, Without Events: Z'"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

