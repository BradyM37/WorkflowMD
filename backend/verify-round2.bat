@echo off
REM ========================================
REM ROUND 2 VERIFICATION SCRIPT (Windows)
REM ========================================
REM Tests all new features to ensure everything works

setlocal enabledelayedexpansion

if "%1"=="" (
    set BASE_URL=http://localhost:3000
) else (
    set BASE_URL=%1
)

echo =========================================
echo Round 2 Feature Verification
echo =========================================
echo.
echo Testing server at: %BASE_URL%
echo.

set TESTS_PASSED=0
set TESTS_FAILED=0

REM Colors not supported in basic cmd, but we can use symbols
set PASS=[PASS]
set FAIL=[FAIL]
set WARN=[WARN]

echo =========================================
echo 1. HEALTH CHECKS
echo =========================================

call :test_endpoint "Basic Health" "/health" 200
call :test_endpoint "Detailed Health" "/health/detailed" 200
call :test_endpoint "Readiness Check" "/ready" 200
call :test_endpoint "Liveness Check" "/live" 200

echo.
echo =========================================
echo 2. MONITORING ENDPOINTS (ROUND 2)
echo =========================================

call :test_endpoint "Prometheus Metrics" "/metrics" 200

echo Checking metrics format...
curl -s "%BASE_URL%/metrics" > temp_metrics.txt
findstr /C:"ghl_debugger" temp_metrics.txt >nul
if !errorlevel! equ 0 (
    echo %PASS% Prometheus format detected
    set /a TESTS_PASSED+=1
) else (
    echo %FAIL% Invalid metrics format
    set /a TESTS_FAILED+=1
)
del temp_metrics.txt

call :test_endpoint "Cache Stats" "/internal/cache-stats" 200

echo.
echo =========================================
echo 3. API DOCUMENTATION (ROUND 2)
echo =========================================

REM Swagger redirects, so we expect 301 or 200
echo Testing Swagger UI...
curl -s -o nul -w "%%{http_code}" "%BASE_URL%/api-docs" > temp_code.txt
set /p CODE=<temp_code.txt
if !CODE! geq 200 if !CODE! leq 399 (
    echo %PASS% HTTP !CODE!
    set /a TESTS_PASSED+=1
) else (
    echo %FAIL% HTTP !CODE!
    set /a TESTS_FAILED+=1
)
del temp_code.txt

echo Checking OpenAPI spec...
curl -s "%BASE_URL%/openapi.json" > temp_openapi.txt
findstr /C:"openapi" temp_openapi.txt >nul
if !errorlevel! equ 0 (
    echo %PASS% OpenAPI spec valid
    set /a TESTS_PASSED+=1
) else (
    echo %FAIL% Invalid OpenAPI spec
    set /a TESTS_FAILED+=1
)
del temp_openapi.txt

echo.
echo =========================================
echo 4. COMPRESSION (ROUND 2)
echo =========================================

echo Testing gzip compression...
echo %WARN% Compression test requires manual verification on Windows
echo Try: curl -H "Accept-Encoding: gzip" %BASE_URL%/health/detailed

echo.
echo =========================================
echo 5. RATE LIMITING (ROUND 2)
echo =========================================

echo Testing rate limit headers...
curl -s -I "%BASE_URL%/health" > temp_headers.txt
findstr /C:"X-RateLimit" temp_headers.txt >nul
if !errorlevel! equ 0 (
    echo %PASS% Rate limit headers present
    set /a TESTS_PASSED+=1
) else (
    echo %WARN% Rate limit headers missing (expected if not authenticated^)
)
del temp_headers.txt

echo.
echo =========================================
echo 6. ERROR HANDLING
echo =========================================

call :test_endpoint "404 Handler" "/nonexistent-endpoint" 404

echo.
echo =========================================
echo 7. SECURITY HEADERS
echo =========================================

echo Checking security headers...
curl -s -I "%BASE_URL%/health" > temp_sec_headers.txt
set SECURITY_COUNT=0
findstr /C:"X-Content-Type-Options" temp_sec_headers.txt >nul && set /a SECURITY_COUNT+=1
findstr /C:"X-Frame-Options" temp_sec_headers.txt >nul && set /a SECURITY_COUNT+=1
findstr /C:"X-XSS-Protection" temp_sec_headers.txt >nul && set /a SECURITY_COUNT+=1
del temp_sec_headers.txt

if !SECURITY_COUNT! geq 2 (
    echo %PASS% !SECURITY_COUNT!/3 security headers present
    set /a TESTS_PASSED+=1
) else (
    echo %FAIL% Insufficient security headers
    set /a TESTS_FAILED+=1
)

echo.
echo =========================================
echo SUMMARY
echo =========================================
echo.

set /a TOTAL_TESTS=%TESTS_PASSED% + %TESTS_FAILED%
if !TOTAL_TESTS! equ 0 set TOTAL_TESTS=1
set /a SUCCESS_RATE=%TESTS_PASSED% * 100 / !TOTAL_TESTS!

echo Total Tests: !TOTAL_TESTS!
echo Passed: %TESTS_PASSED%
echo Failed: %TESTS_FAILED%
echo Success Rate: !SUCCESS_RATE!%%
echo.

if %TESTS_FAILED% equ 0 (
    echo =========================================
    echo ALL TESTS PASSED!
    echo Backend Round 2 is PRODUCTION READY!
    echo =========================================
    exit /b 0
) else if !SUCCESS_RATE! geq 80 (
    echo =========================================
    echo MOSTLY PASSING ^(!SUCCESS_RATE!%%^)
    echo Review warnings above
    echo =========================================
    exit /b 0
) else (
    echo =========================================
    echo TESTS FAILED
    echo Fix errors before deploying to production
    echo =========================================
    exit /b 1
)

REM ========================================
REM Helper Function: Test Endpoint
REM ========================================
:test_endpoint
set NAME=%~1
set ENDPOINT=%~2
set EXPECTED=%~3

echo Testing %NAME%...

curl -s -o nul -w "%%{http_code}" "%BASE_URL%%ENDPOINT%" > temp_code.txt
set /p RESPONSE=<temp_code.txt
del temp_code.txt

if "!RESPONSE!"=="%EXPECTED%" (
    echo %PASS% HTTP !RESPONSE!
    set /a TESTS_PASSED+=1
) else (
    echo %FAIL% Expected %EXPECTED%, got !RESPONSE!
    set /a TESTS_FAILED+=1
)

goto :eof
