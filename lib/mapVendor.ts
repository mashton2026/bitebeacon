import { type SubscriptionTier, type Van } from "../types/van";

type VendorRow = {
  id: string | number;
  name?: string | null;
  lat?: number | string | null;
  lng?: number | string | null;
  rating?: number | string | null;
  cuisine?: string | null;
  temporary?: boolean | null;
  photo?: string | null;
  vendor_name?: string | null;
  menu?: string | null;
  schedule?: string | null;
  vendor_message?: string | null;
  is_live?: boolean | null;
  views?: number | null;
  directions?: number | null;
  owner_id?: string | null;
  subscription_tier?: SubscriptionTier | null;
  food_categories?: string[] | null;
};

export function mapVendorRowToVan(row: VendorRow): Van {
  return {
    id: String(row.id),
    name: row.name ?? "",
    lat: Number(row.lat ?? 0),
    lng: Number(row.lng ?? 0),
    rating: Number(row.rating ?? 0),
    cuisine: row.cuisine ?? "",
    temporary: row.temporary ?? false,
    photo: row.photo ?? null,
    vendorName: row.vendor_name ?? "",
    menu: row.menu ?? "",
    schedule: row.schedule ?? "",
    vendorMessage: row.vendor_message ?? "",
    isLive: row.is_live ?? false,
    views: row.views ?? 0,
    directions: row.directions ?? 0,
    owner_id: row.owner_id ?? null,
    subscriptionTier: row.subscription_tier ?? "free",
    foodCategories: row.food_categories ?? [],
  };
}

export function mapVendorRowsToVans(rows: VendorRow[] = []): Van[] {
  return rows.map(mapVendorRowToVan);
}