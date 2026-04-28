# =============================================================================
# Order Cancel & Start Rental — API Test Suite (14 Tests)
# =============================================================================
#
# Tests:
#   1.  Create a SCHEDULED order (start_date in the future)      → status = 'scheduled'
#   2.  Create an ONGOING order (start_date = today)             → status = 'ongoing'
#   3.  Cancel a scheduled order via PATCH                       → 200, status = 'cancelled'
#   4.  Verify cancelled order cannot be transitioned again      → error
#   5.  Create new scheduled order for cancel→stock flow
#   6.  Start rental (scheduled → ongoing) via PATCH             → 200, status = 'ongoing'
#   7.  Verify stock decremented after start rental              
#   8.  Cancel ongoing order → stock restored                    
#   9.  Invalid transition: completed → scheduled                → error
#  10.  Invalid transition: returned → scheduled                 → error
#  11.  Double cancel: cancel already cancelled order             → error
#  12.  Create scheduled order and cancel it (stock should NOT change)
#  13.  Status history has correct entries after transitions
#  14.  Cleanup: Delete all test orders
#
# Usage:
#   .\scripts\test-order-cancel-startrental.ps1
#   (the Next.js dev server must be running on http://localhost:3001)
# =============================================================================

$ErrorActionPreference = 'Stop'
$BaseUrl = 'http://localhost:3001/api'

$script:Pass = 0
$script:Fail = 0
$script:Cases = @()
$script:TestOrderIds = @()

function Record($name, $ok, $detail) {
    $status = if ($ok) { 'PASS' } else { 'FAIL' }
    $color  = if ($ok) { 'Green' } else { 'Red' }
    if ($ok) { $script:Pass++ } else { $script:Fail++ }
    Write-Host ("[{0}] {1}" -f $status, $name) -ForegroundColor $color
    if ($detail) { Write-Host "       $detail" -ForegroundColor DarkGray }
    $script:Cases += [pscustomobject]@{ Name = $name; Status = $status; Detail = $detail }
}

function Invoke-Api($method, $path, $body) {
    $uri = "$BaseUrl$path"
    $headers = @{}
    $params = @{ Uri = $uri; Method = $method; ContentType = 'application/json'; Headers = $headers; UseBasicParsing = $true }
    if ($body) { $params.Body = ($body | ConvertTo-Json -Depth 5 -Compress) }
    try {
        $resp = Invoke-WebRequest @params
        $status = [int]$resp.StatusCode
        $content = $resp.Content
    } catch [System.Net.WebException] {
        $webResp = $_.Exception.Response
        if ($null -ne $webResp) {
            $status = [int]$webResp.StatusCode
            $stream = $webResp.GetResponseStream()
            $reader = New-Object System.IO.StreamReader($stream)
            $content = $reader.ReadToEnd()
            $reader.Close()
        } else {
            $status = -1
            $content = $_.Exception.Message
        }
    }
    $json = $null
    if ($content) { try { $json = $content | ConvertFrom-Json } catch { $json = $null } }
    return [pscustomobject]@{ Status = $status; Body = $json; Raw = $content }
}

function Show-Step($label) { Write-Host "`n=== $label ===" -ForegroundColor Cyan }

Write-Host "`n=== Order Cancel & Start Rental API Tests ===`n" -ForegroundColor Cyan

# -----------------------------------------------------------------------------
# SETUP: Get dependencies (branch, customer, product)
# -----------------------------------------------------------------------------
Show-Step "SETUP: Fetching dependencies"

$branchResp = Invoke-Api "GET" "/branches" $null
$branch = $branchResp.Body.branches | Select-Object -First 1
if (-not $branch) { Write-Host "No branch found. Create one first." -ForegroundColor Yellow; exit 1 }

$customerResp = Invoke-Api "GET" "/customers" $null
$customer = $customerResp.Body.customers | Select-Object -First 1
if (-not $customer) { Write-Host "No customer found. Create one first." -ForegroundColor Yellow; exit 1 }

$productResp = Invoke-Api "GET" "/products" $null
$product = $productResp.Body.products | Select-Object -First 1
if (-not $product) { Write-Host "No product found. Create one first." -ForegroundColor Yellow; exit 1 }

Write-Host "Branch:   $($branch.id)"
Write-Host "Customer: $($customer.id) ($($customer.name))"
Write-Host "Product:  $($product.id) ($($product.name)) | Stock: $($product.available_quantity)"

# Future date (7 days from now) — ensures 'scheduled' status
$futureDate = (Get-Date).AddDays(7).ToString("yyyy-MM-dd")
$futureEndDate = (Get-Date).AddDays(14).ToString("yyyy-MM-dd")
$todayDate = (Get-Date).ToString("yyyy-MM-dd")
$todayEndDate = (Get-Date).AddDays(3).ToString("yyyy-MM-dd")

