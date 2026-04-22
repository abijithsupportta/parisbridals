// Shared WhatsApp ordering config for Paris Bridals
export const WHATSAPP_NUMBER = "918129668157";

interface OrderDetails {
  productName: string;
  price: number;
  categoryName?: string | null;
  quantity: number;
  customerName: string;
  customerPhone: string;
}

export function buildOrderMessage(o: OrderDetails): string {
  const today = new Date().toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const lines = [
    "Hello Paris Bridals! 👋",
    "",
    "*New Rental Enquiry*",
    "",
    `📦 *Product:* ${o.productName}`,
  ];

  if (o.categoryName) lines.push(`🏷️ *Category:* ${o.categoryName}`);
  lines.push(`💰 *Rental Price for Event:* ₹${o.price.toLocaleString("en-IN")}`);
  lines.push(`🔢 *Quantity:* ${o.quantity}`);
  lines.push(`📅 *Enquiry Date:* ${today}`);
  lines.push("");
  lines.push("👤 *Customer Details:*");
  lines.push(`Name: ${o.customerName}`);
  lines.push(`Phone: ${o.customerPhone}`);
  lines.push("");
  lines.push("Please confirm availability. Thank you! 🙏");

  return lines.join("\n");
}

export function buildWhatsAppUrl(message: string): string {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

// Wishlist message builder
interface WishlistItem {
  name: string;
  price: number;
}

export function buildWishlistMessage(items: WishlistItem[]): string {
  const lines = [
    "Hello Paris Bridals! 👋",
    "",
    "*Wishlist Enquiry*",
    "",
  ];

  if (items.length === 0) {
    lines.push("I'm interested in browsing your collections.");
  } else {
    lines.push("I'm interested in these items:");
    items.forEach((item, index) => {
      lines.push(`${index + 1}. ${item.name} - ₹${item.price}/day`);
    });
  }

  lines.push("");
  lines.push("Please check availability. Thank you! 🙏");

  return lines.join("\n");
}

// Cart message builder
interface CartItem extends WishlistItem {
  startDate: string;
  endDate: string;
}

export function buildCartMessage(items: CartItem[]): string {
  const lines = [
    "Hello Paris Bridals! 👋",
    "",
    "*Booking Enquiry*",
    "",
  ];

  if (items.length === 0) {
    lines.push("I'd like to book some items for my event.");
  } else {
    items.forEach((item, index) => {
      lines.push(`${index + 1}. ${item.name}`);
      lines.push(`   Rental: ₹${item.price}/day`);
      lines.push(`   Dates: ${item.startDate} to ${item.endDate}`);
    });
  }

  lines.push("");
  lines.push("Please confirm availability and total cost. Thank you! 🙏");

  return lines.join("\n");
}

// Contact message builder
export function buildContactMessage(name: string, phone: string, message: string): string {
  const lines = [
    "Hello Paris Bridals! 👋",
    "",
    "*New Enquiry*",
    "",
    `👤 *Name:* ${name}`,
    `📱 *Phone:* ${phone}`,
    "",
    `💬 *Message:*`,
    message,
    "",
    "Please get back to me. Thank you! 🙏",
  ];

  return lines.join("\n");
}

// Checkout message builder
interface CheckoutDetails {
  items: CartItem[];
  customerName: string;
  customerPhone: string;
  eventDate: string;
}

export function buildCheckoutMessage(details: CheckoutDetails): string {
  const lines = [
    "Hello Paris Bridals! 👋",
    "",
    "*New Booking Request*",
    "",
  ];

  details.items.forEach((item, index) => {
    lines.push(`${index + 1}. ${item.name}`);
    lines.push(`   Rental: ₹${item.price}/day`);
    lines.push(`   Dates: ${item.startDate} to ${item.endDate}`);
  });

  lines.push("");
  lines.push(`📅 *Event Date:* ${details.eventDate}`);
  lines.push("");
  lines.push("👤 *Customer Details:*");
  lines.push(`Name: ${details.customerName}`);
  lines.push(`Phone: ${details.customerPhone}`);
  lines.push("");
  lines.push("Please confirm availability and final amount. Thank you! 🙏");

  return lines.join("\n");
}
