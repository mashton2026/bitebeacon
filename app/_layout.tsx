import { useColorScheme } from "@/hooks/use-color-scheme";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { StripeProvider } from "@stripe/stripe-react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";
import {
  Sora_700Bold,
  Sora_800ExtraBold,
  useFonts as useSoraFonts,
} from "@expo-google-fonts/sora";

import {
  Manrope_400Regular,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
  useFonts as useManropeFonts,
} from "@expo-google-fonts/manrope";

export default function RootLayout() {
  const colorScheme = useColorScheme();

  const [soraLoaded] = useSoraFonts({
    Sora_700Bold,
    Sora_800ExtraBold,
  });

  const [manropeLoaded] = useManropeFonts({
    Manrope_400Regular,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
  });

  if (!soraLoaded || !manropeLoaded) {
    return null;
  }

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