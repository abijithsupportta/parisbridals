# Update all pages to use AddButton/AddLinkButton component

# Products page - add import and router
$productsFile = "apps/admin/app/dashboard/products/page.tsx"
$content = Get-Content $productsFile -Raw

# Add AddButton import after Modal import
$content = $content -replace 'import Modal from "@/components/admin/Modal";', 'import Modal from "@/components/admin/Modal";
import AddButton from "@/components/admin/AddButton";'

# Add useRouter import
$content = $content -replace 'import \{ useState \} from "react";', 'import { useState } from "react";
import { useRouter } from "next/navigation";'

# Replace Link button with AddButton
$content = $content -replace '<Link href="/dashboard/products/create">\s*<Button variant="gradient">\s*<Plus className="w-4 h-4 mr-2" />\s*Add Product\s*</Button>\s*</Link>', 'const router = useRouter();
        <AddButton label="Add Product" onClick={() => router.push("/dashboard/products/create")} />'

Set-Content $productsFile -Value $content -NoNewline

# Orders page
$ordersFile = "apps/admin/app/dashboard/orders/page.tsx"
$content = Get-Content $ordersFile -Raw

$content = $content -replace 'import \{ useState \} from "react";', 'import { useState } from "react";
import { useRouter } from "next/navigation";'

$content = $content -replace 'import Link from "next/link";', 'import AddButton from "@/components/admin/AddButton";'

$content = $content -replace '<Link href="/dashboard/orders/create">\s*<Button className="shadow-lg shadow-primary/25">\s*<Plus className="w-4 h-4 mr-2" />\s*Add Order\s*</Button>\s*</Link>', 'const router = useRouter();
        <AddButton label="Add Order" onClick={() => router.push("/dashboard/orders/create")} />'

Set-Content $ordersFile -Value $content -NoNewline

# Stores page
$storesFile = "apps/admin/app/dashboard/stores/page.tsx"
$content = Get-Content $storesFile -Raw

$content = $content -replace 'import Link from "next/link";', 'import AddLinkButton from "@/components/admin/AddLinkButton";'

$content = $content -replace '<Link href="/dashboard/stores/create">\s*<Button className="shadow-lg shadow-primary/25">\s*<Plus className="w-4 h-4 mr-2" />\s*Add Store\s*</Button>\s*</Link>', '<AddLinkButton label="Add Store" href="/dashboard/stores/create" />'

Set-Content $storesFile -Value $content -NoNewline

Write-Host "✅ Updated all pages to use AddButton component" -ForegroundColor Green
