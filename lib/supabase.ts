import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, processLock } from "@supabase/supabase-js";
import { AppState, Platform } from "react-native";
import "react-native-url-polyfill/auto";

const supabaseUrl = "https://fptuzxowhfumfmfokwsi.supabase.co";
const supabaseKey = "sb_publishable_WOpKzxhcMvmvD2QgCXKYZw_0MjCSx28";

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Supabase configuration is missing.");
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    ...(Platform.OS !== "web" ? { storage: AsyncStorage } : {}),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: "pkce",
    lock: processLock,
  },
});

let hasAttachedAppStateListener = false;

if (Platform.OS !== "web" && !hasAttachedAppStateListener) {
  hasAttachedAppStateListener = true;

  AppState.addEventListener("change", (state) => {
    if (state === "active") {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}