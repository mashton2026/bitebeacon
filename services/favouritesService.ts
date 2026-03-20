import { supabase } from "../lib/supabase";
import { getCurrentUserId } from "./authService";

export { getCurrentUserId };

export async function isVendorFavourite(
  userId: string,
  vendorId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from("favourites")
    .select("id")
    .eq("user_id", userId)
    .eq("vendor_id", vendorId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return !!data;
}

export async function addFavourite(
  userId: string,
  vendorId: string
): Promise<void> {
  const { error } = await supabase.from("favourites").insert({
    user_id: userId,
    vendor_id: vendorId,
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function removeFavourite(
  userId: string,
  vendorId: string
): Promise<void> {
  const { error } = await supabase
    .from("favourites")
    .delete()
    .eq("user_id", userId)
    .eq("vendor_id", vendorId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function getUserFavouriteVendorIds(
  userId: string
): Promise<string[]> {
  const { data, error } = await supabase
    .from("favourites")
    .select("vendor_id")
    .eq("user_id", userId);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => String(row.vendor_id));
}