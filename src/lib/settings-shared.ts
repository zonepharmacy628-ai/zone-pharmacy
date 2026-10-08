export type SiteSettings = {
  // Branding
  pharmacyName: string;
  websiteTitle: string;
  tagline: string;
  logoFileId: string | null;
  faviconFileId: string | null;
  // Homepage
  announcement: string;
  heroBadge: string;
  heroHeading: string;
  heroHighlight: string;
  heroDescription: string;
  heroImageFileId: string | null;
  popularCategoryIds: number[];
  // Delivery
  deliveryCharge: number;
  freeDeliveryThreshold: number;
  deliveryTime: string;
  deliveryMessage: string;
  // Payment
  codEnabled: boolean;
  jazzcashEnabled: boolean;
  jazzcashTitle: string;
  jazzcashNumber: string;
  bankEnabled: boolean;
  bankName: string;
  bankAccountTitle: string;
  bankAccountNumber: string;
  bankIban: string;
  // Store
  storeAddress: string;
  storePhone: string;
  storeEmail: string;
  openingTime: string;
  closingTime: string;
  currency: string;
};

export const DEFAULT_SETTINGS: SiteSettings = {
  pharmacyName: "24Zone Pharmacy",
  websiteTitle: "24Zone Pharmacy — Genuine Medicines, Fast Delivery",
  tagline: "Your Health, Our Priority",
  logoFileId: null,
  faviconFileId: null,
  announcement: "Free Delivery on Orders Above Rs. 2000",
  heroBadge: "Your Health, Our Priority",
  heroHeading: "Quality Medicines for a",
  heroHighlight: "Healthier Tomorrow",
  heroDescription: "Get genuine medicines, trusted brands and fast delivery — all at your fingertips.",
  heroImageFileId: null,
  popularCategoryIds: [],
  deliveryCharge: 150,
  freeDeliveryThreshold: 2000,
  deliveryTime: "2–5 working days",
  deliveryMessage: "Your order will be delivered within 2–5 working days.",
  codEnabled: true,
  jazzcashEnabled: false,
  jazzcashTitle: "",
  jazzcashNumber: "",
  bankEnabled: false,
  bankName: "",
  bankAccountTitle: "",
  bankAccountNumber: "",
  bankIban: "",
  storeAddress: "",
  storePhone: "",
  storeEmail: "",
  openingTime: "09:00",
  closingTime: "22:00",
  currency: "Rs.",
};

/** The subset of settings that is safe to hand to client components. */
export type PublicSettings = Pick<
  SiteSettings,
  | "pharmacyName"
  | "tagline"
  | "logoFileId"
  | "announcement"
  | "deliveryCharge"
  | "freeDeliveryThreshold"
  | "deliveryTime"
  | "currency"
  | "storePhone"
  | "storeEmail"
  | "storeAddress"
  | "openingTime"
  | "closingTime"
>;

export function toPublicSettings(s: SiteSettings): PublicSettings {
  return {
    pharmacyName: s.pharmacyName,
    tagline: s.tagline,
    logoFileId: s.logoFileId,
    announcement: s.announcement,
    deliveryCharge: s.deliveryCharge,
    freeDeliveryThreshold: s.freeDeliveryThreshold,
    deliveryTime: s.deliveryTime,
    currency: s.currency,
    storePhone: s.storePhone,
    storeEmail: s.storeEmail,
    storeAddress: s.storeAddress,
    openingTime: s.openingTime,
    closingTime: s.closingTime,
  };
}

export function deliveryChargeFor(subtotal: number, s: Pick<SiteSettings, "deliveryCharge" | "freeDeliveryThreshold">) {
  if (subtotal <= 0) return 0;
  if (s.freeDeliveryThreshold > 0 && subtotal >= s.freeDeliveryThreshold) return 0;
  return s.deliveryCharge;
}
