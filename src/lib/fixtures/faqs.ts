export interface FaqItem {
  id: string;
  category: "hallmarking" | "orders" | "payments" | "bespoke" | "care" | "buyback";
  categoryLabel: string;
  question: string;
  answer: string;
}

export const FAQ_CATEGORIES = [
  { id: "all", label: "All Questions" },
  { id: "hallmarking", label: "Certification & BIS" },
  { id: "orders", label: "Orders & Shipping" },
  { id: "payments", label: "Payments & PAN" },
  { id: "bespoke", label: "Bespoke Commissions" },
  { id: "care", label: "Care & Maintenance" },
  { id: "buyback", label: "Lifetime Exchange" },
] as const;

export const FAQ_ITEMS: FaqItem[] = [
  {
    id: "bis-hallmark-authenticity",
    category: "hallmarking",
    categoryLabel: "Certification & BIS",
    question: "How do I verify the authenticity and hallmarking of Chudiwalas jewellery?",
    answer:
      "Every single gold creation is hallmarked by the Bureau of Indian Standards (BIS) and carries the official 6-digit alphanumeric HUID (Hallmark Unique Identification) laser-engraved alongside the purity stamp (916 for 22 Karat, 750 for 18 Karat). You can verify your piece instantly using the official BIS Care mobile application. Natural solitaires and diamond suites are additionally certified by independent gemological laboratories such as IGI (International Gemological Institute) or SGL.",
  },
  {
    id: "polki-diamond-grades",
    category: "hallmarking",
    categoryLabel: "Certification & BIS",
    question: "What quality and grades of Polki and Natural Diamonds do you use?",
    answer:
      "We work exclusively with syndicate uncut Polki diamonds enclosed in pure 24K gold foil (Daak) by master Karigars in Jaipur, and natural round brilliant solitaires grading E-F color with VVS clarity. We strictly adhere to natural origin materials — we never use lab-grown diamonds, moissanite, or synthetic glass simulants in our jewellery.",
  },
  {
    id: "certificates-documentation",
    category: "hallmarking",
    categoryLabel: "Certification & BIS",
    question: "Will my jewellery come with official physical certificates?",
    answer:
      "Yes. Every order arrives in our tamper-evident presentation casket accompanied by the original physical BIS Hallmarking documentation, the laboratory diamond grading dossier (IGI/SGL), and an itemized GST tax invoice detailing gross weight, net gold weight, diamond carats, and purity.",
  },
  {
    id: "domestic-insured-shipping",
    category: "orders",
    categoryLabel: "Orders & Shipping",
    question: "How is high-value precious jewellery delivered safely across India?",
    answer:
      "We provide complimentary, 100% insured door-to-door transit across all serviceable PIN codes in India via specialized secure logistics partners (including Sequel Logistics and BVC Logistics). Every shipment is transported in an armored tamper-evident security bag and requires a secure OTP verification and government-issued photo ID signature upon delivery.",
  },
  {
    id: "delivery-timelines",
    category: "orders",
    categoryLabel: "Orders & Shipping",
    question: "What are the standard delivery timelines for online orders?",
    answer:
      "Ready-to-ship pieces are dispatched from our vault within 24 to 48 hours and typically arrive within 2 to 4 business days depending on destination. Made-to-order creations, customized ring sizes, and bespoke bridal commissions undergo meticulous hand-craftsmanship and typically require 10 to 18 business days.",
  },
  {
    id: "order-tracking",
    category: "orders",
    categoryLabel: "Orders & Shipping",
    question: "Can I track my order shipment in real time?",
    answer:
      "Yes. Once your order is dispatched, you will receive real-time SMS and WhatsApp notifications containing your private tracking capability link, allowing you to monitor transit step-by-step until safe handover.",
  },
  {
    id: "payment-methods",
    category: "payments",
    categoryLabel: "Payments & PAN",
    question: "What payment methods are supported for online checkout?",
    answer:
      "We accept all major domestic Indian payment methods powered by our secure Razorpay gateway, including UPI (Google Pay, PhonePe, Paytm, BHIM), RuPay / Visa / Mastercard credit and debit cards, and Net Banking across 50+ major Indian banks.",
  },
  {
    id: "pan-card-compliance",
    category: "payments",
    categoryLabel: "Payments & PAN",
    question: "Is PAN card submission mandatory for purchasing high-value jewellery?",
    answer:
      "Yes. In strict accordance with Government of India regulations (Rule 114B of the Income Tax Act), furnishing a valid Permanent Account Number (PAN) is legally required for any single precious jewellery transaction equal to or exceeding ₹2,00,000 (INR). Our secure checkout will seamlessly prompt for PAN details when applicable.",
  },
  {
    id: "gst-transparent-pricing",
    category: "payments",
    categoryLabel: "Payments & PAN",
    question: "Are the prices shown on the website inclusive of GST?",
    answer:
      "Yes, all displayed prices on Chudiwalas are 100% transparent and fully inclusive of the mandatory 3% Goods and Services Tax (GST) applicable to precious gold and diamond jewellery in India. There are zero hidden costs or surprise surcharges during checkout.",
  },
  {
    id: "bespoke-commissions",
    category: "bespoke",
    categoryLabel: "Bespoke Commissions",
    question: "Can I customize an existing design or commission a bespoke bridal suite?",
    answer:
      "Yes, bespoke commission is the soul of our atelier. You can customize metal preferences (18K Rose Gold, 18K Yellow Gold, 18K Platinum/White Gold), select specific natural solitaire carat weights, or collaborate directly with our senior designers to create a one-of-a-kind bridal heirloom suited to your wedding lehenga or personal aesthetic.",
  },
  {
    id: "book-consultation",
    category: "bespoke",
    categoryLabel: "Bespoke Commissions",
    question: "How do I book a private consultation with a jewellery stylist?",
    answer:
      "You can schedule a private virtual or boutique consultation directly through our Consultation Booking page, or click the WhatsApp Concierge button to speak with a senior stylist immediately at +91 98765 43210.",
  },
  {
    id: "polki-care-maintenance",
    category: "care",
    categoryLabel: "Care & Maintenance",
    question: "How should I store and care for Jadau Polki jewellery at home?",
    answer:
      "Jadau Polki jewellery should always be preserved in airtight containers or velvet-lined boxes away from moisture, humidity, and direct chemical sprays like perfumes or hairsprays. Never submerge Jadau Polki pieces in water or ultrasonic cleaners, as moisture can alter the delicate 24K gold foil (Daak). We recommend wiping your jewellery with a clean, soft suede cloth after every wear.",
  },
  {
    id: "cleaning-ring-resizing",
    category: "care",
    categoryLabel: "Care & Maintenance",
    question: "Do you offer complimentary cleaning and ring resizing services?",
    answer:
      "Yes. We offer lifetime complimentary inspection, prong retightening, and ultrasonic cleaning for all Chudiwalas solitaires. Ring resizing (within ±2 sizes) is completely complimentary within the first 6 months of purchase.",
  },
  {
    id: "lifetime-exchange-buyback",
    category: "buyback",
    categoryLabel: "Lifetime Exchange",
    question: "What is your Lifetime Buyback and Exchange policy?",
    answer:
      "We stand behind the enduring value of our fine jewellery. We offer a transparent Lifetime Exchange and Buyback policy across India. Gold is credited at 100% of the prevailing 24K/22K/18K market rate at the time of exchange (on net gold weight, excluding making charges and taxes), and natural certified solitaires receive up to 90% of prevailing market diamond value.",
  },
];
