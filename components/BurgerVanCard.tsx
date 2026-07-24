import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  Pressable,
  StyleSheet,
  View,
} from "react-native";

import AppText from "./AppText";
import CardGlowBorder from "./CardGlowBorder";

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

type StatusStyle = {
  text: string;
  icon:
  | "broadcast"
  | "map-marker-plus-outline"
  | "star-outline"
  | "storefront-outline";
  textColor: string;
  backgroundColor: string;
  borderColor: string;
  glowColor: string;
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

  useFocusEffect(
    useCallback(() => {
      setIsNavigating(false);
    }, [])
  );

  const safeName = name?.trim() || "Unnamed vendor";
  const safeCuisine = cuisine?.trim() || "Cuisine not provided";
  const safeVendorMessage = vendorMessage?.trim() || null;

  const safeDistanceText = useMemo(() => {
    if (distanceMiles === undefined || distanceMiles === null) {
      return null;
    }

    if (!Number.isFinite(distanceMiles)) {
      return null;
    }

    return `${distanceMiles.toFixed(1)} mi`;
  }, [distanceMiles]);

  const safeRatingText = useMemo(() => {
    if (!Number.isFinite(rating) || rating <= 0) {
      return null;
    }

    return rating.toFixed(1);
  }, [rating]);

  const status = useMemo<StatusStyle>(() => {
    if (temporary) {
      return {
        text: "SPOTTED",
        icon: "map-marker-plus-outline",
        textColor: "#FFD06A",
        backgroundColor: "rgba(244,181,71,0.1)",
        borderColor: "rgba(244,181,71,0.34)",
        glowColor: "#F4B547",
      };
    }

    if (isLive) {
      return {
        text: "LIVE",
        icon: "broadcast",
        textColor: "#8CFFB1",
        backgroundColor: "rgba(35,209,96,0.1)",
        borderColor: "rgba(67,222,121,0.38)",
        glowColor: "#36D873",
      };
    }

    if (subscriptionTier === "pro") {
      return {
        text: "FEATURED",
        icon: "star-outline",
        textColor: "#FFD06A",
        backgroundColor: "rgba(255,166,31,0.1)",
        borderColor: "rgba(255,190,71,0.38)",
        glowColor: "#FF9C24",
      };
    }

    return {
      text: "LISTED",
      icon: "storefront-outline",
      textColor: "rgba(255,255,255,0.68)",
      backgroundColor: "rgba(255,255,255,0.045)",
      borderColor: "rgba(255,255,255,0.13)",
      glowColor: "#2C8BFF",
    };
  }, [isLive, subscriptionTier, temporary]);

  const cardAccentColor = isLive
    ? "#42D878"
    : temporary
      ? "#F4B547"
      : subscriptionTier === "pro"
        ? "#FFAC2F"
        : "#4FA7FF";

  const cardBorderColor = isLive
    ? "rgba(66,216,120,0.42)"
    : temporary
      ? "rgba(244,181,71,0.34)"
      : subscriptionTier === "pro"
        ? "rgba(255,181,71,0.45)"
        : "rgba(79,167,255,0.3)";

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
      accessibilityLabel={`Open ${safeName}`}
      style={({ pressed }) => [
        styles.cardOuter,
        {
          shadowColor: cardAccentColor,
        },
        pressed && styles.cardPressed,
        (isNavigating || !id) && styles.cardDisabled,
      ]}
    >
      <CardGlowBorder
        accentColor={cardAccentColor}
        borderColor={cardBorderColor}
        borderRadius={22}
      />

      <View style={styles.cardContent}>
        <View style={styles.mainRow}>
          <View
            style={[
              styles.vendorIcon,
              {
                borderColor: cardBorderColor,
                shadowColor: cardAccentColor,
              },
            ]}
          >
            <MaterialCommunityIcons
              name="silverware-fork-knife"
              size={25}
              color="#F4C35B"
            />
          </View>

          <View style={styles.vendorDetails}>
            <AppText
              variant="bodyBold"
              style={styles.name}
              numberOfLines={1}
            >
              {safeName}
            </AppText>

            <View style={styles.cuisineRow}>
              <MaterialCommunityIcons
                name="food-outline"
                size={14}
                color="rgba(255,255,255,0.48)"
              />

              <AppText
                variant="body"
                style={styles.cuisine}
                numberOfLines={1}
              >
                {safeCuisine}
              </AppText>
            </View>
          </View>

          <MaterialCommunityIcons
            name="chevron-right"
            size={27}
            color="rgba(244,181,71,0.74)"
          />
        </View>

        {safeVendorMessage ? (
          <View style={styles.messageRow}>
            <MaterialCommunityIcons
              name="message-text-outline"
              size={15}
              color="#F4B547"
            />

            <AppText
              variant="body"
              style={styles.vendorMessage}
              numberOfLines={2}
            >
              {safeVendorMessage}
            </AppText>
          </View>
        ) : null}

        <View style={styles.footerRow}>
          <View style={styles.infoGroup}>
            {safeRatingText ? (
              <View style={styles.infoPill}>
                <MaterialCommunityIcons
                  name="star"
                  size={15}
                  color="#F4B547"
                />

                <AppText variant="bodyBold" style={styles.infoPillText}>
                  {safeRatingText}
                </AppText>
              </View>
            ) : null}

            {safeDistanceText ? (
              <View style={styles.infoPill}>
                <MaterialCommunityIcons
                  name="map-marker-distance"
                  size={15}
                  color="#F4B547"
                />

                <AppText variant="bodyBold" style={styles.infoPillText}>
                  {safeDistanceText}
                </AppText>
              </View>
            ) : null}
          </View>

          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor: status.backgroundColor,
                borderColor: status.borderColor,
                shadowColor: status.glowColor,
              },
            ]}
          >
            <MaterialCommunityIcons
              name={status.icon}
              size={14}
              color={status.textColor}
            />

            <AppText
              variant="label"
              style={[
                styles.statusText,
                {
                  color: status.textColor,
                },
              ]}
            >
              {status.text}
            </AppText>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cardOuter: {
    position: "relative",
    borderRadius: 22,
    backgroundColor: "rgba(5,14,24,0.86)",
    overflow: "hidden",

    shadowOpacity: 0.15,
    shadowRadius: 13,
    shadowOffset: {
      width: 0,
      height: 5,
    },

    elevation: 5,
  },

  accentLine: {
    position: "absolute",
    top: 18,
    bottom: 18,
    left: 0,
    width: 3,
    borderTopRightRadius: 999,
    borderBottomRightRadius: 999,

    shadowOpacity: 0.8,
    shadowRadius: 7,
    shadowOffset: {
      width: 0,
      height: 0,
    },

    elevation: 6,
  },

  cardContent: {
    paddingHorizontal: 17,
    paddingTop: 16,
    paddingBottom: 15,
  },

  mainRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  vendorIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(244,181,71,0.07)",
    borderWidth: 1,
    marginRight: 13,

    shadowOpacity: 0.2,
    shadowRadius: 9,
    shadowOffset: {
      width: 0,
      height: 0,
    },

    elevation: 4,
  },

  vendorDetails: {
    flex: 1,
    paddingRight: 8,
  },

  name: {
    color: "#FFFFFF",
    fontSize: 17,
    lineHeight: 22,
  },

  cuisineRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },

  cuisine: {
    flex: 1,
    color: "rgba(255,255,255,0.58)",
    fontSize: 12,
    lineHeight: 17,
  },

  messageRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginTop: 13,
    paddingHorizontal: 11,
    paddingVertical: 9,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "rgba(244,181,71,0.13)",
    backgroundColor: "rgba(255,255,255,0.025)",
  },

  vendorMessage: {
    flex: 1,
    color: "rgba(255,255,255,0.64)",
    fontSize: 11,
    lineHeight: 16,
  },

  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 13,
  },

  infoGroup: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 7,
    paddingRight: 8,
  },

  infoPill: {
    minHeight: 29,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(244,181,71,0.18)",
    backgroundColor: "rgba(244,181,71,0.055)",
  },

  infoPillText: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 10.5,
  },

  statusBadge: {
    minHeight: 30,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingHorizontal: 9,
    borderRadius: 999,
    borderWidth: 1,

    shadowOpacity: 0.22,
    shadowRadius: 7,
    shadowOffset: {
      width: 0,
      height: 0,
    },

    elevation: 3,
  },

  statusText: {
    fontSize: 8.5,
    letterSpacing: 1,
  },

  cardPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.985 }],
  },

  cardDisabled: {
    opacity: 0.58,
  },
});