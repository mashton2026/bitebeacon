import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { isCurrentUserAdmin } from "../../services/adminService";
import { getCurrentUser } from "../../services/authService";
import { getAllVendors } from "../../services/vendorService";
import { type Van } from "../../types/van";

const COLORS = {
  background: "#071426",
  surface: "#0D2038",
  surfaceRaised: "#112844",
  gold: "#F5B942",
  goldSoft: "rgba(245,185,66,0.32)",
  goldFaint: "rgba(245,185,66,0.12)",
  text: "#F8F5EC",
  muted: "#A9B8CA",
  subtle: "#7890A9",
  border: "rgba(245,185,66,0.22)",
  green: "#39C989",
  red: "#F07A7A",
};

type StatItem = {
  label: string;
  value: number;
  accent?: string;
};

type AdminTool = {
  title: string;
  description: string;
  route:
    | "/admin/claims"
    | "/admin/vendors"
    | "/admin/subscriptions"
    | "/admin/reports"
    | "/admin/deletion-requests";
};

const ADMIN_TOOLS: AdminTool[] = [
  {
    title: "Review Pending Claims",
    description:
      "Review ownership requests and approve or reject vendor claims.",
    route: "/admin/claims",
  },
  {
    title: "Manage Vendors",
    description:
      "Review vendor listings, suspension status and moderation controls.",
    route: "/admin/vendors",
  },
  {
    title: "Manage Subscription Tiers",
    description:
      "Manage vendor access to Free, Growth and Pro tiers.",
    route: "/admin/subscriptions",
  },
  {
    title: "Review Reports",
    description:
      "Review community reports and take appropriate moderation action.",
    route: "/admin/reports",
  },
  {
    title: "Review Deletion Requests",
    description:
      "Review account deletion requests submitted by users and vendors.",
    route: "/admin/deletion-requests",
  },
];

