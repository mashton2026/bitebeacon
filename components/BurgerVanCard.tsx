import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { theme } from "../constants/theme";

type Props = {
  id: string;
  name: string;
  cuisine: string;
  rating: number;
  isLive?: boolean;
  temporary?: boolean;
  distanceMiles?: number | null;
  subscriptionTier?: "free" | "growth" | "pro";
  vendorMessage?: string;
};

export default function BurgerVanCard({
  id,
  name,
  cuisine,
  rating,
  isLive,
  temporary,
  distanceMiles,
  subscriptionTier,
  vendorMessage,
}: Props) {
  const [isNavigating, setIsNavigating] = useState(false);

  const safeName = name?.trim() || "Unnamed vendor";
  const safeCuisine = cuisine?.trim() || "Cuisine not provided";

  const safeRating = useMemo(() => {
    return Number.isFinite(rating) ? rating : 0;
  }, [rating]);

  const safeDistanceText = useMemo(() => {
    if (distanceMiles === undefined || distanceMiles === null) return null;
    if (!Number.isFinite(distanceMiles)) return null;
    return `${distanceMiles.toFixed(1)} mi`;
  }, [distanceMiles]);

  const hasVendorMessage = !!vendorMessage?.trim();

  const statusText = temporary
    ? "SPOTTED"
    : isLive
      ? "LIVE"
      : subscriptionTier === "pro"
        ? "FEATURED"
        : "LISTED";

  function handlePress() {
    if (isNavigating || !id) return;

    setIsNavigating(true);

    router.push({
      pathname: "/vendor/[id]",
      params: { id },
    });
  }

  return (
    <Pressable
      onPress={handlePress}
      disabled={isNavigating || !id}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.card,
        pressed && styles.cardPressed,
        (isNavigating || !id) && styles.cardDisabled,
      ]}
    >
      <View style={styles.glowOrb} />
      <View style={styles.topAccentLine} />

      <View style={styles.headerRow}>
        <View style={styles.leftBadges}>
          {subscriptionTier === "pro" ? (
            <View style={[styles.badge, styles.featuredBadge]}>
              <Text style={styles.badgeText} numberOfLines={1}>
                FEATURED
              </Text>
            </View>
          ) : subscriptionTier === "growth" ? (
            <View style={[styles.badge, styles.growthBadge]}>
              <Text style={styles.badgeText} numberOfLines={1}>
                GROWTH
              </Text>
            </View>
          ) : null}

          {hasVendorMessage ? (
            <View style={[styles.badge, styles.dealBadge]}>
              <Text style={styles.badgeText} numberOfLines={1}>
                DEAL
              </Text>
            </View>
          ) : null}
        </View>

        <View
          style={[
            styles.statusPill,
            temporary
              ? styles.statusSpotted
              : isLive
                ? styles.statusLive
                : styles.statusListed,
          ]}
        >
          <Text style={styles.statusPillText}>{statusText}</Text>
        </View>
      </View>

      <View style={styles.content}>
        <Text style={styles.name} numberOfLines={1}>
          {safeName}
        </Text>

        <Text style={styles.meta} numberOfLines={1}>
          {safeCuisine}
        </Text>

        <View style={styles.footerRow}>
          <View style={styles.infoPill}>
            <Text style={styles.star}>★</Text>
            <Text style={styles.infoPillText}>{safeRating.toFixed(1)}</Text>
          </View>

          {safeDistanceText ? (
            <View style={styles.infoPill}>
              <Text style={styles.infoPillText}>{safeDistanceText}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#F9FBFF",
    borderRadius: 16,
    marginBottom: 10,
    overflow: "hidden",
    position: "relative",
    borderWidth: 1.5,
    borderColor: "rgba(255,122,0,0.35)",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  cardPressed: {
    opacity: 0.97,
    transform: [{ scale: 0.995 }],
  },
  cardDisabled: {
    opacity: 0.92,
  },
  glowOrb: {
    position: "absolute",
    top: -24,
    right: -18,
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "rgba(255,122,0,0.10)",
  },
  topAccentLine: {
    height: 5,
    backgroundColor: theme.colors.primary,
  },
  headerRow: {
    paddingTop: 10,
    paddingHorizontal: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 10,
    minHeight: 52,
  },

  leftBadges: {
    flexDirection: "column",
    alignItems: "flex-start",
    gap: 6,
    flexShrink: 1,
  },
  badge: {
    minWidth: 68,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
    textAlign: "center",
  },

  featuredBadge: {
    backgroundColor: theme.colors.primary,
  },
  growthBadge: {
    backgroundColor: theme.colors.background,
  },
  dealBadge: {
    backgroundColor: theme.colors.success,
  },

  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  statusLive: {
    backgroundColor: "rgba(29,185,84,0.14)",
  },
  statusListed: {
    backgroundColor: "rgba(11,42,91,0.10)",
  },
  statusSpotted: {
    backgroundColor: "rgba(255,122,0,0.14)",
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: "800",
    color: theme.colors.background,
  },
  content: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 12,
  },
  name: {
    fontSize: 15,
    fontWeight: "800",
    color: theme.colors.background,
    marginBottom: 6,
  },
  meta: {
    fontSize: 12,
    color: theme.colors.muted,
    marginBottom: 8,
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },
  infoPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "rgba(11,42,91,0.08)",
  },
  star: {
    fontSize: 14,
    color: theme.colors.secondary,
    marginRight: 6,
  },
  infoPillText: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.background,
  },
});