import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { useEffect } from "react";
import { View } from "react-native";

export default function IndexScreen() {
  useEffect(() => {
    let isMounted = true;

    async function checkOnboarding() {
      try {


        const seenOnboarding = await AsyncStorage.getItem("seenOnboarding");

        if (!isMounted) return;

        if (seenOnboarding === "true") {
          // ✅ User has already seen onboarding
          router.replace("/welcome");
          return;
        }

        // ❗ First time user
        router.replace("/onboarding");
      } catch {
        // ✅ SAFE FALLBACK (never leave user stuck)
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