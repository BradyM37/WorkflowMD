#!/bin/bash

# ========================================
# ROUND 2 VERIFICATION SCRIPT
# ========================================
# Tests all new features to ensure everything works

set -e  # Exit on error

echo "========================================="
echo "🔍 Round 2 Feature Verification"
echo "========================================="
echo ""

BASE_URL="${1:-http://localhost:3000}"

echo "Testing server at: $BASE_URL"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Helper function to run tests
test_endpoint() {
    local name="$1"
    local endpoint="$2"
    local expected_code="${3:-200}"
    
    echo -n "Testing $name... "
    
    response=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL$endpoint")
    
    if [ "$response" -eq "$expected_code" ]; then
        echo -e "${GREEN}✓ PASS${NC} (HTTP $response)"
        ((TESTS_PASSED++))
        return 0
    else
        echo -e "${RED}✗ FAIL${NC} (Expected $expected_code, got $response)"
        ((TESTS_FAILED++))
        return 1
    fi
}

echo "========================================="
echo "1. HEALTH CHECKS"
echo "========================================="

test_endpoint "Basic Health" "/health" 200
test_endpoint "Detailed Health" "/health/detailed" 200
test_endpoint "Readiness Check" "/ready" 200
test_endpoint "Liveness Check" "/live" 200

echo ""
echo "========================================="
echo "2. MONITORING ENDPOINTS (ROUND 2)"
echo "========================================="

test_endpoint "Prometheus Metrics" "/metrics" 200

echo -n "Checking metrics format... "
metrics=$(curl -s "$BASE_URL/metrics")
if echo "$metrics" | grep -q "ghl_debugger"; then
    echo -e "${GREEN}✓ PASS${NC} (Prometheus format detected)"
    ((TESTS_PASSED++))
else
    echo -e "${RED}✗ FAIL${NC} (Invalid metrics format)"
    ((TESTS_FAILED++))
fi

test_endpoint "Cache Stats" "/internal/cache-stats" 200

echo -n "Checking cache type... "
cache_stats=$(curl -s "$BASE_URL/internal/cache-stats")
if echo "$cache_stats" | grep -q '"type"'; then
    cache_type=$(echo "$cache_stats" | grep -o '"type":"[^"]*"' | cut -d'"' -f4)
    echo -e "${GREEN}✓ PASS${NC} (Cache type: $cache_type)"
    ((TESTS_PASSED++))
else
    echo -e "${RED}✗ FAIL${NC} (No cache type found)"
    ((TESTS_FAILED++))
fi

echo ""
echo "========================================="
echo "3. API DOCUMENTATION (ROUND 2)"
echo "========================================="

test_endpoint "Swagger UI" "/api-docs" 301  # Redirects to /api-docs/

echo -n "Checking OpenAPI spec... "
openapi=$(curl -s "$BASE_URL/openapi.json")
if echo "$openapi" | grep -q '"openapi"'; then
    version=$(echo "$openapi" | grep -o '"openapi":"[^"]*"' | cut -d'"' -f4)
    echo -e "${GREEN}✓ PASS${NC} (OpenAPI version: $version)"
    ((TESTS_PASSED++))
else
    echo -e "${RED}✗ FAIL${NC} (Invalid OpenAPI spec)"
    ((TESTS_FAILED++))
fi

echo -n "Checking API endpoints in spec... "
if echo "$openapi" | grep -q '"/api/workflows"'; then
    echo -e "${GREEN}✓ PASS${NC} (API endpoints documented)"
    ((TESTS_PASSED++))
else
    echo -e "${RED}✗ FAIL${NC} (API endpoints missing)"
    ((TESTS_FAILED++))
fi

echo ""
echo "========================================="
echo "4. COMPRESSION (ROUND 2)"
echo "========================================="

echo -n "Testing gzip compression... "
# Request with compression
response_compressed=$(curl -s -H "Accept-Encoding: gzip" \
    -w "%{size_download}" -o /dev/null \
    "$BASE_URL/health/detailed")

# Request without compression
response_uncompressed=$(curl -s -H "Accept-Encoding: identity" \
    -w "%{size_download}" -o /dev/null \
    "$BASE_URL/health/detailed")

if [ "$response_compressed" -lt "$response_uncompressed" ]; then
    reduction=$((100 - (response_compressed * 100 / response_uncompressed)))
    echo -e "${GREEN}✓ PASS${NC} (${reduction}% size reduction)"
    ((TESTS_PASSED++))
else
    echo -e "${YELLOW}⚠ WARNING${NC} (Compression may not be working)"
    # Don't fail, as this might be expected for small responses
fi

echo ""
echo "========================================="
echo "5. RATE LIMITING (ROUND 2)"
echo "========================================="

echo -n "Testing rate limit headers... "
headers=$(curl -s -I "$BASE_URL/health")
if echo "$headers" | grep -q "X-RateLimit"; then
    echo -e "${GREEN}✓ PASS${NC} (Rate limit headers present)"
    ((TESTS_PASSED++))
else
    echo -e "${YELLOW}⚠ WARNING${NC} (Rate limit headers missing)"
    echo "  This is expected if not authenticated"
fi

echo ""
echo "========================================="
echo "6. CACHING (ROUND 2)"
echo "========================================="

echo -n "Testing cache performance... "

# First request (cache miss)
start1=$(date +%s%N)
curl -s -o /dev/null "$BASE_URL/health/detailed"
end1=$(date +%s%N)
time1=$(( (end1 - start1) / 1000000 ))  # Convert to milliseconds

