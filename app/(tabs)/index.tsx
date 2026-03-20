import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import BurgerVanCard from "../../components/BurgerVanCard";
import { theme } from "../../constants/theme";
import { mapVendorRowsToVans } from "../../lib/mapVendor";
import { getSubscriptionFeatures } from "../../lib/subscriptionFeatures";
import { supabase } from "../../lib/supabase";
import { type Van } from "../../types/van";

const CUSTOM_VANS_KEY = "bitebeacon_custom_vans";

type BrowseFilter = "ALL" | "LIVE NOW" | "TOP RATED" | "FEATURED";

function getDistanceMiles(
  userLat: number,
  userLng: number,
  vanLat: number,
  vanLng: number
) {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;

  const dLat = toRad(vanLat - userLat);
  const dLng = toRad(vanLng - userLng);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(userLat)) *
    Math.cos(toRad(vanLat)) *
    Math.sin(dLng / 2) *
    Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distanceKm = earthRadiusKm * c;

  return distanceKm * 0.621371;
}

function normalizeText(value?: string | null) {
  return (value ?? "").trim().toLowerCase();
}

function matchesFoodCategory(van: Van, category: string) {
  const target = normalizeText(category);

  if (!target) return true;

  return (van.foodCategories ?? []).some(
    (item) => normalizeText(item) === target
  );
}

