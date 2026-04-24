export interface Review {
  id: string;
  name: string;
  text: string;
  rating: number;
  occasion: string;
}

export const reviews: Review[] = [
  { id: "r1", name: "Anita Mathew", text: "The jewellery looked premium in every photo and the booking process was smooth from start to finish.", rating: 5, occasion: "Church Wedding, Kottayam" },
  { id: "r2", name: "Deepa Nair", text: "The set matched my saree perfectly and everyone assumed it was custom bridal jewellery.", rating: 5, occasion: "Temple Wedding, Ernakulam" },
  { id: "r3", name: "Fathima Rashid", text: "I booked quickly on WhatsApp, got a fast response, and the bridal set was exactly what I expected.", rating: 5, occasion: "Reception Booking, Thrissur" },
];

export const howItWorksSteps = [
  { title: "Browse", desc: "Explore our collection of premium jewellery." },
  { title: "Pick Dates", desc: "Select the date for your special event." },
  { title: "WhatsApp Order", desc: "Continue your order through WhatsApp with selected date and product" },
];

export const trustBadges = [
  { title: "Sanitized", icon: "✨" },
  { title: "Insured", icon: "🛡️" },
  { title: "Free Delivery", icon: "🚚" },
  { title: "Easy Return", icon: "↩️" },
];