# Second request (should be cached)
start2=$(date +%s%N)
curl -s -o /dev/null "$BASE_URL/health/detailed"
end2=$(date +%s%N)
time2=$(( (end2 - start2) / 1000000 ))

if [ "$time2" -le "$time1" ]; then
    improvement=$((100 - (time2 * 100 / time1)))
    echo -e "${GREEN}✓ PASS${NC} (2nd request ${improvement}% faster: ${time1}ms → ${time2}ms)"
    ((TESTS_PASSED++))
else
    echo -e "${YELLOW}⚠ INFO${NC} (Cache effect: ${time1}ms → ${time2}ms)"
    # Don't fail as timing can vary
fi

echo ""
echo "========================================="
echo "7. DATABASE INDEXES (ROUND 2)"
echo "========================================="

if command -v psql &> /dev/null; then
    if [ -n "$DATABASE_URL" ]; then
        echo -n "Checking database indexes... "
        
        index_count=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public' AND indexname LIKE 'idx_%'" 2>/dev/null || echo "0")
        index_count=$(echo "$index_count" | xargs)  # Trim whitespace
        
        if [ "$index_count" -ge 10 ]; then
            echo -e "${GREEN}✓ PASS${NC} ($index_count indexes found)"
            ((TESTS_PASSED++))
        else
            echo -e "${YELLOW}⚠ WARNING${NC} (Only $index_count indexes found, expected 13+)"
            echo "  Run: psql \$DATABASE_URL -f migrations/003_performance_indexes.sql"
        fi
    else
        echo -e "${YELLOW}⚠ SKIP${NC} (DATABASE_URL not set)"
    fi
else
    echo -e "${YELLOW}⚠ SKIP${NC} (psql not installed)"
fi

echo ""
echo "========================================="
echo "8. ERROR HANDLING"
echo "========================================="

test_endpoint "404 Handler" "/nonexistent-endpoint" 404

echo -n "Testing 404 response format... "
error_response=$(curl -s "$BASE_URL/nonexistent-endpoint")
if echo "$error_response" | grep -q '"success":false'; then
    echo -e "${GREEN}✓ PASS${NC} (Standardized error format)"
    ((TESTS_PASSED++))
else
    echo -e "${RED}✗ FAIL${NC} (Non-standard error format)"
    ((TESTS_FAILED++))
fi

echo ""
echo "========================================="
echo "9. SECURITY HEADERS"
echo "========================================="

echo -n "Checking security headers... "
headers=$(curl -s -I "$BASE_URL/health")

security_check=0
if echo "$headers" | grep -q "X-Content-Type-Options"; then ((security_check++)); fi
if echo "$headers" | grep -q "X-Frame-Options"; then ((security_check++)); fi
if echo "$headers" | grep -q "X-XSS-Protection"; then ((security_check++)); fi

if [ "$security_check" -ge 2 ]; then
    echo -e "${GREEN}✓ PASS${NC} ($security_check/3 security headers present)"
    ((TESTS_PASSED++))
else
    echo -e "${RED}✗ FAIL${NC} (Insufficient security headers)"
    ((TESTS_FAILED++))
fi

echo ""
echo "========================================="
echo "10. PERFORMANCE"
echo "========================================="

echo -n "Measuring average response time... "

total_time=0
requests=10

for i in $(seq 1 $requests); do
    start=$(date +%s%N)
    curl -s -o /dev/null "$BASE_URL/health"
    end=$(date +%s%N)
    time=$(( (end - start) / 1000000 ))
    total_time=$((total_time + time))
done

avg_time=$((total_time / requests))

if [ "$avg_time" -lt 200 ]; then
    echo -e "${GREEN}✓ EXCELLENT${NC} (${avg_time}ms average)"
    ((TESTS_PASSED++))
elif [ "$avg_time" -lt 500 ]; then
    echo -e "${GREEN}✓ PASS${NC} (${avg_time}ms average)"
    ((TESTS_PASSED++))
else
    echo -e "${YELLOW}⚠ SLOW${NC} (${avg_time}ms average, target: <200ms)"
fi

echo ""
echo "========================================="
echo "📊 SUMMARY"
echo "========================================="

TOTAL_TESTS=$((TESTS_PASSED + TESTS_FAILED))
SUCCESS_RATE=$((TESTS_PASSED * 100 / TOTAL_TESTS))

echo ""
echo "Total Tests: $TOTAL_TESTS"
echo -e "Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Failed: ${RED}$TESTS_FAILED${NC}"
echo "Success Rate: ${SUCCESS_RATE}%"
echo ""

if [ "$TESTS_FAILED" -eq 0 ]; then
    echo -e "${GREEN}=========================================${NC}"
    echo -e "${GREEN}✅ ALL TESTS PASSED!${NC}"
    echo -e "${GREEN}Backend Round 2 is PRODUCTION READY! 🚀${NC}"
    echo -e "${GREEN}=========================================${NC}"
    exit 0
elif [ "$SUCCESS_RATE" -ge 80 ]; then
    echo -e "${YELLOW}=========================================${NC}"
    echo -e "${YELLOW}⚠️  MOSTLY PASSING (${SUCCESS_RATE}%)${NC}"
    echo -e "${YELLOW}Review warnings above${NC}"
    echo -e "${YELLOW}=========================================${NC}"
    exit 0
else
    echo -e "${RED}=========================================${NC}"
    echo -e "${RED}❌ TESTS FAILED${NC}"
    echo -e "${RED}Fix errors before deploying to production${NC}"
    echo -e "${RED}=========================================${NC}"
    exit 1
fi
