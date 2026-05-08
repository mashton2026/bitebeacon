import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { useEffect } from "react";
import { View } from "react-native";
import { supabase } from "../lib/supabase";
import { getVendorByOwnerId } from "../services/vendorService";

export default function IndexScreen() {
  useEffect(() => {
    let isMounted = true;

    async function checkOnboarding() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!isMounted) return;

        if (session?.user) {
          const vendor = await getVendorByOwnerId(session.user.id);

          if (!isMounted) return;

          if (vendor) {
            router.replace({
              pathname: "/vendor/dashboard",
              params: { id: vendor.id },
            });
            return;
          }

          router.replace("/(tabs)");
          return;
        }

        const seenOnboarding = await AsyncStorage.getItem("seenOnboarding");

        if (!isMounted) return;

        if (seenOnboarding === "true") {
          router.replace("/welcome");
          return;
        }

        router.replace("/onboarding");
      } catch {
        if (isMounted) {
          router.replace("/welcome");
        }
      }
    }

    checkOnboarding();

    return () => {
      isMounted = false;
    };
  }, []);

  return <View style={{ flex: 1 }} />;
}