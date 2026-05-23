import * as Location from "expo-location";
import { mapVendorRowToVan, mapVendorRowsToVans } from "../lib/mapVendor";
import { supabase } from "../lib/supabase";
import { type Van } from "../types/van";
import { isCurrentUserAdmin } from "./adminService";

type CreateVendorInput = {
  id: string;
  name: string;
  vendorName: string;
  cuisine: string;
  menu: string;
  schedule: string;
  lat: number;
  lng: number;
  instagramUrl?: string;
  facebookUrl?: string;
  websiteUrl?: string;
  what3words?: string | null;
  isApproved?: boolean;
  photo?: string | null;
  photos?: string[];
  logoUrl?: string | null;
  logoPath?: string | null;
  menuPdfUrl?: string | null;
  menuPdfName?: string | null;
  temporary?: boolean;
  listingSource?: "admin_seeded" | "user_spotted";
  expiresAt?: string;
  isLive?: boolean;
  owner_id?: string | null;
  spottedBy?: string | null;
  views?: number;
  directions?: number;
  rating?: number;
  subscriptionTier?: "free" | "growth" | "pro";
  vendorType?: "food_van" | "restaurant_takeaway" | "event_vendor" | "market_stall";
  foodCategories?: string[];
};

type UpdateVendorInput = {
  name?: string;
  vendorName?: string;
  cuisine?: string;
  menu?: string;
  schedule?: string;
  photo?: string | null;
  photos?: string[];
  logoUrl?: string | null;
  logoPath?: string | null;
  menuPdfUrl?: string | null;
  menuPdfName?: string | null;
  isLive?: boolean;
  foodCategories?: string[];
};

export async function getAllVendors(): Promise<Van[]> {
  const { data, error } = await supabase
    .from("vendors")
    .select("*")
    .eq("is_suspended", false)
    .eq("isApproved", true)
    .or(
      "listing_source.eq.admin_seeded,and(listing_source.eq.user_spotted,expires_at.is.null),and(listing_source.eq.user_spotted,expires_at.gte.now())"
    );

  if (error) throw new Error(error.message);

  const vendors = data ?? [];

  // Get spotted vendor IDs
  const spottedVendorIds = vendors
    .filter((vendor) => vendor.listing_source === "user_spotted")
    .map((vendor) => String(vendor.id));

  let confirmationCounts = new Map<string, number>();

  // Only fetch confirmations if needed
  if (spottedVendorIds.length > 0) {
    const { data: confirmations, error: confirmationsError } = await supabase
      .from("vendor_confirmations")
      .select("vendor_id");

    if (confirmationsError) throw new Error(confirmationsError.message);

    for (const confirmation of confirmations ?? []) {
      const vendorId = String(confirmation.vendor_id);
      confirmationCounts.set(
        vendorId,
        (confirmationCounts.get(vendorId) ?? 0) + 1
      );
    }
  }

  const mapped = mapVendorRowsToVans(vendors);

  // Attach confirmationCount to ALL vendors safely
  return mapped.map((vendor) => ({
    ...vendor,
    confirmationCount: confirmationCounts.get(String(vendor.id)) ?? 0,
  }));
}

export async function getAllVendorsForAdmin(): Promise<Van[]> {
  const { data, error } = await supabase
    .from("vendors")
    .select("*");

  if (error) throw new Error(error.message);

  return mapVendorRowsToVans(data ?? []);
}

export async function getVendorById(id: string): Promise<Van | null> {
  if (!id?.trim()) return null;

  const { data, error } = await supabase
    .from("vendors")
    .select("*")
    .eq("id", id)
    .eq("is_suspended", false)
    .eq("isApproved", true)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  return mapVendorRowToVan(data);
}

export async function getVendorByOwnerId(ownerId: string): Promise<Van | null> {
  if (!ownerId?.trim()) return null;

  const { data, error } = await supabase
    .from("vendors")
    .select("*")
    .eq("owner_id", ownerId)
    .eq("is_suspended", false)
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  return mapVendorRowToVan(data);
}

export async function getAnyVendorByOwnerId(ownerId: string): Promise<Van | null> {
  if (!ownerId?.trim()) return null;

  const { data, error } = await supabase
    .from("vendors")
    .select("*")
    .eq("owner_id", ownerId)
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  return mapVendorRowToVan(data);
}

