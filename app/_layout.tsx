import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";

import { useColorScheme } from "@/hooks/use-color-scheme";

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="welcome" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="auth/login" />
        <Stack.Screen name="auth/user-gateway" />
        <Stack.Screen name="auth/user-login" />
        <Stack.Screen name="auth/user-signup" />
        <Stack.Screen name="auth/vendor-signup" />
        <Stack.Screen name="vendor/[id]" />
        <Stack.Screen name="vendor/dashboard" />
        <Stack.Screen name="vendor/pick-location" />
        <Stack.Screen name="vendor/register" />
        <Stack.Screen name="vendor/upgrade" />
        <Stack.Screen
          name="modal"
          options={{ presentation: "modal", title: "Modal" }}
        />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}