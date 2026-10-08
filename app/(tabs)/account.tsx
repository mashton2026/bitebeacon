import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import AppText from "../../components/AppText";
import MapTextureBackground from "../../components/MapTextureBackground";
import PremiumCard from "../../components/PremiumCard";
import { theme } from "../../constants/theme";
import { isCurrentUserAdmin } from "../../services/adminService";
import {
  getCurrentUser,
  getCurrentUserScoutPoints,
  getCurrentUserVendor,
  getUserVendorStatus,
  signOutCurrentUser,
} from "../../services/authService";

export default function AccountScreen() {
  const [email, setEmail] = useState<string | null>(null);
  const [isVendor, setIsVendor] = useState(false);
  const [vendorId, setVendorId] = useState<string | null>(null);
  const [scoutPoints, setScoutPoints] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isSuspended, setIsSuspended] = useState(false);
  const [accountSummaryLoading, setAccountSummaryLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      loadUser();
    }, [])
  );

  async function loadUser() {
    setLoading(true);
    setAccountSummaryLoading(true);
    setIsSuspended(false);

    try {
      const user = await getCurrentUser();

      if (!user) {
        setEmail(null);
        setIsVendor(false);
        setVendorId(null);
        setScoutPoints(0);
        setIsAdmin(false);
        setAccountSummaryLoading(false);
        setLoading(false);
        return;
      }

      setEmail(user.email ?? null);

      const [adminStatus, points, vendor, vendorStatus] = await Promise.all([
        isCurrentUserAdmin().catch(() => false),
        getCurrentUserScoutPoints().catch(() => 0),
        getCurrentUserVendor().catch(() => null),
        getUserVendorStatus(user.id).catch(() => ({
          hasVendor: false,
          isSuspended: false,
        })),
      ]);

      setIsAdmin(adminStatus);
      setScoutPoints(points);

      // 🚨 HARD LOCK CHECK
      if (vendorStatus.isSuspended) {
        setIsSuspended(true);
        setIsVendor(false);
        setVendorId(null);
        setAccountSummaryLoading(false);
        setLoading(false);
        return;
      }

      setIsAdmin(adminStatus);
      setScoutPoints(points);

      if (vendor && !vendor.isSuspended) {
        setIsVendor(true);
        setVendorId(vendor.id);
        setAccountSummaryLoading(false);
        setLoading(false);
        return;
      }

      setIsVendor(false);
      setVendorId(null);
      setAccountSummaryLoading(false);
      setLoading(false);
    } catch {
      setEmail(null);
      setIsVendor(false);
      setVendorId(null);
      setScoutPoints(0);
      setIsAdmin(false);
      setAccountSummaryLoading(false);
      setLoading(false);
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

  if (isSuspended) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.title}>Account Suspended</Text>

        <Text style={styles.subtitle}>
          Your vendor account has been suspended.
        </Text>

        <View style={styles.loadingCard}>
          <Text style={styles.loadingCardTitle}>Access Restricted</Text>
          <Text style={styles.loadingCardText}>
            This account has been temporarily disabled. Please contact BiteBeacon
            support if you believe this is a mistake.
          </Text>
        </View>

        <LogoutButton onPress={handleLogout} />
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.title}>Account</Text>
        <Text style={styles.subtitle}>Loading your account...</Text>

        <View style={styles.loadingCard}>
          <Text style={styles.loadingCardTitle}>Please wait</Text>
          <Text style={styles.loadingCardText}>
            We are checking your account, vendor access, and scout progress.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <MapTextureBackground>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <AppText variant="heading" style={styles.title}>
          Account
        </AppText>

        <AppText variant="body" style={styles.subtitle}>
          {email ? `Signed in as ${email}` : "Browsing as a guest"}
        </AppText>

        {email && (
          <Pressable
            onPress={() => {
              if (!vendorId) return;
              router.push({
                pathname: "/vendor/dashboard",
                params: { id: vendorId },
              });
            }}
            disabled={!vendorId}
            style={!vendorId ? styles.vendorDashboardCardDisabled : undefined}
          >
            <View style={styles.vendorDashboardPremiumCard}>
              <PremiumCard>
                <AppText variant="label" style={styles.vendorDashboardEyebrow}>
                  Vendor Dashboard
                </AppText>

                <AppText variant="title" style={styles.vendorDashboardTitle}>
                  {accountSummaryLoading
                    ? "Loading vendor tools..."
                    : "Manage your listing"}
                </AppText>

                <AppText variant="body" style={styles.vendorDashboardText}>
                  {accountSummaryLoading
                    ? "Checking your vendor access and loading your dashboard tools."
                    : "Manage your listing, analytics and content."}
                </AppText>
              </PremiumCard>
            </View>
          </Pressable>
        )}

        {email && (
          <View style={styles.scoutPremiumCard}>
            <PremiumCard>
              <AppText variant="label" style={styles.scoutCardEyebrow}>
                Scout Progress
              </AppText>

              <AppText variant="title" style={styles.scoutCardTitle}>
                {accountSummaryLoading
                  ? "Loading scout progress..."
                  : `${scoutPoints} Scout Point${scoutPoints === 1 ? "" : "s"}`}
              </AppText>

              <AppText variant="body" style={styles.scoutCardText}>
                Earn points when vendors claim listings you originally spotted.
              </AppText>
            </PremiumCard>
          </View>
        )}

        {!email && (
          <>
            <Section title="Get Started" />
            <Row
              label="User Login"
              onPress={() => router.push("/auth/user-login")}
            />
            <Row
              label="Create Account"
              onPress={() => router.push("/auth/user-signup")}
            />
            <Row
              label="Vendor Portal"
              onPress={() => router.push("/auth/login")}
            />

            <Section title="Help & Support" />
            <Row
              label="Contact BiteBeacon Support"
              onPress={() => router.push("/account/help")}
            />

            <Section title="Legal" />
            <Row
              label="Terms & Conditions"
              onPress={() => router.push("/account/terms")}
            />
            <Row
              label="Privacy Policy"
              onPress={() => router.push("/account/privacy")}
            />
          </>
        )}

        {email && !isVendor && !isAdmin && (
          <>
            <Section title="Your Activity" />
            <Row
              label="Favourites"
              onPress={() => router.push("/(tabs)/favourites")}
            />
            <Row
              label="Explore Map"
              onPress={() => router.push("/(tabs)/explore")}
            />

            <Section title="Security" />
            <Row
              label="Account Settings"
              onPress={() => router.push("/account/security")}
            />

            <Section title="Help & Support" />
            <Row
              label="Contact BiteBeacon Support"
              onPress={() => router.push("/account/help")}
            />

            <Section title="Legal" />
            <Row
              label="Terms & Conditions"
              onPress={() => router.push("/account/terms")}
            />
            <Row
              label="Privacy Policy"
              onPress={() => router.push("/account/privacy")}
            />

            <LogoutButton onPress={handleLogout} />
          </>
        )}

        {email && isVendor && !isAdmin && (
          <>
            <Section title="Vendor Tools" />
            {vendorId && (
              <Pressable
                style={styles.dashboardNavRow}
                onPress={() =>
                  router.push({
                    pathname: "/vendor/dashboard",
                    params: { id: vendorId },
                  })
                }
              >
                <View style={styles.dashboardNavIcon}>
                  <MaterialCommunityIcons
                    name="view-dashboard-outline"
                    size={22}
                    color="#FFB000"
                  />
                </View>

                <View style={styles.dashboardNavTextWrap}>
                  <AppText variant="bodyBold" style={styles.dashboardNavTitle}>
                    Dashboard
                  </AppText>

                  <AppText variant="body" style={styles.dashboardNavSubtitle}>
                    Manage your vendor tools and performance
                  </AppText>
                </View>

                <MaterialCommunityIcons
                  name="chevron-right"
                  size={24}
                  color="#FFB000"
                />
              </Pressable>
            )}
            {vendorId && (
              <Pressable
                style={styles.dashboardNavRow}
                onPress={() =>
                  router.push({
                    pathname: "/vendor/[id]",
                    params: { id: vendorId },
                  })
                }
              >
                <View style={styles.dashboardNavIcon}>
                  <MaterialCommunityIcons
                    name="storefront-outline"
                    size={22}
                    color="#FFB000"
                  />
                </View>

                <View style={styles.dashboardNavTextWrap}>
                  <AppText variant="bodyBold" style={styles.dashboardNavTitle}>
                    View Listing
                  </AppText>

                  <AppText variant="body" style={styles.dashboardNavSubtitle}>
                    See your public BiteBeacon listing
                  </AppText>
                </View>

                <MaterialCommunityIcons
                  name="chevron-right"
                  size={24}
                  color="#FFB000"
                />
              </Pressable>
            )}

            <Section title="Security" />
            <Row
              label="Account Settings"
              onPress={() => router.push("/account/security")}
            />

            <Section title="Help & Support" />
            <Row
              label="Contact BiteBeacon Support"
              onPress={() => router.push("/account/help")}
            />

            <Section title="Legal" />
            <Row
              label="Terms & Conditions"
              onPress={() => router.push("/account/terms")}
            />
            <Row
              label="Privacy Policy"
              onPress={() => router.push("/account/privacy")}
            />

            <LogoutButton onPress={handleLogout} />
          </>
        )}

        {email && isAdmin && (
          <>
            <Section title="Admin" />
            <Row label="Control Centre" onPress={() => router.push("/admin")} />

            {vendorId && (
              <>
                <Section title="Vendor Tools" />
                <Row
                  label="Dashboard"
                  onPress={() =>
                    router.push({
                      pathname: "/vendor/dashboard",
                      params: { id: vendorId },
                    })
                  }
                />
                <Row
                  label="View Listing"
                  onPress={() =>
                    router.push({
                      pathname: "/vendor/[id]",
                      params: { id: vendorId },
                    })
                  }
                />
              </>
            )}

            <Section title="Security" />
            <Row
              label="Account Settings"
              onPress={() => router.push("/account/security")}
            />

            <Section title="Help & Support" />
            <Row
              label="Contact BiteBeacon Support"
              onPress={() => router.push("/account/help")}
            />

            <Section title="Legal" />
            <Row
              label="Terms & Conditions"
              onPress={() => router.push("/account/terms")}
            />
            <Row
              label="Privacy Policy"
              onPress={() => router.push("/account/privacy")}
            />

            <LogoutButton onPress={handleLogout} />
          </>
        )}
      </ScrollView>
    </MapTextureBackground>
  );
}