export async function createVendor(input: CreateVendorInput): Promise<void> {

  // Step 3: Check for existing nearby spotted vendor
  if ((input.listingSource ?? "admin_seeded") === "user_spotted") {
    const radius = 0.001; // ~100m

    const { data: existing } = await supabase
      .from("vendors")
      .select("id, name, lat, lng")
      .eq("listing_source", "user_spotted")
      .gte("lat", input.lat - radius)
      .lte("lat", input.lat + radius)
      .gte("lng", input.lng - radius)
      .lte("lng", input.lng + radius);

    if (existing && existing.length > 0) {
      const normalizedInputName = input.name.trim().toLowerCase();

      const match = existing.find((v) =>
        v.name?.trim().toLowerCase() === normalizedInputName
      );

      if (match && input.spottedBy) {
        // Add confirmation instead of creating new vendor
        const { error: confirmationError } = await supabase
          .from("vendor_confirmations")
          .insert({
            vendor_id: match.id,
            user_id: input.spottedBy,
          });

        if (confirmationError) throw new Error(confirmationError.message);

        return; // STOP here, do not create duplicate vendor
      }
    }
  }
  const { data, error } = await supabase
    .from("vendors")
    .insert({
      id: input.id,
      name: input.name,
      vendor_name: input.vendorName,
      cuisine: input.cuisine,
      menu: input.menu,
      schedule: input.schedule,
      lat: input.lat,
      lng: input.lng,
      rating: input.rating ?? 0,
      temporary: input.temporary ?? false,
      listing_source: input.listingSource ?? "admin_seeded",
      expires_at: input.expiresAt ?? null,
      isApproved: input.isApproved ?? true,
      photo: input.photo ?? input.photos?.[0] ?? null,
      photos: input.photos ?? (input.photo ? [input.photo] : []),
      logo_url: input.logoUrl ?? null,
      logo_path: input.logoPath ?? null,
      menu_pdf_url: input.menuPdfUrl ?? null,
      menu_pdf_name: input.menuPdfName ?? null,
      is_live: input.isLive ?? false,
      owner_id: input.owner_id ?? null,
      spotted_by: input.spottedBy ?? null,
      views: input.views ?? 0,
      directions: input.directions ?? 0,
      subscription_tier: input.subscriptionTier ?? "free",
      vendor_type: input.vendorType ?? "food_van",
      food_categories: input.foodCategories ?? [],
      what3words: input.what3words ?? null,
      instagram_url: input.instagramUrl ?? null,
      facebook_url: input.facebookUrl ?? null,
      website_url: input.websiteUrl ?? null,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  if ((input.listingSource ?? "admin_seeded") === "user_spotted" && data?.id && input.spottedBy) {
    const { error: confirmationError } = await supabase
      .from("vendor_confirmations")
      .insert({
        vendor_id: data.id,
        user_id: input.spottedBy,
      });

    if (confirmationError) throw new Error(confirmationError.message);
  }
}

export async function createOwnedVendor(input: {
  name: string;
  vendorName: string;
  cuisine: string;
  menu: string;
  schedule: string;
  lat: number;
  lng: number;
}): Promise<void> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) throw new Error(error.message);
  if (!user) throw new Error("Not authenticated");

  await createVendor({
    id: `vendor-${Date.now()}`,
    name: input.name,
    vendorName: input.vendorName,
    cuisine: input.cuisine,
    menu: input.menu,
    schedule: input.schedule,
    lat: input.lat,
    lng: input.lng,
    temporary: false,
    listingSource: "admin_seeded",
    isApproved: false,
    isLive: false,
    owner_id: user.id,
    subscriptionTier: "free",
    foodCategories: [],
  });
}

export async function updateVendor(
  id: string,
  input: UpdateVendorInput
): Promise<void> {
  if (!id?.trim()) {
    throw new Error("Vendor id is required.");
  }

  const updates: Record<string, unknown> = {};

  if (input.name !== undefined) updates.name = input.name;
  if (input.vendorName !== undefined) updates.vendor_name = input.vendorName;
  if (input.cuisine !== undefined) updates.cuisine = input.cuisine;
  if (input.menu !== undefined) updates.menu = input.menu;
  if (input.schedule !== undefined) updates.schedule = input.schedule;
  if (input.photo !== undefined) updates.photo = input.photo;

  if (input.photos !== undefined) {
    updates.photos = input.photos;
    updates.photo = input.photos[0] ?? null;
  }
  if (input.logoUrl !== undefined) updates.logo_url = input.logoUrl;
  if (input.logoPath !== undefined) updates.logo_path = input.logoPath;
  if (input.menuPdfUrl !== undefined) updates.menu_pdf_url = input.menuPdfUrl;
  if (input.menuPdfName !== undefined) updates.menu_pdf_name = input.menuPdfName;
  if (input.isLive !== undefined) updates.is_live = input.isLive;
  if (input.foodCategories !== undefined) {
    updates.food_categories = input.foodCategories;
  }

  const { error } = await supabase.from("vendors").update(updates).eq("id", id);

  if (error) throw new Error(error.message);
}