export default function HomeScreen() {
  const [supabaseVans, setSupabaseVans] = useState<Van[]>([]);
  const [customVans, setCustomVans] = useState<Van[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<BrowseFilter>("ALL");
  const [selectedFoodCategory, setSelectedFoodCategory] =
    useState<string>("ALL");
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  const aboutFade = useRef(new Animated.Value(0)).current;
  const aboutSlide = useRef(new Animated.Value(8)).current;

  useEffect(() => {
    requestUserLocation();
    loadSupabaseVans();

    Animated.parallel([
      Animated.timing(aboutFade, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(aboutSlide, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadCustomVans();
      loadSupabaseVans();
    }, [])
  );

  async function loadSupabaseVans() {
    const { data, error } = await supabase.from("vendors").select("*");

    if (error) {
      console.log("Error loading vendors:", error.message);
      return;
    }

    const mappedVans = mapVendorRowsToVans(data ?? []);
    setSupabaseVans(mappedVans);
  }

  async function loadCustomVans() {
    try {
      const stored = await AsyncStorage.getItem(CUSTOM_VANS_KEY);

      if (!stored) {
        setCustomVans([]);
        return;
      }

      const parsed: Van[] = JSON.parse(stored);
      setCustomVans(parsed);
    } catch {
      setCustomVans([]);
    }
  }

  async function requestUserLocation() {
    try {
      const permission = await Location.requestForegroundPermissionsAsync();

      if (permission.status !== "granted") return;

      const current = await Location.getCurrentPositionAsync({});

      setUserLocation({
        latitude: current.coords.latitude,
        longitude: current.coords.longitude,
      });
    } catch { }
  }

  const allVans: Van[] = [...supabaseVans, ...customVans];

  const foodCategories = useMemo(() => {
    const discoveredCategories = new Set<string>();

    allVans.forEach((van) => {
      (van.foodCategories ?? []).forEach((category) => {
        const cleaned = category.trim();
        if (cleaned) {
          discoveredCategories.add(cleaned);
        }
      });
    });

    return ["ALL", ...Array.from(discoveredCategories).sort((a, b) => a.localeCompare(b))];
  }, [allVans]);

  const filteredVans = useMemo(() => {
    let workingVans = [...allVans];

    if (selectedFilter === "LIVE NOW") {
      workingVans = workingVans.filter(
        (van) =>
          getSubscriptionFeatures(van.subscriptionTier).liveStatus && van.isLive
      );
    }

    if (selectedFilter === "FEATURED") {
      workingVans = workingVans.filter((van) => van.subscriptionTier === "pro");
    }

    if (selectedFoodCategory !== "ALL") {
      workingVans = workingVans.filter((van) =>
        matchesFoodCategory(van, selectedFoodCategory)
      );
    }

    const sortedVans = [...workingVans].sort((a, b) => {
      const tierRank = { pro: 3, growth: 2, free: 1 };

      const aRank = tierRank[a.subscriptionTier ?? "free"];
      const bRank = tierRank[b.subscriptionTier ?? "free"];

      if (selectedFilter === "TOP RATED" && b.rating !== a.rating) {
        return b.rating - a.rating;
      }

      if (selectedFilter === "LIVE NOW" && a.isLive !== b.isLive) {
        return a.isLive ? -1 : 1;
      }

      if (aRank !== bRank) {
        return bRank - aRank;
      }

      if (b.rating !== a.rating) {
        return b.rating - a.rating;
      }

      return a.name.localeCompare(b.name);
    });

    return sortedVans;
  }, [allVans, selectedFilter, selectedFoodCategory]);

  const liveNowVans = useMemo(() => {
    return [...allVans]
      .filter(
        (van) =>
          getSubscriptionFeatures(van.subscriptionTier).liveStatus && van.isLive
      )
      .sort((a, b) => {
        const tierRank = { pro: 3, growth: 2, free: 1 };
        const aRank = tierRank[a.subscriptionTier ?? "free"];
        const bRank = tierRank[b.subscriptionTier ?? "free"];

        if (aRank !== bRank) {
          return bRank - aRank;
        }

        return b.rating - a.rating;
      })
      .slice(0, 6);
  }, [allVans]);

  const featuredProVans = useMemo(() => {
    return [...allVans]
      .filter((van) => van.subscriptionTier === "pro")
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 4);
  }, [allVans]);

  function getVendorDistance(van: Van) {
    if (!userLocation) return null;

    return getDistanceMiles(
      userLocation.latitude,
      userLocation.longitude,
      van.lat,
      van.lng
    );
  }

  function renderCompactLiveCard(van: Van) {
    return (
      <Pressable
        key={`live-${van.id}`}
        style={styles.liveCard}
        onPress={() => router.push(`/vendor/${van.id}`)}
      >
        <View style={styles.liveCardTop}>
          <Text style={styles.liveCardBadge}>LIVE</Text>
          {van.subscriptionTier === "pro" ? (
            <Text style={styles.liveCardFeatured}>FEATURED</Text>
          ) : van.subscriptionTier === "growth" ? (
            <Text style={styles.liveCardGrowth}>GROWTH</Text>
          ) : null}
        </View>

        <Text style={styles.liveCardTitle} numberOfLines={1}>
          {van.name}
        </Text>

        <Text style={styles.liveCardCuisine} numberOfLines={1}>
          {van.cuisine}
        </Text>

        <View style={styles.liveCardFooter}>
          <Text style={styles.liveCardRating}>★ {van.rating.toFixed(1)}</Text>
          {getVendorDistance(van) !== null ? (
            <Text style={styles.liveCardDistance}>
              {getVendorDistance(van)?.toFixed(1)} mi
            </Text>
          ) : null}
        </View>
      </Pressable>
    );
  }

  function renderFoodCategoryCard(category: string) {
    const isActive = selectedFoodCategory === category;

    return (
      <Pressable
        key={category}
        style={[
          styles.foodCategoryCard,
          isActive && styles.foodCategoryCardActive,
        ]}
        onPress={() => setSelectedFoodCategory(category)}
      >
        <Text
          style={[
            styles.foodCategoryCardTitle,
            isActive && styles.foodCategoryCardTitleActive,
          ]}
        >
          {category}
        </Text>

        <Text
          style={[
            styles.foodCategoryCardText,
            isActive && styles.foodCategoryCardTextActive,
          ]}
        >
          {category === "ALL"
            ? "Browse every food type"
            : `See ${category.toLowerCase()} vendors`}
        </Text>
      </Pressable>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={filteredVans}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            <View style={styles.heroWrap}>
              <View style={styles.hero}>
                <Image
                  source={require("../../assets/images/logo.png")}
                  style={styles.logo}
                  resizeMode="cover"
                />
              </View>
            </View>

            <Animated.View
              style={[
                styles.aboutSection,
                {
                  opacity: aboutFade,
                  transform: [{ translateY: aboutSlide }],
                },
              ]}
            >
              <Text style={styles.aboutGreeting}>To BiteBeaconeers,</Text>

              <Text style={styles.aboutText}>
                Built to make street food easier to find and support local vendors.
                Discover what’s live, nearby, and actually worth the trip.
              </Text>

              <Text style={styles.aboutSignature}>— Founder</Text>

              <View style={styles.aboutDivider} />
            </Animated.View>

            {liveNowVans.length > 0 ? (
              <View style={styles.sectionBlock}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Live Now</Text>
                  <Text style={styles.sectionSubtitle}>
                    Ready-to-visit vendors near you
                  </Text>
                </View>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.horizontalListContent}
                >
                  {liveNowVans.map(renderCompactLiveCard)}
                </ScrollView>
              </View>
            ) : null}

            {featuredProVans.length > 0 ? (
              <View style={styles.sectionBlock}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Featured Vendors</Text>
                  <Text style={styles.sectionSubtitle}>
                    Premium listings with extra visibility
                  </Text>
                </View>

                {featuredProVans.map((item) => (
                  <BurgerVanCard
                    key={`featured-${item.id}`}
                    id={item.id}
                    name={item.name}
                    cuisine={item.cuisine}
                    rating={item.rating}
                    isLive={item.isLive}
                    temporary={item.temporary}
                    distanceMiles={getVendorDistance(item)}
                    subscriptionTier={item.subscriptionTier}
                    vendorMessage={item.vendorMessage}
                  />
                ))}
              </View>
            ) : null}

            <View style={styles.controlsCard}>
              <Text style={styles.controlsTitle}>Browse vendors</Text>

              <View style={styles.filterRow}>
                {(["ALL", "LIVE NOW", "TOP RATED", "FEATURED"] as BrowseFilter[]).map(
                  (option) => (
                    <Pressable
                      key={option}
                      style={[
                        styles.filterChip,
                        selectedFilter === option && styles.filterChipActive,
                      ]}
                      onPress={() => setSelectedFilter(option)}
                    >
                      <Text
                        style={[
                          styles.filterChipText,
                          selectedFilter === option &&
                          styles.filterChipTextActive,
                        ]}
                      >
                        {option}
                      </Text>
                    </Pressable>
                  )
                )}
              </View>
            </View>

            <View style={styles.sectionBlock}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Browse by Food</Text>
                <Text style={styles.sectionSubtitle}>
                  Food types update as vendor categories grow
                </Text>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.foodCategoryRow}
              >
                {foodCategories.map(renderFoodCategoryCard)}
              </ScrollView>
            </View>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>All Vendors Nearby</Text>
              <Text style={styles.sectionSubtitle}>
                Ranked by tier, quality, and availability
              </Text>
            </View>
          </>
        }
        renderItem={({ item }) => (
          <BurgerVanCard
            id={item.id}
            name={item.name}
            cuisine={item.cuisine}
            rating={item.rating}
            isLive={item.isLive}
            temporary={item.temporary}
            distanceMiles={getVendorDistance(item)}
            subscriptionTier={item.subscriptionTier}
            vendorMessage={item.vendorMessage}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },

  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },

  heroWrap: {
    marginTop: 20,
    marginBottom: 18,
  },

  hero: {
    width: "100%",
    height: 280,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: "#FF7A00",
    overflow: "hidden",
    backgroundColor: "#0B2A5B",
  },

  logo: {
    width: "100%",
    height: "100%",
  },

  introSection: {
    marginBottom: 18,
  },

  kicker: {
    fontSize: 12,
    fontWeight: "800",
    color: "#FFC107",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 6,
  },

  introTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 6,
  },

  introText: {
    fontSize: 15,
    lineHeight: 22,
    color: "rgba(255,255,255,0.78)",
  },

  sectionBlock: {
    marginBottom: 24,
  },

  sectionHeader: {
    marginTop: 8,
    marginBottom: 12,
  },

  sectionTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 2,
  },

  sectionSubtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.7)",
  },

  horizontalListContent: {
    paddingRight: 8,
  },

  liveCard: {
    width: 200,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 14,
    marginRight: 12,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },

  liveCardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },

  liveCardBadge: {
    backgroundColor: "#1DB954",
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: "hidden",
  },

  liveCardFeatured: {
    color: "#FF7A00",
    fontSize: 10,
    fontWeight: "800",
  },

  liveCardGrowth: {
    color: "#0B2A5B",
    fontSize: 10,
    fontWeight: "800",
  },

  liveCardTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 4,
  },

  liveCardCuisine: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 14,
  },

  liveCardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  liveCardRating: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FF7A00",
  },

  liveCardDistance: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0B2A5B",
  },

  controlsCard: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 18,
    padding: 16,
    marginTop: 4,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: "#FF7A00",
  },

  controlsTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 12,
  },

  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },

  filterChip: {
    backgroundColor: "#2C4875",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },

  filterChipActive: {
    backgroundColor: "#FFFFFF",
  },

  filterChipText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 13,
  },

  filterChipTextActive: {
    color: "#0B2A5B",
  },

  foodCategoryRow: {
    paddingRight: 8,
  },

  foodCategoryCard: {
    width: 160,
    minHeight: 92,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 18,
    padding: 14,
    marginRight: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    justifyContent: "space-between",
  },

  foodCategoryCardActive: {
    backgroundColor: "#FF7A00",
    borderColor: "#FF7A00",
  },

  foodCategoryCardTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 8,
  },

  foodCategoryCardTitleActive: {
    color: "#FFFFFF",
  },

  foodCategoryCardText: {
    fontSize: 13,
    lineHeight: 18,
    color: "rgba(255,255,255,0.72)",
  },

  foodCategoryCardTextActive: {
    color: "rgba(255,255,255,0.92)",
  },
  aboutSection: {
    marginBottom: 26,
  },

  aboutGreeting: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFC107",
    marginBottom: 6,
  },

  aboutText: {
    fontSize: 15,
    lineHeight: 22,
    color: "rgba(255,255,255,0.85)",
    marginBottom: 10,
  },

  aboutSignature: {
    fontSize: 13,
    color: "rgba(255,255,255,0.6)",
    fontStyle: "italic",
  },
  aboutDivider: {
    height: 2,
    width: 120,
    backgroundColor: "#FF7A00",
    borderRadius: 999,
    marginTop: 14,
    alignSelf: "center",
  },
});