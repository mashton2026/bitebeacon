import { supabase } from "../lib/supabase";
import { type Van } from "../types/van";
import { getVendorByOwnerId } from "./vendorService";

export type AuthUser = {
  id: string;
  email: string | null;
};

export async function getCurrentUser(): Promise<AuthUser | null> {
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
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
  } ``
}

export async function getCurrentUserVendor(): Promise<Van | null> {
  const user = await getCurrentUser();

  if (!user) {
    return null;
  }

  return getVendorByOwnerId(user.id);
}

export async function isCurrentUserVendor(): Promise<boolean> {
  const vendor = await getCurrentUserVendor();
  return !!vendor;
}