export async function deleteVendor(id: string): Promise<void> {
  if (!id?.trim()) {
    throw new Error("Vendor id is required.");
  }

  const { error } = await supabase.from("vendors").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function updateVendorSubscriptionTier(
  id: string,
  tier: "free" | "growth" | "pro"
): Promise<void> {
  if (!id?.trim()) {
    throw new Error("Vendor id is required.");
  }

  const updates =
    tier === "free"
      ? { subscription_tier: tier, is_live: false }
      : { subscription_tier: tier };

  const { error } = await supabase
    .from("vendors")
    .update(updates)
    .eq("id", id);

  if (error) throw new Error(error.message);
}

export async function setVendorLiveStatus(
  id: string,
  isLive: boolean
): Promise<void> {
  if (!id?.trim()) {
    throw new Error("Vendor id is required.");
  }

  const { error } = await supabase
    .from("vendors")
    .update({ is_live: isLive })
    .eq("id", id);

  if (error) throw new Error(error.message);
}

async function incrementVendorCounter(
  id: string,
  field: "views" | "directions"
): Promise<number> {
  const { data, error } = await supabase
    .from("vendors")
    .select(field)
    .eq("id", id)
    .single();

  if (error || !data) {
    throw new Error(`Failed to fetch ${field}`);
  }

  const currentValue =
    field === "views"
      ? Number((data as { views?: number | null }).views ?? 0)
      : Number((data as { directions?: number | null }).directions ?? 0);

  const nextValue = currentValue + 1;

  const { data: updated, error: updateError } = await supabase
    .from("vendors")
    .update({ [field]: nextValue })
    .eq("id", id)
    .select(field)
    .maybeSingle();

  if (updateError || !updated) {
    throw new Error(`Failed to update ${field}`);
  }

  return field === "views"
    ? Number((updated as { views?: number | null }).views ?? nextValue)
    : Number(
      (updated as { directions?: number | null }).directions ?? nextValue
    );
}

export async function incrementVendorViews(id: string): Promise<number> {
  if (!id?.trim()) return 0;

  const { data, error } = await supabase.rpc("increment_vendor_views", {
    p_vendor_id: id,
  });

  if (error) throw new Error(error.message);

  return Number(data ?? 0);
}

export async function incrementVendorDirections(id: string): Promise<number> {
  if (!id?.trim()) return 0;

  const { data, error } = await supabase.rpc("increment_vendor_directions", {
    p_vendor_id: id,
  });

  if (error) throw new Error(error.message);

  return Number(data ?? 0);
}

export async function suspendVendor(id: string, reason: string) {
  const { error } = await supabase.rpc("suspend_vendor", {
    p_vendor_id: id,
    p_reason: reason,
  });
  if (error) throw new Error(error.message);
}

export async function unsuspendVendor(id: string) {
  const { error } = await supabase.rpc("unsuspend_vendor", {
    p_vendor_id: id,
  });
  if (error) throw new Error(error.message);
}

export async function adminUpdateVendor(input: {
  id: string;
  name: string;
  vendorName: string;
  cuisine: string;
  menu: string;
  schedule: string;
  vendorMessage?: string;
  foodCategories: string[];
  subscriptionTier: "free" | "growth" | "pro";
  isLive: boolean;
  lat: number;
  lng: number;
}) {
  const { error } = await supabase.rpc("admin_update_vendor", {
    p_vendor_id: input.id,
    p_name: input.name,
    p_vendor_name: input.vendorName,
    p_cuisine: input.cuisine,
    p_menu: input.menu,
    p_schedule: input.schedule,
    p_vendor_message: input.vendorMessage ?? "",
    p_food_categories: input.foodCategories,
    p_subscription_tier: input.subscriptionTier,
    p_is_live: input.isLive,
    p_lat: input.lat,
    p_lng: input.lng,
  });

  if (error) throw new Error(error.message);
}

export async function adminRemoveVendorPhoto(
  vendorId: string,
  photoUrl: string
) {
  const { error } = await supabase.rpc("admin_remove_vendor_photo", {
    p_vendor_id: vendorId,
    p_photo_url: photoUrl,
  });

  if (error) throw new Error(error.message);
}

export async function adminDeleteVendor(vendorId: string) {
  if (!vendorId?.trim()) {
    throw new Error("Vendor id is required.");
  }

  const isAdmin = await isCurrentUserAdmin();

  if (!isAdmin) {
    throw new Error("Admin access required.");
  }

  const { error } = await supabase.rpc("admin_delete_vendor", {
    p_vendor_id: vendorId,
  });

  if (error) throw new Error(error.message);
}

export async function rewardScoutPointForClaim(vendorId: string): Promise<void> {
  const { data: vendor, error: vendorError } = await supabase
    .from("vendors")
    .select("id, owner_id, rewarded_for_claim")
    .eq("id", vendorId)
    .maybeSingle();

  if (vendorError) {
    throw new Error(vendorError.message);
  }

  if (!vendor) return;

  const ownerId = (vendor as {
    owner_id?: string | null;
    rewarded_for_claim?: boolean | null;
  }).owner_id;

  const rewardedForClaim = (vendor as {
    owner_id?: string | null;
    rewarded_for_claim?: boolean | null;
  }).rewarded_for_claim;

  if (!ownerId) return;
  if (rewardedForClaim) return;

  const { data: confirmations, error: confirmationsError } = await supabase
    .from("vendor_confirmations")
    .select("user_id")
    .eq("vendor_id", vendorId);

  if (confirmationsError) {
    throw new Error(confirmationsError.message);
  }

  const uniqueUserIds = Array.from(
    new Set(
      (confirmations ?? [])
        .map((confirmation) => confirmation.user_id)
        .filter((userId): userId is string => !!userId && userId !== ownerId)
    )
  );

  if (uniqueUserIds.length === 0) {
    const { error: rewardFlagError } = await supabase
      .from("vendors")
      .update({ rewarded_for_claim: true })
      .eq("id", vendorId);

    if (rewardFlagError) {
      throw new Error(rewardFlagError.message);
    }

    return;
  }

  for (const userId of uniqueUserIds) {
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("scout_points")
      .eq("id", userId)
      .maybeSingle();

    if (profileError) {
      throw new Error(profileError.message);
    }

    const currentPoints = Number(
      (profile as { scout_points?: number | null } | null)?.scout_points ?? 0
    );

    const { error: upsertError } = await supabase.from("profiles").upsert(
      {
        id: userId,
        scout_points: currentPoints + 1,
      },
      {
        onConflict: "id",
      }
    );

    if (upsertError) {
      throw new Error(upsertError.message);
    }
  }

  const { error: rewardFlagError } = await supabase
    .from("vendors")
    .update({ rewarded_for_claim: true })
    .eq("id", vendorId);

  if (rewardFlagError) {
    throw new Error(rewardFlagError.message);
  }
}

export async function canCountVendorInteraction(
  vendorId: string,
  userId: string,
  interactionType: "view" | "direction",
  cooldownMinutes: number
): Promise<boolean> {
  const cutoff = new Date(
    Date.now() - cooldownMinutes * 60 * 1000
  ).toISOString();

  const { data, error } = await supabase
    .from("vendor_interactions")
    .select("id")
    .eq("vendor_id", vendorId)
    .eq("user_id", userId)
    .eq("interaction_type", interactionType)
    .gte("created_at", cutoff)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.log("Interaction check error:", error.message);
    return false;
  }

  return !data;
}

