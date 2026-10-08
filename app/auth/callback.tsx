import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { supabase } from "../../lib/supabase";
import { getVendorByOwnerId } from "../../services/vendorService";

const BG = "#071726";
const PANEL = "#10151C";
const GOLD = "#FFD65B";
const TEXT = "#FFF7E7";
const MUTED = "#B7C0C9";
const METALLIC_GOLD = [
  "#A66B00",
  "#FFECA3",
  "#FFC531",
  "#FFF2AE",
  "#C88705",
] as const;

export default function AuthCallback() {
  const { type, code } = useLocalSearchParams();
  const isVendor = type === "vendor";
  const authCode = typeof code === "string" ? code : undefined;
  const [retryCount, setRetryCount] = useState(0);
  const [lookupFailed, setLookupFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function handleAuth() {
      setLookupFailed(false);

      try {
        if (authCode) {
          const { error: exchangeError } =
            await supabase.auth.exchangeCodeForSession(authCode);
          if (exchangeError) {
            if (!cancelled) {
              router.replace(isVendor ? "/auth/login" : "/auth/user-login");
            }
            return;
          }
        }

        const { data, error } = await supabase.auth.getSession();
        if (cancelled) return;

        if (error || !data.session) {
          router.replace(isVendor ? "/auth/login" : "/auth/user-login");
          return;
        }

        if (isVendor) {
          // A failed vendor lookup is not the same as a failed login.
          // Keep the session and allow a retry rather than redirecting.
          try {
            const vendor = await getVendorByOwnerId(data.session.user.id);
            if (cancelled) return;

            if (vendor) {
              router.replace({
                pathname: "/vendor/dashboard",
                params: { id: vendor.id },
              });
            } else {
              router.replace("/vendor/claim-select");
            }
          } catch {
            if (!cancelled) setLookupFailed(true);
          }
          return;
        }

        router.replace("/(tabs)");
      } catch {
        if (cancelled) return;
        // If a session exists, don't assume the user is logged out.
        // An unexpected network error can be retried safely.
        setLookupFailed(true);
      }
    }

    void handleAuth();
    return () => {
      cancelled = true;
    };
  }, [isVendor, authCode, retryCount]);

  return (
    <View style={styles.container}>
      <View style={styles.glow} />
      <View style={styles.outerGlow}>
        <LinearGradient
          colors={METALLIC_GOLD}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.metallicBorder}
        >
          <View style={styles.card}>
            <Text style={styles.kicker}>BITEBEACON</Text>
            <LinearGradient
              colors={["#9B680C", "#FFF0A2", "#E9A912"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.divider}
            />
            {lookupFailed ? (
              <>
                <Text style={styles.title}>Connection interrupted</Text>
                <Text style={styles.subtitle}>
                  We couldn't finish signing you in. Please try again.
                </Text>
                <Pressable
                  style={({ pressed }) => [
                    styles.retryWrap,
                    pressed && styles.pressed,
                  ]}
                  onPress={() => setRetryCount((count) => count + 1)}
                  accessibilityRole="button"
                >
                  <LinearGradient
                    colors={METALLIC_GOLD}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.retryButton}
                  >
                    <Text style={styles.retryText}>Try Again</Text>
                  </LinearGradient>
                </Pressable>
                <Pressable
                  style={styles.backButton}
                  onPress={() =>
                    router.replace(isVendor ? "/auth/login" : "/auth/user-login")
                  }
                  accessibilityRole="button"
                >
                  <Text style={styles.backText}>Back to Login</Text>
                </Pressable>
              </>
            ) : (
              <>
                <ActivityIndicator size="large" color={GOLD} style={styles.spinner} />
                <Text style={styles.title}>Signing you in</Text>
                <Text style={styles.subtitle}>Getting everything ready for you...</Text>
              </>
            )}
          </View>
        </LinearGradient>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 26,
  },
  glow: {
    position: "absolute",
    width: 290,
    height: 290,
    borderRadius: 145,
    backgroundColor: "rgba(255,204,50,0.045)",
  },
  outerGlow: {
    width: "100%",
    maxWidth: 380,
    borderRadius: 26,
    shadowColor: "#FFCC34",
    shadowOpacity: 0.3,
    shadowRadius: 17,
    shadowOffset: { width: 0, height: 5 },
    elevation: 10,
  },
  metallicBorder: {
    padding: 2,
    borderRadius: 26,
  },
  card: {
    backgroundColor: PANEL,
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingVertical: 38,
    alignItems: "center",
  },
  kicker: {
    color: GOLD,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 3,
  },
  divider: {
    height: 2,
    width: 78,
    borderRadius: 3,
    marginTop: 18,
    marginBottom: 28,
  },
  spinner: { marginBottom: 22 },
  title: {
    color: TEXT,
    fontSize: 23,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    color: MUTED,
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
  },
  retryWrap: {
    marginTop: 24,
    borderRadius: 14,
    overflow: "hidden",
  },
  retryButton: {
    paddingVertical: 14,
    paddingHorizontal: 34,
    borderRadius: 14,
  },
  retryText: {
    color: "#241800",
    fontWeight: "900",
    fontSize: 15,
  },
  backButton: { marginTop: 18, padding: 8 },
  backText: { color: MUTED, fontSize: 14 },
  pressed: { opacity: 0.86 },
});