export default function AdminPanelScreen() {
  const [currentEmail, setCurrentEmail] = useState<string | null>(null);
  const [vendors, setVendors] = useState<Van[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const loadAdminData = useCallback(async () => {
    setIsLoading(true);
    setLoadError(false);

    try {
      const [user, adminStatus] = await Promise.all([
        getCurrentUser(),
        isCurrentUserAdmin(),
      ]);

      setCurrentEmail(user?.email ?? null);
      setIsAdmin(adminStatus);

      if (!adminStatus) {
        setVendors([]);
        return;
      }

      const allVendors = await getAllVendors();

      setVendors(allVendors);
    } catch {
      setVendors([]);
      setLoadError(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadAdminData();
    }, [loadAdminData])
  );

  const summary = useMemo(() => {
    return {
      totalVendors: vendors.length,

      liveVendors: vendors.filter(
        (vendor) => vendor.isLive
      ).length,

      claimedVendors: vendors.filter(
        (vendor) => !!vendor.owner_id
      ).length,

      spottedVans: vendors.filter(
        (vendor) => vendor.temporary
      ).length,

      suspendedVendors: vendors.filter(
        (vendor) => vendor.isSuspended
      ).length,

      freeVendors: vendors.filter(
        (vendor) =>
          (vendor.subscriptionTier ?? "free") === "free"
      ).length,

      growthVendors: vendors.filter(
        (vendor) => vendor.subscriptionTier === "growth"
      ).length,

      proVendors: vendors.filter(
        (vendor) => vendor.subscriptionTier === "pro"
      ).length,
    };
  }, [vendors]);

  const stats: StatItem[] = [
    {
      label: "Total Vendors",
      value: summary.totalVendors,
    },
    {
      label: "Live Vendors",
      value: summary.liveVendors,
      accent: COLORS.green,
    },
    {
      label: "Claimed Vendors",
      value: summary.claimedVendors,
    },
    {
      label: "Spotted Vans",
      value: summary.spottedVans,
    },
    {
      label: "Suspended Vendors",
      value: summary.suspendedVendors,
      accent: COLORS.red,
    },
    {
      label: "Free Tier",
      value: summary.freeVendors,
    },
    {
      label: "Growth Tier",
      value: summary.growthVendors,
    },
    {
      label: "Pro Tier",
      value: summary.proVendors,
      accent: COLORS.gold,
    },
  ];

  function renderBackButton() {
    return (
      <Pressable
        style={({ pressed }) => [
          styles.backButton,
          pressed && styles.pressed,
        ]}
        onPress={() => router.replace("/(tabs)")}
        accessibilityRole="button"
        accessibilityLabel="Return to BiteBeacon"
      >
        <Text style={styles.backButtonText}>
          Back to BiteBeacon
        </Text>
      </Pressable>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.stateContainer}>
        <Text style={styles.kicker}>ADMINISTRATION</Text>

        <Text style={styles.title}>Control Centre</Text>

        <ActivityIndicator
          size="large"
          color={COLORS.gold}
          style={styles.loadingIndicator}
        />

        <Text style={styles.stateText}>
          Loading your administration dashboard...
        </Text>

        {renderBackButton()}
      </View>
    );
  }

  if (!isAdmin) {
    return (
      <View style={styles.stateContainer}>
        <Text style={styles.kicker}>ADMINISTRATION</Text>

        <Text style={styles.title}>
          Access Restricted
        </Text>

        <Text style={styles.stateText}>
          {loadError
            ? "We couldn't verify your administrator access. Please try again."
            : "This area is available only to authorised BiteBeacon administrators."}
        </Text>

        <Pressable
          style={styles.retryButton}
          onPress={() => void loadAdminData()}
          accessibilityRole="button"
        >
          <Text style={styles.retryButtonText}>
            Try Again
          </Text>
        </Pressable>

        {renderBackButton()}
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* HEADER */}

      <View style={styles.header}>
        <Text style={styles.kicker}>
          ADMINISTRATION
        </Text>

        <Text style={styles.title}>
          Control Centre
        </Text>

        <Text style={styles.subtitle}>
          Your BiteBeacon platform overview and management tools.
        </Text>

        <View style={styles.adminIdentity}>
          <View style={styles.identityDot} />

          <View style={styles.identityContent}>
            <Text style={styles.identityLabel}>
              ADMINISTRATOR
            </Text>

            <Text
              style={styles.identityEmail}
              numberOfLines={2}
            >
              {currentEmail ?? "Admin session active"}
            </Text>
          </View>
        </View>
      </View>

      {/* PLATFORM SUMMARY */}

      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionKicker}>
            PLATFORM
          </Text>

          <Text style={styles.sectionTitle}>
            Overview
          </Text>
        </View>

        <View style={styles.sectionLine} />
      </View>

      <View style={styles.statsGrid}>
        {stats.map((stat) => (
          <View
            key={stat.label}
            style={styles.statCard}
          >
            <View style={styles.statTopLine} />

            <Text style={styles.statLabel}>
              {stat.label}
            </Text>

            <Text
              style={[
                styles.statValue,
                stat.accent
                  ? { color: stat.accent }
                  : null,
              ]}
            >
              {stat.value}
            </Text>
          </View>
        ))}
      </View>

      <Text style={styles.summaryFootnote}>
        Figures reflect the vendor records currently returned
        by BiteBeacon.
      </Text>

      {/* ADMIN TOOLS */}

      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionKicker}>
            MANAGEMENT
          </Text>

          <Text style={styles.sectionTitle}>
            Admin Tools
          </Text>
        </View>

        <View style={styles.sectionLine} />
      </View>

      <Text style={styles.sectionDescription}>
        Select an area to review or manage.
      </Text>

      <View style={styles.toolsList}>
        {ADMIN_TOOLS.map((tool, index) => (
          <Pressable
            key={tool.route}
            style={({ pressed }) => [
              styles.toolCard,
              pressed && styles.pressed,
            ]}
            onPress={() => router.push(tool.route)}
            accessibilityRole="button"
            accessibilityLabel={tool.title}
            accessibilityHint={tool.description}
          >
            <View style={styles.toolNumber}>
              <Text style={styles.toolNumberText}>
                {String(index + 1).padStart(2, "0")}
              </Text>
            </View>

            <View style={styles.toolContent}>
              <Text style={styles.toolTitle}>
                {tool.title}
              </Text>

              <Text style={styles.toolDescription}>
                {tool.description}
              </Text>
            </View>

            <Text style={styles.toolArrow}>
              ›
            </Text>
          </Pressable>
        ))}
      </View>

      {/* FOOTER */}

      <View style={styles.footer}>
        <Text style={styles.footerLabel}>
          BITEBEACON ADMINISTRATION
        </Text>

        <Text style={styles.footerText}>
          Platform management and moderation
        </Text>
      </View>

      {renderBackButton()}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  content: {
    paddingHorizontal: 20,
    paddingTop: 30,
    paddingBottom: 60,
  },

  stateContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingHorizontal: 24,
    paddingTop: 48,
  },

  header: {
    marginBottom: 30,
  },

  kicker: {
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.gold,
    letterSpacing: 2,
    marginBottom: 10,
  },

  title: {
    fontSize: 32,
    fontWeight: "800",
    color: COLORS.text,
    letterSpacing: -0.6,
    marginBottom: 10,
  },

  subtitle: {
    fontSize: 14,
    lineHeight: 22,
    color: COLORS.muted,
    marginBottom: 22,
  },

  adminIdentity: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    padding: 15,
  },

  identityDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: COLORS.green,
    marginRight: 13,
  },

  identityContent: {
    flex: 1,
  },

  identityLabel: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.4,
    color: COLORS.gold,
    marginBottom: 4,
  },

  identityEmail: {
    fontSize: 13,
    color: COLORS.text,
    lineHeight: 19,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
  },

  sectionKicker: {
    fontSize: 10,
    color: COLORS.gold,
    fontWeight: "800",
    letterSpacing: 1.6,
    marginBottom: 4,
  },

  sectionTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: COLORS.text,
  },

  sectionLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.goldSoft,
    marginLeft: 18,
    marginTop: 12,
  },

  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },

  statCard: {
    width: "48.5%",
    minHeight: 112,
    backgroundColor: COLORS.surface,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 15,
    marginBottom: 12,
    overflow: "hidden",
  },

  statTopLine: {
    width: 34,
    height: 2,
    borderRadius: 2,
    backgroundColor: COLORS.gold,
    marginBottom: 13,
  },

  statLabel: {
    fontSize: 12,
    color: COLORS.muted,
    fontWeight: "600",
    marginBottom: 8,
  },

  statValue: {
    fontSize: 29,
    fontWeight: "800",
    color: COLORS.text,
    letterSpacing: -0.5,
  },

  summaryFootnote: {
    fontSize: 11,
    color: COLORS.subtle,
    lineHeight: 17,
    marginTop: 3,
    marginBottom: 32,
  },

  sectionDescription: {
    fontSize: 13,
    color: COLORS.muted,
    marginTop: -7,
    marginBottom: 17,
  },

  toolsList: {
    gap: 11,
  },

  toolCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 18,
    paddingVertical: 17,
    paddingHorizontal: 14,
    minHeight: 94,
  },

  toolNumber: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: COLORS.goldFaint,
    borderWidth: 1,
    borderColor: COLORS.goldSoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 13,
  },

  toolNumberText: {
    color: COLORS.gold,
    fontSize: 12,
    fontWeight: "800",
  },

  toolContent: {
    flex: 1,
  },

  toolTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: 5,
  },

  toolDescription: {
    fontSize: 12,
    lineHeight: 18,
    color: COLORS.muted,
  },

  toolArrow: {
    fontSize: 28,
    color: COLORS.gold,
    marginLeft: 10,
    fontWeight: "300",
  },

  footer: {
    alignItems: "center",
    marginTop: 34,
  },

  footerLabel: {
    fontSize: 10,
    color: COLORS.gold,
    fontWeight: "800",
    letterSpacing: 1.5,
    marginBottom: 5,
  },

  footerText: {
    fontSize: 11,
    color: COLORS.subtle,
  },

  backButton: {
    marginTop: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 15,
    alignItems: "center",
    backgroundColor: COLORS.surfaceRaised,
  },

  backButtonText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "700",
  },

  retryButton: {
    marginTop: 24,
    backgroundColor: COLORS.gold,
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: "center",
  },

  retryButtonText: {
    color: COLORS.background,
    fontWeight: "800",
    fontSize: 14,
  },

  loadingIndicator: {
    marginTop: 35,
    marginBottom: 20,
  },

  stateText: {
    fontSize: 14,
    color: COLORS.muted,
    lineHeight: 22,
  },

  pressed: {
    opacity: 0.75,
  },
});