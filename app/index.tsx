import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import BiteBeaconStartup from "../components/BiteBeaconStartup";
import { supabase } from "../lib/supabase";
import { getVendorByOwnerId } from "../services/vendorService";

export default function IndexScreen() {
  const [startupFinished, setStartupFinished] = useState(false);
  const [destination, setDestination] = useState<
    | { pathname: "/vendor/dashboard"; params: { id: string } }
    | "/(tabs)"
    | "/welcome"
    | "/onboarding"
    | null
  >(null);

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
            setDestination({
              pathname: "/vendor/dashboard",
              params: { id: vendor.id },
            });
            return;
          }

          setDestination("/(tabs)");
          return;
        }

        const seenOnboarding = await AsyncStorage.getItem("seenOnboarding");

        if (!isMounted) return;

        setDestination(seenOnboarding === "true" ? "/welcome" : "/onboarding");
      } catch {
        if (isMounted) {
          setDestination("/welcome");
        }
      }
    }

    checkOnboarding();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!startupFinished || !destination) return;

    if (typeof destination === "string") {
      router.replace(destination);
    } else {
      router.replace(destination);
    }
  }, [startupFinished, destination]);

  return <BiteBeaconStartup onFinished={() => setStartupFinished(true)} />;
}
