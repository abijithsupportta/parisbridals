# R2 Image/Video Upload Implementation Plan

This plan implements Cloudflare R2 file upload functionality for all admin modules with soft delete, edit forms, and proper validation.

## Scope

**Modules to update:**
- Categories (images only)
- Products (images + videos, max 10 images)
- Banners (images + videos)
- **Skip:** Orders (no image/video needed)

## Phase 1: Database Schema Updates

### 1.1 Add Soft Delete Fields
Create migration to add `deleted_at` columns to:
- `categories` table
- `products` table
- `banners` table

```sql
ALTER TABLE categories ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE products ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE banners ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;

-- Index for soft delete queries
CREATE INDEX idx_categories_deleted_at ON categories(deleted_at);
CREATE INDEX idx_products_deleted_at ON products(deleted_at);
CREATE INDEX idx_banners_deleted_at ON banners(deleted_at);
```

### 1.2 Update Supabase Queries
- Modify all query functions to filter out soft-deleted records (`WHERE deleted_at IS NULL`)
- Update delete functions to use soft delete (set `deleted_at = NOW()`)
- Add category product count check for delete validation

## Phase 2: R2 Integration Setup

### 2.1 Install Dependencies
```bash
pnpm add @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

### 2.2 Create R2 Utility
Create `apps/admin/lib/r2/client.ts`:
- Initialize S3 client with R2 credentials
- Export upload function
- Export delete function
- Export get signed URL function

### 2.3 Environment Variables
Add to `apps/admin/.env.local`:
```env
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key_id
R2_SECRET_ACCESS_KEY=your_secret_access_key
R2_BUCKET_NAME=your_bucket_name
R2_REGION=auto
```

## Phase 3: Reusable Upload Component

### 3.1 Create FileUpload Component
Create `apps/admin/components/ui/file-upload.tsx`:
- Accept file input (single or multiple)
- Support drag & drop
- Show file preview (images)
- Show file list with remove option
- Loading state during upload
- File type validation
- File size validation
- Props: `accept`, `multiple`, `maxFiles`, `onUpload`, `onRemove`

### 3.2 Create ImagePreview Component
Create `apps/admin/components/ui/image-preview.tsx`:
- Display uploaded images
- Show remove button
- Display file name and size
- Support both images and videos

## Phase 4: Update Create Forms

### 4.1 CategoryForm
- Remove `image_url` input field
- Add `FileUpload` component (images only, single file)
- On form submit: upload file to R2, store URL in `image_url`
- Show image preview after upload

### 4.2 ProductForm
- Remove comma-separated `images` input field
- Add `FileUpload` component (images + videos, multiple, max 10)
- On form submit: upload all files to R2, store URLs in `images` array
- Show image/video preview with remove option
- Validate max 10 files

### 4.3 BannerForm
- Remove `web_image_url` and `mobile_image_url` input fields
- Add two `FileUpload` components (web and mobile images)
- Support both images and videos
- On form submit: upload files to R2, store URLs
- Show preview for both images

## Phase 5: Create Edit Forms

### 5.1 Create Edit Pages
Create edit pages for:
- `apps/admin/app/dashboard/categories/[id]/edit/page.tsx`
- `apps/admin/app/dashboard/products/[id]/edit/page.tsx`
- `apps/admin/app/dashboard/banners/[id]/edit/page.tsx`

### 5.2 Create Edit Form Components
Create:
- `CategoryEditForm.tsx` (or make CategoryForm reusable for both create/edit)
- `ProductEditForm.tsx`
- `BannerEditForm.tsx`

**Edit form features:**
- Fetch existing data on load
- Pre-populate form fields
- Show existing images/videos with preview
- Allow removing existing files
- Allow adding new files
- Update function instead of create
- Delete old files from R2 when replaced

### 5.3 Update Navigation
- Add "Edit" button to list pages for each module
- Link to edit pages with dynamic routes

## Phase 6: Delete Functionality

### 6.1 Soft Delete Implementation
Update delete functions in `lib/supabase/queries.ts`:
- `deleteCategory` → soft delete (set `deleted_at`)
- `deleteProduct` → soft delete (set `deleted_at`)
- `deleteBanner` → soft delete (set `deleted_at`)

### 6.2 Delete Confirmation Dialog
Create `apps/admin/components/ui/delete-confirmation.tsx`:
- Show confirmation modal before delete
- Display entity name and type
- Warning message
- Confirm and Cancel buttons

### 6.3 Category Delete Protection
Add validation in `deleteCategory`:
- Check if category has associated products
- If yes, return error with message "Cannot delete category with products"
- Show error message to user

### 6.4 Update Delete Buttons
- Replace direct delete with confirmation dialog
- Show error message if delete fails
- Refresh list after successful delete

## Phase 7: Update List Pages

### 7.1 Add Edit Buttons
- Add Edit button to each row in Categories, Products, Banners pages
- Link to edit pages

### 7.2 Update Delete Buttons
- Replace with confirmation dialog
- Show loading state during delete
- Show error/success messages

### 7.3 Filter Soft-Deleted Records
- Update all list pages to filter out soft-deleted records
- Ensure query functions already filter by `deleted_at IS NULL`

## Phase 8: Testing & Validation

### 8.1 Test Upload Functionality
- Test image upload for categories
- Test multiple image/video upload for products (max 10)
- Test image/video upload for banners
- Verify files are stored in R2
- Verify URLs are saved correctly

### 8.2 Test Edit Functionality
- Test editing existing records
- Test replacing images
- Test removing images
- Test adding new images

### 8.3 Test Delete Functionality
- Test soft delete
- Test category delete protection (with products)
- Test delete confirmation dialog
- Verify soft-deleted records don't appear in lists

## File Structure

```
apps/admin/
├── lib/
│   ├── r2/
│   │   └── client.ts (NEW)
│   └── supabase/
│       └── queries.ts (UPDATE)
├── components/
│   ├── ui/
│   │   ├── file-upload.tsx (NEW)
│   │   ├── image-preview.tsx (NEW)
│   │   └── delete-confirmation.tsx (NEW)
│   └── admin/
│       ├── CategoryForm.tsx (UPDATE - make reusable)
│       ├── ProductForm.tsx (UPDATE - make reusable)
│       └── BannerForm.tsx (UPDATE - make reusable)
└── app/dashboard/
    ├── categories/
    │   ├── [id]/
    │   │   └── edit/
    │   │       └── page.tsx (NEW)
    │   └── page.tsx (UPDATE - add edit buttons)
    ├── products/
    │   ├── [id]/
    │   │   └── edit/
    │   │       └── page.tsx (NEW)
    │   └── page.tsx (UPDATE - add edit buttons)
    └── banners/
        ├── [id]/
        │   └── edit/
        │       └── page.tsx (NEW)
        └── page.tsx (UPDATE - add edit buttons)
```

## Implementation Order

1. Database migration (soft delete fields)
2. Install R2 dependencies
3. Create R2 client utility
4. Create reusable upload components
5. Update CategoryForm with file upload
6. Update ProductForm with file upload
7. Update BannerForm with file upload
8. Create edit pages and forms
9. Implement soft delete functions
10. Create delete confirmation dialog
11. Add category delete protection
12. Update list pages with edit/delete buttons
13. Test all functionality

## Notes

- All uploads happen on form submit (not immediate)
- URL input fields are completely removed
- Image/video preview shown after upload
- Edit forms reuse create form components with mode flag
- Soft delete prevents permanent data loss
- Category deletion checks for associated products
- All delete operations require confirmation