# ============================================================================
# TEST 1: Create order with future start → should be 'scheduled'
# ============================================================================
Show-Step "TEST 1: Create Scheduled Order (future start_date)"

$scheduledOrder = @{
    customer_id = $customer.id
    branch_id = $branch.id
    rental_start_date = $futureDate
    rental_end_date = $futureEndDate
    security_deposit = 500
    items = @(@{ product_id = $product.id; quantity = 1; price_per_day = 300 })
}

$res = Invoke-Api "POST" "/orders" $scheduledOrder
$test1OrderId = $null
if ($res.Status -in @(200, 201)) { $test1OrderId = $res.Body.order.id; $script:TestOrderIds += $test1OrderId }
Record "1. Create scheduled order -> 200/201" ($res.Status -in @(200, 201)) "Status: $($res.Status)"
Record "   Order status = 'scheduled'" ($res.Body.order.status -eq "scheduled") "Got: $($res.Body.order.status)"

# ============================================================================
# TEST 2: Create order with today's start → should be 'ongoing'
# ============================================================================
Show-Step "TEST 2: Create Ongoing Order (today start_date)"

$ongoingOrder = @{
    customer_id = $customer.id
    branch_id = $branch.id
    rental_start_date = $todayDate
    rental_end_date = $todayEndDate
    security_deposit = 500
    items = @(@{ product_id = $product.id; quantity = 1; price_per_day = 300 })
}

$res = Invoke-Api "POST" "/orders" $ongoingOrder
$test2OrderId = $null
if ($res.Status -in @(200, 201)) { $test2OrderId = $res.Body.order.id; $script:TestOrderIds += $test2OrderId }
Record "2. Create ongoing order -> 200/201" ($res.Status -in @(200, 201)) "Status: $($res.Status)"
Record "   Order status = 'ongoing'" ($res.Body.order.status -eq "ongoing") "Got: $($res.Body.order.status)"

# ============================================================================
# TEST 3: Cancel a SCHEDULED order
# ============================================================================
Show-Step "TEST 3: Cancel Scheduled Order"

if ($test1OrderId) {
    $res = Invoke-Api "PATCH" "/orders/$test1OrderId" @{ status = "cancelled" }
    Record "3. PATCH scheduled -> cancelled -> 200" ($res.Status -eq 200) "Status: $($res.Status)"
    
    # Verify the status
    $fetch = Invoke-Api "GET" "/orders/$test1OrderId" $null
    Record "   Verify status is cancelled" ($fetch.Body.order.status -eq "cancelled") "Got: $($fetch.Body.order.status)"
} else {
    Record "3. SKIPPED (order creation failed)" $false ""
}

# ============================================================================
# TEST 4: Cancelled order cannot transition to anything
# ============================================================================
Show-Step "TEST 4: Cancelled Order Cannot Transition"

if ($test1OrderId) {
    # Try cancelled -> ongoing
    $res = Invoke-Api "PATCH" "/orders/$test1OrderId" @{ status = "ongoing" }
    Record "4a. PATCH cancelled -> ongoing -> should FAIL" ($res.Status -ne 200) "Status: $($res.Status)"
    
    # Try cancelled -> scheduled
    $res = Invoke-Api "PATCH" "/orders/$test1OrderId" @{ status = "scheduled" }
    Record "4b. PATCH cancelled -> scheduled -> should FAIL" ($res.Status -ne 200) "Status: $($res.Status)"
} else {
    Record "4. SKIPPED" $false ""
}

# ============================================================================
# TEST 5: Create new scheduled order for start rental test
# ============================================================================
Show-Step "TEST 5: Create Scheduled Order for Start Rental"

$startRentalOrder = @{
    customer_id = $customer.id
    branch_id = $branch.id
    rental_start_date = $futureDate
    rental_end_date = $futureEndDate
    security_deposit = 500
    items = @(@{ product_id = $product.id; quantity = 1; price_per_day = 300 })
}

$res = Invoke-Api "POST" "/orders" $startRentalOrder
$test5OrderId = $null
if ($res.Status -in @(200, 201)) { $test5OrderId = $res.Body.order.id; $script:TestOrderIds += $test5OrderId }
Record "5. Create scheduled order -> 200/201" ($res.Status -in @(200, 201)) "ID: $test5OrderId"

# ============================================================================
# TEST 6: Start Rental (scheduled → ongoing) via PATCH
# ============================================================================
Show-Step "TEST 6: Start Rental (scheduled -> ongoing)"

# Capture stock BEFORE transition
$prodBefore = (Invoke-Api "GET" "/products/$($product.id)" $null).Body.product
$stockBefore = $prodBefore.available_quantity

