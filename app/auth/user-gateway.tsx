import { router } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { supabase } from "../../lib/supabase";

export default function UserGatewayScreen() {
  const [isContinuingAsGuest, setIsContinuingAsGuest] = useState(false);

  async function handleContinueAsGuest() {
    setIsContinuingAsGuest(true);

    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        Alert.alert("Guest mode failed", error.message);
        return;
      }

      router.replace("/(tabs)");
    } finally {
      setIsContinuingAsGuest(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Browse BiteBeacon</Text>
      <Text style={styles.subtitle}>
        Log in to save favourites and manage your account.
      </Text>

      <Pressable
        style={styles.primaryButton}
        onPress={() => router.push("/auth/user-login")}
      >
        <Text style={styles.primaryButtonText}>Login</Text>
      </Pressable>

      <Pressable
        style={styles.secondaryButton}
        onPress={() => router.push("/auth/user-signup")}
      >
        <Text style={styles.secondaryButtonText}>Create Account</Text>
      </Pressable>

      <Pressable
        style={styles.guestButton}
        onPress={handleContinueAsGuest}
        disabled={isContinuingAsGuest}
      >
        <Text style={styles.guestButtonText}>
          {isContinuingAsGuest ? "Opening Guest Mode..." : "Continue as Guest"}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F4F2",
    justifyContent: "center",
    padding: 24,
  },

  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#0B2A5B",
    marginBottom: 10,
  },

  subtitle: {
    fontSize: 15,
    color: "#5F6368",
    marginBottom: 30,
  },

  primaryButton: {
    backgroundColor: "#0B2A5B",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    marginBottom: 12,
  },

  primaryButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },

  secondaryButton: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#0B2A5B",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    marginBottom: 12,
  },

  secondaryButtonText: {
    color: "#0B2A5B",
    fontWeight: "700",
  },

  guestButton: {
    backgroundColor: "#D9D9D9",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },

  guestButtonText: {
    fontWeight: "700",
    color: "#222",
  },
});