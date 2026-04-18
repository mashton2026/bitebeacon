import { supabase } from "../lib/supabase";
import { type Van } from "../types/van";
import { getAnyVendorByOwnerId, getVendorByOwnerId } from "./vendorService";

export type AuthUser = {
  id: string;
  email: string | null;
};

type ProfileScoutPointsRow = {
  scout_points?: number | null;
};

export async function getCurrentUser(): Promise<AuthUser | null> {
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user?.id) {
    return null;
  }

  return {
    id: data.user.id,
    email: data.user.email ?? null,
  };
}

export async function getCurrentUserId(): Promise<string | null> {
  const user = await getCurrentUser();
  return user?.id ?? null;
}

export async function getCurrentUserEmail(): Promise<string | null> {
  const user = await getCurrentUser();
  return user?.email ?? null;
}

export async function signOutCurrentUser(): Promise<void> {
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw new Error(error.message);
  }
}

export async function getCurrentUserVendor(): Promise<Van | null> {
  const user = await getCurrentUser();

  if (!user?.id) {
    return null;
  }

  return await getVendorByOwnerId(user.id);
}

export async function getUserVendorStatus(userId: string): Promise<{
  hasVendor: boolean;
  isSuspended: boolean;
}> {
  if (!userId) {
    return { hasVendor: false, isSuspended: false };
  }

  try {
    const vendor = await getAnyVendorByOwnerId(userId);

    if (!vendor) {
      return { hasVendor: false, isSuspended: false };
    }

    return {
      hasVendor: true,
      isSuspended: !!vendor.isSuspended,
    };
  } catch {
    return { hasVendor: false, isSuspended: false };
  }
}

export async function isCurrentUserVendor(): Promise<boolean> {
  const vendor = await getCurrentUserVendor();
  return Boolean(vendor);
}

export async function getCurrentUserScoutPoints(): Promise<number> {
  const user = await getCurrentUser();

  if (!user?.id) {
    return 0;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("scout_points")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  const scoutPoints = (data as ProfileScoutPointsRow | null)?.scout_points;

  return Number.isFinite(Number(scoutPoints)) ? Number(scoutPoints) : 0;
}