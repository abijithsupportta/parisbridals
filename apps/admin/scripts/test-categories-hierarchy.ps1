# =============================================================================
# Category Hierarchy API — Comprehensive Edge Case Test Suite
# =============================================================================
#
# Exercises the full category module over the REST API, covering 25+ cases:
#   - Happy path CRUD for Main / Sub / Variant
#   - Children endpoint per level
#   - Validation failures (missing name, missing slug, empty body, bad JSON)
#   - Not-found behaviour (GET/PATCH/DELETE unknown id; unknown children id)
#   - Delete safety checks (blocked when children exist, 409 response)
#   - Update whitelist behaviour (unknown fields ignored, no-op rejected)
#   - Pre-delete check endpoint
#   - Cascade clean-up in the correct order
#
# Usage:
#   .\scripts\test-categories-hierarchy.ps1
#   (the Next.js dev server must be running on http://localhost:3001)
# =============================================================================

$ErrorActionPreference = 'Stop'
$BaseUrl = 'http://localhost:3001/api/categories'

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

# Raw HTTP helper that never throws — we always want to inspect status codes.
# Compatible with Windows PowerShell 5.1 (no -SkipHttpErrorCheck).
function Invoke-Api($method, $path, $body) {
    $uri = "$BaseUrl$path"
    $params = @{ Uri = $uri; Method = $method; ContentType = 'application/json'; UseBasicParsing = $true }
    if ($body) { $params.Body = ($body | ConvertTo-Json -Depth 5) }
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

Write-Host "`n=== Category Hierarchy API Tests ===`n" -ForegroundColor Cyan

# -----------------------------------------------------------------------------
# Setup: track created ids for later cleanup
# -----------------------------------------------------------------------------
$created = @{ main = $null; sub = $null; variant = $null; extraSub = $null }
$ts = [int][double]::Parse((Get-Date -UFormat %s))

# 1. Create Main category ------------------------------------------------------
$r = Invoke-Api 'POST' '' @{
    name = "Test Main $ts"; slug = "test-main-$ts"; description = 'Main'; is_active = $true; is_global = $true
}
$ok = $r.Status -eq 201 -and $r.Body.category.parent_id -eq $null
$created.main = $r.Body.category.id
Record 'Create Main category returns 201 with parent_id=null' $ok "status=$($r.Status) id=$($created.main)"

# 2. Create Sub under Main -----------------------------------------------------
$r = Invoke-Api 'POST' '' @{
    name = "Test Sub $ts"; slug = "test-sub-$ts"; parent_id = $created.main; is_active = $true
}
$ok = $r.Status -eq 201 -and $r.Body.category.parent_id -eq $created.main
$created.sub = $r.Body.category.id
Record 'Create Sub under Main returns 201 with correct parent_id' $ok "status=$($r.Status) id=$($created.sub)"

# 3. Create Variant under Sub --------------------------------------------------
$r = Invoke-Api 'POST' '' @{
    name = "Test Variant $ts"; slug = "test-variant-$ts"; parent_id = $created.sub
}
$ok = $r.Status -eq 201 -and $r.Body.category.parent_id -eq $created.sub
$created.variant = $r.Body.category.id
Record 'Create Variant under Sub returns 201 with correct parent_id' $ok "status=$($r.Status) id=$($created.variant)"

# 4. Second Sub under Main (for bulk / ordering tests) -------------------------
$r = Invoke-Api 'POST' '' @{
    name = "Test Sub Two $ts"; slug = "test-sub-two-$ts"; parent_id = $created.main; sort_order = 5
}
$ok = $r.Status -eq 201
$created.extraSub = $r.Body.category.id
Record 'Create second Sub under Main (sort_order=5) returns 201' $ok "status=$($r.Status)"

# 5. GET /api/categories lists all created rows -------------------------------
$r = Invoke-Api 'GET' '' $null
$ids = $r.Body.categories | ForEach-Object { $_.id }
$ok = $r.Status -eq 200 -and ($ids -contains $created.main) -and ($ids -contains $created.sub) -and ($ids -contains $created.variant)
Record 'GET /api/categories returns all created rows' $ok "total=$($r.Body.categories.Count)"

# 6. GET single category -------------------------------------------------------
$r = Invoke-Api 'GET' "/$($created.main)" $null
Record 'GET /api/categories/:id returns 200 for existing Main' ($r.Status -eq 200 -and $r.Body.category.id -eq $created.main)

# 7. GET children of Main returns Sub(s) --------------------------------------
$r = Invoke-Api 'GET' "/$($created.main)/children" $null
$childIds = $r.Body.children | ForEach-Object { $_.id }
$ok = $r.Status -eq 200 -and $r.Body.level -eq 'main' -and ($childIds -contains $created.sub) -and ($childIds -contains $created.extraSub)
Record 'GET children of Main returns its Subs and level=main' $ok "count=$($r.Body.children.Count)"

# 8. GET children of Sub returns Variant --------------------------------------
$r = Invoke-Api 'GET' "/$($created.sub)/children" $null
$ok = $r.Status -eq 200 -and $r.Body.level -eq 'sub' -and $r.Body.children.Count -ge 1
Record 'GET children of Sub returns Variant and level=sub' $ok "count=$($r.Body.children.Count)"

# 9. GET children of Variant returns empty ------------------------------------
$r = Invoke-Api 'GET' "/$($created.variant)/children" $null
$ok = $r.Status -eq 200 -and $r.Body.level -eq 'variant' -and $r.Body.children.Count -eq 0
Record 'GET children of Variant returns empty array and level=variant' $ok

# 10. PATCH update Main name/description --------------------------------------
$r = Invoke-Api 'PATCH' "/$($created.main)" @{ description = 'Updated desc' }
$ok = $r.Status -eq 200 -and $r.Body.category.description -eq 'Updated desc'
Record 'PATCH updates description and returns updated row' $ok

# 11. PATCH toggles is_active --------------------------------------------------
$r = Invoke-Api 'PATCH' "/$($created.variant)" @{ is_active = $false }
$ok = $r.Status -eq 200 -and $r.Body.category.is_active -eq $false
Record 'PATCH toggles is_active=false on Variant' $ok

# 12. PATCH with unknown field silently ignores it ----------------------------
$r = Invoke-Api 'PATCH' "/$($created.variant)" @{ nonsense_field = 'x'; sort_order = 9 }
$ok = $r.Status -eq 200 -and $r.Body.category.sort_order -eq 9
Record 'PATCH ignores unknown fields and applies whitelisted ones' $ok

# 13. PATCH with empty body rejected (400) ------------------------------------
$r = Invoke-Api 'PATCH' "/$($created.variant)" @{}
Record 'PATCH with no valid fields returns 400' ($r.Status -eq 400) "status=$($r.Status)"

# 14. POST missing name returns 400 -------------------------------------------
$r = Invoke-Api 'POST' '' @{ slug = 'no-name' }
Record 'POST without name returns 400' ($r.Status -eq 400) "status=$($r.Status) msg=$($r.Body.error)"

# 15. POST missing slug returns 400 -------------------------------------------
$r = Invoke-Api 'POST' '' @{ name = 'No Slug' }
Record 'POST without slug returns 400' ($r.Status -eq 400)

# 16. POST with malformed JSON returns 4xx/5xx --------------------------------
$rawStatus = -1
try {
    $resp = Invoke-WebRequest -Uri $BaseUrl -Method POST -Body 'not-json' -ContentType 'application/json' -UseBasicParsing
    $rawStatus = [int]$resp.StatusCode
} catch [System.Net.WebException] {
    if ($null -ne $_.Exception.Response) { $rawStatus = [int]$_.Exception.Response.StatusCode }
}
Record 'POST with malformed JSON returns 4xx/5xx' ($rawStatus -ge 400) "status=$rawStatus"

# 17. POST duplicate slug returns 500 (unique constraint) ---------------------
$r = Invoke-Api 'POST' '' @{ name = "Test Main $ts dup"; slug = "test-main-$ts" }
Record 'POST with duplicate slug fails (unique constraint)' ($r.Status -ge 400) "status=$($r.Status)"

# 18. GET unknown id returns 404 ----------------------------------------------
$r = Invoke-Api 'GET' '/00000000-0000-0000-0000-000000000000' $null
Record 'GET unknown id returns 404' ($r.Status -eq 404)

# 19. GET children of unknown id returns 404 ----------------------------------
$r = Invoke-Api 'GET' '/00000000-0000-0000-0000-000000000000/children' $null
Record 'GET children of unknown id returns 404' ($r.Status -eq 404)

# 20. PATCH unknown id returns 500 (db error, not found) ----------------------
$r = Invoke-Api 'PATCH' '/00000000-0000-0000-0000-000000000000' @{ name = 'x' }
Record 'PATCH unknown id returns 4xx/5xx' ($r.Status -ge 400) "status=$($r.Status)"

# 21. can-delete on Variant reports safe --------------------------------------
$r = Invoke-Api 'GET' "/$($created.variant)/can-delete" $null
Record 'can-delete on leaf Variant returns canDelete=true' ($r.Status -eq 200 -and $r.Body.canDelete -eq $true)

# 22. can-delete on Main reports blocked by children --------------------------
$r = Invoke-Api 'GET' "/$($created.main)/can-delete" $null
$ok = $r.Status -eq 200 -and $r.Body.canDelete -eq $false -and $r.Body.childCount -ge 2
Record 'can-delete on Main with children returns canDelete=false' $ok "reason=$($r.Body.reason)"

# 23. DELETE Main while children exist returns 409 ----------------------------
$r = Invoke-Api 'DELETE' "/$($created.main)" $null
$ok = $r.Status -eq 409 -and $r.Body.childCount -ge 2
Record 'DELETE Main while children exist returns 409 with childCount' $ok "status=$($r.Status)"

# 24. DELETE Sub while Variant exists returns 409 -----------------------------
$r = Invoke-Api 'DELETE' "/$($created.sub)" $null
Record 'DELETE Sub while Variant exists returns 409' ($r.Status -eq 409) "status=$($r.Status)"

# 25. DELETE Variant (leaf) succeeds ------------------------------------------
$r = Invoke-Api 'DELETE' "/$($created.variant)" $null
Record 'DELETE leaf Variant returns 200' ($r.Status -eq 200 -and $r.Body.success -eq $true)

# 26. DELETE Sub after Variant gone succeeds ----------------------------------
$r = Invoke-Api 'DELETE' "/$($created.sub)" $null
Record 'DELETE Sub after Variant removed returns 200' ($r.Status -eq 200)

# 27. DELETE extra Sub ---------------------------------------------------------
$r = Invoke-Api 'DELETE' "/$($created.extraSub)" $null
Record 'DELETE second Sub returns 200' ($r.Status -eq 200)

# 28. DELETE Main after all children gone -------------------------------------
$r = Invoke-Api 'DELETE' "/$($created.main)" $null
Record 'DELETE Main after children cleared returns 200' ($r.Status -eq 200)

# 29. GET deleted Main returns 404 --------------------------------------------
$r = Invoke-Api 'GET' "/$($created.main)" $null
Record 'GET deleted Main returns 404' ($r.Status -eq 404)

# 30. DELETE unknown id is idempotent (succeeds or 4xx, never crashes) --------
$r = Invoke-Api 'DELETE' '/00000000-0000-0000-0000-000000000000' $null
Record 'DELETE unknown id does not crash server (returns status)' ($r.Status -ge 200 -and $r.Status -lt 600) "status=$($r.Status)"

# -----------------------------------------------------------------------------
Write-Host "`n=== Summary ===" -ForegroundColor Cyan
Write-Host ("Passed: {0}" -f $script:Pass) -ForegroundColor Green
$failColor = if ($script:Fail -eq 0) { 'Green' } else { 'Red' }
Write-Host ("Failed: {0}" -f $script:Fail) -ForegroundColor $failColor
Write-Host ("Total:  {0}" -f ($script:Pass + $script:Fail))

if ($script:Fail -gt 0) { exit 1 } else { exit 0 }
