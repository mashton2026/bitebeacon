import { router } from "expo-router";
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
  return (
    <Pressable
      onPress={() => router.push(`/vendor/${id}`)}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      {subscriptionTier === "pro" ? (
        <View style={styles.featuredBadge}>
          <Text style={styles.featuredBadgeText}>FEATURED</Text>
        </View>
      ) : subscriptionTier === "growth" ? (
        <View style={styles.growthBadge}>
          <Text style={styles.growthBadgeText}>GROWTH</Text>
        </View>
      ) : null}

      <View style={styles.accent} />

      {!!vendorMessage?.trim() ? (
        <View style={styles.dealBadge}>
          <Text style={styles.dealBadgeText}>DEAL</Text>
        </View>
      ) : null}

      <View style={styles.content}>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.meta}>{cuisine}</Text>

        <View style={styles.footerRow}>
          <View style={styles.ratingRow}>
            <Text style={styles.star}>★</Text>
            <Text style={styles.rating}>{rating.toFixed(1)}</Text>
          </View>

          {distanceMiles !== undefined && distanceMiles !== null ? (
            <Text style={styles.distance}>{distanceMiles.toFixed(1)} mi</Text>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: 16,
    marginBottom: 10,
    flexDirection: "row",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
    position: "relative",
  },

  cardPressed: {
    opacity: 0.96,
    transform: [{ scale: 0.995 }],
  },

  featuredBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "#FF7A00",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    zIndex: 10,
  },

  featuredBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
  },

  dealBadge: {
    position: "absolute",
    top: 38,
    right: 10,
    backgroundColor: "#1DB954",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    zIndex: 10,
  },

  dealBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
  },

  growthBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "#0B2A5B",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    zIndex: 10,
  },

  growthBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
  },

  accent: {
    width: 5,
    backgroundColor: theme.colors.primary,
  },

  content: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    flex: 1,
  },

  name: {
    fontSize: 16,
    fontWeight: "800",
    color: theme.colors.text,
    marginBottom: 6,
    paddingRight: 90,
  },

  meta: {
    fontSize: 13,
    color: theme.colors.muted,
    marginBottom: 8,
  },

  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  star: {
    fontSize: 16,
    color: theme.colors.secondary,
    marginRight: 6,
  },

  rating: {
    fontSize: 14,
    fontWeight: "700",
    color: theme.colors.primary,
  },

  distance: {
    fontSize: 12,
    fontWeight: "600",
    color: "#0B2A5B",
  },
});