function Section({ title }: { title: string }) {
  return <Text style={styles.section}>{title}</Text>;
}

function Row({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.row} onPress={onPress}>
      <AppText variant="bodyBold" style={styles.rowText}>
        {label}
      </AppText>

      <MaterialCommunityIcons
        name="chevron-right"
        size={22}
        color="#FFB000"
      />
    </Pressable>
  );
}

function LogoutButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable style={styles.logoutButton} onPress={onPress}>
      <View style={styles.logoutIcon}>
        <MaterialCommunityIcons
          name="logout"
          size={22}
          color="#FF5252"
        />
      </View>

      <View style={styles.logoutTextWrap}>
        <AppText variant="bodyBold" style={styles.logoutText}>
          Log Out
        </AppText>

        <AppText variant="body" style={styles.logoutSubtext}>
          End your current BiteBeacon session
        </AppText>
      </View>

      <MaterialCommunityIcons
        name="chevron-right"
        size={22}
        color="#FF5252"
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent",
    padding: 24,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: 24,
  },
  title: {
    fontSize: 34,
    color: "#FFFFFF",
    marginBottom: 8,
  },

  subtitle: {
    fontSize: 15,
    lineHeight: 21,
    color: "rgba(255,255,255,0.66)",
    marginBottom: 28,
  },
  loadingCard: {
    backgroundColor: "#0B1A29",
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "rgba(255,214,90,0.55)",
  },
  loadingCardTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#FFE29A",
    marginBottom: 6,
  },
  loadingCardText: {
    fontSize: 14,
    lineHeight: 20,
    color: "rgba(255,255,255,0.78)",
    fontWeight: "600",
  },
  scoutCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: theme.colors.secondary,
  },
  scoutCardEyebrow: {
    fontSize: 12,
    fontWeight: "800",
    color: theme.colors.secondary,
    letterSpacing: 1,
    marginBottom: 6,
    textTransform: "uppercase",
  },
  scoutCardTitle: {
    fontSize: 18,
    color: "#FFFFFF",
    marginBottom: 4,
  },
  scoutCardText: {
    fontSize: 13,
    lineHeight: 18,
    color: "rgba(255,255,255,0.72)",
  },
  scoutPremiumCard: {
    marginBottom: 12,
  },
  vendorDashboardPremiumCard: {
    marginBottom: 12,
  },
  vendorDashboardCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: theme.colors.secondary,
  },
  vendorDashboardCardDisabled: {
    opacity: 0.6,
  },
  vendorDashboardEyebrow: {
    fontSize: 12,
    fontWeight: "800",
    color: theme.colors.secondary,
    letterSpacing: 1,
    marginBottom: 6,
    textTransform: "uppercase",
  },
  vendorDashboardTitle: {
    fontSize: 18,
    color: "#FFFFFF",
    marginBottom: 4,
  },
  vendorDashboardText: {
    fontSize: 13,
    lineHeight: 18,
    color: "rgba(255,255,255,0.72)",
  },
  section: {
    fontSize: 12,
    fontWeight: "800",
    color: theme.colors.secondary,
    marginTop: 18,
    marginBottom: 8,
    letterSpacing: 1,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 15,
    paddingHorizontal: 16,
    marginBottom: 8,
    borderRadius: 16,
    backgroundColor: "rgba(5,14,24,0.68)",
    borderWidth: 1,
    borderColor: "rgba(255,176,0,0.16)",
  },

  rowText: {
    flex: 1,
    color: "#FFFFFF",
  },
  logoutButton: {
    marginTop: 24,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: "rgba(35,8,10,0.78)",
    borderWidth: 1,
    borderColor: "rgba(255,82,82,0.42)",
  },

  logoutIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,82,82,0.10)",
    borderWidth: 1,
    borderColor: "rgba(255,82,82,0.20)",
  },

  logoutTextWrap: {
    flex: 1,
    marginLeft: 12,
  },

  logoutText: {
    color: "#FFFFFF",
    marginBottom: 2,
  },

  logoutSubtext: {
    color: "rgba(255,255,255,0.58)",
    fontSize: 12,
    lineHeight: 17,
  },

  dashboardNavRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 10,
    borderRadius: 18,
    backgroundColor: "rgba(5,14,24,0.78)",
    borderWidth: 1,
    borderColor: "rgba(255,176,0,0.22)",
  },

  dashboardNavIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,176,0,0.10)",
    borderWidth: 1,
    borderColor: "rgba(255,176,0,0.18)",
  },

  dashboardNavTextWrap: {
    flex: 1,
    marginLeft: 12,
  },

  dashboardNavTitle: {
    color: "#FFFFFF",
    marginBottom: 2,
  },

  dashboardNavSubtitle: {
    color: "rgba(255,255,255,0.62)",
    fontSize: 12,
    lineHeight: 17,
  },
});