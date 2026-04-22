# Paris Bridals Standalone Project Plan

This plan outlines the creation of a standalone monorepo for Paris Bridals jewellery rental business with admin dashboard and customer storefront, using clean architecture, shadcn/ui components, Supabase database, and Cloudflare R2 storage.

## Project Overview

**Location**: `D:\personal\parisbridals\`
**Type**: Standalone monorepo (separate from rentacostumes_v2)
**Business Model**: Single-shop jewellery rental (not multi-tenant SaaS)
**Tech Stack**: Next.js 16, TypeScript, Supabase, Cloudflare R2, shadcn/ui

**Quality Standards**: The complete project will adhere to industry standards, best practices, and security practices including:
- **Security**: OWASP guidelines, input validation, SQL injection prevention, XSS protection, CSRF protection, secure headers
- **Code Quality**: TypeScript strict mode, ESLint, Prettier, clean code principles, SOLID principles
- **Performance**: Code splitting, lazy loading, image optimization, caching strategies (TOP PRIORITY)
- **Accessibility**: WCAG 2.1 AA compliance, semantic HTML, ARIA labels, keyboard navigation
- **Testing**: Unit tests, integration tests, E2E tests for critical flows
- **Documentation**: README, API documentation, code comments where necessary

## Architecture Decisions

### Monorepo Structure
```
parisbridals/
├── apps/
│   ├── admin/              # Admin dashboard (Port: 3001)
│   └── storefront/         # Customer storefront (Port: 3002)
├── packages/
│   ├── shared-ui/          # Reusable shadcn/ui components
│   ├── shared-types/       # TypeScript types & interfaces
│   ├── shared-utils/       # Utility functions
│   └── shared-api/         # Reusable API layer (recommended approach)
├── database/
│   └── migrations/         # All Supabase migrations (root level)
├── storage/
│   └── r2-config/          # Cloudflare R2 configuration
├── turbo.json
├── package.json
└── README.md
```

### Reusable API Architecture Decision
**Recommended Approach**: Use `packages/shared-api` package for reusable API functions
- **Rationale**: Since this is a standalone project with only 2 apps (admin + storefront), a shared API package provides better type safety, easier maintenance, and avoids code duplication
- **Alternative Considered**: API routes in each app - rejected due to redundancy
- **Structure**:
  - `packages/shared-api/src/lib/supabase/` - Supabase client configuration
  - `packages/shared-api/src/lib/queries/` - Database queries (products, categories, etc.)
  - `packages/shared-api/src/lib/mutations/` - Database mutations
  - `packages/shared-api/src/lib/validations/` - Zod schemas
  - `packages/shared-api/src/lib/storage/` - R2 storage functions

## Jewellery Rental Product Fields

### Complete Product Schema for Jewellery Rental

```sql
products (
  -- Basic Identification
  id uuid primary key,
  sku text unique,                    -- Stock Keeping Unit
  barcode text unique,                -- Barcode/QR for tracking
  name text not null,                 -- Product name
  slug text unique not null,          -- URL-friendly slug
  description text,                   -- Detailed description

  -- Categorization
  category_id uuid references categories(id),
  branch_id uuid references branches(id),
  tags text[],                       -- Flexible tagging (e.g., "bridal", "vintage")

  -- Pricing (Rental)
  price_per_day numeric(10,2) not null,
  min_rental_days integer default 1,  -- Minimum rental period
  max_rental_days integer default 30, -- Maximum rental period
  security_deposit numeric(10,2) default 0,

  -- Material Details (Essential for customer info)
  material text,                     -- gold, silver, platinum, brass
  metal_purity text,                 -- 24K, 22K, 18K, 14K, 925
  metal_color text,                  -- yellow, white, rose gold

  -- Weight & Dimensions (Essential for pricing & deposits)
  weight_grams numeric(8,3),          -- Precise weight in grams
  size text,                         -- Ring size, bangle size, etc.

  -- Gemstone Details (Simplified)
  has_gemstones boolean default false,
  gemstone_type text,                -- diamond, ruby, emerald, pearl
  gemstone_description text,         -- Brief description (e.g., "2 diamonds, 1.5 carat total")

  -- Design & Style
  style text,                        -- traditional, modern, minimalist
  occasion text[],                   -- wedding, party, festival, daily wear

  -- Inventory Management
  total_quantity integer not null,
  available_quantity integer not null,
  reserved_quantity integer default 0, -- Temporarily reserved
  maintenance_quantity integer default 0, -- Under repair/cleaning

  -- Condition & Maintenance
  condition text,                     -- new, excellent, good, fair, needs repair
  last_sanitized_date date,
  sanitization_status text,          -- sanitized, pending, in-progress
  last_inspection_date date,
  inspection_notes text,
  damage_history jsonb,               -- Array of damage records

  -- Rental Tracking
  total_rentals_count integer default 0,
  last_rental_date date,
  last_return_date date,
  average_rental_duration numeric(5,1),

  -- Images & Media
  images text[],                      -- Array of image URLs (R2)
  thumbnail_url text,
  video_url text,                     -- Optional video showcase

  -- SEO & Display
  meta_title text,
  meta_description text,
  is_featured boolean default false,
  is_trending boolean default false,
  sort_order integer default 0,

  -- Status
  is_active boolean default true,
  is_available_for_rental boolean default true,
  status text,                        -- available, rented, maintenance, retired

  -- Timestamps
  created_at timestamptz default now(),
  updated_at timestamptz default now()
)
```

### Field Categories Explained

#### 1. **Basic Identification**
- `sku`: Unique stock keeping unit for inventory management
- `barcode`: For physical tracking and fraud prevention
- `name` & `slug`: Display name and SEO-friendly URL
- `description`: Detailed product information

#### 2. **Categorization**
- `category_id`: Link to hierarchical categories
- `branch_id`: Multi-branch inventory tracking
- `tags`: Flexible tagging for advanced filtering

#### 3. **Pricing (Rental-Specific)**
- `price_per_day`: Daily rental rate
- `min_rental_days`: Minimum rental period (e.g., 3 days for bridal)
- `max_rental_days`: Maximum rental period
- `security_deposit`: Refundable deposit for high-value items

#### 4. **Material Details (Essential for Customer Info)**
- `material`: Type of metal (gold, silver, platinum, brass)
- `metal_purity`: 24K, 22K, 18K, 14K, 925 (sterling silver)
- `metal_color`: Yellow, white, rose gold

#### 5. **Weight & Dimensions (Essential for Pricing & Deposits)**
- `weight_grams`: Precise weight (affects security deposit calculation)
- `size`: Ring size, bangle size (important for fit)

#### 6. **Gemstone Details (Simplified)**
- `has_gemstones`: Boolean flag for filtering
- `gemstone_type`: Diamond, ruby, emerald, pearl
- `gemstone_description`: Brief description (e.g., "2 diamonds, 1.5 carat total")

#### 7. **Design & Style**
- `style`: Traditional, modern, minimalist
- `occasion`: Wedding, party, festival, daily wear (for filtering)

#### 8. **Inventory Management**
- `total_quantity`: Total physical stock
- `available_quantity`: Currently available for rent
- `reserved_quantity`: Temporarily reserved (pending bookings)
- `maintenance_quantity`: Under repair/cleaning

#### 9. **Condition & Maintenance**
- `condition`: New, excellent, good, fair, needs repair
- `last_sanitized_date`: Last cleaning/sanitization
- `sanitization_status`: Sanitized, pending, in-progress
- `last_inspection_date`: Last quality check
- `damage_history`: JSON array of damage records

#### 10. **Rental Tracking**
- `total_rentals_count`: How many times rented
- `last_rental_date`: Most recent rental
- `last_return_date`: Most recent return
- `average_rental_duration`: Average rental length

#### 11. **Images & Media**
- `images`: Array of image URLs (stored in R2)
- `thumbnail_url`: Main thumbnail
- `video_url`: Optional video showcase

#### 12. **SEO & Display**
- `meta_title`: SEO title
- `meta_description`: SEO description
- `is_featured`: Featured on homepage
- `is_trending`: Trending items
- `sort_order`: Display order

#### 13. **Status**
- `is_active`: Active/inactive
- `is_available_for_rental`: Can be rented
- `status`: Available, rented, maintenance, retired

## Order Management System (Admin-Side WhatsApp-Based)

### Order Workflow
Since there's no online payment gateway, orders are created manually by admin:

1. **Customer Enquiry** → Customer enquires via phone, WhatsApp, or in-store
2. **Availability Check** → Admin checks product availability for requested dates
3. **Order Creation** → Admin creates order in system
4. **Inventory Allocation** → Products reserved for the rental period
5. **Delivery/Pickup** → Items handed over to customer
6. **Return Processing** → Items returned, inspected for damage
7. **Order Completion** → Order marked complete, inventory released

### Order Schema

```sql
-- Orders (rental orders created by admin)
orders (
  -- Basic Information
  id uuid primary key,
  order_number text unique not null,    -- Auto-generated (e.g., PB-2024-001)
  customer_id uuid references customers(id),
  branch_id uuid references branches(id),

  -- Rental Period
  start_date date not null,
  end_date date not null,
  rental_days integer not null,          -- Calculated from dates

  -- Status & Tracking
  status text not null,                  -- enquiry, confirmed, reserved, delivered, returned, completed, cancelled
  source text,                          -- phone, whatsapp, in-store, website

  -- Pricing
  total_amount numeric(10,2) not null,   -- Sum of (price_per_day * days) for all items
  security_deposit numeric(10,2) default 0,
  deposit_collected boolean default false,
  deposit_refunded boolean default false,
  deposit_refund_amount numeric(10,2),   -- Partial refund if damage

  -- Delivery/Pickup
  delivery_type text not null,           -- pickup, delivery
  delivery_address text,
  delivery_date date,
  delivery_notes text,
  pickup_date date,
  pickup_notes text,

  -- Return Processing
  return_date date,
  return_condition text,                 -- excellent, good, fair, damaged
  damage_description text,
  damage_charges numeric(10,2) default 0,
  damage_photos text[],                 -- R2 URLs

  -- Admin Notes
  admin_notes text,
  internal_notes text,

  -- Timestamps
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  confirmed_at timestamptz,
  delivered_at timestamptz,
  returned_at timestamptz,
  completed_at timestamptz
)

