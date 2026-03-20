import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { theme } from "../../constants/theme";
import {
  getCurrentUser,
  getCurrentUserVendor,
  signOutCurrentUser,
} from "../../services/authService";

export default function AccountScreen() {
  const [email, setEmail] = useState<string | null>(null);
  const [isVendor, setIsVendor] = useState(false);
  const [vendorId, setVendorId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadUser();
    }, [])
  );

  async function loadUser() {
    const user = await getCurrentUser();

    if (!user) {
      setEmail(null);
      setIsVendor(false);
      setVendorId(null);
      return;
    }

    setEmail(user.email);

    try {
      const vendor = await getCurrentUserVendor();

      if (vendor) {
        setIsVendor(true);
        setVendorId(vendor.id);
        return;
      }

      setIsVendor(false);
      setVendorId(null);
    } catch {
      setIsVendor(false);
      setVendorId(null);
    }
  }

  async function handleLogout() {
    try {
      await signOutCurrentUser();
      router.replace("/welcome");
    } catch (error) {
      Alert.alert(
        "Logout failed",
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Your Account</Text>

      <Text style={styles.subtitle}>
        {email ? `Signed in as ${email}` : "You are browsing as a guest."}
      </Text>

      {!email ? (
        <>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Welcome to BiteBeacon</Text>
            <Text style={styles.cardText}>
              Browse vendors as a guest, or create an account to save favourites
              and build your own BiteBeacon experience.
            </Text>
          </View>

          <View style={styles.actionGroup}>
            <Pressable
              style={styles.primaryButton}
              onPress={() => router.push("/auth/user-login")}
            >
              <Text style={styles.primaryButtonText}>User Login</Text>
            </Pressable>

            <Pressable
              style={styles.secondaryButton}
              onPress={() => router.push("/auth/user-signup")}
            >
              <Text style={styles.secondaryButtonText}>Create User Account</Text>
            </Pressable>

            <Pressable
              style={styles.secondaryButton}
              onPress={() => router.push("/auth/login")}
            >
              <Text style={styles.secondaryButtonText}>Vendor Portal</Text>
            </Pressable>
          </View>
        </>
      ) : !isVendor ? (
        <>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>User Dashboard</Text>
            <Text style={styles.cardText}>
              Use your account to keep track of favourites and quickly jump back
              into discovery.
            </Text>
          </View>

          <View style={styles.grid}>
            <Pressable
              style={styles.gridCard}
              onPress={() => router.push("/(tabs)/favourites")}
            >
              <Text style={styles.gridCardTitle}>Favourites</Text>
              <Text style={styles.gridCardText}>
                View your saved food vendors
              </Text>
            </Pressable>

            <Pressable
              style={styles.gridCard}
              onPress={() => router.push("/(tabs)/explore")}
            >
              <Text style={styles.gridCardTitle}>Open Map</Text>
              <Text style={styles.gridCardText}>
                Discover vendors near you
              </Text>
            </Pressable>
          </View>

          <Pressable style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutButtonText}>Log Out</Text>
          </Pressable>
        </>
      ) : (
        <>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Vendor Signed In</Text>
            <Text style={styles.cardText}>
              Your vendor tools live in the Vendor Dashboard, where you can
              manage your listing, update details, and control live status.
            </Text>
          </View>

          <View style={styles.grid}>
            {vendorId ? (
              <Pressable
                style={styles.gridCard}
                onPress={() =>
                  router.push({
                    pathname: "/vendor/dashboard",
                    params: { id: vendorId },
                  })
                }
              >
                <Text style={styles.gridCardTitle}>Dashboard</Text>
                <Text style={styles.gridCardText}>
                  Manage your vendor listing
                </Text>
              </Pressable>
            ) : null}

            <Pressable
              style={styles.gridCard}
              onPress={() => {
                if (vendorId) {
                  router.push({
                    pathname: "/vendor/dashboard",
                    params: { id: vendorId },
                  });
                  return;
                }

                router.push("/auth/login");
              }}
            >
              <Text style={styles.gridCardTitle}>Vendor Portal</Text>
              <Text style={styles.gridCardText}>
                Return to vendor tools
              </Text>
            </Pressable>
          </View>

          <Pressable style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutButtonText}>Log Out</Text>
          </Pressable>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: 24,
  },

  title: {
    fontSize: 30,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 8,
  },

  subtitle: {
    fontSize: 15,
    color: "rgba(255,255,255,0.75)",
    marginBottom: 24,
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 18,
    marginBottom: 20,
  },

  cardTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0B2A5B",
    marginBottom: 8,
  },

  cardText: {
    fontSize: 15,
    color: "#444",
    lineHeight: 22,
  },

  actionGroup: {
    gap: 12,
  },

  grid: {
    gap: 12,
    marginBottom: 20,
  },

  gridCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 18,
  },

  gridCardTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0B2A5B",
    marginBottom: 6,
  },

  gridCardText: {
    fontSize: 14,
    color: "#555",
    lineHeight: 20,
  },

  primaryButton: {
    backgroundColor: "#FFFFFF",
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
  },

  primaryButtonText: {
    color: "#0B2A5B",
    fontSize: 16,
    fontWeight: "700",
  },

  secondaryButton: {
    backgroundColor: "#FF7A00",
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
  },

  secondaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },

  logoutButton: {
    backgroundColor: "#C62828",
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
  },

  logoutButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});