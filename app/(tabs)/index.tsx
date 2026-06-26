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
  TextInput,
  View,
} from "react-native";
import AppUpdateBanner from "../../components/AppUpdateBanner";
import MapTextureBackground from "../../components/MapTextureBackground";
import { getAppSettings, type AppSettings } from "../../services/appSettingsService";

import BurgerVanCard from "../../components/BurgerVanCard";
import { theme } from "../../constants/theme";
import { getSubscriptionFeatures } from "../../lib/subscriptionFeatures";
import { getAllVendors } from "../../services/vendorService";
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

function matchesSearchQuery(van: Van, query: string) {
  const search = normalizeText(query);

  if (!search) return true;

  const inName = normalizeText(van.name).includes(search);
  const inVendorName = normalizeText(van.vendorName).includes(search);
  const inCuisine = normalizeText(van.cuisine).includes(search);
  const inMenu = normalizeText(van.menu).includes(search);
  const inCategories = (van.foodCategories ?? []).some((category) =>
    normalizeText(category).includes(search)
  );

  return inName || inVendorName || inCuisine || inMenu || inCategories;
}

export default function HomeScreen() {
  const [supabaseVans, setSupabaseVans] = useState<Van[]>([]);
  const [customVans, setCustomVans] = useState<Van[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<BrowseFilter>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(20);
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [vendorsLoading, setVendorsLoading] = useState(true);
  const [appSettings, setAppSettings] = useState<AppSettings | null>(null);

  const hasLoadedInitialData = useRef(false);
  const aboutFade = useRef(new Animated.Value(0)).current;
  const aboutSlide = useRef(new Animated.Value(8)).current;

  useEffect(() => {
    requestUserLocation();
    loadAppSettings();
    loadInitialData();

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
      if (!hasLoadedInitialData.current) return;

      setVisibleCount(20);
      loadCustomVans();
      loadSupabaseVans();
    }, [])
  );

  async function loadAppSettings() {
    const settings = await getAppSettings();
    setAppSettings(settings);
  }

  async function loadInitialData() {
    setVendorsLoading(true);

    try {
      await Promise.all([loadCustomVans(), loadSupabaseVans()]);
      hasLoadedInitialData.current = true;
    } finally {
      setVendorsLoading(false);
    }
  }

  async function loadSupabaseVans() {
    try {
      const vendors = await getAllVendors();
      setSupabaseVans(vendors);
    } catch (error) {
      console.log(
        "Error loading vendors:",
        error instanceof Error ? error.message : "Unknown error"
      );
      setSupabaseVans([]);
    }
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

      const lastKnown = await Location.getLastKnownPositionAsync();

      if (lastKnown) {
        setUserLocation({
          latitude: lastKnown.coords.latitude,
          longitude: lastKnown.coords.longitude,
        });
      }

      const current = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      setUserLocation({
        latitude: current.coords.latitude,
        longitude: current.coords.longitude,
      });
    } catch { }
  }

  const allVans: Van[] = useMemo(
    () => [...supabaseVans, ...customVans],
    [supabaseVans, customVans]
  );

  const visibleVans = useMemo(() => {
    return allVans.filter((van) => {
      if (van.isSuspended) return false;

      if (
        van.listingSource === "user_spotted" &&
        van.expiresAt &&
        new Date(van.expiresAt) < new Date()
      ) {
        return false;
      }

      return true;
    });
  }, [allVans]);

  const distanceMap = useMemo(() => {
    const nextMap = new Map<string, number>();

    if (!userLocation) return nextMap;

    visibleVans.forEach((van) => {
      nextMap.set(
        van.id,
        getDistanceMiles(
          userLocation.latitude,
          userLocation.longitude,
          van.lat,
          van.lng
        )
      );
    });

    return nextMap;
  }, [visibleVans, userLocation]);

  const filteredVans = useMemo(() => {
    let workingVans = [...visibleVans];

    if (selectedFilter === "LIVE NOW") {
      workingVans = workingVans.filter(
        (van) =>
          getSubscriptionFeatures(van.subscriptionTier).liveStatus && van.isLive
      );
    }

    if (selectedFilter === "FEATURED") {
      workingVans = workingVans.filter((van) => van.subscriptionTier === "pro");
    }

    if (searchQuery.trim()) {
      workingVans = workingVans.filter((van) =>
        matchesSearchQuery(van, searchQuery)
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

      if (userLocation) {
        const distanceA = distanceMap.get(a.id) ?? Number.MAX_SAFE_INTEGER;
        const distanceB = distanceMap.get(b.id) ?? Number.MAX_SAFE_INTEGER;

        if (Math.abs(distanceA - distanceB) > 0.05) {
          return distanceA - distanceB;
        }
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
  }, [
    visibleVans,
    selectedFilter,
    searchQuery,
    userLocation,
    distanceMap,
  ]);

  const liveNowVans = useMemo(() => {
    return [...visibleVans]
      .filter(
        (van) =>
          getSubscriptionFeatures(van.subscriptionTier).liveStatus && van.isLive
      )
      .sort((a, b) => {
        const tierRank = { pro: 3, growth: 2, free: 1 };
        const aRank = tierRank[a.subscriptionTier ?? "free"];
        const bRank = tierRank[b.subscriptionTier ?? "free"];

        if (userLocation) {
          const distanceA = distanceMap.get(a.id) ?? Number.MAX_SAFE_INTEGER;
          const distanceB = distanceMap.get(b.id) ?? Number.MAX_SAFE_INTEGER;

          if (Math.abs(distanceA - distanceB) > 0.05) {
            return distanceA - distanceB;
          }
        }

        if (aRank !== bRank) {
          return bRank - aRank;
        }

        return b.rating - a.rating;
      })
      .slice(0, 6);
  }, [visibleVans, userLocation, distanceMap]);

  const featuredProVans = useMemo(() => {
    return [...visibleVans]
      .filter(
        (van) =>
          van.subscriptionTier === "pro" &&
          van.listingSource !== "user_spotted"
      )
      .sort((a, b) => {
        if (userLocation) {
          const distanceA = distanceMap.get(a.id) ?? Number.MAX_SAFE_INTEGER;
          const distanceB = distanceMap.get(b.id) ?? Number.MAX_SAFE_INTEGER;

          if (Math.abs(distanceA - distanceB) > 0.05) {
            return distanceA - distanceB;
          }
        }

        return b.rating - a.rating;
      })
      .slice(0, 3);
  }, [visibleVans, userLocation, distanceMap]);

  const recentlySpottedVans = useMemo(() => {
    return [...visibleVans]
      .filter((van) => van.listingSource === "user_spotted")
      .sort((a, b) => {
        if (userLocation) {
          const distanceA = distanceMap.get(a.id) ?? Number.MAX_SAFE_INTEGER;
          const distanceB = distanceMap.get(b.id) ?? Number.MAX_SAFE_INTEGER;

          return distanceA - distanceB;
        }

        return a.name.localeCompare(b.name);
      })
      .slice(0, 4);
  }, [visibleVans, userLocation, distanceMap]);

  function getVendorDistance(van: Van) {
    if (!userLocation) return null;
    return distanceMap.get(van.id) ?? null;
  }

  function renderCompactLiveCard(van: Van) {
    const vendorDistance = getVendorDistance(van);

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
          {vendorDistance !== null ? (
            <Text style={styles.liveCardDistance}>
              {vendorDistance.toFixed(1)} mi
            </Text>
          ) : null}
        </View>
      </Pressable>
    );
  }

  function renderFeaturedVendorCard(van: Van) {
    const vendorDistance = getVendorDistance(van);

    return (
      <Pressable
        key={`featured-${van.id}`}
        style={styles.featuredRow}
        onPress={() => router.push(`/vendor/${van.id}`)}
      >
        <View style={styles.featuredRowLeft}>
          <Text style={styles.featuredRowName} numberOfLines={1}>
            {van.name}
          </Text>

          <Text style={styles.featuredRowCuisine} numberOfLines={1}>
            {van.cuisine}
          </Text>
        </View>

        <View style={styles.featuredRowRight}>
          {vendorDistance !== null ? (
            <Text style={styles.featuredRowDistance}>
              {vendorDistance.toFixed(1)} mi
            </Text>
          ) : null}

          {van.isLive ? (
            <Text style={styles.featuredRowBadge}>LIVE</Text>
          ) : null}
        </View>
      </Pressable>
    );
  }

  useEffect(() => {
    setVisibleCount(20);
  }, [selectedFilter, searchQuery]);

  const visibleFilteredVans = filteredVans.slice(0, visibleCount);
  const hasMoreVans = filteredVans.length > visibleCount;

  const showEmptyState = !vendorsLoading && filteredVans.length === 0;

  return (
    <View style={styles.container}>
      <MapTextureBackground userLocation={userLocation} />

      <FlatList
        data={visibleFilteredVans}
        keyExtractor={(item) => item.id}
        numColumns={1}
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

            <AppUpdateBanner settings={appSettings} />

            <View style={styles.adventureCard}>
              <Text style={styles.adventureKicker}>TODAY ON BITEBEACON</Text>

              <Text style={styles.adventureTitle}>Discover food worth the trip.</Text>

              <View style={styles.adventureStatsRow}>
                <View style={styles.adventureStat}>
                  <Text style={styles.adventureStatValue}>🍔 {visibleVans.length}</Text>
                  <Text style={styles.adventureStatLabel}>Food Spots</Text>
                </View>

                <View style={styles.adventureStat}>
                  <Text style={styles.adventureStatValue}>🔥 {liveNowVans.length}</Text>
                  <Text style={styles.adventureStatLabel}>Live Now</Text>
                </View>

                <View style={styles.adventureStat}>
                  <Text style={styles.adventureStatValue}>
                    📍 {visibleVans.filter((van) => van.listingSource === "user_spotted").length}
                  </Text>
                  <Text style={styles.adventureStatLabel}>Finds</Text>
                </View>
              </View>

              <TextInput
                style={styles.adventureSearchInput}
                placeholder="🍔 Burgers, coffee, pizza, tacos..."
                placeholderTextColor="rgba(255,255,255,0.58)"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />

              {searchQuery.trim() ? (
                <Text style={styles.searchResultsCount}>
                  {filteredVans.length} results found
                </Text>
              ) : null}

              {searchQuery.trim() ? (
                <View style={styles.searchResultsPanel}>
                  {filteredVans.slice(0, 4).map((van) => {
                    const distance = getVendorDistance(van);

                    return (
                      <Pressable
                        key={`search-${van.id}`}
                        style={styles.searchResultRow}
                        onPress={() => router.push(`/vendor/${van.id}`)}
                      >
                        <View style={styles.searchResultTextWrap}>
                          <Text style={styles.searchResultName} numberOfLines={1}>
                            {van.name}
                          </Text>
                          <Text style={styles.searchResultMeta} numberOfLines={1}>
                            {van.cuisine}
                          </Text>
                        </View>

                        {distance !== null ? (
                          <Text style={styles.searchResultDistance}>
                            {distance.toFixed(1)} mi
                          </Text>
                        ) : null}
                      </Pressable>
                    );
                  })}

                  {filteredVans.length > 4 ? (
                    <Pressable
                      style={styles.viewAllResultsButton}
                      onPress={() => setVisibleCount(50)}
                    >
                      <Text style={styles.viewAllResultsText}>
                        View all {filteredVans.length} results below
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              ) : null}

              <Pressable
                style={styles.adventureButton}
                onPress={() => router.push("/(tabs)/explore")}
              >
                <Text style={styles.adventureButtonText}>Explore the map</Text>
              </Pressable>
            </View>

            {!vendorsLoading && recentlySpottedVans.length > 0 ? (
              <View style={styles.sectionBlock}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Recently Spotted</Text>
                  <Text style={styles.sectionSubtitle}>
                    Community discoveries near you
                  </Text>
                </View>

                <View style={styles.spottedList}>
                  {recentlySpottedVans.map((van) => {
                    const distance = getVendorDistance(van);

                    return (
                      <Pressable
                        key={`spotted-${van.id}`}
                        style={styles.spottedRow}
                        onPress={() => router.push(`/vendor/${van.id}`)}
                      >
                        <View>
                          <Text style={styles.spottedName}>{van.name}</Text>
                          <Text style={styles.spottedCuisine}>
                            {van.cuisine}
                          </Text>
                        </View>

                        {distance !== null ? (
                          <Text style={styles.spottedDistance}>
                            {distance.toFixed(1)} mi
                          </Text>
                        ) : null}
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ) : null}

            {vendorsLoading ? (
              <View style={styles.loadingCard}>
                <Text style={styles.loadingCardTitle}>Loading vendors...</Text>
                <Text style={styles.loadingCardText}>
                  Finding nearby food vans and preparing your home feed.
                </Text>
              </View>
            ) : null}

            {!vendorsLoading && liveNowVans.length > 0 ? (
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

            {!vendorsLoading && featuredProVans.length > 0 ? (
              <View style={styles.sectionBlock}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Worth the Trip</Text>
                  <Text style={styles.sectionSubtitle}>
                    Featured food spots with extra buzz
                  </Text>
                </View>

                <View>
                  {featuredProVans.map(renderFeaturedVendorCard)}
                </View>
              </View>
            ) : null}

            <View style={styles.controlsCard}>
              <Text style={styles.controlsTitle}>Find Your Food</Text>

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

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Nearby Food Spots</Text>
              <Text style={styles.sectionSubtitle}>
                Closest places and community finds near you
              </Text>
            </View>
          </>
        }
        ListEmptyComponent={
          showEmptyState ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateTitle}>No vendors found</Text>
              <Text style={styles.emptyStateText}>
                Try a different search or change your food and browse filters.
              </Text>
            </View>
          ) : null
        }
        ListFooterComponent={
          hasMoreVans ? (
            <Pressable
              style={styles.loadMoreButton}
              onPress={() => setVisibleCount((current) => current + 20)}
            >
              <Text style={styles.loadMoreButtonText}>Load More Vendors</Text>
            </Pressable>
          ) : null
        }
        renderItem={({ item }) => (
          <View style={styles.vendorGridItem}>
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
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#061E3F",
    position: "relative",
  },

  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  vendorGridRow: {
    justifyContent: "space-between",
  },
  vendorGridItem: {
    width: "100%",
    marginBottom: 10,
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
    borderColor: theme.colors.border,
    overflow: "hidden",
    backgroundColor: theme.colors.background,
  },

  logo: {
    width: "100%",
    height: "100%",
  },

  aboutSection: {
    marginBottom: 24,
  },

  aboutGreeting: {
    fontSize: 16,
    fontWeight: "700",
    color: theme.colors.secondary,
    marginBottom: 6,
  },

  aboutText: {
    fontSize: 15,
    lineHeight: 22,
    color: "rgba(255,255,255,0.86)",
    marginBottom: 10,
  },

  aboutSignature: {
    fontSize: 13,
    color: "rgba(255,255,255,0.62)",
    fontStyle: "italic",
  },

  aboutDivider: {
    height: 2,
    width: 120,
    backgroundColor: theme.colors.primary,
    borderRadius: 999,
    marginTop: 14,
    alignSelf: "center",
  },

  loadingCard: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 18,
    padding: 16,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: theme.colors.border,
  },

  loadingCardTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 6,
  },

  loadingCardText: {
    fontSize: 14,
    lineHeight: 20,
    color: "rgba(255,255,255,0.72)",
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
    backgroundColor: theme.colors.success,
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: "hidden",
  },

  liveCardFeatured: {
    color: theme.colors.primary,
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
    color: theme.colors.primary,
  },

  liveCardDistance: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.background,
  },

  featuredCard: {
    width: 190,
    minHeight: 125,
    backgroundColor: "#14386E",
    borderRadius: 22,
    padding: 16,
    marginRight: 12,
    borderWidth: 2,
    borderColor: theme.colors.border,
    overflow: "hidden",
    justifyContent: "space-between",
  },

  featuredCardGlow: {
    position: "absolute",
    top: -18,
    right: -18,
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "rgba(255,122,0,0.16)",
  },

  featuredCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  featuredCardBadge: {
    backgroundColor: theme.colors.primary,
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    overflow: "hidden",
  },

  featuredCardDistance: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 12,
    fontWeight: "700",
  },

  featuredCardTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#FFFFFF",
    marginTop: 18,
    marginBottom: 6,
  },

  featuredCardMeta: {
    fontSize: 12,
    color: "rgba(255,255,255,0.8)",
    marginBottom: 16,
  },

  featuredCardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  featuredCardRating: {
    fontSize: 14,
    fontWeight: "800",
    color: theme.colors.secondary,
  },

  featuredCardDeal: {
    backgroundColor: theme.colors.success,
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    overflow: "hidden",
  },

  controlsCard: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 18,
    padding: 14,
    marginTop: 4,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },

  controlsTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#FFFFFF",
    marginBottom: 12,
  },

  searchInput: {
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 2,
    borderColor: theme.colors.border,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 14,
    color: "#FFFFFF",
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
    color: theme.colors.background,
  },

  emptyState: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 18,
    borderWidth: 2,
    borderColor: theme.colors.border,
    padding: 18,
    marginTop: 6,
  },

  emptyStateTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 6,
  },

  emptyStateText: {
    fontSize: 14,
    lineHeight: 20,
    color: "rgba(255,255,255,0.72)",
  },

  loadMoreButton: {
    marginTop: 10,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 2,
    borderColor: theme.colors.border,
  },

  loadMoreButtonText: {
    color: theme.colors.background,
    fontSize: 15,
    fontWeight: "800",
  },

  adventureCard: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 22,
    padding: 16,
    marginBottom: 22,
    borderWidth: 2,
    borderColor: theme.colors.border,
  },

  adventureKicker: {
    fontSize: 11,
    fontWeight: "800",
    color: theme.colors.secondary,
    letterSpacing: 1,
    marginBottom: 8,
  },

  adventureTitle: {
    fontSize: 24,
    fontWeight: "900",
    color: "#FFFFFF",
    marginBottom: 14,
  },

  adventureText: {
    fontSize: 14,
    lineHeight: 20,
    color: "rgba(255,255,255,0.76)",
    marginBottom: 16,
  },

  adventureStatsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },

  adventureStat: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: "center",
  },

  adventureStatValue: {
    fontSize: 22,
    fontWeight: "900",
    color: "#FFFFFF",
  },

  adventureStatLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "rgba(255,255,255,0.72)",
    marginTop: 4,
    textAlign: "center",
    lineHeight: 12,
  },

  adventureButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: 16,
    paddingVertical: 13,
    alignItems: "center",
  },

  adventureButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
  },

  adventureSearchInput: {
    backgroundColor: "rgba(255,255,255,0.10)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: "#FFFFFF",
    fontSize: 16,
    marginBottom: 14,
  },

  searchResultsPanel: {
    backgroundColor: "rgba(255,255,255,0.10)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    marginBottom: 14,
    overflow: "hidden",
  },

  searchResultRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },

  searchResultTextWrap: {
    flex: 1,
    paddingRight: 10,
  },

  searchResultName: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },

  searchResultMeta: {
    color: "rgba(255,255,255,0.62)",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
  },

  searchResultDistance: {
    color: theme.colors.secondary,
    fontSize: 12,
    fontWeight: "800",
  },

  searchResultsCount: {
    color: theme.colors.secondary,
    fontSize: 12,
    fontWeight: "800",
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 6,
  },

  viewAllResultsButton: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "rgba(255,122,0,0.16)",
  },

  viewAllResultsText: {
    color: theme.colors.secondary,
    fontSize: 13,
    fontWeight: "900",
    textAlign: "center",
  },

  spottedList: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },

  spottedRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },

  spottedName: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },

  spottedCuisine: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 12,
    marginTop: 2,
  },

  spottedDistance: {
    color: theme.colors.secondary,
    fontSize: 13,
    fontWeight: "800",
  },

  featuredRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.10)",
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },

  featuredRowLeft: {
    flex: 1,
  },

  featuredRowName: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },

  featuredRowCuisine: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 13,
    marginTop: 2,
  },

  featuredRowRight: {
    alignItems: "flex-end",
  },

  featuredRowDistance: {
    color: theme.colors.secondary,
    fontWeight: "800",
    fontSize: 14,
  },

  featuredRowBadge: {
    marginTop: 6,
    backgroundColor: theme.colors.primary,
    color: "#FFFFFF",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    fontSize: 10,
    fontWeight: "800",
  },
});