-- Order Items (products in each order)
order_items (
  id uuid primary key,
  order_id uuid references orders(id),
  product_id uuid references products(id),
  product_name text not null,          -- Denormalized for history
  product_sku text,
  quantity integer not null default 1,
  price_per_day numeric(10,2) not null,
  total_price numeric(10,2) not null,  -- price_per_day * quantity * rental_days

  -- Return Tracking
  returned_quantity integer default 0,
  return_condition text,                -- excellent, good, fair, damaged
  damage_description text,
  damage_charges numeric(10,2) default 0,

  -- Timestamps
  created_at timestamptz default now(),
  updated_at timestamptz default now()
)

-- Order Status History (audit trail)
order_status_history (
  id uuid primary key,
  order_id uuid references orders(id),
  status text not null,
  notes text,
  changed_by text,                     -- Admin who changed status
  changed_at timestamptz default now()
)
```

### Order Status Flow

```
enquiry → confirmed → reserved → delivered → returned → completed
                     ↓
                   cancelled
```

**Status Descriptions:**
- **enquiry**: Initial WhatsApp enquiry, order not yet confirmed
- **confirmed**: Admin confirmed availability, customer committed
- **reserved**: Products reserved, awaiting pickup/delivery
- **delivered**: Items handed over to customer
- **returned**: Items returned, pending inspection
- **completed**: Inspection done, order closed
- **cancelled**: Order cancelled (before delivery)

### Order Management Features

#### 1. Order Creation (Admin)
- Select customer from database or create new customer
- Select products with availability check
- Set rental dates (auto-calculate days)
- Auto-calculate total amount
- Set security deposit
- Add delivery/pickup details
- Link WhatsApp conversation

#### 2. Order Dashboard
- View all orders with filters (status, date, customer)
- Quick actions (confirm, deliver, return, complete)
- Today's orders overview
- Upcoming deliveries/pickups
- Overdue returns alerts

#### 3. Order Details View
- Complete order information
- Customer details with WhatsApp link
- Product list with images
- Rental period calendar
- Status timeline with history
- Delivery/pickup information
- Return processing form
- Damage assessment

#### 4. Inventory Integration
- Automatic stock reservation on order confirmation
- Stock release on order completion/cancellation
- Low stock alerts
- Branch-wise inventory tracking

#### 5. Return Processing
- Return inspection form
- Condition rating (excellent/good/fair/damaged)
- Damage description
- Damage charges calculation
- Deposit refund processing
- Before/after photo upload (R2)

#### 6. Reports
- Order history by date range
- Revenue by period
- Popular products
- Customer rental frequency
- Damage statistics
- Deposit collection/refund reports

## Availability Management System

### Availability Logic
Products must be available for rental based on existing orders:
- **Rule**: If a product is rented April 25-26, it becomes available again on April 27
- **Overlap Check**: New rental dates must not overlap with confirmed/reserved/delivered orders
- **Buffer Period**: Optional buffer day for cleaning (configurable)

### Availability Query Function
```sql
-- Function to check product availability for date range
CREATE OR REPLACE FUNCTION check_product_availability(
  p_product_id uuid,
  p_start_date date,
  p_end_date date
) RETURNS boolean AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 FROM order_items oi
    JOIN orders o ON oi.order_id = o.id
    WHERE oi.product_id = p_product_id
    AND o.status IN ('confirmed', 'reserved', 'delivered')
    AND (
      (o.start_date <= p_end_date AND o.end_date >= p_start_date)
    )
  );
END;
$$ LANGUAGE plpgsql;
```

### Availability API Endpoint
```typescript
// GET /api/products/[id]/availability?start=2024-04-25&end=2024-04-30
// Returns array of available/unavailable dates
interface AvailabilityResponse {
  productId: string;
  availableDates: Date[];
  unavailableDates: Date[];
  unavailableRanges: Array<{
    startDate: Date;
    endDate: Date;
    reason: string; // "Rented", "Maintenance", etc.
  }>;
}
```

## Storefront Availability Calendar (UX-Focused)

### Product Details Page Calendar Component

**Location**: Storefront product details page, rental date selection section

**Features:**
1. **Visual Calendar Display**
   - Month view with date grid
   - Available dates: Green/white
   - Unavailable dates: Gray with strikethrough
   - Selected dates: Highlighted in accent color
   - Today's date: Marked with indicator

2. **Date Selection**
   - Click to select start date
   - Click again to select end date
   - Visual range indicator between selected dates
   - Prevent selection of unavailable dates
   - Prevent selection of past dates
   - Enforce min/max rental days from product settings

3. **Availability Indicators**
   - Hover tooltip showing: "Available" or "Unavailable: Rented until [date]"
   - Color legend for date states
   - "Next available" button to jump to next available date

4. **UX Enhancements**
   - Smooth transitions between months
   - Keyboard navigation support
   - Mobile-optimized touch targets
   - Loading state while fetching availability
   - Error handling with retry option

5. **Price Calculation**
   - Real-time price update as dates are selected
   - Show: "₹X × Y days = ₹Z total"
   - Display security deposit if applicable

### Component Structure
```typescript
// components/storefront/RentalDateCalendar.tsx
interface RentalDateCalendarProps {
  productId: string;
  minRentalDays: number;
  maxRentalDays: number;
  pricePerDay: number;
  onDatesChange: (startDate: Date, endDate: Date) => void;
}

interface CalendarDay {
  date: Date;
  isAvailable: boolean;
  isUnavailable: boolean;
  isSelected: boolean;
  isInRange: boolean;
  isToday: boolean;
  isPast: boolean;
  unavailabilityReason?: string;
}
```

### User Flow
1. **Initial Load**: Calendar shows current month, fetches availability
2. **User Interaction**: User clicks available date → becomes start date
3. **Range Selection**: User clicks another date → becomes end date, range highlighted
4. **Validation**: System prevents invalid selections (unavailable dates, past dates, min/max days)
5. **Price Update**: Real-time price calculation displayed
6. **Confirmation**: User clicks "Check Availability" → validates and shows WhatsApp button

### Error States & UX
- **Unavailable Selection**: Shake animation + toast message "This date is unavailable"
- **Invalid Range**: Red outline + message "Minimum 3 days required for bridal items"
- **Past Date**: Grayed out + cannot select
- **Network Error**: Retry button + "Unable to load availability"

## Database Schema (Simplified for Single Shop)

### Core Tables
```sql
-- Branches (multi-location support)
branches (
  id uuid primary key,
  name text not null,
  address text,
  phone text,
  is_main boolean default false,
  is_active boolean default true
)

-- Categories
categories (
  id uuid primary key,
  name text not null,
  slug text unique not null,
  description text,
  image_url text,
  parent_id uuid references categories(id),
  sort_order integer default 0,
  is_active boolean default true
)

-- Products (jewellery-specific) - See detailed schema above

-- Customers (lead management)
customers (
  id uuid primary key,
  name text not null,
  phone text not null,
  email text,
  address text,
  gst_number text,
  source text, -- whatsapp, website, referral
  notes text
)

-- Banners
banners (
  id uuid primary key,
  title text not null,
  subtitle text,
  image_url text,
  cta_text text,
  cta_link text,
  position text, -- hero, editorial, split
  is_active boolean default true,
  sort_order integer default 0
)

-- Settings (store configuration)
settings (
  id uuid primary key,
  key text unique not null,
  value text,
  description text
)

