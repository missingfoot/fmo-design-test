export interface Article {
  id: string;
  title: string;
  summary: string;
}

export interface Category {
  id: string;
  label: string;
  /** One-line summary of what's in this category, shown under its label
   * wherever categories are listed outside the sidebar tree. */
  description: string;
  /** Inner markup (paths/shapes only) for a 24x24 lucide-style icon. */
  icon: string;
  articles: Article[];
}

export type PageId = "example-1" | "example-2" | "example-3" | "example-4" | "knowledge-base";

export interface NavPage {
  id: PageId;
  icon: string;
  label: string;
}

export const navPages: NavPage[] = [
  { id: "example-1", icon: "briefcase", label: "Example Page" },
  { id: "example-2", icon: "knowledge-base", label: "Example Page" },
  { id: "example-3", icon: "map", label: "Example Page" },
  { id: "example-4", icon: "target", label: "Example Page" },
  { id: "knowledge-base", icon: "help", label: "Knowledge Base" },
];

export const categories: Category[] = [
  {
    id: "product-features",
    label: "Product & Features",
    description: "How Smart Link's ordering and payment features work, day to day.",
    icon: '<path d="M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z"/><path d="M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12"/><path d="M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17"/>',
    articles: [
      {
        id: "whats-new-in-smartlink",
        title: "What's New in Smart Link",
        summary: "Overview of recent Smart Link features and changes.",
      },
      {
        id: "my-orders-incoming",
        title: "My Orders: Incoming Order Notifications",
        summary: "How incoming-order alerts behave and what shops can do with them.",
      },
      {
        id: "request-funds-same-day",
        title: "Request Funds: Same Day Requests",
        summary: "How the Request Funds feature works for same-day requests.",
      },
      {
        id: "customer-numbers-multiple",
        title: "Customer Numbers: Adding Multiple Contacts",
        summary: "How to add and manage multiple customer contact numbers in Smart Link.",
      },
      {
        id: "tap-to-pay-getting-started",
        title: "Tap to Pay: Getting Started",
        summary: "An introduction to Tap to Pay and the main steps for using it.",
      },
      {
        id: "text-to-pay-account-limits",
        title: "Text to Pay: Account Limits",
        summary: "How Text to Pay limits work and where they can be managed.",
      },
      {
        id: "pre-orders-how-they-work",
        title: "Pre-Orders: How They Work",
        summary: "A guide to enabling and handling pre-orders.",
      },
      {
        id: "edit-order-updating",
        title: "Edit Order: Updating a Customer Order",
        summary: "How the Edit Order feature handles changes to an existing order.",
      },
      {
        id: "menu-availability",
        title: "Menu Availability: Products, Variants and Categories",
        summary: "How product, variant and category availability affects ordering.",
      },
      {
        id: "pf-order-notes",
        title: "Order Notes: Passing On Customer Requests",
        summary: "How the free-text Order Notes field works, where notes print, and its limits.",
      },
    ],
  },
  {
    id: "hardware",
    label: "Hardware",
    description: "Setting up and using the AP Smart Link terminal in shop.",
    icon: '<rect width="16" height="16" x="4" y="4" rx="2"/><rect width="6" height="6" x="9" y="9" rx="1"/><path d="M15 2v2"/><path d="M15 20v2"/><path d="M2 15h2"/><path d="M2 9h2"/><path d="M20 15h2"/><path d="M20 9h2"/><path d="M9 2v2"/><path d="M9 20v2"/>',
    articles: [
      {
        id: "hw-smart-link-getting-started",
        title: "AP Smart Link: Getting Started",
        summary: "An overview of the AP Smart Link terminal and what it's used for in shop.",
      },
      {
        id: "hw-smart-link-card-payments",
        title: "AP Smart Link: Accepting Card Payments",
        summary: "How to take card and digital wallet payments on the terminal at no transaction fee.",
      },
      {
        id: "hw-smart-link-printing-receipts",
        title: "AP Smart Link: Printing Order Receipts",
        summary: "How incoming orders print automatically at the terminal, and what to do if they don't.",
      },
      {
        id: "hw-smart-link-accept-decline",
        title: "AP Smart Link: Accepting or Declining Orders",
        summary: "How the accept and decline workflow works when a new order comes through.",
      },
      {
        id: "hw-smart-link-tracking-drivers",
        title: "AP Smart Link: Tracking Delivery Drivers",
        summary: "Using the terminal to monitor driver locations and delivery status.",
      },
      {
        id: "hw-smart-link-connectivity",
        title: "AP Smart Link: Troubleshooting Connectivity",
        summary: "What to check if the terminal loses connection or stops printing orders.",
      },
      {
        id: "hw-smart-link-firmware-updates",
        title: "AP Smart Link: Managing Firmware Updates",
        summary: "How OTA firmware updates roll out to terminals, and what to check when one stalls or fails.",
      },
    ],
  },
  {
    id: "marketing",
    label: "Marketing",
    description: "Reaching customers with SMS campaigns, promotions and discounts.",
    icon: '<path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/>',
    articles: [
      {
        id: "mkt-sms-sending-campaign",
        title: "SMS Marketing: Sending a Campaign",
        summary: "How to send a message with a link to a shop's website to its customer list.",
      },
      {
        id: "mkt-sms-delivery-notifications",
        title: "SMS Marketing: Delivery Status Notifications",
        summary: "How customers are automatically notified when their order is out for delivery.",
      },
      {
        id: "mkt-downtime-promotions",
        title: "Downtime Promotions: Running Special Offers",
        summary: "How shops can create promotions to fill quiet trading periods.",
      },
      {
        id: "mkt-minimum-discount",
        title: "Discounts: Setting a Minimum Customer Discount",
        summary: "How the minimum 3% customer discount model works and why every shop offers one.",
      },
      {
        id: "mkt-fmo-movement",
        title: "The FMO Movement: What It Means for Your Shop",
        summary: "Background on the discount-donation initiative and how shops can promote it.",
      },
      {
        id: "mkt-customer-reviews",
        title: "Customer Reviews: Why They Matter",
        summary: "How ratings and reviews affect a shop's visibility and how to encourage more of them.",
      },
      {
        id: "mkt-loyalty-points",
        title: "Loyalty Points: Rewarding Repeat Customers",
        summary: "How the optional points-based loyalty scheme works and how it stacks with other discounts.",
      },
      {
        id: "mkt-seasonal-campaigns",
        title: "Seasonal Campaigns: Planning Around Key Dates",
        summary: "Using the Seasonal Planner to time SMS campaigns and promotions around key UK dates.",
      },
    ],
  },
  {
    id: "sales-accounts",
    label: "Sales & Accounts",
    description: "Getting paid, account signup, and managing shop details.",
    icon: '<path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/>',
    articles: [
      {
        id: "sales-ap-funds",
        title: "AP Funds: Accessing Your Online Card Money",
        summary: "What AP Funds are and how they give shops instant access to card takings.",
      },
      {
        id: "sales-getting-paid-timelines",
        title: "Getting Paid: Bank Transfer Timelines",
        summary: "Standard 3-5 day bank transfers versus paid same-day transfers.",
      },
      {
        id: "sales-subscription-commission",
        title: "Subscription & Commission: How Pricing Works",
        summary: "The 0% commission model, the monthly subscription, and why there are no hidden fees.",
      },
      {
        id: "sales-signing-up-new-shop",
        title: "Sales & Accounts: Signing Up a New Shop",
        summary: "The steps for onboarding a new takeaway or restaurant onto the platform.",
      },
      {
        id: "sales-advantage-card",
        title: "Advantage Card: Accessing Your Funds Anytime",
        summary: "An overview of the Advantage Card and how it ties into AP Funds.",
      },
      {
        id: "sales-updating-shop-details",
        title: "Account Details: Updating Shop Information",
        summary: "How a shop can update its own account, contact, and payment details.",
      },
      {
        id: "sales-vat-invoicing",
        title: "VAT & Invoicing: Understanding Your Statements",
        summary: "How monthly statements are built, how VAT is applied, and where to find past invoices.",
      },
      {
        id: "sales-multi-site-accounts",
        title: "Multi-Site Accounts: Managing Several Shops",
        summary: "How linked multi-site accounts share billing and logins while keeping each shop independent.",
      },
    ],
  },
  {
    id: "troubleshooting",
    label: "Troubleshooting",
    description: "Fixing order, payment and delivery problems as they come up.",
    icon: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94z"/>',
    articles: [
      {
        id: "ts-order-not-on-terminal",
        title: "Order Not Appearing on Smart Link",
        summary: "What to check when a customer's order isn't showing up at the terminal.",
      },
      {
        id: "ts-missing-confirmation-email",
        title: "Customer Didn't Receive a Confirmation Email",
        summary: "Steps to diagnose a missing order confirmation email.",
      },
      {
        id: "ts-payment-taken-order-declined",
        title: "Payment Taken but Order Declined",
        summary: "Explaining bank hold timelines when a declined order still shows as pending on a customer's account.",
      },
      {
        id: "ts-no-takeaways-in-postcode",
        title: "No Takeaways Appearing in a Customer's Postcode",
        summary: "Why this happens and how coverage grows into new areas over time.",
      },
      {
        id: "ts-mistake-on-order",
        title: "Resolving a Mistake on a Customer's Order",
        summary: "The process to follow once an order with an error has already been placed.",
      },
      {
        id: "ts-cancelling-accepted-order",
        title: "Cancelling an Order After Acceptance",
        summary: "Why accepted orders can't be cancelled by the customer, and what to advise instead.",
      },
      {
        id: "ts-driver-app-crash",
        title: "Driver App Crashing or Freezing",
        summary: "Steps to diagnose a driver's app crashing or freezing mid-shift, and when to escalate.",
      },
      {
        id: "ts-menu-price-mismatch",
        title: "Menu Price Mismatch Between App and Terminal",
        summary: "Why a displayed price can differ between the customer app and the terminal, and how to fix it.",
      },
    ],
  },
  {
    id: "delivery-logistics",
    label: "Delivery & Logistics",
    description: "Driver operations, delivery zones, fees and failed-delivery handling.",
    icon: '<path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.626l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/>',
    articles: [
      {
        id: "del-driver-app-overview",
        title: "Driver App: Overview and Daily Use",
        summary: "What the driver app does day to day and how it connects to the terminal.",
      },
      {
        id: "del-delivery-zones",
        title: "Delivery Zones: Setting Coverage Areas",
        summary: "How shops define and adjust the areas they'll deliver to.",
      },
      {
        id: "del-delivery-fees",
        title: "Delivery Fees: How They're Calculated",
        summary: "How delivery fees are worked out and where a shop can adjust them.",
      },
      {
        id: "del-failed-delivery",
        title: "Failed Deliveries: What Happens Next",
        summary: "What happens to the order and payment when a delivery can't be completed.",
      },
      {
        id: "del-driver-pay",
        title: "Driver Pay: How Earnings Are Calculated",
        summary: "How driver earnings are calculated per drop and paid out.",
      },
      {
        id: "del-vehicle-requirements",
        title: "Driver Vehicle Requirements",
        summary: "The vehicle types, documents and checks required to deliver for a shop.",
      },
      {
        id: "del-multi-drop",
        title: "Multi-Drop Deliveries: Batching Orders",
        summary: "How orders get batched onto a single driver run and what that changes for shops.",
      },
    ],
  },
  {
    id: "account-compliance",
    label: "Account & Compliance",
    description: "Identity checks, data protection, disputes and account standing.",
    icon: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>',
    articles: [
      {
        id: "acc-kyc-verification",
        title: "Identity Verification: KYC Checks Explained",
        summary: "Why identity checks are required and what happens if one fails.",
      },
      {
        id: "acc-data-protection",
        title: "Data Protection: Customer Data Handling",
        summary: "How customer data is stored, shared and protected, and shop obligations around it.",
      },
      {
        id: "acc-chargebacks",
        title: "Chargebacks: How Disputes Are Handled",
        summary: "How a card chargeback is raised, investigated and resolved.",
      },
      {
        id: "acc-account-suspension",
        title: "Account Suspension: Causes and Reinstatement",
        summary: "What triggers a suspension and the steps to get an account reinstated.",
      },
      {
        id: "acc-food-hygiene-rating",
        title: "Food Hygiene Ratings: Displaying Yours on FMO",
        summary: "How a shop's hygiene rating appears on FMO and how to update it.",
      },
      {
        id: "acc-allergen-info",
        title: "Allergen Information: Shop Responsibilities",
        summary: "What allergen information a shop must keep up to date and where it's shown.",
      },
      {
        id: "acc-multi-user-access",
        title: "Multi-User Access: Staff Logins and Permissions",
        summary: "How to give staff their own logins with the right level of access.",
      },
    ],
  },
];

