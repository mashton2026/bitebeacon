import { type SubscriptionTier, type Van, type VendorType } from "../types/van";

type VendorRow = {
  id: string | number;
  name?: string | null;
  lat?: number | string | null;
  lng?: number | string | null;
  rating?: number | string | null;
  cuisine?: string | null;
  temporary?: boolean | null;
  listing_source?: "admin_seeded" | "user_spotted" | null;
  expires_at?: string | null;
  expired_at?: string | null;
  photo?: string | null;
  photos?: string[] | null;
  logo_url?: string | null;
  logo_path?: string | null;
  vendor_name?: string | null;
  menu?: string | null;
  schedule?: string | null;
  menu_pdf_url?: string | null;
  menu_pdf_name?: string | null;
  vendor_message?: string | null;
  is_live?: boolean | null;
  live_until?: string | null;
  isApproved?: boolean | null;
  views?: number | null;
  directions?: number | null;
  owner_id?: string | null;
  subscription_tier?: SubscriptionTier | null;
  vendor_type?: VendorType | null;
  food_categories?: string[] | null;
  is_suspended?: boolean | null;
  suspension_reason?: string | null;
  suspended_at?: string | null;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  subscription_status?: string | null;
  instagram_url?: string | null;
  facebook_url?: string | null;
  website_url?: string | null;
  what3words?: string | null;
};

function toSafeNumber(value: number | string | null | undefined): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toSafeString(value: string | null | undefined): string {
  return typeof value === "string" ? value : "";
}

function toNullableString(value: string | null | undefined): string | null {
  return typeof value === "string" ? value : null;
}

function toSafeStringArray(value: string[] | null | undefined): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is string => typeof item === "string" && item.length > 0
  );
}

function toSafeSubscriptionTier(
  value: SubscriptionTier | null | undefined
): SubscriptionTier {
  return value === "growth" || value === "pro" || value === "free"
    ? value
    : "free";
}

export function mapVendorRowToVan(row: VendorRow): Van {
  const safePhoto = toNullableString(row.photo);
  const safePhotos =
    toSafeStringArray(row.photos);
  const mergedPhotos =
    safePhotos.length > 0 ? safePhotos : safePhoto ? [safePhoto] : [];

  return {
    id: String(row.id),
    name: toSafeString(row.name),
    lat: toSafeNumber(row.lat),
    lng: toSafeNumber(row.lng),
    rating: toSafeNumber(row.rating),
    cuisine: toSafeString(row.cuisine),
    temporary: row.temporary ?? false,
    listingSource: row.listing_source ?? "admin_seeded",
    expiresAt: toNullableString(row.expires_at),
    expiredAt: toNullableString(row.expired_at),
    photo: safePhoto,
    photos: mergedPhotos,
    logoUrl: toNullableString(row.logo_url),
    logoPath: toNullableString(row.logo_path),
    vendorName: toSafeString(row.vendor_name),
    menu: toSafeString(row.menu),
    schedule: toSafeString(row.schedule),
    menuPdfUrl: toNullableString(row.menu_pdf_url),
    menuPdfName: toNullableString(row.menu_pdf_name),
    vendorMessage: toSafeString(row.vendor_message),
    isLive: row.is_live ?? false,
    liveUntil: toNullableString(row.live_until),
    isApproved: (row as any).isApproved ?? (row as any).isapproved ?? false,
    views: typeof row.views === "number" && Number.isFinite(row.views) ? row.views : 0,
    directions:
      typeof row.directions === "number" && Number.isFinite(row.directions)
        ? row.directions
        : 0,
    owner_id: toNullableString(row.owner_id),
    subscriptionTier: toSafeSubscriptionTier(row.subscription_tier),
    vendorType: row.vendor_type ?? "food_van",
    foodCategories: toSafeStringArray(row.food_categories),
    isSuspended: row.is_suspended ?? false,
    suspensionReason: toNullableString(row.suspension_reason),
    suspendedAt: toNullableString(row.suspended_at),
    stripe_customer_id: toNullableString(row.stripe_customer_id),
    stripe_subscription_id: toNullableString(row.stripe_subscription_id),
    subscription_status: toNullableString(row.subscription_status),
    instagramUrl: toNullableString(row.instagram_url),
    facebookUrl: toNullableString(row.facebook_url),
    websiteUrl: toNullableString(row.website_url),
    what3words: toNullableString(row.what3words),
  };
}

export function mapVendorRowsToVans(rows: VendorRow[] = []): Van[] {
  return rows.map(mapVendorRowToVan);
}