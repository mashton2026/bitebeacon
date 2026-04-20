import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { theme } from "../../constants/theme";
import { isCurrentUserAdmin } from "../../services/adminService";
import { getCurrentUser } from "../../services/authService";
import { getAllVendors } from "../../services/vendorService";
import { type Van } from "../../types/van";

export default function AdminPanelScreen() {
  const [currentEmail, setCurrentEmail] = useState<string | null>(null);
  const [vendors, setVendors] = useState<Van[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadAdminData();
    }, [])
  );

  async function loadAdminData(): Promise<void> {
    setIsLoading(true);
    try {
      const [user, adminStatus, allVendors] = await Promise.all([
        getCurrentUser(),
        isCurrentUserAdmin(),
        getAllVendors(),
      ]);

      setCurrentEmail(user?.email ?? null);
      setIsAdmin(adminStatus);
      setVendors(adminStatus ? allVendors : []);
    } catch {
      setCurrentEmail(null);
      setVendors([]);
      setIsAdmin(false);
    } finally {
      setIsLoading(false);
    }
  }

  const summary = useMemo(() => {
    return {
      totalVendors: vendors.length,
      liveVendors: vendors.filter((v) => v.isLive).length,
      claimedVendors: vendors.filter((v) => !!v.owner_id).length,
      spottedVans: vendors.filter((v) => v.temporary).length,
      suspendedVendors: vendors.filter((v) => v.isSuspended).length,
      freeVendors: vendors.filter(
        (v) => (v.subscriptionTier ?? "free") === "free"
      ).length,
      growthVendors: vendors.filter((v) => v.subscriptionTier === "growth")
        .length,
      proVendors: vendors.filter((v) => v.subscriptionTier === "pro").length,
    };
  }, [vendors]);

  // 🔄 LOADING STATE
  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text style={styles.kicker}>ADMIN</Text>
        <Text style={styles.title}>Control Centre</Text>
        <Text style={styles.subtitle}>
          Loading admin tools and platform summary...
        </Text>

        <Pressable
          style={styles.backButton}
          onPress={() => router.replace("/(tabs)")}
        >
          <Text style={styles.backButtonText}>Back</Text>
        </Pressable>
      </View>
    );
  }

  // 🔒 NOT ADMIN
  if (!isAdmin) {
    return (
      <View style={styles.container}>
        <Text style={styles.kicker}>ADMIN</Text>
        <Text style={styles.title}>Access Restricted</Text>
        <Text style={styles.subtitle}>
          This area is only available to BiteBeacon admin accounts.
        </Text>

        <Pressable
          style={styles.backButton}
          onPress={() => router.replace("/(tabs)")}
        >
          <Text style={styles.backButtonText}>Back</Text>
        </Pressable>
      </View>
    );
  }

  // ✅ MAIN ADMIN UI
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.kicker}>ADMIN</Text>
      <Text style={styles.title}>Control Centre</Text>

      <Text style={styles.subtitle}>
        Monitor vendors, claims, moderation, and subscription control from one
        place.
      </Text>

      <Text style={styles.helperText}>
        {currentEmail
          ? `Signed in as ${currentEmail}`
          : "Admin session active"}
      </Text>

      <Text style={styles.sectionTitle}>Platform Summary</Text>

      <View style={styles.statsBlock}>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Total Vendors</Text>
          <Text style={styles.statValue}>{summary.totalVendors}</Text>
        </View>

        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Live Vendors</Text>
          <Text style={styles.statValue}>{summary.liveVendors}</Text>
        </View>

        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Claimed Vendors</Text>
          <Text style={styles.statValue}>{summary.claimedVendors}</Text>
        </View>

        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Spotted Vans</Text>
          <Text style={styles.statValue}>{summary.spottedVans}</Text>
        </View>

        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Suspended Vendors</Text>
          <Text style={styles.statValue}>{summary.suspendedVendors}</Text>
        </View>

        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Free Tier</Text>
          <Text style={styles.statValue}>{summary.freeVendors}</Text>
        </View>

        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Growth Tier</Text>
          <Text style={styles.statValue}>{summary.growthVendors}</Text>
        </View>

        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Pro Tier</Text>
          <Text style={styles.statValue}>{summary.proVendors}</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Admin Tools</Text>

      <Pressable
        style={styles.row}
        onPress={() => router.push("/admin/claims")}
      >
        <Text style={styles.rowTitle}>Review Pending Claims</Text>
        <Text style={styles.rowText}>
          Approve or reject ownership requests for community spotted vans.
        </Text>
      </Pressable>

      <Pressable
        style={styles.row}
        onPress={() => router.push("/admin/vendors")}
      >
        <Text style={styles.rowTitle}>Manage Vendors</Text>
        <Text style={styles.rowText}>
          Suspend or unsuspend vendors and review moderation status.
        </Text>
      </Pressable>

      <Pressable
        style={styles.row}
        onPress={() => router.push("/admin/subscriptions")}
      >
        <Text style={styles.rowTitle}>Manage Subscription Tiers</Text>
        <Text style={styles.rowText}>
          Move vendors between Free, Growth, and Pro.
        </Text>
      </Pressable>

      <Pressable
        style={styles.row}
        onPress={() => router.push("/admin/reports")}
      >
        <Text style={styles.rowTitle}>Review Reports</Text>
        <Text style={styles.rowText}>
          Review user-submitted listing reports and take moderation action.
        </Text>
      </Pressable>

      <Pressable
        style={styles.row}
        onPress={() => router.push("/admin/deletion-requests")}
      >
        <Text style={styles.rowTitle}>Review Deletion Requests</Text>
        <Text style={styles.rowText}>
          Review account deletion requests submitted by users and vendors.
        </Text>
      </Pressable>

      {/* ✅ FIXED BACK BUTTON */}
      <Pressable
        style={styles.backButton}
        onPress={() => router.replace("/(tabs)")}
      >
        <Text style={styles.backButtonText}>Back</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: 24,
  },
  content: {
    paddingBottom: 40,
  },
  kicker: {
    fontSize: 12,
    fontWeight: "800",
    color: theme.colors.secondary,
    marginBottom: 8,
    letterSpacing: 1.2,
  },
  title: {
    fontSize: 30,
    fontWeight: "800",
    color: theme.colors.textOnDark,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: "rgba(255,255,255,0.75)",
    lineHeight: 22,
    marginBottom: 12,
  },
  helperText: {
    fontSize: 14,
    color: "rgba(255,255,255,0.6)",
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: theme.colors.secondary,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginTop: 10,
    marginBottom: 12,
  },
  statsBlock: {
    marginBottom: 16,
  },
  statRow: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },
  statLabel: {
    fontSize: 14,
    color: "rgba(255,255,255,0.65)",
  },
  statValue: {
    fontSize: 24,
    fontWeight: "800",
    color: theme.colors.textOnDark,
  },
  row: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },
  rowTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: theme.colors.textOnDark,
  },
  rowText: {
    fontSize: 14,
    color: "rgba(255,255,255,0.7)",
  },
  backButton: {
    marginTop: 28,
    backgroundColor: "#D9D9D9",
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
  },
  backButtonText: {
    color: "#222222",
    fontSize: 16,
    fontWeight: "700",
  },
});