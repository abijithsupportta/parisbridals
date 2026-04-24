/**
 * Homepage static data — reviews, editorial banners, trending, occasions, steps.
 *
 * @module data/homepage
 */

// ── Reviews ───────────────────────────────────────────────────────────
export interface Review {
  id: string;
  name: string;
  occasion: string;
  rating: number;
  text: string;
}

export const reviews: Review[] = [
  {
    id: 'r1',
    name: 'Priya Menon',
    occasion: 'Wedding Ceremony',
    rating: 5,
    text: 'The jewellery set was absolutely stunning. My bridal look was incomplete without it. Paris Bridals made my special day even more beautiful.',
  },
  {
    id: 'r2',
    name: 'Anjali Nair',
    occasion: 'Engagement',
    rating: 5,
    text: 'Renting from Paris Bridals was the best decision. The quality was exceptional and the pieces looked brand new. Highly recommend!',
  },
  {
    id: 'r3',
    name: 'Divya Krishnan',
    occasion: 'Reception',
    rating: 5,
    text: 'From selection to return, the experience was seamless. The team helped me choose the perfect set that matched my saree beautifully.',
  },
];

// ── Editorial Banners ─────────────────────────────────────────────────
export interface EditorialBanner {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  link: string;
}

export const editorialBanners: EditorialBanner[] = [
  {
    id: 'eb1',
    title: 'Bridal Collection',
    subtitle: 'Exquisite pieces handcrafted for your most memorable day. From traditional Kerala to contemporary designs.',
    image: 'https://images.unsplash.com/photo-1515377905703-c4788e51af15?w=800',
    link: '/collections?occasion=wedding',
  },
  {
    id: 'eb2',
    title: 'Festive Favourites',
    subtitle: 'Celebrate every festival in style with our curated collection of temple jewellery and gold sets.',
    image: 'https://images.unsplash.com/photo-1602173574767-37ac01994b2a?w=800',
    link: '/collections?occasion=festival',
  },
];

// ── Trending Products ─────────────────────────────────────────────────
export interface TrendingProduct {
  id: string;
  name: string;
  category: string;
  pricePerDay: number;
  image: string;
  tag?: string;
}

export const trendingProducts: TrendingProduct[] = [
  {
    id: 't1',
    name: 'Kundan Bridal Set',
    category: 'Bridal Sets',
    pricePerDay: 2499,
    image: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=600',
    tag: 'Trending',
  },
  {
    id: 't2',
    name: 'Temple Necklace Gold',
    category: 'Necklaces',
    pricePerDay: 1999,
    image: 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=600',
  },
  {
    id: 't3',
    name: 'Diamond Jhumka Pair',
    category: 'Earrings',
    pricePerDay: 1299,
    image: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=600',
    tag: 'Popular',
  },
  {
    id: 't4',
    name: 'Ruby & Gold Choker',
    category: 'Chokers',
    pricePerDay: 1799,
    image: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=600',
  },
];

// ── Shop by Occasion ──────────────────────────────────────────────────
export interface Occasion {
  id: string;
  name: string;
  image: string;
  count: string;
}

export const occasions: Occasion[] = [
  {
    id: 'o1',
    name: 'Wedding',
    image: 'https://images.unsplash.com/photo-1515377905703-c4788e51af15?w=400',
    count: '120+',
  },
  {
    id: 'o2',
    name: 'Engagement',
    image: 'https://images.unsplash.com/photo-1602173574767-37ac01994b2a?w=400',
    count: '85+',
  },
  {
    id: 'o3',
    name: 'Reception',
    image: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=400',
    count: '70+',
  },
  {
    id: 'o4',
    name: 'Festival',
    image: 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=400',
    count: '95+',
  },
  {
    id: 'o5',
    name: 'Party',
    image: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=400',
    count: '60+',
  },
];

// ── How It Works ──────────────────────────────────────────────────────
export interface HowItWorksStep {
  title: string;
  desc: string;
}

export const howItWorksSteps: HowItWorksStep[] = [
  {
    title: 'Browse & Select',
    desc: 'Explore our curated collection and choose the perfect pieces for your occasion.',
  },
  {
    title: 'Book & Receive',
    desc: 'Reserve your selection and pick it up at our store, fully sanitized and ready to wear.',
  },
  {
    title: 'Wear & Return',
    desc: 'Enjoy your event in style and return the jewellery within the rental period.',
  },
];