-- Staff (admin users)
staff (
  id uuid primary key,
  email text unique not null,
  name text not null,
  phone text,
  role text, -- admin, branch_admin, staff
  branch_id uuid references branches(id),
  is_active boolean default true
)
```

### Jewellery-Specific Features
1. **Material & Purity Tracking**: Track metal type (gold/silver/platinum) and purity (24k/18k/14k)
2. **Weight Management**: Precise weight tracking in grams
3. **Gemstone Details**: Array of gemstone types
4. **Making Charges**: Separate from base price
5. **Barcode System**: For inventory tracking and fraud prevention
6. **Security Deposits**: High-value items require deposits
7. **Sanitization Tracking**: Track cleaning status between rentals
8. **Insurance Status**: Track insurance coverage per item

## Admin Dashboard Modules

### 1. Dashboard
- Real-time metrics (total products, active rentals, revenue, low stock alerts)
- Branch-wise performance comparison
- Today's bookings overview
- WhatsApp enquiry tracking
- Quick actions (add product, add customer)

### 2. Product Management
- Product CRUD with images
- Category management (hierarchical)
- Bulk operations (activate/deactivate, feature)
- Stock management across branches
- Barcode generation/scanning
- Low stock alerts
- Material & purity tracking
- Weight & making charges
- Gemstone details
- Image optimization for R2

### 3. Category Management
- Hierarchical categories
- Sort order management
- Image uploads
- Active/inactive status

### 4. Inventory Management
- Real-time stock tracking
- Branch transfer management
- Stock adjustment logs
- Low stock notifications
- Barcode scanning
- Sanitization status
- Insurance tracking

### 5. Branch Management
- Branch CRUD
- Set main branch
- Branch-wise inventory view
- Transfer items between branches
- Branch performance reports

### 6. Banner Management
- Hero banners
- Editorial banners
- Split promo banners
- Sort order management
- Active/inactive status

### 7. Customer Management
- Lead tracking from WhatsApp
- Customer database
- Enquiry history
- Contact details
- Source tracking

### 8. Reports & Analytics
- Sales reports (daily/weekly/monthly)
- Popular products
- Branch performance
- Category performance
- Rental duration analysis
- Customer acquisition
- WhatsApp conversion tracking

### 9. Settings
- Store information
- WhatsApp number configuration
- R2 storage configuration
- Security deposit rules
- Branch settings
- Staff permissions

### 10. Staff Management
- Staff CRUD
- Role-based permissions
- Branch assignment
- Activity logs

## Storefront Features

### Design System

### Claymorphism Evaluation & Recommendation

**What is Claymorphism?**
- 3D, clay-like appearance with soft, rounded shapes
- Inner and outer shadows with pastel colors
- Tactile, playful aesthetic
- Similar to neumorphism but with more color and softness

**My Honest Opinion: NOT Recommended for Entire Project**

**Reasons Against Full Claymorphism:**

1. **Brand Mismatch**
   - Bridal jewellery conveys elegance, luxury, sophistication
   - Claymorphism has a playful, toy-like quality
   - May undermine premium bridal aesthetics

2. **Performance Impact**
   - Multiple box-shadows and filters affect mobile performance
   - Mobile is primary target (mobile-first design)
   - Could slow down rendering on lower-end devices

3. **Admin Dashboard Usability**
   - Admin interfaces need to be clean, functional, data-focused
   - Claymorphism would be distracting and reduce readability
   - Hard to maintain consistency across data-heavy components

4. **Maintenance Complexity**
   - Hard to maintain consistent claymorphism across all components
   - Risk of visual inconsistencies
   - More CSS complexity = more bugs

5. **Accessibility Concerns**
   - Complex shadows can reduce readability
   - May not work well with screen readers
   - Color contrast issues with pastel palettes

6. **Trend Risk**
   - Claymorphism is a trend that may fade quickly
   - Would require redesign in 1-2 years
   - Not a timeless design choice

**Recommended Design Approach:**

**Storefront (Customer Site):**
- Modern, clean design with subtle depth effects
- Soft shadows (not full claymorphism)
- Rounded corners (8-16px)
- Elegant color palette (gold, rose gold, soft neutrals)
- Use claymorphism sparingly for:
  - Product cards
  - Call-to-action buttons
  - Hero sections
- Keep overall layout clean and functional

**Admin Dashboard:**
- Clean, minimal design (like rentacostumes_v2 admin)
- Flat design with subtle shadows
- Data-focused, high contrast
- No claymorphism
- Prioritize usability and speed

**Why This Approach?**
- Timeless, won't look outdated quickly
- Better performance on mobile
- Aligns with bridal jewellery luxury aesthetic
- Easier to maintain
- Better accessibility
- Admin remains functional and efficient

**Confirmed Design Approach:**
- Storefront: Modern, clean design with subtle depth effects, soft shadows, rounded corners (8-16px), elegant color palette (gold, rose gold, soft neutrals)
- Admin: Clean, minimal design with flat design and subtle shadows, data-focused, high contrast
- No full claymorphism implementation

### Design Principle: Mobile-First
The customer storefront is designed **mobile-first** to optimize for the majority of users who browse on smartphones. All UI components, layouts, and interactions are designed for mobile screens first, then enhanced for desktop.

**Mobile-First Considerations:**
- Touch-optimized UI (44px minimum touch targets)
- Single-column layouts that stack naturally
- Bottom navigation bar for easy thumb access
- Swipe gestures for product galleries
- Large, readable fonts (minimum 16px body text)
- Simplified forms with auto-fill support
- Optimized images for mobile bandwidth
- Progressive enhancement for desktop (hover states, multi-column layouts)

## Loading States & UX Patterns

### Skeleton Loading
**Purpose**: Provide visual feedback while content is loading, reducing perceived wait time

**Implementation**:
- Use shadcn/ui skeleton components or custom skeleton loaders
- Match skeleton layout to actual content structure
- Add shimmer animation for visual interest
- Use for: product cards, product details, order lists, dashboard metrics

**Skeleton Components**:
```typescript
// Product Card Skeleton
<ProductCardSkeleton />
// Product Details Skeleton
<ProductDetailsSkeleton />
// Order List Skeleton
<OrderListSkeleton />
// Dashboard Metrics Skeleton
<DashboardSkeleton />
```

### Loading States Pattern

**1. Skeleton Loading** (Initial load)
- Use when fetching data for the first time
- Shows structure of upcoming content
- Smooth transition to actual content

**2. Spinner/Loading Indicator** (Async operations)
- Use for button actions (submit, save, delete)
- Use for page transitions
- Small, unobtrusive spinners
- Use shadcn/ui `Spinner` or `Loader` component

**3. Progress Bar** (Multi-step processes)
- Use for file uploads (R2 image upload)
- Use for multi-step forms
- Show percentage completion
- Allow cancellation if possible

**4. Optimistic UI** (Immediate feedback)
- Update UI immediately after user action
- Revert if action fails
- Use for: like/unlike, add to cart, toggle switches
- Improves perceived performance

**5. Shimmer Effect** (Alternative to skeleton)
- Animated gradient background
- More subtle than skeleton
- Use for: hero sections, large images
- Can be combined with skeleton

### Empty States
**Purpose**: Inform users when no data exists and guide them to next action

**Empty State Components**:
```typescript
// No Products Found
<EmptyState
  icon={Package}
  title="No products found"
  description="Get started by adding your first product"
  action="Add Product"
/>

// No Orders
<EmptyState
  icon={ShoppingBag}
  title="No orders yet"
  description="Orders will appear here once created"
  action="Create Order"
/>

// Search Results
<EmptyState
  icon={Search}
  title="No results found"
  description="Try adjusting your search or filters"
  action="Clear Filters"
/>
```

### Error States
**Purpose**: Inform users when something goes wrong and provide recovery options

**Error State Patterns**:
```typescript
// Network Error
<ErrorState
  title="Connection Error"
  description="Unable to load data. Please check your connection."
  action="Retry"
  onRetry={retryFunction}
/>

// Server Error
<ErrorState
  title="Something went wrong"
  description="We're experiencing technical difficulties."
  action="Try Again"
  onRetry={retryFunction}
/>

// Not Found
<ErrorState
  title="Not Found"
  description="The requested resource could not be found."
  action="Go Home"
/>
```

### Loading UX Best Practices

**1. Progressive Loading**
- Load critical content first (above the fold)
- Lazy load images below the fold
- Use `loading="lazy"` for images
- Implement intersection observer for infinite scroll

**2. Placeholder Images**
- Use low-quality image placeholders (LQIP)
- Blur-up technique for images
- Show thumbnail while full image loads
- Use for product images, banners

**3. Skeleton Screens**
- Full-page skeleton for initial load
- Component-level skeleton for partial updates
- Match actual content layout
- Smooth fade-in transition

**4. Loading Boundaries**
- Wrap sections in loading boundaries
- Show skeleton for that section only
- Don't block entire page
- Allow interaction with loaded sections

**5. Cancelable Operations**
- Allow users to cancel long-running operations
- Show progress for file uploads
- Provide cancel button on modals
- Abort pending requests on navigation

### shadcn/ui Components to Use

**From shadcn/ui**:
- `Skeleton` - For skeleton loading
- `Spinner` / `Loader` - For loading indicators
- `Progress` - For progress bars
- `Button` - With loading state
- `AlertDialog` - For error confirmations
- `Toast` - For success/error notifications
- `Badge` - For status indicators

**Custom Components to Create**:
- `EmptyState` - Reusable empty state component
- `ErrorState` - Reusable error state component
- `LoadingOverlay` - Full-page loading overlay
- `ImageLoader` - Image with loading states
- `InfiniteScrollLoader` - For infinite scroll

### Loading State Implementation Examples

**Product Card with Skeleton**:
```typescript
{isLoading ? (
  <ProductCardSkeleton />
) : product ? (
  <ProductCard product={product} />
) : (
  <EmptyState title="Product not found" />
)}
```

**Button with Loading State**:
```typescript
<Button disabled={isLoading} onClick={handleSubmit}>
  {isLoading ? <Spinner className="mr-2" /> : null}
  {isLoading ? 'Saving...' : 'Save'}
</Button>
```

**Image with Loading States**:
```typescript
<ImageLoader
  src={product.image}
  alt={product.name}
  skeleton={<ImageSkeleton />}
  fallback={<ImageFallback />}
/>
```

**Form with Optimistic UI**:
```typescript
const updateProduct = async (data) => {
  // Optimistic update
  setProducts(prev => prev.map(p => 
    p.id === data.id ? { ...p, ...data } : p
  ));
  
  try {
    await updateProductMutation(data);
  } catch (error) {
    // Revert on error
    setProducts(originalProducts);
    toast.error('Failed to update product');
  }
};
```

## Performance Enhancement Plan (TOP PRIORITY)

### Performance Goals
- **First Contentful Paint (FCP)**: < 1.5s
- **Largest Contentful Paint (LCP)**: < 2.5s
- **Time to Interactive (TTI)**: < 3.5s
- **Cumulative Layout Shift (CLS)**: < 0.1
- **First Input Delay (FID)**: < 100ms
- **Time to First Byte (TTFB)**: < 600ms
- **Bundle Size**: < 200KB per route (gzipped)

### 1. Code Splitting & Lazy Loading

**Route-Based Code Splitting**:
- Next.js automatic code splitting by default
- Each route loads only its required JavaScript
- Use dynamic imports for heavy components
- Implement route prefetching for improved navigation

**Component-Level Lazy Loading**:
```typescript
// Lazy load heavy components
const ProductGallery = dynamic(() => import('./ProductGallery'), {
  loading: () => <ProductGallerySkeleton />,
  ssr: false // Client-side only for heavy components
});

