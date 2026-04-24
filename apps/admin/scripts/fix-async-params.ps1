# Fix all API routes to use async params for Next.js 16

$files = @(
    "apps/admin/app/api/banners/[id]/route.ts",
    "apps/admin/app/api/branches/[id]/route.ts",
    "apps/admin/app/api/categories/[id]/route.ts",
    "apps/admin/app/api/categories/[id]/can-delete/route.ts",
    "apps/admin/app/api/categories/[id]/children/route.ts",
    "apps/admin/app/api/customers/[id]/route.ts",
    "apps/admin/app/api/orders/[id]/route.ts",
    "apps/admin/app/api/orders/[id]/deposit/route.ts",
    "apps/admin/app/api/orders/[id]/return/route.ts",
    "apps/admin/app/api/payments/[id]/route.ts",
    "apps/admin/app/api/products/[id]/route.ts",
    "apps/admin/app/api/products/[id]/can-delete/route.ts",
    "apps/admin/app/api/staff/[id]/route.ts"
)

foreach ($file in $files) {
    if (Test-Path $file) {
        $content = Get-Content $file -Raw
        
        # Replace sync params with async params
        $content = $content -replace '\{ params \}: \{ params: \{ id: string \} \}', '{ params }: { params: Promise<{ id: string }> }'
        
        # Add await params.id at the start of each function
        $content = $content -replace '(export async function \w+\([^)]+\) \{[^\n]*\n)', '$1  const { id } = await params;' + "`n"
        
        # Replace params.id with id
        $content = $content -replace 'params\.id', 'id'
        
        Set-Content $file -Value $content -NoNewline
        Write-Host "Fixed $file" -ForegroundColor Green
    }
}

Write-Host "All API routes fixed for Next.js 16 async params" -ForegroundColor Green
