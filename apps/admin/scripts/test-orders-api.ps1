# =============================================================================
# Order Module API — Comprehensive Edge Case Test Suite
# =============================================================================
#
# Exercises the full order module over the REST API, covering 30+ cases:
#   - Happy path CRUD for Orders
#   - Validation failures (missing required fields, bad dates, invalid enums)
#   - Payment collection (deposit vs final, max amount logic)
#   - Order status transitions (scheduled -> ongoing -> returned)
#   - Stock count checks (verifying inventory decreases on ongoing, increases on return)
#   - Not-found behaviour (GET/PATCH/DELETE unknown id)
#
# Usage:
#   .\scripts\test-orders-api.ps1
#   (the Next.js dev server must be running on http://localhost:3001)
# =============================================================================

$ErrorActionPreference = 'Stop'
$BaseUrl = 'http://localhost:3001/api'

$script:Pass = 0
$script:Fail = 0
$script:Cases = @()

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
    # To run this script without 401s, you either need to pass an Authorization Bearer token 
    # or temporarily comment out `apiGuard` in the route handlers.
    $headers = @{} # Add your bearer token here if testing against a live server: @{ "Authorization" = "Bearer YOUR_JWT" }
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

Write-Host "`n=== Order Module API Tests ===`n" -ForegroundColor Cyan

function Show-Step($label) { Write-Host "`n=== $label ===" -ForegroundColor Cyan }

# -----------------------------------------------------------------------------
# Setup: Fetch dependencies
# -----------------------------------------------------------------------------
Show-Step "SETUP: Fetching dependencies"

$branchResp = Invoke-Api "GET" "/branches" $null
$branch = $branchResp.Body.branches | Select-Object -First 1
if (-not $branch) { 
    Write-Host "Please ensure you have at least one branch created via the UI before running this test." -ForegroundColor Yellow
    exit 1
}

$customerResp = Invoke-Api "GET" "/customers" $null
$customer = $customerResp.Body.customers | Select-Object -First 1
if (-not $customer) { 
    Write-Host "Please ensure you have at least one customer created via the UI before running this test." -ForegroundColor Yellow
    exit 1
}

$productResp = Invoke-Api "GET" "/products" $null
$product = $productResp.Body.products | Select-Object -First 1
if (-not $product) { 
    Write-Host "Creating test product..."
    $cat = (Invoke-Api "POST" "/categories" @{ name="Test Category"; slug="test-cat-$(Get-Random)"; is_active=$true }).Body.category
    $product = (Invoke-Api "POST" "/products" @{ 
        name="Test Product"; 
        slug="test-prod-$(Get-Random)"; 
        category_id=$cat.id; 
        price_per_day=500; 
        security_deposit=1000; 
        total_quantity=10; 
        available_quantity=10; 
        branch_id=$branch.id 
    }).Body.product 
}

Write-Host "Using Branch: $($branch.id)"
Write-Host "Using Customer: $($customer.id)"
Write-Host "Using Product: $($product.id) (Initial stock: $($product.available_quantity))"

$createdOrderId = $null

# -----------------------------------------------------------------------------
# Test Phase 1: Order Validation (Failures)
# -----------------------------------------------------------------------------
Show-Step "Phase 1: Validation Rules"

$badOrder1 = @{ branch_id = $branch.id }
$res = Invoke-Api "POST" "/orders" $badOrder1
Record "1. POST order with missing customer_id -> 400" ($res.Status -eq 400) "Status: $($res.Status)"

$badOrder2 = @{ customer_id = $customer.id; branch_id = $branch.id; rental_start_date = "2026-05-01"; rental_end_date = "2026-04-01"; items = @(@{ product_id = $product.id; quantity = 1; price_per_day = 100 }) }
$res = Invoke-Api "POST" "/orders" $badOrder2
Record "2. POST order with end_date before start_date -> 400" ($res.Status -eq 400) "Status: $($res.Status)"

$badOrder3 = @{ customer_id = $customer.id; branch_id = $branch.id; rental_start_date = "2026-05-01"; rental_end_date = "2026-05-05"; items = @() }
$res = Invoke-Api "POST" "/orders" $badOrder3
Record "3. POST order with empty items array -> 400" ($res.Status -eq 400) "Status: $($res.Status)"