const Calendar = dynamic(() => import('./RentalDateCalendar'), {
  loading: () => <CalendarSkeleton />,
});
```

**Library Lazy Loading**:
```typescript
// Load heavy libraries only when needed
const Chart = dynamic(() => import('recharts').then(mod => mod.BarChart), {
  ssr: false,
});

const PDFGenerator = dynamic(() => import('./PDFGenerator'), {
  ssr: false,
});
```

### 2. Image Optimization

**Next.js Image Component**:
- Use `next/image` for all images
- Automatic WebP/AVIF conversion
- Responsive images with srcset
- Lazy loading by default
- Blur-up placeholders
- Priority loading for above-the-fold images

```typescript
<Image
  src={product.image}
  alt={product.name}
  width={800}
  height={600}
  placeholder="blur"
  blurDataURL={product.blurDataURL} // LQIP
  loading="lazy"
  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
/>
```

**R2 Image Optimization**:
- Compress images before upload (max 500KB per image)
- Use WebP format for uploads
- Generate multiple sizes during upload (thumbnail, medium, large)
- Implement CDN caching headers
- Use image CDN (Cloudflare Images or similar)

**Image Compression Strategy**:
- Product images: 80% quality, max 800x600px
- Thumbnails: 70% quality, max 300x300px
- Banners: 85% quality, max 1920x600px
- Use sharp or imagemin for compression

### 3. Database Optimization

**Supabase Query Optimization**:
- Use indexes on frequently queried columns
- Implement query result caching
- Use Supabase Realtime only when needed
- Optimize RLS policies for performance
- Use connection pooling

**Index Strategy**:
```sql
-- Products
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_branch ON products(branch_id);
CREATE INDEX idx_products_status ON products(is_active, is_available_for_rental);
CREATE INDEX idx_products_slug ON products(slug);
CREATE INDEX idx_products_search ON products USING gin(to_tsvector('english', name || ' ' || description));

-- Orders
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_dates ON orders(start_date, end_date);
CREATE INDEX idx_orders_customer ON orders(customer_id);
CREATE INDEX idx_orders_branch ON orders(branch_id);
```

**Query Optimization**:
- Select only required columns (not `SELECT *`)
- Use pagination for large datasets
- Implement cursor-based pagination for infinite scroll
- Cache frequently accessed data
- Use materialized views for complex aggregations

### 4. Caching Strategy

**Browser Caching**:
- Set appropriate Cache-Control headers
- Cache static assets (CSS, JS, images) for 1 year
- Cache HTML pages for 1 hour with revalidation
- Use service workers for offline support

**CDN Caching**:
- Use Cloudflare CDN for all static assets
- Cache API responses where appropriate
- Implement cache invalidation strategy
- Use cache tags for selective invalidation

**Application Caching**:
- React Query for data caching
- Cache API responses in memory
- Implement stale-while-revalidate
- Cache product availability for 5 minutes
- Cache category data for 1 hour

```typescript
// React Query configuration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: false,
    },
  },
});
```

### 5. Bundle Optimization

**Tree Shaking**:
- Remove unused code automatically
- Use ES modules for better tree shaking
- Avoid importing entire libraries
- Use specific imports

```typescript
// Good
import { Button } from '@/components/ui/button';

// Bad
import * as UI from '@/components/ui';
```

**Bundle Analysis**:
- Use @next/bundle-analyzer
- Identify large dependencies
- Replace heavy libraries with lighter alternatives
- Split large components

**Minification**:
- Enable Terser for JS minification
- Enable CSS minification
- Remove console.log in production
- Remove dead code

### 6. Font Optimization

**Font Loading Strategy**:
- Use `next/font` for automatic font optimization
- Subset fonts to include only used characters
- Use font-display: swap for faster rendering
- Preload critical fonts
- Use system fonts where possible

```typescript
import { Cormorant_Garamond, DM_Sans } from 'next/font/google';

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-cormorant',
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-dm-sans',
});
```

### 7. CSS Optimization

**CSS-in-JS Optimization**:
- Use Tailwind CSS for utility classes
- Enable CSS purging in production
- Minimize CSS bundle size
- Avoid inline styles where possible

**Critical CSS**:
- Extract critical CSS for above-the-fold content
- Inline critical CSS in head
- Lazy load non-critical CSS
- Use CSS containment for isolation

### 8. JavaScript Optimization

**Reduce JavaScript Execution**:
- Minimize main thread work
- Use Web Workers for heavy computations
- Offload image processing to workers
- Use requestIdleCallback for non-critical tasks

**Event Optimization**:
- Use passive event listeners
- Debounce/throttle scroll and resize events
- Use Intersection Observer for lazy loading
- Implement virtual scrolling for long lists

```typescript
// Debounced search
const debouncedSearch = debounce((query: string) => {
  searchProducts(query);
}, 300);

// Throttled scroll
const throttledScroll = throttle(() => {
  handleScroll();
}, 100);
```

### 9. API Optimization

**API Response Optimization**:
- Use compression (gzip/brotli)
- Minimize response payload size
- Implement pagination
- Use GraphQL for precise data fetching (optional)
- Cache API responses

**Request Batching**:
- Batch multiple requests into single API call
- Use DataLoader pattern for N+1 problem
- Implement request debouncing
- Cancel pending requests on navigation

### 10. Mobile Performance

**Mobile-Specific Optimizations**:
- Optimize touch events
- Reduce JavaScript bundle for mobile
- Use mobile-specific image sizes
- Implement mobile-specific caching
- Test on real devices

**Network Optimization**:
- Use HTTP/2 or HTTP/3
- Enable Brotli compression
- Preconnect to external domains
- Preload critical resources
- Use DNS prefetch

```html
<link rel="preconnect" href="https://cdn.cloudflare.com" />
<link rel="dns-prefetch" href="https://api.supabase.co" />
<link rel="preload" href="/fonts/cormorant.woff2" as="font" type="font/woff2" crossorigin />
```

### 11. Performance Monitoring

**Core Web Vitals Monitoring**:
- Track LCP, FID, CLS in production
- Use Web Vitals library
- Set up alerts for performance degradation
- Monitor bundle size over time
- Track API response times

**Performance Budgets**:
- Set budget limits for bundle size
- Set budget limits for image sizes
- Set budget limits for API response times
- Fail builds that exceed budgets
- Regular performance audits

### 12. Performance Testing

**Lighthouse CI**:
- Run Lighthouse in CI/CD pipeline
- Set minimum score thresholds (90+)
- Block deployments on performance regressions
- Track performance over time

**Load Testing**:
- Test with realistic user loads
- Identify bottlenecks
- Optimize database queries under load
- Test CDN performance
- Test API rate limiting

### Performance Implementation Checklist

**Phase 1: Foundation**
- [ ] Set up Next.js Image component
- [ ] Configure font optimization
- [ ] Enable code splitting
- [ ] Set up performance monitoring

**Phase 2: Optimization**
- [ ] Implement image compression
- [ ] Add database indexes
- [ ] Set up caching strategy
- [ ] Optimize bundle size

**Phase 3: Advanced**
- [ ] Implement lazy loading
- [ ] Add service worker
- [ ] Optimize API responses
- [ ] Set up CDN

**Phase 4: Monitoring**
- [ ] Set up Lighthouse CI
- [ ] Configure performance budgets
- [ ] Set up alerts
- [ ] Regular audits

## SEO Strategy (Storefront)

### SEO Goals
- Improve search engine visibility for bridal jewellery rental
- Drive organic traffic to storefront
- Improve local SEO for Chennai/Tamil Nadu region

### SEO Implementation

**1. Meta Tags & Structured Data**
```typescript
// Dynamic meta tags for product pages
export async function generateMetadata({ params }): Promise<Metadata> {
  const product = await getProduct(params.id);
  
  return {
    title: `${product.name} | Paris Bridals - Jewellery Rental`,
    description: product.description,
    openGraph: {
      title: product.name,
      description: product.description,
      images: [product.images[0]],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: product.name,
      description: product.description,
      images: [product.images[0]],
    },
  };
}
```

**2. Structured Data (JSON-LD)**
```typescript
// Product schema
const productSchema = {
  '@context': 'https://schema.org/',
  '@type': 'Product',
  name: product.name,
  description: product.description,
  image: product.images,
  offers: {
    '@type': 'Offer',
    price: product.price_per_day,
    priceCurrency: 'INR',
    availability: 'https://schema.org/InStock',
  },
};

// Local business schema
const localBusinessSchema = {
  '@context': 'https://schema.org',
  '@type': 'LocalBusiness',
  name: 'Paris Bridals',
  address: {
    streetAddress: '123 Main Street',
    addressLocality: 'Chennai',
    addressRegion: 'Tamil Nadu',
    postalCode: '600001',
    addressCountry: 'IN',
  },
  telephone: '+91-9876543210',
};
```

**3. Sitemap Generation**
- Dynamic sitemap for all products and categories
- Sitemap for static pages
- Submit to Google Search Console
- Auto-update on content changes

**4. Robots.txt**
- Allow search engine crawlers
- Block admin routes
- Optimize crawl budget

**5. Canonical URLs**
- Prevent duplicate content issues
- Handle pagination with canonical tags
- Handle filter parameters with canonical tags

**6. Image SEO**
- Descriptive alt text for all images
- Image file names with keywords
- Image sitemap
- Lazy loading for below-the-fold images

**7. Local SEO**
- Google Business Profile integration
- Local keywords in content
- Location-based pages (if multiple branches)
- Customer reviews integration

## Analytics Strategy

### Analytics Tools
- **Google Analytics 4** - User behavior tracking
- **Google Search Console** - SEO monitoring
- **Custom Analytics** - Business-specific metrics

### Implementation

**1. Google Analytics 4**
```typescript
// Track page views
useEffect(() => {
  gtag('event', 'page_view', {
    page_title: document.title,
    page_location: window.location.href,
  });
}, []);

