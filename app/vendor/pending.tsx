import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { supabase } from "../../lib/supabase";

const GOLD = "#FFE59A";
const NAVY = "#071725";

export default function VendorPendingScreen() {
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function handleSignOut() {
    if (isSigningOut) return;
    setIsSigningOut(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      router.replace("/auth/login");
    } catch (error) {
      Alert.alert(
        "Sign out failed",
        error instanceof Error ? error.message : "Please try again."
      );
    } finally {
      setIsSigningOut(false);
    }
  }

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.iconShell}>
       <MaterialCommunityIcons name="shield-check-outline" size={36} color={GOLD} />
        </View>
        <Text style={styles.kicker}>APPLICATION RECEIVED</Text>
        <Text style={styles.title}>Your listing is under review</Text>
        <Text style={styles.body}>
          Thanks for creating your BiteBeacon vendor listing.
        </Text>
        <Text style={styles.body}>
          Your listing has been submitted and is waiting for admin approval before
          it appears publicly on the map.
        </Text>

        <View style={styles.statusGlow}>
          <LinearGradient
            colors={["#684006", "#FFD66B", "#FFF5CC", "#B7750E", "#FFE59A", "#7A4B09"]}
            locations={[0, 0.18, 0.34, 0.59, 0.81, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.statusFrame}
          >
            <View style={styles.statusCard}>
              <View style={styles.statusHeading}>
                <MaterialCommunityIcons name="clock-check-outline" size={22} color={GOLD} />
                <Text style={styles.statusLabel}>CURRENT STATUS</Text>
              </View>
              <Text style={styles.statusValue}>Pending Approval</Text>
              <Text style={styles.statusSubtext}>Our team will review your listing.</Text>
            </View>
          </LinearGradient>
        </View>

        <View style={styles.noteRow}>
          <MaterialCommunityIcons name="information-outline" size={20} color={GOLD} />
          <Text style={styles.note}>
            We may contact you if we need extra proof of ownership or verification
            details.
          </Text>
        </View>

        <Pressable onPress={() => router.replace("/(tabs)")} style={styles.buttonOuter}>
          <LinearGradient
            colors={["#8C5709", "#FFE7A1", "#F7BD45", "#FFF1C1", "#B67B17"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.primaryButton}
          >
            <MaterialCommunityIcons name="home-outline" size={20} color={NAVY} />
            <Text style={styles.primaryButtonText}>Back to Home</Text>
          </LinearGradient>
        </Pressable>

        <Pressable
          style={styles.secondaryButton}
          onPress={handleSignOut}
          disabled={isSigningOut}
        >
          <MaterialCommunityIcons name="account-switch-outline" size={19} color={GOLD} />
          <Text style={styles.secondaryButtonText}>
            {isSigningOut ? "Signing out..." : "Log Out / Switch Account"}
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: NAVY },
  container: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 56,
    paddingBottom: 40,
    justifyContent: "center",
  },
  iconShell: {
    width: 68,
    height: 68,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,213,113,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,229,154,0.50)",
    marginBottom: 22,
  },
  kicker: {
    fontSize: 12,
    fontWeight: "900",
    color: GOLD,
    letterSpacing: 1.6,
    marginBottom: 10,
  },
  title: {
    fontSize: 34,
    fontWeight: "900",
    color: "#FFFFFF",
    marginBottom: 16,
    lineHeight: 41,
  },
  body: {
    fontSize: 16,
    color: "rgba(255,255,255,0.80)",
    lineHeight: 24,
    marginBottom: 12,
  },
  statusGlow: {
    marginTop: 18,
    marginBottom: 20,
    borderRadius: 23,
    shadowColor: "#FFCC55",
    shadowOpacity: 0.32,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 3 },
    elevation: 7,
  },
  statusFrame: { borderRadius: 23, padding: 2 },
  statusCard: {
    borderRadius: 21,
    backgroundColor: "#0B2338",
    padding: 20,
  },
  statusHeading: { flexDirection: "row", alignItems: "center", gap: 9, marginBottom: 11 },
  statusLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: GOLD,
    letterSpacing: 1.2,
  },
  statusValue: { fontSize: 25, fontWeight: "900", color: "#FFFFFF" },
  statusSubtext: {
    fontSize: 12,
    color: "rgba(255,255,255,0.66)",
    marginTop: 7,
  },
  noteRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 24 },
  note: {
    flex: 1,
    fontSize: 14,
    color: "rgba(255,255,255,0.72)",
    lineHeight: 21,
  },
  buttonOuter: { borderRadius: 17, marginBottom: 12, overflow: "hidden" },
  primaryButton: {
    minHeight: 54,
    borderRadius: 17,
    flexDirection: "row",
    gap: 9,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  primaryButtonText: { color: NAVY, fontSize: 16, fontWeight: "900" },
  secondaryButton: {
    minHeight: 54,
    borderRadius: 17,
    borderWidth: 1.5,
    borderColor: GOLD,
    backgroundColor: "rgba(255,229,154,0.04)",
    flexDirection: "row",
    gap: 9,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  secondaryButtonText: { color: GOLD, fontSize: 15, fontWeight: "800" },
});