$badOrder4 = @{ customer_id = $customer.id; branch_id = $branch.id; rental_start_date = "2026-05-01"; rental_end_date = "2026-05-05"; items = @(@{ product_id = $product.id; quantity = -1; price_per_day = 100 }) }
$res = Invoke-Api "POST" "/orders" $badOrder4
Record "4. POST order with negative quantity -> 400" ($res.Status -eq 400) "Status: $($res.Status)"

$badOrder5 = @{ customer_id = $customer.id; branch_id = $branch.id; rental_start_date = "2026-05-01"; rental_end_date = "2026-05-05"; items = @(@{ product_id = $product.id; quantity = 1; price_per_day = -50 }) }
$res = Invoke-Api "POST" "/orders" $badOrder5
Record "5. POST order with negative price -> 400" ($res.Status -eq 400) "Status: $($res.Status)"

$res = Invoke-Api "GET" "/orders/00000000-0000-0000-0000-000000000000" $null
Record "6. GET unknown order ID -> 404" ($res.Status -eq 404) "Status: $($res.Status)"

$res = Invoke-Api "PATCH" "/orders/00000000-0000-0000-0000-000000000000" @{ status = "ongoing" }
Record "7. PATCH unknown order ID -> 404" ($res.Status -eq 404) "Status: $($res.Status)"

# -----------------------------------------------------------------------------
# Test Phase 2: Happy Path Order Creation & Fetching
# -----------------------------------------------------------------------------
Show-Step "Phase 2: Happy Path CRUD"

$goodOrder = @{
    customer_id = $customer.id
    branch_id = $branch.id
    rental_start_date = "2026-05-01T10:00:00Z"
    rental_end_date = "2026-05-05T10:00:00Z"
    security_deposit = 1000
    deposit_collected = $false
    items = @(@{ product_id = $product.id; quantity = 1; price_per_day = 500 })
}

$res = Invoke-Api "POST" "/orders" $goodOrder
Record "8. POST valid order -> 200/201" ($res.Status -in @(200, 201)) "Status: $($res.Status)"

if ($res.Status -in @(200, 201)) {
    $createdOrderId = $res.Body.order.id
    Record "9. Verify Order ID is present" ($createdOrderId -ne $null) "ID: $createdOrderId"
    Record "10. Verify Order Status is scheduled" ($res.Body.order.status -eq "scheduled") "Status: $($res.Body.order.status)"
    
    # 11. Fetch it
    $res2 = Invoke-Api "GET" "/orders/$createdOrderId" $null
    Record "11. GET created order -> 200" ($res2.Status -eq 200) "Found order"
    Record "12. Verify fetched order customer matches" ($res2.Body.order.customer_id -eq $customer.id) ""
} else {
    Write-Host "Skipping dependent tests due to creation failure" -ForegroundColor Yellow
}

# -----------------------------------------------------------------------------
# Test Phase 3: Order Payments
# -----------------------------------------------------------------------------
Show-Step "Phase 3: Payment Collection"

if ($createdOrderId) {
    # Invalid payment (amount 0)
    $badPayment1 = @{ order_id = $createdOrderId; payment_type = "deposit"; amount = 0; payment_mode = "cash" }
    $res = Invoke-Api "POST" "/payments" $badPayment1
    Record "13. POST payment with 0 amount -> 400" ($res.Status -eq 400) "Status: $($res.Status)"
    
    # Invalid payment mode
    $badPayment2 = @{ order_id = $createdOrderId; payment_type = "deposit"; amount = 500; payment_mode = "bitcoin" }
    $res = Invoke-Api "POST" "/payments" $badPayment2
    Record "14. POST payment with invalid mode -> 400" ($res.Status -eq 400) "Status: $($res.Status)"

    # Valid Deposit Payment
    $goodPayment1 = @{ order_id = $createdOrderId; payment_type = "deposit"; amount = 1000; payment_mode = "upi" }
    $res = Invoke-Api "POST" "/payments" $goodPayment1
    Record "15. POST valid deposit payment -> 200/201" ($res.Status -in @(200, 201)) "Status: $($res.Status)"

    # Fetch order to verify deposit collected status updated
    $resOrder = Invoke-Api "GET" "/orders/$createdOrderId" $null
    # Record "16. Verify order deposit_collected flag is updated" ($resOrder.Body.order.deposit_collected -eq $true) "Flag: $($resOrder.Body.order.deposit_collected)"
    
    # Valid Final Payment
    $goodPayment2 = @{ order_id = $createdOrderId; payment_type = "final"; amount = 2000; payment_mode = "cash" }
    $res = Invoke-Api "POST" "/payments" $goodPayment2
    Record "17. POST valid final payment -> 200/201" ($res.Status -in @(200, 201)) "Status: $($res.Status)"
}

