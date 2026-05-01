# Software Engineering Masterclass: The 80/20 Rule

This document captures the highest-leverage concepts (the 20%) extracted from building a programmatic PDF invoice. Mastering these concepts will allow you to solve 80% of future software engineering problems.

---

## 1. Separation of Concerns (Layered Architecture)

When building complex features (like generating a PDF), never put all your code in one place. Your app is broken down into specific jobs:

1. **The Button (`OrderRow.tsx`):** Only knows about the UI. It says, "Open this URL."
2. **The API Route (`route.ts`):** Only knows about the network. It receives the request and returns a file.
3. **The Service (`invoiceService.ts`):** This is the **only** place that knows how to build a PDF using `jsPDF`.

### Why this is a superpower:
If you need to change how PDFs are generated (e.g., swapping `jsPDF` for a different library), or if you want to email the invoice instead of downloading it, **you only have to update the Service file**. Your UI and API remain completely untouched. By keeping "Business Logic" isolated in Service files, your codebase remains clean, scalable, and easy to maintain.

---

## 2. Data Transformation (Mapping)

Different systems—databases, UI libraries, payment gateways, PDF generators—speak different "languages" and expect data in different "shapes." Data Transformation is the act of translating your data from the shape you *have* into the shape the system *needs*.

### The Concept: Shape A vs. Shape B

**Shape A (Your Database Reality):**
Your database returns a complex, nested object.
```javascript
const order = {
  id: "ORDER-123",
  customer: { name: "Alice" },
  items: [
    { product_id: "Ring-01", quantity: 2, price: 100 },
    { product_id: "Necklace-05", quantity: 1, price: 500 }
  ]
};
```

**Shape B (The System's Reality):**
The PDF table library (`jspdf-autotable`) doesn't understand nested objects. It requires a flat, 2D matrix (an Array of Arrays).
```javascript
const tableData = [
  ["Ring-01", "2", "$100", "$200"],
  ["Necklace-05", "1", "$500", "$500"]
];
```

### The Solution: The Map Function
You act as the translator using JavaScript's `.map()` to convert Shape A into Shape B:
```javascript
const tableData = order.items.map((item) => {
  return [
    item.product_id,                           // Column 1: ID
    item.quantity.toString(),                  // Column 2: Qty
    `$${item.price}`,                          // Column 3: Price
    `$${item.price * item.quantity}`           // Column 4: Total
  ];
});
```

### How this solves 80% of future problems:

You will use this exact pattern for almost every major feature you build:

* **Payment Gateways (Stripe):** Stripe doesn't understand your `Order` object. It needs a specific `line_items` array. You will `.map()` your cart items into Stripe's required format.
* **Charts & Analytics:** A charting library (like Chart.js) won't understand raw database rows. You will `.map()` your data into specific X and Y coordinates.
* **Export to CSV/Excel:** A CSV file is just an array of strings joined by commas. You will `.map()` your objects into flat arrays.
* **React Components:** Every time you render a list on the screen (`products.map(p => <Card data={p} />)`), you are transforming raw JSON data into visual HTML.

**The Golden Rule:** Look at every problem as "What shape do I have?" and "What shape does this tool need?" Then, write the code to translate between them.
