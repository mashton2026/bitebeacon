import { router } from "expo-router";
import { useState } from "react";
import {
  Alert,
  Linking,
  Pressable,
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
      <Text style={styles.title}>Upgrade Your Plan</Text>
      <Text style={styles.subtitle}>
        Unlock more power, visibility, and growth on BiteBeacon.
      </Text>

      <Text style={styles.liveNotice}>
        LIVE status is currently free during the BiteBeacon launch period.
        After launch, LIVE visibility will become a Growth feature.
      </Text>

      <View style={styles.card}>
        <Text style={styles.planTitle}>Growth</Text>
        <Text style={styles.planPrice}>£9.99 / month</Text>
        <Pressable
          style={[styles.button, isUpdating && styles.buttonDisabled]}
          onPress={() =>
            startCheckout("price_1TGMXnPDTRLYMBotypaooxb6", "growth")
          }
          disabled={isUpdating}
        >
          <Text style={styles.buttonText}>
            {isUpdating ? "Opening..." : "Upgrade to Growth"}
          </Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.planTitle}>Pro</Text>
        <Text style={styles.planPrice}>£14.99 / month</Text>
        <Pressable
          style={[styles.buttonSecondary, isUpdating && styles.buttonDisabled]}
          onPress={() =>
            startCheckout("price_1TGMe2PDTRLYMBotJMfaW1ql", "pro")
          }
          disabled={isUpdating}
        >
          <Text style={styles.buttonSecondaryText}>
            {isUpdating ? "Opening..." : "Upgrade to Pro"}
          </Text>
        </Pressable>
      </View>

      <Pressable
        style={[styles.manageButton, isUpdating && styles.buttonDisabled]}
        onPress={manageSubscription}
        disabled={isUpdating}
      >
        <Text style={styles.manageButtonText}>
          {isUpdating ? "Opening..." : "Manage Subscription"}
        </Text>
      </Pressable>

      <Pressable
        style={[styles.backButton, isUpdating && styles.buttonDisabled]}
        onPress={() => router.back()}
        disabled={isUpdating}
      >
        <Text style={styles.backText}>Back</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0B2A5B",
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 15,
    color: "rgba(255,255,255,0.8)",
    marginBottom: 20,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: "#FF7A00",
  },
  planTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0B2A5B",
    marginBottom: 4,
  },
  planPrice: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FF7A00",
    marginBottom: 10,
  },
  liveNotice: {
    fontSize: 13,
    color: "#FFD1A6",
    lineHeight: 18,
    marginBottom: 20,
    fontWeight: "700",
  },
  button: {
    marginTop: 10,
    backgroundColor: "#FF7A00",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  buttonText: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
  buttonSecondary: {
    marginTop: 10,
    backgroundColor: "#0B2A5B",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  buttonSecondaryText: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
  manageButton: {
    marginTop: 10,
    backgroundColor: "#FFFFFF",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FF7A00",
  },
  manageButtonText: {
    color: "#0B2A5B",
    fontWeight: "800",
  },
  backButton: {
    marginTop: 10,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: "#D9D9D9",
  },
  backText: {
    fontWeight: "700",
  },
  buttonDisabled: {
    opacity: 0.7,
  },
});