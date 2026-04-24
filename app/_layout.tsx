import { useColorScheme } from "@/hooks/use-color-scheme";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { StripeProvider } from "@stripe/stripe-react-native";
import * as Linking from "expo-linking";
import { router, Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import "react-native-reanimated";
import { supabase } from "../lib/supabase";

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    const handleDeepLink = async (url: string | null) => {
      if (!url) return;

      // Only handle Supabase auth callbacks
      if (!url.includes("code=")) return;

      const { error } = await supabase.auth.exchangeCodeForSession(url);

      if (error) {
        console.log("Auth error:", error.message);
        router.replace("/auth/user-login");
        return;
      }

      setTimeout(() => {
        router.replace("/(tabs)");
      }, 300);
    };

    // App opened from email link
    Linking.getInitialURL().then(handleDeepLink);

    // App already open
    const subscription = Linking.addEventListener("url", (event) => {
      handleDeepLink(event.url);
    });

    return () => {
      subscription.remove();
    };
  }, []);

  return (
    <StripeProvider publishableKey="pk_live_51TFFsuPDTRLYMBotQCGmmVzsFgb3fgRZW7jfHj82O2HSN1GYRa5XL7pcGjLmSXKbNHyJB81GOIRo1y2AuqAGjXyD00hWak2boz">
      <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="welcome" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="auth/login" />
          <Stack.Screen name="auth/forgot-password" />
          <Stack.Screen name="auth/user-gateway" />
          <Stack.Screen name="auth/user-login" />
          <Stack.Screen name="auth/user-signup" />
          <Stack.Screen name="auth/vendor-signup" />
          <Stack.Screen name="vendor/[id]" />
          <Stack.Screen name="vendor/dashboard" />
          <Stack.Screen name="vendor/pick-location" />
          <Stack.Screen name="vendor/register" />
          <Stack.Screen name="vendor/upgrade" />
          <Stack.Screen name="vendor/claim" />
          <Stack.Screen name="vendor/claim-select" />
          <Stack.Screen name="vendor/report" />
          <Stack.Screen name="account/security" />
          <Stack.Screen name="account/help" />
          <Stack.Screen name="account/terms" />
          <Stack.Screen name="account/privacy" />
          <Stack.Screen name="admin/index" />
          <Stack.Screen name="admin/claims" />
          <Stack.Screen name="admin/vendors" />
          <Stack.Screen name="admin/subscriptions" />
          <Stack.Screen name="admin/reports" />
          <Stack.Screen name="admin/deletion-requests" />
          <Stack.Screen name="admin/edit-vendor" />
          <Stack.Screen
            name="modal"
            options={{ presentation: "modal", title: "Modal" }}
          />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </StripeProvider>
  );
}