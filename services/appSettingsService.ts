import { supabase } from "../lib/supabase";

export type AppSettings = {
  latest_android_version: number;
  minimum_android_version: number;
  update_message: string;
  play_store_url: string | null;
  force_update: boolean;
};

export async function getAppSettings(): Promise<AppSettings | null> {
  const { data, error } = await supabase
    .from("app_settings")
    .select(
      "latest_android_version, minimum_android_version, update_message, play_store_url, force_update"
    )
    .eq("id", "bitebeacon")
    .single();

  if (error) {
    console.log("Error loading app settings:", error.message);
    return null;
  }

  return data;
}