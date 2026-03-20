import { mapVendorRowToVan, mapVendorRowsToVans } from "../lib/mapVendor";
import { supabase } from "../lib/supabase";
import { type Van } from "../types/van";

type CreateVendorInput = {
  id: string;
  name: string;
  vendorName: string;
  cuisine: string;
  menu: string;
  schedule: string;
  lat: number;
  lng: number;
  photo?: string | null;
  temporary?: boolean;
  isLive?: boolean;
  owner_id?: string | null;
  views?: number;
  directions?: number;
  rating?: number;
  subscriptionTier?: "free" | "growth" | "pro";
  foodCategories?: string[];
};

type UpdateVendorInput = {
  name?: string;
  vendorName?: string;
  cuisine?: string;
  menu?: string;
  schedule?: string;
  photo?: string | null;
  isLive?: boolean;
  foodCategories?: string[];
};

export async function getAllVendors(): Promise<Van[]> {
  const { data, error } = await supabase.from("vendors").select("*");

  if (error) {
    throw new Error(error.message);
  }

  return mapVendorRowsToVans(data ?? []);
}

export async function getVendorById(id: string): Promise<Van | null> {
  const { data, error } = await supabase
    .from("vendors")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return null;
  }

  return mapVendorRowToVan(data);
}

export async function getVendorByOwnerId(ownerId: string): Promise<Van | null> {
  const { data, error } = await supabase
    .from("vendors")
    .select("*")
    .eq("owner_id", ownerId)
    .order("id", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  if (!data || data.length === 0) {
    return null;
  }

  return mapVendorRowToVan(data[0]);
}

export async function createVendor(input: CreateVendorInput): Promise<void> {
  const { error } = await supabase.from("vendors").insert({
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
    photo: input.photo ?? null,
    is_live: input.isLive ?? false,
    owner_id: input.owner_id ?? null,
    views: input.views ?? 0,
    directions: input.directions ?? 0,
    subscription_tier: input.subscriptionTier ?? "free",
    food_categories: input.foodCategories ?? [],
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function updateVendor(
  id: string,
  input: UpdateVendorInput
): Promise<void> {
  const updates: Record<string, unknown> = {};

  if (input.name !== undefined) updates.name = input.name;
  if (input.vendorName !== undefined) updates.vendor_name = input.vendorName;
  if (input.cuisine !== undefined) updates.cuisine = input.cuisine;
  if (input.menu !== undefined) updates.menu = input.menu;
  if (input.schedule !== undefined) updates.schedule = input.schedule;
  if (input.photo !== undefined) updates.photo = input.photo;
  if (input.isLive !== undefined) updates.is_live = input.isLive;
  if (input.foodCategories !== undefined) updates.food_categories = input.foodCategories;

  const { error } = await supabase.from("vendors").update(updates).eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}

export async function deleteVendor(id: string): Promise<void> {
  const { error } = await supabase.from("vendors").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}

export async function setVendorLiveStatus(
  id: string,
  isLive: boolean
): Promise<void> {
  const { error } = await supabase
    .from("vendors")
    .update({ is_live: isLive })
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}

export async function incrementVendorDirections(
  id: string,
  currentDirections: number
): Promise<number> {
  const nextDirections = currentDirections + 1;

  const { error } = await supabase
    .from("vendors")
    .update({ directions: nextDirections })
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  return nextDirections;
}