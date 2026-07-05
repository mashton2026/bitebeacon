export type SubscriptionTier = "free" | "growth" | "pro";

export type VendorType =
  | "food_van"
  | "restaurant_takeaway"
  | "event_vendor"
  | "market_stall";

export type Van = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  isApproved?: boolean;
  instagramUrl?: string | null;
  facebookUrl?: string | null;
  websiteUrl?: string | null;
  rating: number;
  cuisine: string;
  temporary?: boolean;
  listingSource?: "admin_seeded" | "user_spotted";
  expiresAt?: string | null;
  expiredAt?: string | null;
  photo?: string | null;
  photos?: string[];
  logoUrl?: string | null;
  logoPath?: string | null;
  menuPdfUrl?: string | null;
  menuPdfName?: string | null;
  vendorName?: string;
  menu?: string;
  schedule?: string;
  what3words?: string | null;
  spotNotes?: string | null;
  vendorMessage?: string;
  isLive: boolean;
  liveUntil?: string | null;
  views?: number;
  directions?: number;
  owner_id?: string | null;
  subscriptionTier?: SubscriptionTier;
  vendorType?: VendorType;
  foodCategories?: string[];
  confirmationCount?: number;
  isSuspended?: boolean;
  suspensionReason?: string | null;
  suspendedAt?: string | null;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  subscription_status?: string | null;
};