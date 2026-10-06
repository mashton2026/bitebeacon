import { router } from "expo-router";
import { useState } from "react";
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { supabase } from "../../lib/supabase";
import {
  getCurrentUser,
  getCurrentUserVendor,
} from "../../services/authService";

export default function UpgradeScreen() {
  const [isUpdating, setIsUpdating] = useState(false);

  async function startCheckout(priceId: string, tier: "growth" | "pro") {
    if (isUpdating) return;
    setIsUpdating(true);

    try {
      const user = await getCurrentUser();
      const vendor = await getCurrentUserVendor();

      if (!user || !vendor) {
        Alert.alert(
          "Upgrade unavailable",
          "Please log in with your vendor account first."
        );
        return;
      }

      // Prevent duplicate subscriptions for already subscribed vendors.
      // Existing subscribers should manage or upgrade through the Stripe portal.
      if (
        vendor.subscriptionTier === "growth" ||
        vendor.subscriptionTier === "pro"
      ) {
        const { data, error } = await supabase.functions.invoke(
          "create-portal-session",
          {
            body: {
              vendorId: vendor.id,
            },
          }
        );

        if (error) {
          const message =
            typeof error === "object" &&
            error !== null &&
            "message" in error &&
            typeof error.message === "string"
              ? error.message
              : "Edge Function returned a non-2xx status code";

          Alert.alert("Error", message);
          return;
        }

        if (data?.url) {
          await Linking.openURL(data.url);
          return;
        }

        Alert.alert(
          "Error",
          data?.error ?? data?.message ?? "No portal URL returned."
        );
        return;
      }

      const { data, error } = await supabase.functions.invoke(
        "create-checkout-session",
        {
          body: {
            priceId,
            tier,
            userId: user.id,
            vendorId: vendor.id,
          },
        }
      );

      if (error) {
        const message =
          typeof error === "object" &&
          error !== null &&
          "message" in error &&
          typeof error.message === "string"
            ? error.message
            : "Edge Function returned a non-2xx status code";

        Alert.alert("Checkout failed", message);
        return;
      }

      if (data?.url) {
        await Linking.openURL(data.url);
        return;
      }

      Alert.alert(
        "Checkout failed",
        data?.error ?? data?.message ?? "No checkout URL returned."
      );
    } catch (error) {
      Alert.alert(
        "Checkout failed",
        error instanceof Error ? error.message : "Unknown error"
      );
    } finally {
      setIsUpdating(false);
    }
  }

  async function manageSubscription() {
    if (isUpdating) return;
    setIsUpdating(true);

    try {
      const vendor = await getCurrentUserVendor();

      if (!vendor?.stripe_customer_id) {
        Alert.alert(
          "Unavailable",
          "No active subscription found for this vendor."
        );
        return;
      }

      const { data, error } = await supabase.functions.invoke(
        "create-portal-session",
        {
          body: {
            vendorId: vendor.id,
          },
        }
      );

      if (error) {
        const message =
          typeof error === "object" &&
          error !== null &&
          "message" in error &&
          typeof error.message === "string"
            ? error.message
            : "Edge Function returned a non-2xx status code";

        Alert.alert("Error", message);
        return;
      }

      if (data?.url) {
        await Linking.openURL(data.url);
        return;
      }

      Alert.alert(
        "Error",
        data?.error ?? data?.message ?? "No portal URL returned."
      );
    } catch (error) {
      Alert.alert(
        "Error",
        error instanceof Error ? error.message : "Something went wrong"
      );
    } finally {
      setIsUpdating(false);
    }
  }

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={styles.header}>
          <Text style={styles.eyebrow}>VENDOR PLANS</Text>
          <Text style={styles.title}>Plans & Visibility</Text>
          <Text style={styles.subtitle}>
            Choose the level that suits your business and how you want to appear
            across BiteBeacon.
          </Text>
        </View>

        <View style={styles.liveNoticeCard}>
          <View style={styles.liveNoticeIcon}>
            <Text style={styles.liveNoticeIconText}>LIVE</Text>
          </View>
          <View style={styles.liveNoticeContent}>
            <Text style={styles.liveNoticeTitle}>Launch benefit</Text>
            <Text style={styles.liveNoticeText}>
              LIVE status is currently free during the BiteBeacon launch period.
              After launch, LIVE visibility will become a Growth feature.
            </Text>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Choose your plan</Text>
          <Text style={styles.sectionSubtitle}>
            Upgrade when the extra visibility is right for you.
          </Text>
        </View>

        <View style={[styles.planCard, styles.growthCard]}>
          <View style={styles.planTopRow}>
            <View>
              <Text style={styles.planKicker}>GROWTH</Text>
              <Text style={styles.planTitle}>Growth</Text>
            </View>
            <View style={styles.priceBlock}>
              <Text style={styles.planPrice}>£9.99</Text>
              <Text style={styles.planPeriod}>/ month</Text>
            </View>
          </View>

          <View style={styles.planDivider} />

          <Text style={styles.planDescription}>
            A stronger presence for vendors ready to increase their visibility on
            BiteBeacon.
          </Text>

          <Pressable
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.buttonPressed,
              isUpdating && styles.buttonDisabled,
            ]}
            onPress={() =>
              startCheckout("price_1TGMXnPDTRLYMBotypaooxb6", "growth")
            }
            disabled={isUpdating}
          >
            <Text style={styles.primaryButtonText}>
              {isUpdating ? "Opening..." : "Upgrade to Growth"}
            </Text>
          </Pressable>
        </View>

        <View style={[styles.planCard, styles.proCard]}>
          <View style={styles.proBadge}>
            <Text style={styles.proBadgeText}>PREMIUM</Text>
          </View>

          <View style={styles.planTopRow}>
            <View>
              <Text style={styles.planKicker}>PRO</Text>
              <Text style={styles.planTitle}>Pro</Text>
            </View>
            <View style={styles.priceBlock}>
              <Text style={styles.planPrice}>£14.99</Text>
              <Text style={styles.planPeriod}>/ month</Text>
            </View>
          </View>

          <View style={styles.planDivider} />

          <Text style={styles.planDescription}>
            BiteBeacon's premium vendor tier for businesses that want the strongest
            presence available.
          </Text>

          <Pressable
            style={({ pressed }) => [
              styles.proButton,
              pressed && styles.buttonPressed,
              isUpdating && styles.buttonDisabled,
            ]}
            onPress={() =>
              startCheckout("price_1TGMe2PDTRLYMBotJMfaW1ql", "pro")
            }
            disabled={isUpdating}
          >
            <Text style={styles.proButtonText}>
              {isUpdating ? "Opening..." : "Upgrade to Pro"}
            </Text>
          </Pressable>
        </View>

        <View style={styles.manageCard}>
          <View style={styles.manageTextBlock}>
            <Text style={styles.manageTitle}>Already subscribed?</Text>
            <Text style={styles.manageSubtitle}>
              Open the secure subscription portal to manage your existing plan.
            </Text>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.manageButton,
              pressed && styles.buttonPressed,
              isUpdating && styles.buttonDisabled,
            ]}
            onPress={manageSubscription}
            disabled={isUpdating}
          >
            <Text style={styles.manageButtonText}>
              {isUpdating ? "Opening..." : "Manage Subscription"}
            </Text>
          </Pressable>
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.backButton,
            pressed && styles.backButtonPressed,
            isUpdating && styles.buttonDisabled,
          ]}
          onPress={() => router.back()}
          disabled={isUpdating}
        >
          <Text style={styles.backText}>Back</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#07131F",
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 34,
  },
  header: {
    marginBottom: 20,
  },
  eyebrow: {
    color: "#F4B547",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.8,
    marginBottom: 8,
  },
  title: {
    fontSize: 31,
    lineHeight: 36,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: -0.6,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "600",
    color: "rgba(255,255,255,0.68)",
  },
  liveNoticeCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    backgroundColor: "rgba(14,29,45,0.96)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(244,181,71,0.34)",
    padding: 15,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOpacity: 0.22,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  liveNoticeIcon: {
    minWidth: 54,
    height: 34,
    borderRadius: 17,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(244,181,71,0.12)",
    borderWidth: 1,
    borderColor: "rgba(244,181,71,0.48)",
  },
  liveNoticeIconText: {
    color: "#F4B547",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.8,
  },
  liveNoticeContent: {
    flex: 1,
  },
  liveNoticeTitle: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
    marginBottom: 4,
  },
  liveNoticeText: {
    color: "rgba(255,255,255,0.68)",
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "600",
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "900",
    marginBottom: 4,
  },
  sectionSubtitle: {
    color: "rgba(255,255,255,0.56)",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
  },
  planCard: {
    position: "relative",
    overflow: "hidden",
    backgroundColor: "rgba(14,29,45,0.98)",
    borderRadius: 24,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOpacity: 0.28,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  growthCard: {
    borderColor: "rgba(244,181,71,0.42)",
  },
  proCard: {
    borderColor: "#F4B547",
    shadowColor: "#F4B547",
    shadowOpacity: 0.16,
    shadowRadius: 18,
  },
  proBadge: {
    position: "absolute",
    top: 0,
    right: 0,
    backgroundColor: "#F4B547",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderBottomLeftRadius: 15,
  },
  proBadgeText: {
    color: "#07131F",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.1,
  },
  planTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: 12,
    paddingRight: 4,
  },
  planKicker: {
    color: "#F4B547",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.5,
    marginBottom: 5,
  },
  planTitle: {
    color: "#FFFFFF",
    fontSize: 25,
    fontWeight: "900",
    letterSpacing: -0.3,
  },
  priceBlock: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: 2,
  },
  planPrice: {
    color: "#F4B547",
    fontSize: 22,
    fontWeight: "900",
  },
  planPeriod: {
    color: "rgba(255,255,255,0.58)",
    fontSize: 12,
    fontWeight: "700",
    marginLeft: 3,
  },
  planDivider: {
    height: 1,
    backgroundColor: "rgba(244,181,71,0.18)",
    marginVertical: 15,
  },
  planDescription: {
    color: "rgba(255,255,255,0.68)",
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "600",
    marginBottom: 18,
  },
  primaryButton: {
    minHeight: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    backgroundColor: "#FF7A00",
    borderWidth: 1,
    borderColor: "#FFB24D",
    shadowColor: "#FF7A00",
    shadowOpacity: 0.24,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 6,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
  },
  proButton: {
    minHeight: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    backgroundColor: "#F4B547",
    borderWidth: 1,
    borderColor: "#FFD778",
    shadowColor: "#F4B547",
    shadowOpacity: 0.28,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 7,
  },
  proButtonText: {
    color: "#07131F",
    fontSize: 15,
    fontWeight: "900",
  },
  manageCard: {
    backgroundColor: "rgba(10,24,38,0.98)",
    borderRadius: 22,
    padding: 16,
    marginTop: 2,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(244,181,71,0.24)",
  },
  manageTextBlock: {
    marginBottom: 14,
  },
  manageTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
    marginBottom: 4,
  },
  manageSubtitle: {
    color: "rgba(255,255,255,0.56)",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
  },
  manageButton: {
    minHeight: 50,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    backgroundColor: "rgba(244,181,71,0.08)",
    borderWidth: 1,
    borderColor: "rgba(244,181,71,0.62)",
  },
  manageButtonText: {
    color: "#F4B547",
    fontSize: 14,
    fontWeight: "900",
  },
  backButton: {
    minHeight: 48,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  backButtonPressed: {
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  backText: {
    color: "rgba(255,255,255,0.78)",
    fontSize: 14,
    fontWeight: "800",
  },
  buttonPressed: {
    opacity: 0.84,
  },
  buttonDisabled: {
    opacity: 0.58,
  },
});
