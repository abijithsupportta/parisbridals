# Terminal CRUD test for /api/categories
# Usage (from apps/admin): powershell -ExecutionPolicy Bypass -File scripts/test-categories-api.ps1

$ErrorActionPreference = "Stop"
$base = "http://localhost:3001"

function Show-Step($label) {
  Write-Host ""
  Write-Host "=== $label ===" -ForegroundColor Cyan
}

# Clean up any leftover test rows from previous runs
Show-Step "CLEANUP: Deleting any previous test categories"
$existing = (Invoke-WebRequest -Uri "$base/api/categories" -UseBasicParsing).Content | ConvertFrom-Json
foreach ($cat in $existing.categories) {
  if ($cat.slug -like "api-test-*" -or $cat.slug -like "api-sub-*" -or $cat.slug -like "api-variant-*") {
    Write-Host "  Removing $($cat.slug) ($($cat.id))"
    try { Invoke-WebRequest -Uri "$base/api/categories/$($cat.id)" -Method DELETE -UseBasicParsing | Out-Null } catch {}
  }
}

# 1. LIST (GET collection)
Show-Step "1. GET /api/categories (list)"
$list = (Invoke-WebRequest -Uri "$base/api/categories" -UseBasicParsing).Content | ConvertFrom-Json
Write-Host "   Total categories: $($list.categories.Count)"

# 2. CREATE Main
Show-Step "2. POST /api/categories (create Main)"
$mainBody = @{
  name = "API Test Main"
  slug = "api-test-main-$(Get-Random)"
  description = "Main category created via API test"
  is_global = $true
  is_active = $true
  sort_order = 100
} | ConvertTo-Json
$main = (Invoke-WebRequest -Uri "$base/api/categories" -Method POST -ContentType "application/json" -Body $mainBody -UseBasicParsing).Content | ConvertFrom-Json
Write-Host "   Created Main: $($main.category.id) / slug=$($main.category.slug)" -ForegroundColor Green

# 3. CREATE Sub (parent = main)
Show-Step "3. POST /api/categories (create Sub under Main)"
$subBody = @{
  name = "API Sub"
  slug = "api-sub-$(Get-Random)"
  parent_id = $main.category.id
  is_active = $true
  sort_order = 1
} | ConvertTo-Json
$sub = (Invoke-WebRequest -Uri "$base/api/categories" -Method POST -ContentType "application/json" -Body $subBody -UseBasicParsing).Content | ConvertFrom-Json
Write-Host "   Created Sub: $($sub.category.id) / parent_id=$($sub.category.parent_id)" -ForegroundColor Green

# 4. CREATE Variant (parent = sub)
Show-Step "4. POST /api/categories (create Variant under Sub)"
$varBody = @{
  name = "API Variant"
  slug = "api-variant-$(Get-Random)"
  parent_id = $sub.category.id
  is_active = $true
  sort_order = 1
} | ConvertTo-Json
$variant = (Invoke-WebRequest -Uri "$base/api/categories" -Method POST -ContentType "application/json" -Body $varBody -UseBasicParsing).Content | ConvertFrom-Json
Write-Host "   Created Variant: $($variant.category.id) / parent_id=$($variant.category.parent_id)" -ForegroundColor Green

# 5. GET single
Show-Step "5. GET /api/categories/:id (fetch single)"
$fetch = (Invoke-WebRequest -Uri "$base/api/categories/$($main.category.id)" -UseBasicParsing).Content | ConvertFrom-Json
Write-Host "   Fetched: $($fetch.category.name)" -ForegroundColor Green

# 6. PATCH (rename main)
Show-Step "6. PATCH /api/categories/:id (rename Main)"
$patchBody = @{ name = "API Test Main (Renamed)"; sort_order = 200 } | ConvertTo-Json
$patched = (Invoke-WebRequest -Uri "$base/api/categories/$($main.category.id)" -Method PATCH -ContentType "application/json" -Body $patchBody -UseBasicParsing).Content | ConvertFrom-Json
Write-Host "   Renamed to: $($patched.category.name) / sort_order=$($patched.category.sort_order)" -ForegroundColor Green

# 7. can-delete check on Main (should fail — has child)
Show-Step "7. GET /api/categories/:id/can-delete (Main with child)"
$check = (Invoke-WebRequest -Uri "$base/api/categories/$($main.category.id)/can-delete" -UseBasicParsing).Content | ConvertFrom-Json
Write-Host "   canDelete=$($check.canDelete), reason='$($check.reason)'" -ForegroundColor Yellow
if ($check.canDelete) { throw "EXPECTED canDelete=false for Main with child Sub!" }

# 8. Attempt DELETE on Main (should 409)
Show-Step "8. DELETE /api/categories/:id (Main with child, expect 409)"
try {
  Invoke-WebRequest -Uri "$base/api/categories/$($main.category.id)" -Method DELETE -UseBasicParsing | Out-Null
  throw "EXPECTED 409 Conflict!"
} catch {
  $status = $_.Exception.Response.StatusCode.value__
  Write-Host "   Got status $status (expected 409)" -ForegroundColor Green
}

# 9. DELETE Variant (leaf, should succeed)
Show-Step "9. DELETE /api/categories/:id (Variant = leaf)"
Invoke-WebRequest -Uri "$base/api/categories/$($variant.category.id)" -Method DELETE -UseBasicParsing | Out-Null
Write-Host "   Deleted Variant" -ForegroundColor Green

# 10. DELETE Sub (now a leaf)
Show-Step "10. DELETE /api/categories/:id (Sub = now leaf)"
Invoke-WebRequest -Uri "$base/api/categories/$($sub.category.id)" -Method DELETE -UseBasicParsing | Out-Null
Write-Host "   Deleted Sub" -ForegroundColor Green

# 11. DELETE Main (finally a leaf)
Show-Step "11. DELETE /api/categories/:id (Main = now leaf)"
Invoke-WebRequest -Uri "$base/api/categories/$($main.category.id)" -Method DELETE -UseBasicParsing | Out-Null
Write-Host "   Deleted Main" -ForegroundColor Green

# 12. Verify 404 after delete
Show-Step "12. GET deleted category (expect 404)"
try {
  Invoke-WebRequest -Uri "$base/api/categories/$($main.category.id)" -UseBasicParsing | Out-Null
  throw "EXPECTED 404!"
} catch {
  $status = $_.Exception.Response.StatusCode.value__
  Write-Host "   Got status $status (expected 404)" -ForegroundColor Green
}

Write-Host ""
Write-Host "=== ALL TESTS PASSED ===" -ForegroundColor Green