export interface FlatArticle extends Article {
  categoryId: string;
  categoryLabel: string;
}

export function getAllArticlesFlat(): FlatArticle[] {
  return categories.flatMap((c) => c.articles.map((a) => ({ ...a, categoryId: c.id, categoryLabel: c.label })));
}

// Subsequence fuzzy match: every character of `needle` must appear in
// `haystack` in order, though not necessarily contiguously (e.g. "ordnt"
// matches "orderNotifications" as one token).
//
// Short needles (like a 3-letter acronym: "PCI", "SMS", "OTA") skip fuzzy
// matching entirely and require a word-start match, with real article
// vocabulary, an ordinary word like "specific" trivially contains p-c-i
// in order, so pure subsequence matching makes short/acronym queries
// match almost everything, and even a plain substring check still lets a
// short acronym hide mid-word (e.g. "ota" inside "rotation" or "quota").
// Anchoring to the start of the token avoids both: "ota" still matches
// "ota-enabled", and "pay" still matches "payment", but neither matches
// buried inside an unrelated word. Longer needles keep fuzzy matching, but
// the matched span is capped close to the needle's own length so a typo
// like "termnl" can still find "terminal" without letting matches sprawl
// loosely across an unrelated word.
export function fuzzyContains(haystack: string, needle: string): boolean {
  if (needle.length <= 3) return haystack.startsWith(needle);

  let hi = 0;
  let start = -1;
  for (const ch of needle) {
    hi = haystack.indexOf(ch, hi);
    if (hi === -1) return false;
    if (start === -1) start = hi;
    hi++;
  }
  return hi - start <= needle.length + 2;
}

