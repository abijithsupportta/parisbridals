<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Storefront Agent Rules

## Architecture
- Uses `src/` directory: `src/app/`, `src/components/`, `src/lib/`
- Simpler than admin — no layered repository/service architecture
- Data fetching via direct Supabase queries in server components or `src/lib/actions/`
- Port: 3002

## Design System
- **Luxury minimalist** aesthetic — ivory/white backgrounds, gold accents, charcoal text
- **Mobile-first** responsive design (44px min touch targets, 16px min body text)
- Bottom mobile navigation bar (`MobileBottomNav.tsx`)
- NO claymorphism — clean design with subtle depth
- Photography-led, breathing whitespace

## Data Rules
- **Vendor-specific filtering**: Only show Paris Bridals store data (filter by `store_id`)
- All banners, categories, products MUST come from database — no hardcoded content
- No hardcoded image URLs — use R2/database URLs

## Components
- `src/components/home/` — homepage sections (HeroCarousel, FeaturedProducts, etc.)
- `src/components/product/` — product detail components
- `src/components/ui/` — shadcn/ui reusable primitives
- Header with search overlay (desktop + mobile variants)

## Pages
- Homepage: 11-section layout (hero → categories → featured → editorial → etc.)
- `/collections` — category browsing
- `/product/[slug]` — product details with rental calendar
- `/cart`, `/checkout`, `/wishlist` — e-commerce flows
- `/search` — search results with overlay
- Info pages: `/about`, `/contact`, `/faqs`, `/care`, `/shipping`, `/returns`, `/legal`, `/membership`, `/size-guide`

## Tech
- Next.js 16, React 19, Tailwind CSS 4
- Supabase for data
- WhatsApp integration for order enquiries (`lib/whatsapp.ts`)
- No TanStack Query or Zustand — simpler state management
