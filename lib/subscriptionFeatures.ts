import { type SubscriptionTier } from "../types/van";

export type SubscriptionFeatures = {
  images: boolean;
  liveStatus: boolean;
  analytics: boolean;
  reviews: boolean;
  priorityPlacement: boolean;
  notifications: boolean;
  promotions: boolean;
  featuredBadge: boolean;
  trendingBoost: boolean;
};

const subscriptionFeatureMap: Record<SubscriptionTier, SubscriptionFeatures> = {
  free: {
    images: false,
    liveStatus: false,
    analytics: false,
    reviews: false,
    priorityPlacement: false,
    notifications: false,
    promotions: false,
    featuredBadge: false,
    trendingBoost: false,
  },
  growth: {
    images: true,
    liveStatus: true,
    analytics: true,
    reviews: true,
    priorityPlacement: false,
    notifications: false,
    promotions: false,
    featuredBadge: false,
    trendingBoost: false,
  },
  pro: {
    images: true,
    liveStatus: true,
    analytics: true,
    reviews: true,
    priorityPlacement: true,
    notifications: true,
    promotions: true,
    featuredBadge: true,
    trendingBoost: true,
  },
};

export function getSubscriptionFeatures(
  tier?: SubscriptionTier
): SubscriptionFeatures {
  return subscriptionFeatureMap[tier ?? "free"];
}