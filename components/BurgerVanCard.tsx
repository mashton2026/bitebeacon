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

  const safeDistanceText = useMemo(() => {
    if (distanceMiles === undefined || distanceMiles === null) return null;
    if (!Number.isFinite(distanceMiles)) return null;
    return `${distanceMiles.toFixed(1)} mi`;
  }, [distanceMiles]);

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
      <View style={styles.listContent}>
        <View style={styles.listText}>
          <Text style={styles.name} numberOfLines={1}>
            {safeName}
          </Text>

          <Text style={styles.meta} numberOfLines={1}>
            {safeCuisine}
          </Text>
        </View>

        <View style={styles.listRight}>
          {safeDistanceText ? (
            <Text style={styles.distanceText}>{safeDistanceText}</Text>
          ) : null}

          <Text style={styles.statusText}>{statusText}</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "rgba(255,255,255,0.10)",
    borderRadius: 16,
    marginBottom: 8,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },

  cardPressed: {
    opacity: 0.95,
  },

  cardDisabled: {
    opacity: 0.85,
  },

  listContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },

  listText: {
    flex: 1,
    paddingRight: 12,
  },

  name: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
  },

  meta: {
    color: "rgba(255,255,255,0.62)",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 3,
  },

  listRight: {
    alignItems: "flex-end",
  },

  distanceText: {
    color: theme.colors.secondary,
    fontSize: 13,
    fontWeight: "900",
  },

  statusText: {
    color: "rgba(255,255,255,0.62)",
    fontSize: 10,
    fontWeight: "900",
    marginTop: 4,
  },
});