// Track custom events
const trackProductView = (productId: string) => {
  gtag('event', 'view_item', {
    item_id: productId,
  });
};

const trackWhatsAppClick = (productId: string) => {
  gtag('event', 'whatsapp_enquiry', {
    item_id: productId,
  });
};
```

**2. Custom Business Metrics**
- Product views
- WhatsApp enquiry clicks
- Calendar availability checks
- Popular products
- Peak rental periods
- Customer demographics

**3. Admin Dashboard Analytics**
- Total orders by period
- Revenue by period
- Popular products
- Customer rental frequency
- Damage statistics
- Conversion rates

## GST & Invoice System

### GST Configuration
- **GST Rate**: 18% (standard for services in India)
- **GSTIN**: Store GST number
- **Invoice Numbering**: Auto-generated sequential numbers
- **Invoice Format**: GST-compliant invoice format

### GST Schema Updates
```sql
-- Add GST fields to orders
ALTER TABLE orders ADD COLUMN gst_rate numeric(5,2) DEFAULT 18.00;
ALTER TABLE orders ADD COLUMN gst_amount numeric(10,2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN subtotal numeric(10,2);
ALTER TABLE orders ADD COLUMN grand_total numeric(10,2);
ALTER TABLE orders ADD COLUMN invoice_number text UNIQUE;
ALTER TABLE orders ADD COLUMN invoice_generated_at timestamptz;
ALTER TABLE orders ADD COLUMN gstin text; -- Customer GSTIN if applicable
```

### Invoice Generation
```typescript
// Invoice data structure
interface Invoice {
  invoiceNumber: string;
  invoiceDate: Date;
  customer: {
    name: string;
    address: string;
    gstin?: string;
  };
  items: Array<{
    name: string;
    quantity: number;
    rate: number;
    amount: number;
  }>;
  subtotal: number;
  gstAmount: number;
  grandTotal: number;
  gstin: string; // Store GSTIN
  signature?: string;
}

// PDF Invoice Generation
const generateInvoicePDF = async (orderId: string) => {
  const order = await getOrderWithInvoiceDetails(orderId);
  const pdf = await createPDFInvoice(order);
  await uploadInvoiceToR2(pdf, order.invoice_number);
  return pdf;
};
```

### Invoice Features
- Auto-generate invoice on order completion
- GST calculation (18% on rental amount)
- Itemized breakdown
- Store GSTIN display
- Customer GSTIN (if provided)
- Signature placeholder
- Download as PDF
- Email invoice to customer (optional)
- Invoice history tracking

## Audit Logging System

### Audit Schema
```sql
-- Audit logs table
audit_logs (
  id uuid primary key,
  user_id uuid references profiles(id),
  action text not null,              -- create, update, delete
  entity_type text not null,         -- product, order, category, etc.
  entity_id uuid,
  old_values jsonb,
  new_values jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz default now()
)
```

### Audit Actions to Log
- Product CRUD operations
- Order status changes
- Price changes
- Stock adjustments
- Staff actions
- Settings changes
- Login attempts
- Failed operations

### Audit Log Features
- Automatic logging for all critical actions
- Before/after value tracking
- IP address and user agent
- User attribution
- Audit log viewer for admin
- Export audit logs
- Retention policy (90 days)

## Environment Variables Documentation

### Required Environment Variables

**Supabase**
```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**Cloudflare R2**
```
R2_ACCOUNT_ID=your-account-id
R2_ACCESS_KEY_ID=your-access-key
R2_SECRET_ACCESS_KEY=your-secret-key
R2_BUCKET_NAME=parisbridals
R2_PUBLIC_URL=https://your-cdn-url.com
```

**Store Configuration**
```
NEXT_PUBLIC_STORE_NAME=Paris Bridals
NEXT_PUBLIC_STORE_GSTIN=29ABCDE1234F1Z5
NEXT_PUBLIC_WHATSAPP_NUMBER=919876543210
NEXT_PUBLIC_CURRENCY=INR
NEXT_PUBLIC_DEFAULT_LANGUAGE=en
```

**Analytics**
```
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

**Error Tracking**
```
NEXT_PUBLIC_SENTRY_DSN=your-sentry-dsn
SENTRY_AUTH_TOKEN=your-auth-token
```

**Email (Optional)**
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
EMAIL_FROM=noreply@parisbridals.com
```

### Environment Setup Guide
- `.env.local` for local development
- `.env.production` for production
- Never commit `.env` files
- Use `.env.example` as template

## Local Development Setup

### Prerequisites
- Node.js 18+ 
- pnpm 8+ (or npm/yarn)
- Git
- Supabase CLI (optional)
- VS Code (recommended)

### Setup Steps
```bash
# 1. Clone repository
git clone <repo-url>
cd parisbridals

# 2. Install dependencies
pnpm install

# 3. Set up environment variables
cp .env.example .env.local
# Edit .env.local with your values

# 4. Run database migrations
pnpm db:migrate

# 5. Seed initial data
pnpm db:seed

# 6. Start development servers
pnpm dev
```

### Development Commands
```bash
# Start all apps
pnpm dev

# Start admin only
pnpm dev:admin

# Start storefront only
pnpm dev:storefront

# Run database migrations
pnpm db:migrate

# Generate types
pnpm db:generate

# Run tests
pnpm test

# Build for production
pnpm build

# Lint code
pnpm lint

# Format code
pnpm format
```

## Deployment Pipeline

### CI/CD Configuration (GitHub Actions)

**Workflow Triggers**
- Push to main branch
- Pull requests
- Manual deployment

**Pipeline Stages**
1. **Lint & Test** - Run ESLint, Prettier, unit tests
2. **Build** - Build admin and storefront
3. **Database Migrations** - Run migrations on staging/production
4. **Deploy** - Deploy to Vercel/Netlify
5. **Smoke Tests** - Run post-deployment tests

### GitHub Actions Example
```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Install dependencies
        run: pnpm install
        
      - name: Run tests
        run: pnpm test
        
      - name: Build
        run: pnpm build
        
      - name: Deploy Admin
        run: vercel deploy --prod --token=${{ secrets.VERCEL_TOKEN }}
        
      - name: Deploy Storefront
        run: vercel deploy --prod --token=${{ secrets.VERCEL_TOKEN }}
```

## Rollback Strategy

### Rollback Triggers
- Deployment failure
- Critical bugs detected
- Performance degradation
- Security issues

### Rollback Methods

**1. Vercel Rollback**
```bash
# List deployments
vercel list

# Rollback to previous deployment
vercel rollback <deployment-url>
```

**2. Database Rollback**
```sql
-- Rollback last migration
-- Use version control for migrations
-- Keep migration files with down() method
```

**3. Feature Flags**
- Implement feature flags for new features
- Disable features without rollback
- Use environment variables for flags

**4. Blue-Green Deployment**
- Maintain two production environments
- Switch traffic between environments
- Easy rollback by switching back

## API Rate Limiting

### Rate Limiting Strategy
- **Public APIs**: 100 requests per minute per IP
- **Authenticated APIs**: 1000 requests per minute per user
- **Admin APIs**: 5000 requests per minute per admin

### Implementation
```typescript
// Using Redis or in-memory store
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(100, '1 m'),
});

export async function rateLimit(ip: string) {
  const { success } = await ratelimit.limit(ip);
  if (!success) {
    throw new Error('Rate limit exceeded');
  }
}
```

### Rate Limiting Endpoints
- Product listing API
- Availability check API
- Search API
- Contact form API

## Content Security Policy (CSP)

### CSP Configuration
```typescript
// next.config.js
const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: `
      default-src 'self';
      script-src 'self' 'unsafe-eval' 'unsafe-inline' https://cdn.jsdelivr.net;
      style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net;
      img-src 'self' data: https://*.r2.dev https://*.cloudflare.com;
      font-src 'self' https://fonts.gstatic.com https://fonts.googleapis.com;
      connect-src 'self' https://*.supabase.co;
      frame-src 'self';
      media-src 'self';
      object-src 'none';
      base-uri 'self';
      form-action 'self';
      frame-ancestors 'none';
      upgrade-insecure-requests;
    `.replace(/\s{2,}/g, ' ').trim(),
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'Referrer-Policy',
    value: 'origin-when-cross-origin',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()',
  },
];
```

### Additional Security Headers
- Strict-Transport-Security (HSTS)
- X-XSS-Protection
- Expect-CT

## Currency Handling

### Currency Configuration
- **Primary Currency**: INR (Indian Rupee)
- **Symbol**: ₹
- **Formatting**: Indian number format (lakhs, crores)

### Currency Utilities
```typescript
// Currency formatting
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
};

// Examples
formatCurrency(1000); // ₹1,000
formatCurrency(100000); // ₹1,00,000
formatCurrency(10000000); // ₹1,00,00,000
```

## Updated Prioritized Task Execution Order

### Phase 1: Foundation & Setup (Week 1)
**Priority: CRITICAL - Must complete first**

1. **Initialize Monorepo**
   - Create directory structure at `D:\personal\parisbridals\`
   - Initialize Turborepo configuration
   - Set up package.json with workspaces
   - Configure TypeScript strict mode
   - Set up ESLint, Prettier, Husky

2. **Configure Supabase**
   - Create Supabase project
   - Set up environment variables
   - Configure database connection
   - Set up RLS policies template

3. **Configure Cloudflare R2**
   - Create R2 bucket
   - Set up access keys
   - Configure CORS
   - Test upload/download functionality

4. **Set up Security Headers**
   - Configure Next.js security headers
   - Set up CSP (Content Security Policy)
   - Configure CORS policies
   - Set up rate limiting strategy

### Phase 2: Database & Migrations (Week 1-2)
**Priority: CRITICAL - Foundation for all features**

5. **Create Database Migrations**
   - Create `database/migrations/` folder
   - Write core table migrations (branches, categories, products, customers, staff)
   - Write order management migrations (orders, order_items, order_status_history)
   - Write settings and banners migrations
   - Write GST and audit logs migrations
   - Add indexes for performance
   - Write RLS policies
   - Seed initial data (branches, categories, settings)

6. **Create Availability Function**
   - Implement `check_product_availability()` SQL function
   - Test with sample data
   - Add to migrations

### Phase 3: Shared Packages (Week 2)
**Priority: HIGH - Required by both apps**

7. **Create Shared Types Package**
   - Set up `packages/shared-types`
   - Define TypeScript interfaces for all entities
   - Define enums (status, role, etc.)
   - Export types for use across apps

8. **Create Shared API Package**
   - Set up `packages/shared-api`
   - Configure Supabase client
   - Create query functions (getProducts, getCategories, etc.)
   - Create mutation functions (createProduct, updateProduct, etc.)
   - Create validation schemas (Zod)
   - Create R2 storage functions
   - Create availability check function
   - Implement audit logging functions
   - Implement GST calculation functions

9. **Create Shared Utils Package**
   - Set up `packages/shared-utils`
   - Add utility functions (date formatting, currency formatting, etc.)
   - Add validation helpers
   - Add error handling utilities
   - Add currency formatting (INR)

10. **Create Shared UI Package**
    - Set up `packages/shared-ui`
    - Install and configure shadcn/ui
    - Add common UI components (Button, Input, Card, etc.)
    - Create design tokens (colors, spacing, typography)
    - Add loading components (Skeleton, Spinner, EmptyState, ErrorState)

### Phase 4: Admin Dashboard - Core (Week 3)
**Priority: HIGH - Admin needed before orders can be created**

11. **Admin App Setup**
    - Initialize Next.js app at `apps/admin`
    - Configure TailwindCSS with design tokens
    - Set up authentication (email/password)
    - Create admin layout with sidebar
    - Set up routing structure

12. **Admin Authentication**
    - Implement login page
    - Implement session management
    - Implement protected routes
    - Implement logout functionality
    - Add password reset (optional)
    - Implement audit logging for auth events

13. **Admin Dashboard Home**
    - Create dashboard overview
    - Display key metrics (total products, active rentals, revenue)
    - Add quick actions
    - Create charts/graphs for analytics

14. **Branch Management Module**
    - CRUD operations for branches
    - Set main branch functionality
    - Branch listing with status
    - Branch edit/delete
    - Audit logging for branch changes

15. **Staff Management Module**
    - CRUD operations for staff
    - Role assignment
    - Branch assignment
    - Activity logs
    - Audit logging for staff changes

### Phase 5: Admin Dashboard - Inventory (Week 4)
**Priority: HIGH - Products needed before orders**

16. **Category Management Module**
    - CRUD operations for categories
    - Hierarchical category support
    - Sort order management
    - Image upload to R2
    - Active/inactive status
    - Audit logging for category changes

17. **Product Management Module**
    - Product CRUD with all fields
    - Image upload to R2 (multiple images)
    - Category assignment
    - Branch assignment
    - Stock management
    - Barcode generation
    - Bulk operations (activate/deactivate, feature)
    - Search and filters
    - Audit logging for product changes

18. **Inventory Management Module**
    - Real-time stock tracking
    - Stock adjustment interface
    - Low stock alerts
    - Branch transfer functionality
    - Maintenance tracking
    - Audit logging for inventory changes

19. **Banner Management Module**
    - CRUD operations for banners
    - Banner types (hero, editorial, split)
    - Image upload to R2
    - Sort order management
    - Active/inactive status
    - Audit logging for banner changes

20. **Customer Management Module**
    - Customer CRUD
    - Customer search
    - Customer history view
    - Source tracking
    - GSTIN field for customers
    - Audit logging for customer changes

### Phase 6: Admin Dashboard - Orders (Week 5)
**Priority: HIGH - Core business logic**

21. **Order Management Module**
    - Order creation interface
    - Product availability check
    - Customer selection/create
    - Date selection with validation
    - Auto-price calculation
    - GST calculation (18%)
    - Security deposit handling
    - Delivery/pickup configuration
    - Invoice generation on completion

22. **Order Dashboard**
    - Order listing with filters
    - Status-based views
    - Quick actions (confirm, deliver, return, complete)
    - Today's orders overview
    - Upcoming deliveries/pickups
    - Overdue returns alerts

23. **Order Details View**
    - Complete order information
    - Product list with images
    - Customer details
    - Status timeline
    - Delivery/pickup information
    - Admin notes
    - Invoice download

24. **Return Processing**
    - Return inspection form
    - Condition rating
    - Damage description
    - Damage charges calculation
    - Deposit refund processing
    - Before/after photo upload
    - Audit logging for returns

25. **Inventory Integration**
    - Automatic stock reservation on order confirmation
    - Stock release on order completion/cancellation
    - Conflict prevention
    - Real-time availability updates

26. **Invoice System**
    - Auto-generate invoice on order completion
    - GST calculation (18%)
    - PDF generation
    - Invoice download
    - Invoice history

### Phase 7: Admin Dashboard - Advanced (Week 6)
**Priority: MEDIUM - Enhances functionality**

27. **Settings Module**
    - Store information settings
    - GSTIN configuration
    - Branch settings
    - Staff permissions
    - Security deposit rules
    - Rental duration rules

28. **Reports Module**
    - Order history reports
    - Revenue reports (with GST breakdown)
    - Popular products report
    - Customer rental frequency
    - Damage statistics
    - Deposit collection/refund reports
    - GST reports

29. **Audit Log Viewer**
    - View all audit logs
    - Filter by user, action, entity
    - Export audit logs
    - Audit log retention management

30. **Admin Performance Optimization**
    - Code splitting
    - Lazy loading
    - Image optimization
    - Caching strategies

### Phase 8: Storefront - Foundation (Week 7)
**Priority: HIGH - Customer-facing**

31. **Storefront App Setup**
    - Initialize Next.js app at `apps/storefront`
    - Copy existing parisbridals design
    - Configure TailwindCSS with design tokens
    - Set up mobile-first layout
    - Configure responsive breakpoints

32. **Storefront Layout**
    - Header with navigation
    - Mobile bottom navigation
    - Footer
    - Loading states
    - Error boundaries

33. **Storefront Core Pages**
    - Home page with hero, categories, featured products
    - Category listing page
    - Product listing page with filters
    - Search page
    - SEO optimization for all pages

34. **Product Display Components**
    - Product card component
    - Product grid/list views
    - Image gallery with swipe
    - Mobile-optimized touch targets

### Phase 9: Storefront - Product Details (Week 8)
**Priority: HIGH - Critical for customer experience**

35. **Product Details Page**
    - Full product information display
    - Image gallery with swipe
    - Material, weight, gemstone details
    - Size information
    - Related products
    - SEO meta tags
    - Structured data (JSON-LD)

36. **Availability Calendar Component**
    - Calendar view with date selection
    - Visual availability indicators
    - Unavailable date marking
    - Date range selection
    - Validation (min/max days, unavailable dates)
    - Real-time price calculation (with GST)
    - Mobile-optimized touch targets
    - Loading states
    - Error handling

37. **Availability API Integration**
    - Connect to availability check function
    - Fetch unavailable dates
    - Display in calendar
    - Handle edge cases
    - API rate limiting

38. **WhatsApp Integration**
    - Prefilled message generation
    - Product enquiry message
    - Cart booking message
    - Contact form message
    - WhatsApp button on product page
    - Analytics tracking for WhatsApp clicks

### Phase 10: Storefront - Advanced (Week 9)
**Priority: MEDIUM - Enhances user experience**

39. **Search & Filters**
    - Full-text search
    - Category filters
    - Material filters
    - Price range filters
    - Occasion filters
    - Mobile-optimized filter UI
    - SEO-friendly filter URLs

40. **Wishlist Functionality**
    - Add to wishlist
    - Wishlist sharing via WhatsApp
    - Local storage persistence

41. **Cart Functionality**
    - Add to cart
    - Cart management
    - Cart sharing via WhatsApp
    - Local storage persistence

42. **Storefront Performance Optimization**
    - Image optimization
    - Code splitting
    - Lazy loading
    - Mobile performance tuning
    - PWA considerations (optional)

### Phase 11: SEO & Analytics (Week 10)
**Priority: HIGH - Business visibility**

43. **SEO Implementation**
    - Dynamic meta tags
    - Structured data (JSON-LD)
    - Sitemap generation
    - Robots.txt
    - Canonical URLs
    - Image SEO
    - Local SEO

44. **Analytics Implementation**
    - Google Analytics 4 setup
    - Custom business metrics
    - Event tracking
    - Admin dashboard analytics
    - Google Search Console setup

### Phase 12: Security & Validation (Week 10)
**Priority: CRITICAL - Industry standards**

45. **Input Validation**
    - Implement Zod schemas for all forms
    - Server-side validation
    - Client-side validation
    - Error message standardization

46. **Security Hardening**
    - SQL injection prevention (parameterized queries)
    - XSS prevention (sanitization)
    - CSRF protection (tokens)
    - Rate limiting implementation
    - Secure file upload validation
    - Environment variable protection
    - CSP headers configuration

47. **Authentication Security**
    - Password hashing (bcrypt)
    - Session security
    - Token expiration
    - Secure password reset flow

48. **API Security**
    - API key management (if needed)
    - Request validation
    - Response sanitization
    - Error message security (no sensitive data)
    - API rate limiting

### Phase 13: Testing (Week 11)
**Priority: HIGH - Quality assurance**

49. **Unit Tests**
    - Test utility functions
    - Test validation schemas
    - Test API functions
    - Test availability logic
    - Test GST calculation

50. **Integration Tests**
    - Test database operations
    - Test R2 operations
    - Test authentication flow
    - Test order creation flow
    - Test invoice generation

51. **E2E Tests**
    - Test admin login
    - Test product creation
    - Test order creation
    - Test availability check
    - Test storefront product browsing
    - Test calendar selection
    - Test invoice generation

52. **Accessibility Testing**
    - WCAG 2.1 AA compliance check
    - Screen reader testing
    - Keyboard navigation testing
    - Color contrast verification

### Phase 14: Deployment & DevOps (Week 12)
**Priority: HIGH - Go live**

53. **Environment Setup**
    - Production environment variables documentation
    - Production Supabase configuration
    - Production R2 configuration
    - Domain configuration

54. **CI/CD Pipeline**
    - GitHub Actions setup
    - Automated testing
    - Automated deployment
    - Rollback strategy

55. **Build Optimization**
    - Production build configuration
    - Asset optimization
    - Bundle size analysis
    - Performance tuning

56. **Deployment**
    - Deploy admin app
    - Deploy storefront app
    - Configure DNS
    - Set up SSL
    - Configure CDN

57. **Post-Deployment**
    - Smoke testing
    - Monitoring setup
    - Error tracking (Sentry)
    - Analytics setup
    - Backup strategy
    - Performance monitoring

### Phase 15: Documentation & Handoff (Week 12)
**Priority: MEDIUM - Maintainability**

58. **Documentation**
    - Update README
    - API documentation
    - Deployment guide
    - Admin user guide
    - Local development setup guide
    - Environment variables documentation

59. **Code Cleanup**
    - Remove debug code
    - Remove console.logs
    - Add final comments
    - Final code review

### Core Features
- **Product Browsing**: Grid/list views with filters
- **Search**: Full-text search with filters
- **Categories**: Hierarchical category navigation
- **Product Details**: Full product information with images
- **WhatsApp Integration**: Prefilled messages for:
  - Product enquiry
  - Wishlist sharing
  - Cart booking
  - Contact form
- **Banners**: Hero, editorial, split promo banners
- **Trust Badges**: Sanitized, Insured, Free Delivery, Easy Return
- **Mobile-First Design**: Responsive with bottom navigation
- **Collections**: Shop by occasion (Wedding, Party, Festival, etc.)

### Features NOT Included
- User accounts/authentication
- Online payment gateway
- Cart checkout flow (redirects to WhatsApp)
- Wishlist persistence (WhatsApp sharing only)

## Technical Implementation Plan

### Phase 1: Project Setup
1. Initialize monorepo with Turborepo
2. Set up Next.js apps (admin + storefront)
3. Configure shadcn/ui
4. Set up TypeScript with shared types package
5. Configure TailwindCSS
6. Set up Supabase project
7. Configure Cloudflare R2

### Phase 2: Database & Storage
1. Create migrations folder at root
2. Write core table migrations
3. Add RLS policies
4. Set up R2 storage buckets
5. Create storage functions
6. Seed initial data

### Phase 3: Shared Packages
1. Create `shared-api` package with:
   - Supabase client configuration
   - Query functions (getProducts, getCategories, etc.)
   - Mutation functions (createProduct, updateProduct, etc.)
   - Validation schemas (Zod)
   - Storage functions (R2 upload/delete)
2. Create `shared-types` package
3. Create `shared-utils` package
4. Create `shared-ui` package with shadcn components

### Phase 4: Admin Dashboard
1. Authentication (email/password)
2. Dashboard layout with sidebar
3. Dashboard module with metrics
4. Product management module
5. Category management module
6. Inventory management module
7. Branch management module
8. Banner management module
9. Customer management module
10. Reports module
11. Settings module
12. Staff management module

### Phase 5: Storefront
1. Copy existing parisbridals design (mobile-first)
2. Replace static data with Supabase queries
3. Implement product browsing (mobile-optimized)
4. Implement search & filters
5. Implement category navigation
6. Implement WhatsApp integration
7. Implement banner system
8. Implement mobile bottom navigation

### Phase 6: Validation & UX
1. Industry-standard form validations (Zod)
2. Error handling with user-friendly messages
3. Loading states
4. Optimistic UI updates
5. Input sanitization
6. Phone number validation (Indian format)
7. Email validation
8. Image validation (size, format)
9. URL validation

### Phase 7: Testing & Deployment
1. Unit tests for critical functions
2. Integration tests for API
3. E2E tests for key flows
4. Performance optimization
5. SEO optimization
6. Deployment configuration

## Validation Standards

### Form Validations
- **Phone**: Indian format (+91 XXXXX XXXXX) with regex
- **Email**: Standard email format validation
- **Price**: Positive numbers, max 2 decimal places
- **Weight**: Positive numbers, max 3 decimal places
- **Images**: Max 5MB, allowed formats (jpg, png, webp)
- **URL**: Valid URL format
- **Required fields**: Non-empty, trimmed
- **Slug**: URL-friendly, unique

### Business Logic Validations
- Stock availability before booking
- Branch existence checks
- Category hierarchy validation
- Duplicate SKU prevention
- Security deposit rules
- Rental date validation (end date > start date)
- Quantity limits per booking

## Cloudflare R2 Integration

### Configuration
```typescript
// packages/shared-api/src/lib/storage/r2.ts
- Upload images with compression
- Generate signed URLs for delivery
- Delete images
- Organize by folder structure:
  - products/
  - categories/
  - banners/
  - branches/
```

### Benefits
- Cost-effective storage
- CDN delivery
- High availability
- Scalable

## Clean Architecture Principles

### Layer Separation
```
apps/admin/
├── app/                    # Next.js App Router
├── components/             # UI components
├── features/              # Feature-specific logic
│   ├── products/
│   │   ├── components/
│   │   ├── hooks/
│   │   └── services/
│   └── categories/
└── lib/                   # App-specific utilities

packages/shared-api/
├── src/
│   ├── lib/
│   │   ├── supabase/      # Database client
│   │   ├── queries/       # Read operations
│   │   ├── mutations/     # Write operations
│   │   ├── validations/   # Zod schemas
│   │   └── storage/       # R2 functions
│   └── types/
```

### Dependency Rules
- Apps depend on packages
- Packages never depend on apps
- UI components depend on shared-api
- Features depend on shared-api
- No circular dependencies

## Migration Strategy

### From Existing parisbridals
1. Copy component designs from `apps/parisbridals`
2. Keep styling and layout
3. Replace static data with Supabase queries
4. Remove user account features
5. Enhance WhatsApp integration
6. Add admin-specific features

### Migration Files Organization
```
database/migrations/
├── 001_initial_schema.sql
├── 002_branches.sql
├── 003_categories.sql
├── 004_products.sql
├── 005_customers.sql
├── 006_banners.sql
├── 007_settings.sql
├── 008_staff.sql
├── 009_rls_policies.sql
├── 010_indexes.sql
└── seed_data.sql
```

## Edge Cases & Considerations

### Jewellery-Specific
1. **Fraud Prevention**: Barcode tracking, packaging photos
2. **Weight Accuracy**: 3 decimal places for precision
3. **Gemstone Authentication**: Detailed gemstone tracking
4. **Making Charges**: Separate from material value
5. **Sanitization**: Track cleaning status between rentals
6. **Insurance**: Per-item insurance tracking
7. **Security Deposits**: High-value items require deposits
8. **Multi-Branch**: Inventory synchronization across locations

### Business Logic
1. **Stock Conflicts**: Prevent double bookings
2. **Branch Transfers**: Track item movement
3. **Low Stock Alerts**: Automated notifications
4. **WhatsApp Integration**: Message character limits
5. **Image Optimization**: Compress before R2 upload
6. **URL Generation**: Unique slugs for products/categories

### Technical
1. **Image Loading**: Lazy loading, placeholders
2. **Error Handling**: Graceful degradation
3. **Offline Support**: Service workers (optional)
4. **Performance**: Code splitting, caching
5. **SEO**: Meta tags, structured data

## Prioritized Task Execution Order

### Phase 1: Foundation & Setup (Week 1)
**Priority: CRITICAL - Must complete first**

1. **Initialize Monorepo**
   - Create directory structure at `D:\personal\parisbridals\`
   - Initialize Turborepo configuration
   - Set up package.json with workspaces
   - Configure TypeScript strict mode
   - Set up ESLint, Prettier, Husky

2. **Configure Supabase**
   - Create Supabase project
   - Set up environment variables
   - Configure database connection
   - Set up RLS policies template

3. **Configure Cloudflare R2**
   - Create R2 bucket
   - Set up access keys
   - Configure CORS
   - Test upload/download functionality

4. **Set up Security Headers**
   - Configure Next.js security headers
   - Set up CSP (Content Security Policy)
   - Configure CORS policies
   - Set up rate limiting strategy

### Phase 2: Database & Migrations (Week 1-2)
**Priority: CRITICAL - Foundation for all features**

5. **Create Database Migrations**
   - Create `database/migrations/` folder
   - Write core table migrations (branches, categories, products, customers, staff)
   - Write order management migrations (orders, order_items, order_status_history)
   - Write settings and banners migrations
   - Add indexes for performance
   - Write RLS policies
   - Seed initial data (branches, categories, settings)

6. **Create Availability Function**
   - Implement `check_product_availability()` SQL function
   - Test with sample data
   - Add to migrations

### Phase 3: Shared Packages (Week 2)
**Priority: HIGH - Required by both apps**

7. **Create Shared Types Package**
   - Set up `packages/shared-types`
   - Define TypeScript interfaces for all entities
   - Define enums (status, role, etc.)
   - Export types for use across apps

8. **Create Shared API Package**
   - Set up `packages/shared-api`
   - Configure Supabase client
   - Create query functions (getProducts, getCategories, etc.)
   - Create mutation functions (createProduct, updateProduct, etc.)
   - Create validation schemas (Zod)
   - Create R2 storage functions
   - Create availability check function

9. **Create Shared Utils Package**
   - Set up `packages/shared-utils`
   - Add utility functions (date formatting, currency formatting, etc.)
   - Add validation helpers
   - Add error handling utilities

10. **Create Shared UI Package**
    - Set up `packages/shared-ui`
    - Install and configure shadcn/ui
    - Add common UI components (Button, Input, Card, etc.)
    - Create design tokens (colors, spacing, typography)

### Phase 4: Admin Dashboard - Core (Week 3)
**Priority: HIGH - Admin needed before orders can be created**

11. **Admin App Setup**
    - Initialize Next.js app at `apps/admin`
    - Configure TailwindCSS with design tokens
    - Set up authentication (email/password)
    - Create admin layout with sidebar
    - Set up routing structure

12. **Admin Authentication**
    - Implement login page
    - Implement session management
    - Implement protected routes
    - Implement logout functionality
    - Add password reset (optional)

13. **Admin Dashboard Home**
    - Create dashboard overview
    - Display key metrics (total products, active rentals, revenue)
    - Add quick actions
    - Create charts/graphs for analytics

14. **Branch Management Module**
    - CRUD operations for branches
    - Set main branch functionality
    - Branch listing with status
    - Branch edit/delete

15. **Staff Management Module**
    - CRUD operations for staff
    - Role assignment
    - Branch assignment
    - Activity logs

### Phase 5: Admin Dashboard - Inventory (Week 4)
**Priority: HIGH - Products needed before orders**

16. **Category Management Module**
    - CRUD operations for categories
    - Hierarchical category support
    - Sort order management
    - Image upload to R2
    - Active/inactive status

17. **Product Management Module**
    - Product CRUD with all fields
    - Image upload to R2 (multiple images)
    - Category assignment
    - Branch assignment
    - Stock management
    - Barcode generation
    - Bulk operations (activate/deactivate, feature)
    - Search and filters

18. **Inventory Management Module**
    - Real-time stock tracking
    - Stock adjustment interface
    - Low stock alerts
    - Branch transfer functionality
    - Maintenance tracking

19. **Banner Management Module**
    - CRUD operations for banners
    - Banner types (hero, editorial, split)
    - Image upload to R2
    - Sort order management
    - Active/inactive status

20. **Customer Management Module**
    - Customer CRUD
    - Customer search
    - Customer history view
    - Source tracking

### Phase 6: Admin Dashboard - Orders (Week 5)
**Priority: HIGH - Core business logic**

21. **Order Management Module**
    - Order creation interface
    - Product availability check
    - Customer selection/create
    - Date selection with validation
    - Auto-price calculation
    - Security deposit handling
    - Delivery/pickup configuration

22. **Order Dashboard**
    - Order listing with filters
    - Status-based views
    - Quick actions (confirm, deliver, return, complete)
    - Today's orders overview
    - Upcoming deliveries/pickups
    - Overdue returns alerts

23. **Order Details View**
    - Complete order information
    - Product list with images
    - Customer details
    - Status timeline
    - Delivery/pickup information
    - Admin notes

24. **Return Processing**
    - Return inspection form
    - Condition rating
    - Damage description
    - Damage charges calculation
    - Deposit refund processing
    - Before/after photo upload

25. **Inventory Integration**
    - Automatic stock reservation on order confirmation
    - Stock release on order completion/cancellation
    - Conflict prevention
    - Real-time availability updates

### Phase 7: Admin Dashboard - Advanced (Week 6)
**Priority: MEDIUM - Enhances functionality**

26. **Settings Module**
    - Store information settings
    - Branch settings
    - Staff permissions
    - Security deposit rules
    - Rental duration rules

27. **Reports Module**
    - Order history reports
    - Revenue reports
    - Popular products report
    - Customer rental frequency
    - Damage statistics
    - Deposit collection/refund reports

28. **Admin Performance Optimization**
    - Code splitting
    - Lazy loading
    - Image optimization
    - Caching strategies

### Phase 8: Storefront - Foundation (Week 7)
**Priority: HIGH - Customer-facing**

29. **Storefront App Setup**
    - Initialize Next.js app at `apps/storefront`
    - Copy existing parisbridals design
    - Configure TailwindCSS with design tokens
    - Set up mobile-first layout
    - Configure responsive breakpoints

30. **Storefront Layout**
    - Header with navigation
    - Mobile bottom navigation
    - Footer
    - Loading states
    - Error boundaries

31. **Storefront Core Pages**
    - Home page with hero, categories, featured products
    - Category listing page
    - Product listing page with filters
    - Search page

32. **Product Display Components**
    - Product card component
    - Product grid/list views
    - Image gallery with swipe
    - Mobile-optimized touch targets

### Phase 9: Storefront - Product Details (Week 8)
**Priority: HIGH - Critical for customer experience**

33. **Product Details Page**
    - Full product information display
    - Image gallery with swipe
    - Material, weight, gemstone details
    - Size information
    - Related products

34. **Availability Calendar Component**
    - Calendar view with date selection
    - Visual availability indicators
    - Unavailable date marking
    - Date range selection
    - Validation (min/max days, unavailable dates)
    - Real-time price calculation
    - Mobile-optimized touch targets
    - Loading states
    - Error handling

35. **Availability API Integration**
    - Connect to availability check function
    - Fetch unavailable dates
    - Display in calendar
    - Handle edge cases

36. **WhatsApp Integration**
    - Prefilled message generation
    - Product enquiry message
    - Cart booking message
    - Contact form message
    - WhatsApp button on product page

### Phase 10: Storefront - Advanced (Week 9)
**Priority: MEDIUM - Enhances user experience**

37. **Search & Filters**
    - Full-text search
    - Category filters
    - Material filters
    - Price range filters
    - Occasion filters
    - Mobile-optimized filter UI

38. **Wishlist Functionality**
    - Add to wishlist
    - Wishlist sharing via WhatsApp
    - Local storage persistence

39. **Cart Functionality**
    - Add to cart
    - Cart management
    - Cart sharing via WhatsApp
    - Local storage persistence

40. **Storefront Performance Optimization**
    - Image optimization
    - Code splitting
    - Lazy loading
    - Mobile performance tuning
    - PWA considerations (optional)

### Phase 11: Security & Validation (Week 10)
**Priority: CRITICAL - Industry standards**

41. **Input Validation**
    - Implement Zod schemas for all forms
    - Server-side validation
    - Client-side validation
    - Error message standardization

42. **Security Hardening**
    - SQL injection prevention (parameterized queries)
    - XSS prevention (sanitization)
    - CSRF protection (tokens)
    - Rate limiting
    - Secure file upload validation
    - Environment variable protection

43. **Authentication Security**
    - Password hashing (bcrypt)
    - Session security
    - Token expiration
    - Secure password reset flow

44. **API Security**
    - API key management (if needed)
    - Request validation
    - Response sanitization
    - Error message security (no sensitive data)

### Phase 12: Testing (Week 11)
**Priority: HIGH - Quality assurance**

45. **Unit Tests**
    - Test utility functions
    - Test validation schemas
    - Test API functions
    - Test availability logic

46. **Integration Tests**
    - Test database operations
    - Test R2 operations
    - Test authentication flow
    - Test order creation flow

47. **E2E Tests**
    - Test admin login
    - Test product creation
    - Test order creation
    - Test availability check
    - Test storefront product browsing
    - Test calendar selection

48. **Accessibility Testing**
    - WCAG 2.1 AA compliance check
    - Screen reader testing
    - Keyboard navigation testing
    - Color contrast verification

### Phase 13: Deployment (Week 12)
**Priority: HIGH - Go live**

49. **Environment Setup**
    - Production environment variables
    - Production Supabase configuration
    - Production R2 configuration
    - Domain configuration

50. **Build Optimization**
    - Production build configuration
    - Asset optimization
    - Bundle size analysis
    - Performance tuning

51. **Deployment**
    - Deploy admin app
    - Deploy storefront app
    - Configure DNS
    - Set up SSL
    - Configure CDN

52. **Post-Deployment**
    - Smoke testing
    - Monitoring setup
    - Error tracking (Sentry or similar)
    - Analytics setup
    - Backup strategy

### Phase 14: Documentation & Handoff (Week 12)
**Priority: MEDIUM - Maintainability**

53. **Documentation**
    - Update README
    - API documentation
    - Deployment guide
    - Admin user guide
    - Troubleshooting guide

54. **Code Cleanup**
    - Remove debug code
    - Remove console.logs
    - Add final comments
    - Final code review

## Implementation Order (Legacy - Replaced by Prioritized Order Above)

### Priority 1 (Core)
1. Project setup
2. Database schema
3. Shared API package
4. Admin authentication
5. Basic product management
6. Storefront product display

### Priority 2 (Essential)
7. Category management
8. Branch management
9. Inventory tracking
10. WhatsApp integration
11. Banner management
12. Customer management

### Priority 3 (Advanced)
13. Reports & analytics
14. Staff management
15. Advanced inventory features
16. Barcode system
17. Sanitization tracking
18. Settings module

## Success Criteria
- ✅ Clean architecture with proper separation
- ✅ Reusable components and API layer
- ✅ Industry-standard validations
- ✅ Seamless WhatsApp integration
- ✅ Multi-branch support
- ✅ Cloudflare R2 storage
- ✅ shadcn/ui components only
- ✅ Responsive, mobile-first design
- ✅ Type-safe codebase
- ✅ Scalable database schema
