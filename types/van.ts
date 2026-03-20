export type SubscriptionTier = "free" | "growth" | "pro";

export type Van = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  rating: number;
  cuisine: string;
  temporary?: boolean;
  photo?: string | null;
  vendorName?: string;
  menu?: string;
  schedule?: string;
  vendorMessage?: string;
  isLive: boolean;
  views?: number;
  directions?: number;
  owner_id?: string | null;
  subscriptionTier?: SubscriptionTier;
  foodCategories?: string[];
};