// Splits into words, but also contributes a few merged-together forms as
// extra tokens, so a query typed as one word still matches text that
// spells the same thing as two, and vice versa: a hyphenated compound
// (e.g. "pre-orders", "text-to-pay") contributes its joined form
// ("preorders", "texttopay"), and every adjacent pair of words (regardless
// of whether they're joined by a hyphen or just a space, e.g. "Smart
// Link") contributes its own joined pair ("smartlink"). That covers a
// two-word product name typed solid ("smartlink"), hyphenated
// ("smart-link"), or as the two separate words it's actually written as.
function tokenize(text: string): string[] {
  const lower = text.toLowerCase();
  const words: string[] = lower.match(/[a-z0-9]+/g) ?? [];
  const hyphenCompounds = lower.match(/[a-z0-9]+(?:-[a-z0-9]+)+/g) ?? [];

  const tokens = [...words];
  for (const compound of hyphenCompounds) {
    tokens.push(compound.replace(/-/g, ""));
  }
  for (let i = 0; i < words.length - 1; i++) {
    tokens.push(words[i] + words[i + 1]);
  }
  return tokens;
}

// Token-based fuzzy match: each query token must fuzzy-match at least one
// single word in the target text. Matching within one token (rather than
// across the whole concatenated document) keeps short/technical queries
// precise even once article bodies are long, "net11" only matches a token
// like "net11", not scattered characters spread across unrelated sentences.
export function articleMatchesFuzzy(article: Article, query: string, bodyText = ""): boolean {
  const queryTokens = tokenize(query);
  if (!queryTokens.length) return true;
  const textTokens = tokenize(`${article.title} ${article.summary} ${bodyText}`);
  return queryTokens.every((qt) => textTokens.some((tt) => fuzzyContains(tt, qt)));
}