if ($test5OrderId) {
    $res = Invoke-Api "PATCH" "/orders/$test5OrderId" @{ status = "ongoing" }
    Record "6. PATCH scheduled -> ongoing -> 200" ($res.Status -eq 200) "Status: $($res.Status)"
    
    $fetch = Invoke-Api "GET" "/orders/$test5OrderId" $null
    Record "   Verify status is ongoing" ($fetch.Body.order.status -eq "ongoing") "Got: $($fetch.Body.order.status)"
} else {
    Record "6. SKIPPED" $false ""
}

# ============================================================================
# TEST 7: Verify stock decremented after start rental
# ============================================================================
Show-Step "TEST 7: Stock Decrement on Start Rental"

$prodAfterStart = (Invoke-Api "GET" "/products/$($product.id)" $null).Body.product
$stockAfterStart = $prodAfterStart.available_quantity
Record "7. Stock decreased by 1 on start rental" ($stockAfterStart -eq ($stockBefore - 1)) "Before: $stockBefore, After: $stockAfterStart"

# ============================================================================
# TEST 8: Cancel ongoing order → stock should be restored
# ============================================================================
Show-Step "TEST 8: Cancel Ongoing Order -> Stock Restored"

if ($test5OrderId) {
    $res = Invoke-Api "PATCH" "/orders/$test5OrderId" @{ status = "cancelled" }
    Record "8a. PATCH ongoing -> cancelled -> 200" ($res.Status -eq 200) "Status: $($res.Status)"
    
    $prodAfterCancel = (Invoke-Api "GET" "/products/$($product.id)" $null).Body.product
    $stockAfterCancel = $prodAfterCancel.available_quantity
    Record "8b. Stock restored after cancel" ($stockAfterCancel -eq $stockBefore) "Before start: $stockBefore, After cancel: $stockAfterCancel"
} else {
    Record "8. SKIPPED" $false ""
}

# ============================================================================
# TEST 9: Invalid transition: completed → scheduled
# ============================================================================
Show-Step "TEST 9: Invalid Transition Blocked (completed -> scheduled)"

# We need a completed order. Create one and manually transition through the lifecycle
$lcOrder = @{
    customer_id = $customer.id
    branch_id = $branch.id
    rental_start_date = $todayDate
    rental_end_date = $todayEndDate
    security_deposit = 500
    items = @(@{ product_id = $product.id; quantity = 1; price_per_day = 300 })
}

$res = Invoke-Api "POST" "/orders" $lcOrder
$test9OrderId = $null
if ($res.Status -in @(200, 201)) {
    $test9OrderId = $res.Body.order.id
    $script:TestOrderIds += $test9OrderId
    
    # ongoing -> returned
    $null = Invoke-Api "PATCH" "/orders/$test9OrderId" @{ status = "returned" }
    # returned -> completed
    $null = Invoke-Api "PATCH" "/orders/$test9OrderId" @{ status = "completed" }
    
    # Now try completed -> scheduled (MUST fail)
    $res = Invoke-Api "PATCH" "/orders/$test9OrderId" @{ status = "scheduled" }
    Record "9. PATCH completed -> scheduled -> FAIL" ($res.Status -ne 200) "Status: $($res.Status)"
} else {
    Record "9. SKIPPED (order creation failed)" $false ""
}

# ============================================================================
# TEST 10: Invalid transition: returned → scheduled
# ============================================================================
Show-Step "TEST 10: Invalid Transition (returned -> scheduled)"

$lcOrder2 = @{
    customer_id = $customer.id
    branch_id = $branch.id
    rental_start_date = $todayDate
    rental_end_date = $todayEndDate
    security_deposit = 500
    items = @(@{ product_id = $product.id; quantity = 1; price_per_day = 300 })
}

$res = Invoke-Api "POST" "/orders" $lcOrder2
$test10OrderId = $null
if ($res.Status -in @(200, 201)) {
    $test10OrderId = $res.Body.order.id
    $script:TestOrderIds += $test10OrderId
    
    # ongoing -> returned
    $null = Invoke-Api "PATCH" "/orders/$test10OrderId" @{ status = "returned" }
    
    # returned -> scheduled (MUST fail)
    $res = Invoke-Api "PATCH" "/orders/$test10OrderId" @{ status = "scheduled" }
    Record "10. PATCH returned -> scheduled -> FAIL" ($res.Status -ne 200) "Status: $($res.Status)"
} else {
    Record "10. SKIPPED" $false ""
}

# ============================================================================
# TEST 11: Double cancel
# ============================================================================
Show-Step "TEST 11: Double Cancel (cancel already cancelled)"

