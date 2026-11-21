import { RawOffer } from "../dto/product";

/**
 * Storefront offers shown on product pages. These are display-only: the
 * selling price already reflects any discount (compare-at price is the
 * regular price). Coupon redemption at checkout is a separate feature.
 */
export const FIXTURE_OFFERS: (RawOffer & { displayOrder: number; isActive: boolean })[] = [
  {
    id: "offer-making-charges",
    title: "Min. 30% off on making charges",
    description: "On all ready-to-ship pieces. Auto applied.",
    code: null,
    isAuto: true,
    isActive: true,
    displayOrder: 1,
  },
  {
    id: "offer-free-shipping",
    title: "Free insured shipping",
    description: "On every order across India.",
    code: null,
    isAuto: true,
    isActive: true,
    displayOrder: 2,
  },
  {
    id: "offer-first-order",
    title: "Extra 5% off your first piece",
    description: "Share the code with the concierge on WhatsApp.",
    code: "FIRST05",
    isAuto: false,
    isActive: true,
    displayOrder: 3,
  },
  {
    id: "offer-jewel-box",
    title: "Chudiwalas velvet box with every order",
    description: "Complimentary on orders above ₹75,000.",
    code: null,
    isAuto: true,
    isActive: true,
    displayOrder: 4,
  },
];