export async function recordVendorInteraction(
  vendorId: string,
  userId: string,
  interactionType: "view" | "direction"
): Promise<void> {
  try {
    let lat: number | null = null;
    let lng: number | null = null;

    try {
      const existingPermission = await Location.getForegroundPermissionsAsync();

      let permission = existingPermission;

      if (!existingPermission.granted) {
        permission = await Location.requestForegroundPermissionsAsync();
      }

      if (permission.granted) {
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        lat = location.coords.latitude;
        lng = location.coords.longitude;
      }
    } catch {
      // fail silently
    }

    const { error } = await supabase.from("vendor_interactions").insert({
      vendor_id: vendorId,
      user_id: userId,
      interaction_type: interactionType,
      lat,
      lng,
    });

    if (error) {
      console.log("Interaction record error:", error.message);
    }
  } catch (err) {
    console.log("Interaction error:", err);
  }
}

export async function getUserVendorRating(
  vendorId: string,
  userId: string
): Promise<number | null> {
  const { data, error } = await supabase
    .from("vendor_ratings")
    .select("rating")
    .eq("vendor_id", vendorId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data?.rating ?? null;
}

export async function getVendorRatingCount(
  vendorId: string
): Promise<number> {
  const { count, error } = await supabase
    .from("vendor_ratings")
    .select("*", { count: "exact", head: true })
    .eq("vendor_id", vendorId);

  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function upsertVendorRating(
  vendorId: string,
  userId: string,
  rating: number
): Promise<void> {
  const { error } = await supabase.from("vendor_ratings").upsert(
    {
      vendor_id: vendorId,
      user_id: userId,
      rating,
    },
    {
      onConflict: "vendor_id,user_id",
    }
  );

  if (error) throw new Error(error.message);
}

export async function refreshVendorRating(
  vendorId: string
): Promise<number> {
  const { data, error } = await supabase.rpc("refresh_vendor_rating", {
    p_vendor_id: vendorId,
  });

  if (error) throw new Error(error.message);
  return Number(data ?? 0);
}

export async function approveVendor(vendorId: string): Promise<void> {
  const { error } = await supabase
    .from("vendors")
    .update({ isApproved: true }) // ✅ CORRECT
    .eq("id", vendorId);

  if (error) throw new Error(error.message);
}