if ($test1OrderId) {
    # test1 is already cancelled from test 3
    $res = Invoke-Api "PATCH" "/orders/$test1OrderId" @{ status = "cancelled" }
    Record "11. PATCH cancelled -> cancelled -> FAIL" ($res.Status -ne 200) "Status: $($res.Status)"
} else {
    Record "11. SKIPPED" $false ""
}

# ============================================================================
# TEST 12: Cancel scheduled order → stock should NOT change
# ============================================================================
Show-Step "TEST 12: Cancel Scheduled -> Stock Unchanged"

$prodBeforeSched = (Invoke-Api "GET" "/products/$($product.id)" $null).Body.product
$stockBeforeSched = $prodBeforeSched.available_quantity

$schedCancel = @{
    customer_id = $customer.id
    branch_id = $branch.id
    rental_start_date = $futureDate
    rental_end_date = $futureEndDate
    security_deposit = 500
    items = @(@{ product_id = $product.id; quantity = 1; price_per_day = 300 })
}

$res = Invoke-Api "POST" "/orders" $schedCancel
$test12OrderId = $null
if ($res.Status -in @(200, 201)) {
    $test12OrderId = $res.Body.order.id
    $script:TestOrderIds += $test12OrderId
    
    # Stock should be the same after creating a scheduled order (not decremented)
    $prodAfterCreate = (Invoke-Api "GET" "/products/$($product.id)" $null).Body.product
    Record "12a. Stock unchanged after creating scheduled order" ($prodAfterCreate.available_quantity -eq $stockBeforeSched) "Before: $stockBeforeSched, After: $($prodAfterCreate.available_quantity)"
    
    # Cancel it
    $null = Invoke-Api "PATCH" "/orders/$test12OrderId" @{ status = "cancelled" }
    
    $prodAfterCancelSched = (Invoke-Api "GET" "/products/$($product.id)" $null).Body.product
    Record "12b. Stock still unchanged after cancel scheduled" ($prodAfterCancelSched.available_quantity -eq $stockBeforeSched) "Before: $stockBeforeSched, After: $($prodAfterCancelSched.available_quantity)"
} else {
    Record "12. SKIPPED" $false ""
}

# ============================================================================
# TEST 13: Status history has correct entries
# ============================================================================
Show-Step "TEST 13: Status History Validation"

if ($test5OrderId) {
    $res = Invoke-Api "GET" "/orders/$test5OrderId/status-history" $null
    if ($res.Status -eq 200 -and $res.Body) {
        $history = $res.Body.history
        if ($history) {
            # test5 went: scheduled -> ongoing -> cancelled (3 entries)
            Record "13a. Status history has 3 entries" ($history.Count -eq 3) "Got: $($history.Count)"
            
            $statuses = $history | Sort-Object created_at | ForEach-Object { $_.status }
            $expectedSequence = @("scheduled", "ongoing", "cancelled")
            $sequenceMatch = ($statuses -join ",") -eq ($expectedSequence -join ",")
            Record "13b. History sequence: scheduled->ongoing->cancelled" $sequenceMatch "Got: $($statuses -join ' -> ')"
        } else {
            Record "13. Status history response had no history array" $false "Body: $($res.Raw)"
        }
    } else {
        Record "13. GET status-history failed" $false "Status: $($res.Status)"
    }
} else {
    Record "13. SKIPPED" $false ""
}

# ============================================================================
# TEST 14: Cleanup — Delete all test orders
# ============================================================================
Show-Step "TEST 14: Cleanup"

$cleanupSuccess = $true
foreach ($oid in $script:TestOrderIds) {
    if ($oid) {
        $res = Invoke-Api "DELETE" "/orders/$oid" $null
        if ($res.Status -ne 200) {
            Write-Host "  Failed to delete order $oid (status $($res.Status))" -ForegroundColor Yellow
            $cleanupSuccess = $false
        }
    }
}
Record "14. Cleanup: deleted $($script:TestOrderIds.Count) test orders" $cleanupSuccess ""

# ============================================================================
# RESULTS
# ============================================================================
Write-Host "`n=== RESULTS ===" -ForegroundColor Cyan
Write-Host "Total Tests: $($script:Cases.Count)"
Write-Host "Passed:      $($script:Pass)" -ForegroundColor Green
Write-Host "Failed:      $($script:Fail)" -ForegroundColor Red
Write-Host "=================`n" -ForegroundColor Cyan

if ($script:Fail -gt 0) {
    Write-Host "Failed Cases:" -ForegroundColor Red
    $script:Cases | Where-Object { $_.Status -eq 'FAIL' } | Format-Table -AutoSize
    exit 1
} else {
    Write-Host "ALL TESTS PASSED!" -ForegroundColor Green
    exit 0
}
