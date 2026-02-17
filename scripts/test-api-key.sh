#!/bin/bash
# Test script for Feature #11: Ingestion API requires valid x-api-key header

API_URL="http://localhost:3006/api/edgar/ingest"
CORRECT_KEY="formd-scout-dev-api-key-2026"

echo "=== Feature #11: API Key Security Test ==="
echo ""

# Test 1: No API key header
echo "Test 1: POST /api/edgar/ingest with NO x-api-key header"
RESPONSE1=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d '{"companyName":"Test","cik":"0000000000","accessionNumber":"0000000000-00-000000"}')

HTTP_CODE1=$(echo "$RESPONSE1" | grep "HTTP_STATUS:" | cut -d: -f2)
BODY1=$(echo "$RESPONSE1" | sed '/HTTP_STATUS:/d')

echo "  HTTP Status: $HTTP_CODE1"
echo "  Response: $BODY1"
if [[ "$HTTP_CODE1" == "401" || "$HTTP_CODE1" == "403" ]]; then
  echo "  ✓ PASS - Correctly rejected with 401/403"
else
  echo "  ✗ FAIL - Expected 401 or 403, got $HTTP_CODE1"
fi
echo ""

# Test 2: Incorrect API key header
echo "Test 2: POST /api/edgar/ingest with INCORRECT x-api-key header"
RESPONSE2=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -H "x-api-key: bad-key" \
  -d '{"companyName":"Test","cik":"0000000000","accessionNumber":"0000000000-00-000001"}')

HTTP_CODE2=$(echo "$RESPONSE2" | grep "HTTP_STATUS:" | cut -d: -f2)
BODY2=$(echo "$RESPONSE2" | sed '/HTTP_STATUS:/d')

echo "  HTTP Status: $HTTP_CODE2"
echo "  Response: $BODY2"
if [[ "$HTTP_CODE2" == "401" || "$HTTP_CODE2" == "403" ]]; then
  echo "  ✓ PASS - Correctly rejected with 401/403"
else
  echo "  ✗ FAIL - Expected 401 or 403, got $HTTP_CODE2"
fi
echo ""

# Test 3: Correct API key header
echo "Test 3: POST /api/edgar/ingest with CORRECT x-api-key header"
RESPONSE3=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -H "x-api-key: $CORRECT_KEY" \
  -d "{\"companyName\":\"API Key Test Corp\",\"cik\":\"9999999999\",\"accessionNumber\":\"9999999999-26-TEST01\",\"filingDate\":\"2026-02-17\"}")

HTTP_CODE3=$(echo "$RESPONSE3" | grep "HTTP_STATUS:" | cut -d: -f2)
BODY3=$(echo "$RESPONSE3" | sed '/HTTP_STATUS:/d')

echo "  HTTP Status: $HTTP_CODE3"
echo "  Response: $BODY3"
if [[ "$HTTP_CODE3" == "200" ]]; then
  echo "  ✓ PASS - Correctly accepted with 200"
else
  echo "  ✗ FAIL - Expected 200, got $HTTP_CODE3"
fi
echo ""

echo "=== Summary ==="
echo "All three tests should pass for Feature #11 to be complete."