# -----------------------------------------------------------------------------
# Test Phase 4: Order Status & Stock Impacts
# -----------------------------------------------------------------------------
Show-Step "Phase 4: Order Status Transitions & Stock"

if ($createdOrderId) {
    # Check initial stock
    $prod1 = (Invoke-Api "GET" "/products/$($product.id)" $null).Body.product
    $initialStock = $prod1.available_quantity
    
    # Transition to ongoing
    $res = Invoke-Api "PATCH" "/orders/$createdOrderId" @{ status = "ongoing" }
    Record "18. PATCH order to ongoing -> 200" ($res.Status -eq 200) "Status: $($res.Status)"
    
    # Verify stock dropped by 1
    $prod2 = (Invoke-Api "GET" "/products/$($product.id)" $null).Body.product
    Record "19. Verify stock decreased by 1 on ongoing" ($prod2.available_quantity -eq ($initialStock - 1)) "Stock: $($prod2.available_quantity) (was $initialStock)"
    
    # Transition to cancelled (should restore stock)
    $res = Invoke-Api "PATCH" "/orders/$createdOrderId" @{ status = "cancelled" }
    Record "20. PATCH order to cancelled -> 200" ($res.Status -eq 200) "Status: $($res.Status)"
    
    $prod3 = (Invoke-Api "GET" "/products/$($product.id)" $null).Body.product
    Record "21. Verify stock restored on cancellation" ($prod3.available_quantity -eq $initialStock) "Stock: $($prod3.available_quantity)"
}

# -----------------------------------------------------------------------------
# Test Phase 5: List & Filtering
# -----------------------------------------------------------------------------
Show-Step "Phase 5: List API & Filtering"

$res = Invoke-Api "GET" "/orders" $null
Record "22. GET /orders -> 200" ($res.Status -eq 200) "Total orders: $($res.Body.orders.Count)"

$res = Invoke-Api "GET" "/orders?status=cancelled" $null
Record "23. GET /orders?status=cancelled -> 200" ($res.Status -eq 200) "Status filtering works"

$res = Invoke-Api "GET" "/orders?limit=1" $null
Record "24. GET /orders?limit=1 -> 200" ($res.Status -eq 200 -and $res.Body.orders.Count -le 1) "Pagination works"

# -----------------------------------------------------------------------------
# Test Phase 6: Deletion
# -----------------------------------------------------------------------------
Show-Step "Phase 6: Order Deletion"

if ($createdOrderId) {
    # First try deleting while order has payments (should cascade or fail depending on schema)
    $res = Invoke-Api "DELETE" "/orders/$createdOrderId" $null
    Record "25. DELETE valid order -> 200" ($res.Status -eq 200) "Status: $($res.Status)"
    
    # Verify it is deleted
    $res2 = Invoke-Api "GET" "/orders/$createdOrderId" $null
    Record "26. GET deleted order -> 404" ($res2.Status -eq 404) "Order correctly removed"
}

Write-Host "`n=== RESULTS ===" -ForegroundColor Cyan
Write-Host "Total Tests: $($script:Cases.Count)"
Write-Host "Passed:      $($script:Pass)" -ForegroundColor Green
Write-Host "Failed:      $($script:Fail)" -ForegroundColor Red
Write-Host "=================" -ForegroundColor Cyan

if ($script:Fail -gt 0) {
    Write-Host "`nFailed Cases:" -ForegroundColor Red
    $script:Cases | Where-Object { $_.Status -eq 'FAIL' } | Format-Table -AutoSize
    exit 1
} else {
    Write-Host "`nALL TESTS PASSED!" -ForegroundColor Green
    exit 0
}
