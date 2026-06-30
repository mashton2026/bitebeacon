import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

export default function VendorPendingScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.kicker}>APPLICATION RECEIVED</Text>

      <Text style={styles.title}>Your listing is under review</Text>

      <Text style={styles.body}>
        Thanks for creating your BiteBeacon vendor listing.
      </Text>

      <Text style={styles.body}>
        Your listing has been submitted and is waiting for admin approval before
        it appears publicly on the map.
      </Text>

      <View style={styles.statusCard}>
        <Text style={styles.statusLabel}>Current status</Text>
        <Text style={styles.statusValue}>Pending Approval</Text>
      </View>

      <Text style={styles.note}>
        We may contact you if we need extra proof of ownership or verification
        details.
      </Text>

      <Pressable
        style={styles.primaryButton}
        onPress={() => router.replace("/(tabs)")}
      >
        <Text style={styles.primaryButtonText}>Back to Home</Text>
      </Pressable>

      <Pressable
        style={styles.secondaryButton}
        onPress={() => router.replace("/auth/login")}
      >
        <Text style={styles.secondaryButtonText}>Log Out / Switch Account</Text>
      </Pressable>
    </View>
  );
}

const NAVY = "#0B2A5B";
const ORANGE = "#FF7A00";
const WHITE = "#FFFFFF";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: NAVY,
    padding: 24,
    justifyContent: "center",
  },
  kicker: {
    fontSize: 12,
    fontWeight: "900",
    color: ORANGE,
    letterSpacing: 1.2,
    marginBottom: 10,
  },
  title: {
    fontSize: 34,
    fontWeight: "900",
    color: WHITE,
    marginBottom: 16,
    lineHeight: 40,
  },
  body: {
    fontSize: 16,
    color: "rgba(255,255,255,0.78)",
    lineHeight: 24,
    marginBottom: 12,
  },
  statusCard: {
    backgroundColor: WHITE,
    borderRadius: 20,
    padding: 18,
    marginTop: 18,
    marginBottom: 18,
    borderWidth: 2,
    borderColor: ORANGE,
  },
  statusLabel: {
    fontSize: 13,
    fontWeight: "800",
    color: "#5D6F8F",
    marginBottom: 6,
    textTransform: "uppercase",
  },
  statusValue: {
    fontSize: 24,
    fontWeight: "900",
    color: NAVY,
  },
  note: {
    fontSize: 14,
    color: "rgba(255,255,255,0.68)",
    lineHeight: 21,
    marginBottom: 22,
  },
  primaryButton: {
    backgroundColor: ORANGE,
    paddingVertical: 15,
    borderRadius: 16,
    alignItems: "center",
    marginBottom: 12,
  },
  primaryButtonText: {
    color: WHITE,
    fontSize: 16,
    fontWeight: "800",
  },
  secondaryButton: {
    backgroundColor: WHITE,
    paddingVertical: 15,
    borderRadius: 16,
    alignItems: "center",
  },
  secondaryButtonText: {
    color: NAVY,
    fontSize: 16,
    fontWeight: "800",
  },
});