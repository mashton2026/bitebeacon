import { router } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { theme } from "../../constants/theme";
import { supabase } from "../../lib/supabase";

export default function UserGatewayScreen() {
  const [isContinuingAsGuest, setIsContinuingAsGuest] = useState(false);

  async function handleContinueAsGuest() {
    if (isContinuingAsGuest) return;

    setIsContinuingAsGuest(true);

    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        console.log("Signout error:", error.message);
      }

      router.replace("/(tabs)");
    } catch (error) {
      Alert.alert(
        "Guest mode failed",
        error instanceof Error ? error.message : "Unknown error"
      );
    } finally {
      setIsContinuingAsGuest(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.heroBlock}>
        <Text style={styles.kicker}>GET STARTED</Text>
        <Text style={styles.title}>Browse BiteBeacon</Text>
        <Text style={styles.subtitle}>
          Log in to save favourites and manage your account, or continue as a
          guest and start discovering food vendors right away.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Choose how you want to continue</Text>
        <Text style={styles.cardText}>
          Create an account for the full BiteBeacon experience, or jump straight
          in as a guest.
        </Text>

        <Pressable
          style={[
            styles.primaryButton,
            isContinuingAsGuest && styles.buttonDisabled,
          ]}
          onPress={() => router.push("/auth/user-login")}
          disabled={isContinuingAsGuest}
        >
          <Text style={styles.primaryButtonText}>Login</Text>
        </Pressable>

        <Pressable
          style={[
            styles.secondaryButton,
            isContinuingAsGuest && styles.buttonDisabled,
          ]}
          onPress={() => router.push("/auth/user-signup")}
          disabled={isContinuingAsGuest}
        >
          <Text style={styles.secondaryButtonText}>Create Account</Text>
        </Pressable>

        <Pressable
          style={[
            styles.guestButton,
            isContinuingAsGuest && styles.buttonDisabled,
          ]}
          onPress={handleContinueAsGuest}
          disabled={isContinuingAsGuest}
        >
          <Text style={styles.guestButtonText}>
            {isContinuingAsGuest ? "Opening Guest Mode..." : "Continue as Guest"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: "center",
    padding: 24,
  },
  heroBlock: {
    marginBottom: 24,
  },
  kicker: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.2,
    color: theme.colors.secondary,
    marginBottom: 8,
  },
  title: {
    fontSize: 34,
    fontWeight: "800",
    color: theme.colors.textOnDark,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: "rgba(255,255,255,0.78)",
  },
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: 24,
    padding: 20,
    borderWidth: 2,
    borderColor: theme.colors.border,
    shadowColor: "#000",
    shadowOpacity: 0.14,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: theme.colors.background,
    marginBottom: 8,
  },
  cardText: {
    fontSize: 15,
    lineHeight: 22,
    color: theme.colors.muted,
    marginBottom: 18,
  },
  primaryButton: {
    backgroundColor: theme.colors.background,
    paddingVertical: 15,
    borderRadius: 16,
    alignItems: "center",
    marginBottom: 12,
  },
  primaryButtonText: {
    color: theme.colors.textOnDark,
    fontSize: 16,
    fontWeight: "800",
  },
  secondaryButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 15,
    borderRadius: 16,
    alignItems: "center",
    marginBottom: 12,
  },
  secondaryButtonText: {
    color: theme.colors.textOnDark,
    fontSize: 16,
    fontWeight: "800",
  },
  guestButton: {
    backgroundColor: "#D9D9D9",
    paddingVertical: 15,
    borderRadius: 16,
    alignItems: "center",
  },
  guestButtonText: {
    color: "#222222",
    fontSize: 16,
    fontWeight: "700",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});