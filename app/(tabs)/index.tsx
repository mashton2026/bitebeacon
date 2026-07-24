import { MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import * as Location from "expo-location";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AppText from "../../components/AppText";
import AppUpdateBanner from "../../components/AppUpdateBanner";
import BurgerVanCard from "../../components/BurgerVanCard";
import CardGlowBorder from "../../components/CardGlowBorder";
import HeroRadar from "../../components/HeroRadar";
import MapTextureBackground from "../../components/MapTextureBackground";
import MetallicFrame from "../../components/MetallicFrame";
import SectionGlowLine from "../../components/SectionGlowLine";
import { getSubscriptionFeatures } from "../../lib/subscriptionFeatures";
import {
  getAppSettings,
  type AppSettings,
} from "../../services/appSettingsService";
import { getAllVendors } from "../../services/vendorService";
import { type Van } from "../../types/van";

const CUSTOM_VANS_KEY = "bitebeacon_custom_vans";
const INITIAL_VISIBLE_VENDOR_COUNT = 20;
const VENDOR_LOAD_INCREMENT = 20;

type BrowseFilter = "ALL" | "LIVE NOW" | "TOP RATED" | "FEATURED";

type UserLocation = {
  latitude: number;
  longitude: number;
};

type IconName = React.ComponentProps<
  typeof MaterialCommunityIcons
>["name"];

const FILTER_OPTIONS: BrowseFilter[] = [
  "ALL",
  "LIVE NOW",
  "TOP RATED",
  "FEATURED",
];

function getDistanceMiles(
  userLat: number,
  userLng: number,
  vanLat: number,
  vanLng: number
) {
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;

  const latitudeDifference = toRadians(vanLat - userLat);
  const longitudeDifference = toRadians(vanLng - userLng);

  const calculation =
    Math.sin(latitudeDifference / 2) *
    Math.sin(latitudeDifference / 2) +
    Math.cos(toRadians(userLat)) *
    Math.cos(toRadians(vanLat)) *
    Math.sin(longitudeDifference / 2) *
    Math.sin(longitudeDifference / 2);

  const angularDistance =
    2 * Math.atan2(Math.sqrt(calculation), Math.sqrt(1 - calculation));

  return earthRadiusKm * angularDistance * 0.621371;
}

function normalizeText(value?: string | null) {
  return (value ?? "").trim().toLowerCase();
}

function matchesSearchQuery(van: Van, query: string) {
  const normalizedQuery = normalizeText(query);

  if (!normalizedQuery) return true;

  return (
    normalizeText(van.name).includes(normalizedQuery) ||
    normalizeText(van.vendorName).includes(normalizedQuery) ||
    normalizeText(van.cuisine).includes(normalizedQuery) ||
    normalizeText(van.menu).includes(normalizedQuery) ||
    (van.foodCategories ?? []).some((category) =>
      normalizeText(category).includes(normalizedQuery)
    )
  );
}

function isExpiredSpottedListing(van: Van) {
  if (
    van.listingSource !== "user_spotted" ||
    !van.expiresAt
  ) {
    return false;
  }

  return new Date(van.expiresAt).getTime() < Date.now();
}

function getTierRank(van: Van) {
  const tierRank = {
    free: 1,
    growth: 2,
    pro: 3,
  };

  return tierRank[van.subscriptionTier ?? "free"];
}

function formatDistance(distance: number | null) {
  if (distance === null || !Number.isFinite(distance)) {
    return null;
  }

  return `${distance.toFixed(1)} mi`;
}

export default function HomeScreen() {
  const [supabaseVans, setSupabaseVans] = useState<Van[]>([]);
  const [customVans, setCustomVans] = useState<Van[]>([]);
  const [selectedFilter, setSelectedFilter] =
    useState<BrowseFilter>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(
    INITIAL_VISIBLE_VENDOR_COUNT
  );
  const [userLocation, setUserLocation] =
    useState<UserLocation | null>(null);
  const [vendorsLoading, setVendorsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [appSettings, setAppSettings] =
    useState<AppSettings | null>(null);

  const hasLoadedInitialData = useRef(false);

  const loadAppSettings = useCallback(async () => {
    try {
      const settings = await getAppSettings();
      setAppSettings(settings);
    } catch (error) {
      console.log(
        "Error loading app settings:",
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }, []);

  const loadSupabaseVans = useCallback(async () => {
    try {
      const vendors = await getAllVendors();
      setSupabaseVans(vendors);
    } catch (error) {
      console.log(
        "Error loading vendors:",
        error instanceof Error ? error.message : "Unknown error"
      );

      setSupabaseVans([]);
      throw error;
    }
  }, []);

  const loadCustomVans = useCallback(async () => {
    try {
      const storedVans = await AsyncStorage.getItem(CUSTOM_VANS_KEY);

      if (!storedVans) {
        setCustomVans([]);
        return;
      }

      const parsedVans: Van[] = JSON.parse(storedVans);
      setCustomVans(Array.isArray(parsedVans) ? parsedVans : []);
    } catch (error) {
      console.log(
        "Error loading custom vendors:",
        error instanceof Error ? error.message : "Unknown error"
      );

      setCustomVans([]);
    }
  }, []);

  const loadVendorData = useCallback(
    async (showRefreshIndicator = false) => {
      if (showRefreshIndicator) {
        setRefreshing(true);
      } else {
        setVendorsLoading(true);
      }

      setLoadFailed(false);

      try {
        await Promise.all([
          loadCustomVans(),
          loadSupabaseVans(),
          loadAppSettings(),
        ]);

        hasLoadedInitialData.current = true;
      } catch {
        setLoadFailed(true);
      } finally {
        setVendorsLoading(false);
        setRefreshing(false);
      }
    },
    [loadAppSettings, loadCustomVans, loadSupabaseVans]
  );

  const requestUserLocation = useCallback(async () => {
    try {
      const permission =
        await Location.requestForegroundPermissionsAsync();

      if (permission.status !== "granted") return;

      const lastKnownPosition =
        await Location.getLastKnownPositionAsync();

      if (lastKnownPosition) {
        setUserLocation({
          latitude: lastKnownPosition.coords.latitude,
          longitude: lastKnownPosition.coords.longitude,
        });
      }

      const currentPosition =
        await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

      setUserLocation({
        latitude: currentPosition.coords.latitude,
        longitude: currentPosition.coords.longitude,
      });
    } catch (error) {
      console.log(
        "Location unavailable:",
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }, []);

  useEffect(() => {
    void requestUserLocation();
    void loadVendorData();
  }, [loadVendorData, requestUserLocation]);

  useFocusEffect(
    useCallback(() => {
      if (!hasLoadedInitialData.current) return;

      setVisibleCount(INITIAL_VISIBLE_VENDOR_COUNT);
      void loadVendorData();
    }, [loadVendorData])
  );

  useEffect(() => {
    setVisibleCount(INITIAL_VISIBLE_VENDOR_COUNT);
  }, [searchQuery, selectedFilter]);

  const allVans = useMemo(
    () => [...supabaseVans, ...customVans],
    [customVans, supabaseVans]
  );

  const visibleVans = useMemo(
    () =>
      allVans.filter(
        (van) =>
          !van.isSuspended && !isExpiredSpottedListing(van)
      ),
    [allVans]
  );

  const distanceMap = useMemo(() => {
    const distances = new Map<string, number>();

    if (!userLocation) return distances;

    visibleVans.forEach((van) => {
      distances.set(
        van.id,
        getDistanceMiles(
          userLocation.latitude,
          userLocation.longitude,
          van.lat,
          van.lng
        )
      );
    });

    return distances;
  }, [userLocation, visibleVans]);

  const getVendorDistance = useCallback(
    (van: Van) => {
      if (!userLocation) return null;
      return distanceMap.get(van.id) ?? null;
    },
    [distanceMap, userLocation]
  );

  const filteredVans = useMemo(() => {
    let matchingVans = [...visibleVans];

    if (selectedFilter === "LIVE NOW") {
      matchingVans = matchingVans.filter(
        (van) =>
          getSubscriptionFeatures(van.subscriptionTier)
            .liveStatus && van.isLive
      );
    }

    if (selectedFilter === "FEATURED") {
      matchingVans = matchingVans.filter(
        (van) => van.subscriptionTier === "pro"
      );
    }

    if (searchQuery.trim()) {
      matchingVans = matchingVans.filter((van) =>
        matchesSearchQuery(van, searchQuery)
      );
    }

    return matchingVans.sort((firstVan, secondVan) => {
      if (
        selectedFilter === "TOP RATED" &&
        secondVan.rating !== firstVan.rating
      ) {
        return secondVan.rating - firstVan.rating;
      }

      if (
        selectedFilter === "LIVE NOW" &&
        firstVan.isLive !== secondVan.isLive
      ) {
        return firstVan.isLive ? -1 : 1;
      }

      if (userLocation) {
        const firstDistance =
          distanceMap.get(firstVan.id) ??
          Number.MAX_SAFE_INTEGER;
        const secondDistance =
          distanceMap.get(secondVan.id) ??
          Number.MAX_SAFE_INTEGER;

        if (Math.abs(firstDistance - secondDistance) > 0.05) {
          return firstDistance - secondDistance;
        }
      }

      const tierDifference =
        getTierRank(secondVan) - getTierRank(firstVan);

      if (tierDifference !== 0) {
        return tierDifference;
      }

      if (secondVan.rating !== firstVan.rating) {
        return secondVan.rating - firstVan.rating;
      }

      return firstVan.name.localeCompare(secondVan.name);
    });
  }, [
    distanceMap,
    searchQuery,
    selectedFilter,
    userLocation,
    visibleVans,
  ]);

  const liveNowVans = useMemo(
    () =>
      [...visibleVans]
        .filter(
          (van) =>
            getSubscriptionFeatures(van.subscriptionTier)
              .liveStatus && van.isLive
        )
        .sort((firstVan, secondVan) => {
          if (userLocation) {
            const firstDistance =
              distanceMap.get(firstVan.id) ??
              Number.MAX_SAFE_INTEGER;
            const secondDistance =
              distanceMap.get(secondVan.id) ??
              Number.MAX_SAFE_INTEGER;

            if (
              Math.abs(firstDistance - secondDistance) > 0.05
            ) {
              return firstDistance - secondDistance;
            }
          }

          const tierDifference =
            getTierRank(secondVan) - getTierRank(firstVan);

          if (tierDifference !== 0) {
            return tierDifference;
          }

          return secondVan.rating - firstVan.rating;
        })
        .slice(0, 6),
    [distanceMap, userLocation, visibleVans]
  );

  const featuredProVans = useMemo(
    () =>
      [...visibleVans]
        .filter(
          (van) =>
            van.subscriptionTier === "pro" &&
            van.listingSource !== "user_spotted"
        )
        .sort((firstVan, secondVan) => {
          if (userLocation) {
            const firstDistance =
              distanceMap.get(firstVan.id) ??
              Number.MAX_SAFE_INTEGER;
            const secondDistance =
              distanceMap.get(secondVan.id) ??
              Number.MAX_SAFE_INTEGER;

            if (
              Math.abs(firstDistance - secondDistance) > 0.05
            ) {
              return firstDistance - secondDistance;
            }
          }

          return secondVan.rating - firstVan.rating;
        })
        .slice(0, 3),
    [distanceMap, userLocation, visibleVans]
  );

  /*
const recentlySpottedVans = useMemo(
  () =>
    [...visibleVans]
      .filter(
        (van) => van.listingSource === "user_spotted"
      )
      .sort((firstVan, secondVan) => {
        if (userLocation) {
          const firstDistance =
            distanceMap.get(firstVan.id) ??
            Number.MAX_SAFE_INTEGER;
          const secondDistance =
            distanceMap.get(secondVan.id) ??
            Number.MAX_SAFE_INTEGER;

          return firstDistance - secondDistance;
        }

        return firstVan.name.localeCompare(secondVan.name);
      })
      .slice(0, 4),
  [distanceMap, userLocation, visibleVans]
);
*/

  const visibleFilteredVans = useMemo(
    () => filteredVans.slice(0, visibleCount),
    [filteredVans, visibleCount]
  );

  const hasMoreVans = filteredVans.length > visibleCount;
  const showEmptyState =
    !vendorsLoading && filteredVans.length === 0;

  const spottedCount = useMemo(
    () =>
      visibleVans.filter(
        (van) => van.listingSource === "user_spotted"
      ).length,
    [visibleVans]
  );

  function openVendor(vendorId: string) {
    router.push({
      pathname: "/vendor/[id]",
      params: { id: vendorId },
    });
  }

  function handleRefresh() {
    void loadVendorData(true);
  }

  function clearSearch() {
    setSearchQuery("");
  }

  function renderSectionHeading(
    icon: IconName,
    eyebrow: string,
    title: string,
    subtitle: string
  ) {
    return (
      <View style={styles.sectionHeading}>
        <View style={styles.sectionHeadingIcon}>
          <MaterialCommunityIcons
            name={icon}
            size={20}
            color="#F4B547"
          />
        </View>

        <View style={styles.sectionHeadingText}>
          <AppText variant="label" style={styles.sectionEyebrow}>
            {eyebrow}
          </AppText>

          <AppText variant="heading" style={styles.sectionTitle}>
            {title}
          </AppText>

          <AppText variant="body" style={styles.sectionSubtitle}>
            {subtitle}
          </AppText>

          <SectionGlowLine />
        </View>
      </View>
    );
  }

  function renderLiveVendorCard(van: Van) {
    const distanceText = formatDistance(getVendorDistance(van));

    return (
      <Pressable
        key={`live-${van.id}`}
        onPress={() => openVendor(van.id)}
        accessibilityRole="button"
        accessibilityLabel={`Open ${van.name}`}
        style={({ pressed }) => [
          styles.liveCardOuter,
          pressed && styles.cardPressed,
        ]}
      >
        <CardGlowBorder
          accentColor="#42D878"
          borderColor="rgba(66,216,120,0.52)"
          borderRadius={22}
        />

        <LinearGradient
          colors={[
            "rgba(12,45,69,0.97)",
            "rgba(6,25,42,0.98)",
            "rgba(4,16,28,0.99)",
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.liveCard}
        >
          <View style={styles.liveCardTopRow}>
            <View style={styles.liveBadge}>
              <View style={styles.livePulseDot} />

              <AppText variant="label" style={styles.liveBadgeText}>
                LIVE
              </AppText>
            </View>

            {van.subscriptionTier === "pro" ? (
              <View style={styles.featuredMiniBadge}>
                <MaterialCommunityIcons
                  name="star"
                  size={12}
                  color="#F4B547"
                />

                <AppText
                  variant="label"
                  style={styles.featuredMiniBadgeText}
                >
                  PRO
                </AppText>
              </View>
            ) : null}
          </View>

          <View style={styles.liveCardIcon}>
            <MaterialCommunityIcons
              name="truck-outline"
              size={27}
              color="#F4C35B"
            />
          </View>

          <AppText
            variant="heading"
            style={styles.liveCardTitle}
            numberOfLines={1}
          >
            {van.name}
          </AppText>

          <AppText
            variant="body"
            style={styles.liveCardCuisine}
            numberOfLines={1}
          >
            {van.cuisine || "Cuisine not provided"}
          </AppText>

          {van.vendorMessage?.trim() ? (
            <AppText
              variant="body"
              style={styles.liveCardMessage}
              numberOfLines={2}
            >
              {van.vendorMessage.trim()}
            </AppText>
          ) : null}

          <View style={styles.liveCardFooter}>
            <View style={styles.liveCardInfo}>
              <MaterialCommunityIcons
                name="star"
                size={14}
                color="#F4B547"
              />

              <AppText
                variant="bodyBold"
                style={styles.liveCardInfoText}
              >
                {Number.isFinite(van.rating)
                  ? van.rating.toFixed(1)
                  : "0.0"}
              </AppText>
            </View>

            {distanceText ? (
              <View style={styles.liveCardInfo}>
                <MaterialCommunityIcons
                  name="map-marker-outline"
                  size={14}
                  color="#F4B547"
                />

                <AppText
                  variant="bodyBold"
                  style={styles.liveCardInfoText}
                >
                  {distanceText}
                </AppText>
              </View>
            ) : null}
          </View>
        </LinearGradient>
      </Pressable>
    );
  }

  function renderFeaturedVendor(van: Van) {
    const distanceText = formatDistance(getVendorDistance(van));

    return (
      <Pressable
        key={`featured-${van.id}`}
        onPress={() => openVendor(van.id)}
        accessibilityRole="button"
        accessibilityLabel={`Open featured vendor ${van.name}`}
        style={({ pressed }) => [
          styles.featuredVendorOuter,
          pressed && styles.cardPressed,
        ]}
      >
        <View style={styles.featuredVendorCard}>
          <View style={styles.featuredAccent} />

          <View style={styles.featuredVendorIcon}>
            <MaterialCommunityIcons
              name="star-circle-outline"
              size={27}
              color="#F4C35B"
            />
          </View>

          <View style={styles.featuredVendorText}>
            <AppText
              variant="bodyBold"
              style={styles.featuredVendorName}
              numberOfLines={1}
            >
              {van.name}
            </AppText>

            <AppText
              variant="body"
              style={styles.featuredVendorCuisine}
              numberOfLines={1}
            >
              {van.cuisine || "Cuisine not provided"}
            </AppText>
          </View>

          <View style={styles.featuredVendorMeta}>
            {distanceText ? (
              <AppText
                variant="bodyBold"
                style={styles.featuredVendorDistance}
              >
                {distanceText}
              </AppText>
            ) : null}

            {van.isLive ? (
              <View style={styles.compactLiveBadge}>
                <View style={styles.compactLiveDot} />

                <AppText
                  variant="label"
                  style={styles.compactLiveBadgeText}
                >
                  LIVE
                </AppText>
              </View>
            ) : (
              <MaterialCommunityIcons
                name="chevron-right"
                size={24}
                color="rgba(244,181,71,0.72)"
              />
            )}
          </View>
        </View>
      </Pressable>
    );
  }

  /*
function renderSpottedVendor(van: Van) {
  const distanceText = formatDistance(getVendorDistance(van));

  return (
    <Pressable
      key={`spotted-${van.id}`}
      onPress={() => openVendor(van.id)}
      accessibilityRole="button"
      accessibilityLabel={`Open recently spotted vendor ${van.name}`}
      style={({ pressed }) => [
        styles.spottedVendorRow,
        pressed && styles.cardPressed,
      ]}
    >
      <View style={styles.spottedVendorIcon}>
        <MaterialCommunityIcons
          name="map-marker-plus-outline"
          size={22}
          color="#F4B547"
        />
      </View>

      <View style={styles.spottedVendorText}>
        <AppText
          variant="bodyBold"
          style={styles.spottedVendorName}
          numberOfLines={1}
        >
          {van.name}
        </AppText>

        <AppText
          variant="body"
          style={styles.spottedVendorCuisine}
          numberOfLines={1}
        >
          {van.cuisine || "Cuisine not provided"}
        </AppText>
      </View>

      {distanceText ? (
        <View style={styles.spottedDistanceBadge}>
          <AppText
            variant="bodyBold"
            style={styles.spottedDistanceText}
          >
            {distanceText}
          </AppText>
        </View>
      ) : (
        <MaterialCommunityIcons
          name="chevron-right"
          size={23}
          color="rgba(244,181,71,0.68)"
        />
      )}
    </Pressable>
  );
}
*/

  function renderSearchResults() {
    if (!searchQuery.trim()) return null;

    return (
      <View style={styles.searchResultsCard}>
        <View style={styles.searchResultsHeader}>
          <View>
            <AppText
              variant="label"
              style={styles.searchResultsEyebrow}
            >
              SEARCH RESULTS
            </AppText>

            <AppText
              variant="bodyBold"
              style={styles.searchResultsCount}
            >
              {filteredVans.length}{" "}
              {filteredVans.length === 1 ? "result" : "results"} found
            </AppText>
          </View>

          <Pressable
            onPress={clearSearch}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Clear search"
            style={({ pressed }) => [
              styles.clearSearchButton,
              pressed && styles.smallPressed,
            ]}
          >
            <MaterialCommunityIcons
              name="close"
              size={19}
              color="#F4B547"
            />
          </Pressable>
        </View>

        {filteredVans.slice(0, 4).map((van) => {
          const distanceText = formatDistance(
            getVendorDistance(van)
          );

          return (
            <Pressable
              key={`search-${van.id}`}
              onPress={() => openVendor(van.id)}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.searchResultRow,
                pressed && styles.smallPressed,
              ]}
            >
              <View style={styles.searchResultIcon}>
                <MaterialCommunityIcons
                  name="silverware-fork-knife"
                  size={17}
                  color="#F4B547"
                />
              </View>

              <View style={styles.searchResultText}>
                <AppText
                  variant="bodyBold"
                  style={styles.searchResultName}
                  numberOfLines={1}
                >
                  {van.name}
                </AppText>

                <AppText
                  variant="body"
                  style={styles.searchResultCuisine}
                  numberOfLines={1}
                >
                  {van.cuisine || "Cuisine not provided"}
                </AppText>
              </View>

              {distanceText ? (
                <AppText
                  variant="bodyBold"
                  style={styles.searchResultDistance}
                >
                  {distanceText}
                </AppText>
              ) : (
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={22}
                  color="rgba(244,181,71,0.65)"
                />
              )}
            </Pressable>
          );
        })}

        {filteredVans.length > 4 ? (
          <Pressable
            onPress={() =>
              setVisibleCount(
                Math.max(filteredVans.length, visibleCount)
              )
            }
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.viewAllSearchButton,
              pressed && styles.smallPressed,
            ]}
          >
            <AppText
              variant="bodyBold"
              style={styles.viewAllSearchText}
            >
              View all {filteredVans.length} results below
            </AppText>

            <MaterialCommunityIcons
              name="arrow-down"
              size={18}
              color="#F4B547"
            />
          </Pressable>
        ) : null}
      </View>
    );
  }

  function renderHomeHeader() {
    return (
      <>
        <View style={styles.brandHeader}>
          <View style={styles.logoGlow}>
            <Image
              source={require("../../assets/images/bitebeacon-logo-full.png")}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

          <AppText variant="label" style={styles.brandSlogan}>
            DISCOVER. GROW. CONNECT.
          </AppText>

          <View style={styles.brandDivider}>
            <View style={styles.brandDividerGlow} />
          </View>
        </View>

        <AppUpdateBanner settings={appSettings} />

        <MetallicFrame
          tone="blue"
          borderWidth={2}
          style={styles.heroOuterGlow}
          contentStyle={{ borderRadius: 28 }}
        >
          <LinearGradient
            colors={[
              "rgba(12,37,61,0.96)",
              "rgba(5,20,35,0.97)",
              "rgba(4,13,23,0.99)",
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroCard}
          >

            <View style={styles.heroTopRow}>
              <View style={styles.heroTitleArea}>
                <AppText
                  variant="label"
                  style={styles.heroEyebrow}
                >
                  TODAY ON BITEBEACON
                </AppText>

                <AppText
                  variant="heading"
                  style={styles.heroTitle}
                >
                  Discover food{"\n"}worth the trip.
                </AppText>

                <AppText
                  variant="body"
                  style={styles.heroDescription}
                >
                  Search local food businesses, see who is live and
                  uncover community finds nearby.
                </AppText>
              </View>

              <View style={styles.heroRadarBackground} pointerEvents="none">
                <HeroRadar />
              </View>
            </View>

            <View style={styles.heroStatsRow}>
              <View style={styles.heroStat}>
                <MaterialCommunityIcons
                  name="truck-outline"
                  size={20}
                  color="#F4B547"
                />

                <AppText
                  variant="heading"
                  style={styles.heroStatValue}
                >
                  {visibleVans.length}
                </AppText>

                <AppText
                  variant="label"
                  style={styles.heroStatLabel}
                >
                  FOOD SPOTS
                </AppText>
              </View>

              <View style={styles.heroStatDivider} />

              <View style={styles.heroStat}>
                <MaterialCommunityIcons
                  name="broadcast"
                  size={20}
                  color="#65E395"
                />

                <AppText
                  variant="heading"
                  style={styles.heroStatValue}
                >
                  {liveNowVans.length}
                </AppText>

                <AppText
                  variant="label"
                  style={styles.heroStatLabel}
                >
                  LIVE NOW
                </AppText>
              </View>

              <View style={styles.heroStatDivider} />

              <View style={styles.heroStat}>
                <MaterialCommunityIcons
                  name="map-marker-plus-outline"
                  size={20}
                  color="#F4B547"
                />

                <AppText
                  variant="heading"
                  style={styles.heroStatValue}
                >
                  {spottedCount}
                </AppText>

                <AppText
                  variant="label"
                  style={styles.heroStatLabel}
                >
                  SCOUT FINDS
                </AppText>
              </View>
            </View>

            <MetallicFrame
              tone="gold"
              borderWidth={1}
              style={styles.searchOuter}
              contentStyle={styles.searchFrameContent}
            >
              <View style={styles.searchInner}>
                <MaterialCommunityIcons
                  name="magnify"
                  size={22}
                  color="#F4B547"
                />

                <TextInput
                  style={styles.searchInput}
                  placeholder="Search burgers, coffee, pizza..."
                  placeholderTextColor="rgba(255,255,255,0.60)"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="search"
                />

                {searchQuery.trim() ? (
                  <Pressable
                    onPress={clearSearch}
                    hitSlop={10}
                    accessibilityRole="button"
                    accessibilityLabel="Clear search"
                    style={styles.searchClearButton}
                  >
                    <MaterialCommunityIcons
                      name="close-circle"
                      size={21}
                      color="rgba(255,255,255,0.52)"
                    />
                  </Pressable>
                ) : null}
              </View>
            </MetallicFrame>

            {renderSearchResults()}

            <Pressable
              onPress={() => router.push("/(tabs)/explore")}
              accessibilityRole="button"
              accessibilityLabel="Explore the BiteBeacon map"
              style={({ pressed }) => [
                styles.exploreButtonOuter,
                pressed && styles.primaryPressed,
              ]}
            >
              <LinearGradient
                colors={[
                  "#FFF7CF",
                  "#FFD972",
                  "#F5B93D",
                  "#D98108",
                ]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.exploreButton}
              >
                <MaterialCommunityIcons
                  name="map-search-outline"
                  size={21}
                  color="#071421"
                />

                <AppText
                  variant="button"
                  style={styles.exploreButtonText}
                >
                  Explore the Map
                </AppText>

                <MaterialCommunityIcons
                  name="arrow-right"
                  size={20}
                  color="#071421"
                />
              </LinearGradient>
            </Pressable>
          </LinearGradient>
        </MetallicFrame>

        <MetallicFrame
          tone="gold"
          borderWidth={2}
          style={styles.communityImageOuter}
          contentStyle={styles.communityImageFrame}
        >
          <Image
            source={require("../../assets/images/hero-community-market.jpg")}
            style={styles.communityImage}
            resizeMode="cover"
          />
        </MetallicFrame>

        {loadFailed ? (
          <View style={styles.errorCard}>
            <View style={styles.errorIcon}>
              <MaterialCommunityIcons
                name="alert-circle-outline"
                size={22}
                color="#F4B547"
              />
            </View>

            <View style={styles.errorTextArea}>
              <AppText variant="bodyBold" style={styles.errorTitle}>
                Some vendors could not be loaded
              </AppText>

              <AppText variant="body" style={styles.errorText}>
                Check your connection and try refreshing the page.
              </AppText>
            </View>

            <Pressable
              onPress={() => void loadVendorData()}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.retryButton,
                pressed && styles.smallPressed,
              ]}
            >
              <AppText
                variant="bodyBold"
                style={styles.retryButtonText}
              >
                Retry
              </AppText>
            </Pressable>
          </View>
        ) : null}

        {vendorsLoading ? (
          <View style={styles.loadingCard}>
            <View style={styles.loadingIcon}>
              <MaterialCommunityIcons
                name="radar"
                size={27}
                color="#F4B547"
              />
            </View>

            <View style={styles.loadingTextArea}>
              <AppText
                variant="bodyBold"
                style={styles.loadingTitle}
              >
                Finding great food
              </AppText>

              <AppText variant="body" style={styles.loadingText}>
                Loading nearby vendors and preparing your feed.
              </AppText>
            </View>
          </View>
        ) : null}

        {!vendorsLoading && liveNowVans.length > 0 ? (
          <View style={styles.sectionBlock}>
            {renderSectionHeading(
              "broadcast",
              "OPEN AND TRADING",
              "Live Now",
              "Food businesses ready for you to visit."
            )}

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.liveHorizontalContent}
            >
              {liveNowVans.map(renderLiveVendorCard)}
            </ScrollView>
          </View>
        ) : null}

        <View style={styles.controlsSection}>
          {renderSectionHeading(
            "tune-variant",
            "BROWSE YOUR WAY",
            "Find Your Food",
            "Filter nearby vendors by availability, rating or plan."
          )}

          <View style={styles.filterPanel}>
            <CardGlowBorder
              accentColor="#4FA7FF"
              borderColor="rgba(79,167,255,0.38)"
              borderRadius={20}
            />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterRow}
            >
              {FILTER_OPTIONS.map((option) => {
                const isActive = selectedFilter === option;

                return (
                  <Pressable
                    key={option}
                    onPress={() => setSelectedFilter(option)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isActive }}
                    style={({ pressed }) => [
                      styles.filterChip,
                      isActive && styles.filterChipActive,
                      pressed && styles.smallPressed,
                    ]}
                  >
                    {option === "LIVE NOW" ? (
                      <View
                        style={[
                          styles.filterStatusDot,
                          isActive && styles.filterStatusDotActive,
                        ]}
                      />
                    ) : null}

                    <AppText
                      variant="bodyBold"
                      style={[
                        styles.filterChipText,
                        isActive && styles.filterChipTextActive,
                      ]}
                    >
                      {option}
                    </AppText>
                  </Pressable>
                );
              })}
            </ScrollView>

            <View style={styles.filterSummary}>
              <MaterialCommunityIcons
                name={
                  userLocation
                    ? "map-marker-radius-outline"
                    : "format-list-bulleted"
                }
                size={17}
                color="#F4B547"
              />

              <AppText variant="body" style={styles.filterSummaryText}>
                {searchQuery.trim()
                  ? `${filteredVans.length} matching food ${filteredVans.length === 1 ? "business" : "businesses"
                  }`
                  : userLocation
                    ? `${filteredVans.length} food ${filteredVans.length === 1 ? "business" : "businesses"
                    } ordered around you`
                    : `${filteredVans.length} food ${filteredVans.length === 1 ? "business" : "businesses"
                    } available`}
              </AppText>
            </View>
          </View>
        </View>

        <View style={styles.nearbyHeadingWrap}>
          {renderSectionHeading(
            "silverware-fork-knife",
            selectedFilter === "ALL"
              ? "NEARBY DISCOVERY"
              : selectedFilter,
            selectedFilter === "ALL"
              ? "Nearby Food Spots"
              : selectedFilter === "LIVE NOW"
                ? "Live Food Spots"
                : selectedFilter === "TOP RATED"
                  ? "Top Rated Food"
                  : "Featured Food Spots",
            selectedFilter === "ALL"
              ? userLocation
                ? "Closest BiteBeacon listings and community finds."
                : "Browse the latest food businesses on BiteBeacon."
              : "Your selected BiteBeacon results."
          )}
        </View>
      </>
    );
  }

  function renderEmptyState() {
    if (!showEmptyState) return null;

    const hasActiveSearch = searchQuery.trim().length > 0;
    const hasActiveFilter = selectedFilter !== "ALL";

    return (
      <View style={styles.emptyStateOuter}>
        <LinearGradient
          colors={[
            "rgba(29,34,42,0.96)",
            "rgba(8,19,31,0.97)",
            "rgba(4,13,22,0.99)",
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.emptyStateCard}
        >
          <View style={styles.emptyStateIcon}>
            <MaterialCommunityIcons
              name="food-off-outline"
              size={38}
              color="#F4B547"
            />
          </View>

          <AppText variant="label" style={styles.emptyStateEyebrow}>
            NOTHING MATCHED
          </AppText>

          <AppText variant="heading" style={styles.emptyStateTitle}>
            No food spots found
          </AppText>

          <View style={styles.emptyStateDivider} />

          <AppText variant="body" style={styles.emptyStateText}>
            {hasActiveSearch || hasActiveFilter
              ? "Try another search or clear your current filters to see more BiteBeacon listings."
              : "There are no active food businesses to show right now. Check back again shortly."}
          </AppText>

          {hasActiveSearch || hasActiveFilter ? (
            <Pressable
              onPress={() => {
                setSearchQuery("");
                setSelectedFilter("ALL");
              }}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.resetFiltersButton,
                pressed && styles.primaryPressed,
              ]}
            >
              <LinearGradient
                colors={[
                  "#FFF7CF",
                  "#FFD972",
                  "#F5B93D",
                  "#D98108",
                ]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.resetFiltersButtonInner}
              >
                <MaterialCommunityIcons
                  name="filter-remove-outline"
                  size={20}
                  color="#071421"
                />

                <AppText
                  variant="button"
                  style={styles.resetFiltersButtonText}
                >
                  Clear Search and Filters
                </AppText>
              </LinearGradient>
            </Pressable>
          ) : (
            <Pressable
              onPress={() => void loadVendorData()}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.resetFiltersButton,
                pressed && styles.primaryPressed,
              ]}
            >
              <LinearGradient
                colors={[
                  "#FFF7CF",
                  "#FFD972",
                  "#F5B93D",
                  "#D98108",
                ]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.resetFiltersButtonInner}
              >
                <MaterialCommunityIcons
                  name="refresh"
                  size={20}
                  color="#071421"
                />

                <AppText
                  variant="button"
                  style={styles.resetFiltersButtonText}
                >
                  Refresh Vendors
                </AppText>
              </LinearGradient>
            </Pressable>
          )}
        </LinearGradient>
      </View>
    );
  }

  return (
    <MapTextureBackground userLocation={userLocation}>
      <SafeAreaView style={styles.safeArea}>
        <FlatList
          data={visibleFilteredVans}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.listContent,
            showEmptyState && styles.emptyListContent,
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#F4B547"
              colors={["#F4B547"]}
              progressBackgroundColor="#0A1724"
            />
          }
          ListHeaderComponent={renderHomeHeader()}
          ListEmptyComponent={renderEmptyState}
          ItemSeparatorComponent={() => (
            <View style={styles.vendorSeparator} />
          )}
          ListFooterComponent={
            hasMoreVans ? (
              <Pressable
                onPress={() =>
                  setVisibleCount(
                    (currentCount) =>
                      currentCount + VENDOR_LOAD_INCREMENT
                  )
                }
                accessibilityRole="button"
                accessibilityLabel="Load more vendors"
                style={({ pressed }) => [
                  styles.loadMoreOuter,
                  pressed && styles.primaryPressed,
                ]}
              >
                <LinearGradient
                  colors={[
                    "rgba(33,47,61,0.98)",
                    "rgba(10,22,35,0.98)",
                  ]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.loadMoreButton}
                >
                  <MaterialCommunityIcons
                    name="plus-circle-outline"
                    size={21}
                    color="#F4B547"
                  />

                  <AppText
                    variant="bodyBold"
                    style={styles.loadMoreText}
                  >
                    Load More Food Spots
                  </AppText>

                  <View style={styles.loadMoreCountBadge}>
                    <AppText
                      variant="label"
                      style={styles.loadMoreCountText}
                    >
                      {filteredVans.length - visibleCount}
                    </AppText>
                  </View>
                </LinearGradient>
              </Pressable>
            ) : visibleFilteredVans.length > 0 ? (
              <View style={styles.endOfList}>
                <View style={styles.endOfListLine} />

                <View style={styles.endOfListIcon}>
                  <MaterialCommunityIcons
                    name="silverware-fork-knife"
                    size={17}
                    color="#F4B547"
                  />
                </View>

                <View style={styles.endOfListLine} />

                <AppText variant="body" style={styles.endOfListText}>
                  You’ve reached the end of these results.
                </AppText>
              </View>
            ) : null
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
      </SafeAreaView>
    </MapTextureBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "transparent",
  },

  listContent: {
    paddingHorizontal: 18,
    paddingTop: 4,
    paddingBottom: 110,
  },

  emptyListContent: {
    flexGrow: 1,
  },

  brandHeader: {
    alignItems: "center",
    paddingTop: 0,
    marginBottom: 16,
  },

  logoGlow: {
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#FFB52D",
    shadowOpacity: 0.48,
    shadowRadius: 22,
    shadowOffset: {
      width: 0,
      height: 0,
    },
    elevation: 9,
  },

  logo: {
    width: 310,
    height: 170,
  },

  brandSlogan: {
    color: "#F4BF5A",
    fontSize: 10,
    letterSpacing: 2.9,
    textAlign: "center",
    marginTop: -24,
  },

  brandDivider: {
    width: 120,
    height: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },

  brandDividerLine: {
    width: "100%",
    height: 1,
    backgroundColor: "rgba(244,181,71,0.08)",
  },

  brandDividerGlow: {
    position: "absolute",
    width: 42,
    height: 2.5,
    borderRadius: 999,
    backgroundColor: "#F4B547",
    shadowColor: "#FF9C24",
    shadowOpacity: 0.82,
    shadowRadius: 9,
    shadowOffset: {
      width: 0,
      height: 0,
    },
    elevation: 6,
  },

  heroOuterGlow: {
    borderRadius: 28,
    marginBottom: 25,
    shadowColor: "#2C8BFF",
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: {
      width: 0,
      height: 7,
    },
    elevation: 7,
  },

  heroCard: {
    position: "relative",
    borderRadius: 28,
    borderWidth: 1.2,
    borderColor: "rgba(85,162,245,0.34)",
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 18,
    overflow: "hidden",
  },

  communityImageOuter: {
    width: "100%",
    height: 190,
    borderRadius: 24,
    marginTop: -7,
    marginBottom: 28,

    shadowColor: "#F4B547",
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: {
      width: 0,
      height: 7,
    },

    elevation: 7,
  },

  communityImageFrame: {
    flex: 1,
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: "#071421",
  },

  communityImage: {
    width: "100%",
    height: "100%",
    borderRadius: 24,
  },

  heroTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
  },

  heroTitleArea: {
    flex: 1,
  },

  heroEyebrow: {
    color: "#F4B547",
    fontSize: 9.5,
    letterSpacing: 2.2,
    marginBottom: 9,
  },

  heroTitle: {
    color: "#FFFFFF",
    fontSize: 30,
    lineHeight: 36,
    letterSpacing: -0.6,
  },

  heroDescription: {
    maxWidth: 310,
    color: "rgba(255,255,255,0.67)",
    fontSize: 13,
    lineHeight: 20,
    marginTop: 9,
  },

  heroBeaconIcon: {
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(41,126,224,0.22)",
    borderWidth: 1,
    borderColor: "rgba(74,154,244,0.32)",
    shadowColor: "#2C8BFF",
    shadowOpacity: 0.45,
    shadowRadius: 12,
    shadowOffset: {
      width: 0,
      height: 0,
    },
    elevation: 5,
  },

  heroStatsRow: {
    flexDirection: "row",
    alignItems: "stretch",
    marginTop: 20,
    marginBottom: 17,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(85,162,245,0.20)",
    backgroundColor: "rgba(255,255,255,0.05)",
    paddingVertical: 12,
  },

  heroStat: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },

  heroStatDivider: {
    width: 1,
    marginVertical: 3,
    backgroundColor: "rgba(255,255,255,0.1)",
  },

  heroStatValue: {
    color: "#FFFFFF",
    fontSize: 20,
    lineHeight: 25,
    marginTop: 4,
  },

  heroStatLabel: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 7.5,
    letterSpacing: 1,
    textAlign: "center",
    marginTop: 2,
  },

  searchOuter: {
    width: "100%",
    height: 58,
    borderRadius: 18,

    shadowColor: "#000",
    shadowOpacity: 0.22,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 4,
    },

    elevation: 3,
  },

  searchFrameContent: {
    flex: 1,
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "rgba(5,15,25,0.96)",
  },

  searchInner: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    gap: 10,
  },

  searchClearButton: {
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
  },

  searchInput: {
    flex: 1,
    height: "100%",

    color: "#FFFFFF",
    fontSize: 14,

    paddingVertical: 0,
    paddingHorizontal: 0,

    textAlignVertical: "center",
    backgroundColor: "transparent",
  },

  searchResultsCard: {
    marginTop: 11,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "rgba(244,181,71,0.2)",
    backgroundColor: "rgba(3,12,21,0.88)",
    overflow: "hidden",
  },

  searchResultsHeader: {
    minHeight: 57,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 13,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.07)",
  },

  searchResultsEyebrow: {
    color: "#F4B547",
    fontSize: 7.5,
    letterSpacing: 1.5,
  },

  searchResultsCount: {
    color: "#FFFFFF",
    fontSize: 12,
    marginTop: 2,
  },

  clearSearchButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(244,181,71,0.24)",
    backgroundColor: "rgba(244,181,71,0.05)",
  },

  searchResultRow: {
    minHeight: 62,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 13,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.055)",
  },

  searchResultIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(244,181,71,0.22)",
    backgroundColor: "rgba(244,181,71,0.055)",
    marginRight: 10,
  },

  searchResultText: {
    flex: 1,
    paddingRight: 9,
  },

  searchResultName: {
    color: "#FFFFFF",
    fontSize: 13,
  },

  searchResultCuisine: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 11,
    marginTop: 2,
  },

  searchResultDistance: {
    color: "#F4B547",
    fontSize: 11,
  },

  viewAllSearchButton: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    backgroundColor: "rgba(244,181,71,0.055)",
  },

  viewAllSearchText: {
    color: "#F4B547",
    fontSize: 11.5,
  },

  exploreButtonOuter: {
    borderRadius: 17,
    marginTop: 14,
    shadowColor: "#FF9C24",
    shadowOpacity: 0.3,
    shadowRadius: 11,
    shadowOffset: {
      width: 0,
      height: 5,
    },
    elevation: 7,
  },

  exploreButton: {
    minHeight: 54,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.55)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    paddingHorizontal: 17,
  },

  exploreButtonText: {
    color: "#071421",
    fontSize: 14,
  },

  errorCard: {
    minHeight: 78,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 19,
    borderWidth: 1,
    borderColor: "rgba(244,181,71,0.26)",
    backgroundColor: "rgba(35,20,9,0.66)",
    paddingHorizontal: 13,
    paddingVertical: 12,
    marginBottom: 22,
  },

  errorIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(244,181,71,0.07)",
    borderWidth: 1,
    borderColor: "rgba(244,181,71,0.21)",
    marginRight: 11,
  },

  errorTextArea: {
    flex: 1,
    paddingRight: 8,
  },

  errorTitle: {
    color: "#FFFFFF",
    fontSize: 13,
  },

  errorText: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 11,
    lineHeight: 16,
    marginTop: 2,
  },

  retryButton: {
    minHeight: 36,
    paddingHorizontal: 12,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(244,181,71,0.3)",
  },

  retryButtonText: {
    color: "#F4B547",
    fontSize: 11,
  },

  loadingCard: {
    minHeight: 84,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(85,162,245,0.24)",
    backgroundColor: "rgba(5,17,29,0.74)",
    paddingHorizontal: 14,
    paddingVertical: 13,
    marginBottom: 24,
  },

  loadingIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(39,112,195,0.1)",
    borderWidth: 1,
    borderColor: "rgba(85,162,245,0.25)",
    marginRight: 12,
  },

  loadingTextArea: {
    flex: 1,
  },

  loadingTitle: {
    color: "#FFFFFF",
    fontSize: 14,
  },

  loadingText: {
    color: "rgba(255,255,255,0.56)",
    fontSize: 11.5,
    lineHeight: 17,
    marginTop: 3,
  },

  sectionBlock: {
    marginBottom: 27,
  },

  sectionHeading: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 14,
  },

  sectionHeadingIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,

    alignItems: "center",
    justifyContent: "center",

    marginRight: 14,

    backgroundColor: "rgba(7,18,30,0.96)",

    borderWidth: 1,
    borderColor: "rgba(244,181,71,0.24)",

    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 3,
    },

    elevation: 2,
  },

  sectionHeadingText: {
    flex: 1,
    paddingTop: 1,
  },

  sectionEyebrow: {
    color: "#F4B547",
    fontSize: 8.5,
    letterSpacing: 1.8,
    marginBottom: 3,
  },

  sectionTitle: {
    color: "#FFFFFF",
    fontSize: 25,
    lineHeight: 30,
    fontWeight: "900",
    letterSpacing: 0.35,

    textShadowColor: "rgba(0,0,0,0.35)",
    textShadowOffset: {
      width: 0,
      height: 1,
    },
    textShadowRadius: 2,
  },

  sectionSubtitle: {
    color: "rgba(255,255,255,0.56)",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 3,
  },

  sectionAccentLine: {
    width: 92,
    height: 2,
    borderRadius: 999,
    marginTop: 9,

    shadowColor: "#F4B547",
    shadowOpacity: 0.45,
    shadowRadius: 7,
    shadowOffset: {
      width: 0,
      height: 0,
    },

    elevation: 4,
  },

  liveHorizontalContent: {
    paddingRight: 8,
    paddingBottom: 4,
  },

  liveCardOuter: {
    position: "relative",
    width: 205,
    borderRadius: 22,
    marginRight: 12,
    overflow: "hidden",

    shadowColor: "#36D873",
    shadowOpacity: 0.14,
    shadowRadius: 12,
    shadowOffset: {
      width: 0,
      height: 5,
    },

    elevation: 5,
  },

  liveCard: {
    minHeight: 220,
    borderRadius: 22,
    borderWidth: 0,
    paddingHorizontal: 15,
    paddingTop: 14,
    paddingBottom: 14,
    overflow: "hidden",
  },

  liveCardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 13,
  },

  liveBadge: {
    minHeight: 26,
    borderRadius: 999,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 9,
    backgroundColor: "rgba(54,216,115,0.09)",
    borderWidth: 1,
    borderColor: "rgba(83,231,139,0.3)",
  },

  livePulseDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#5FE58F",

    shadowColor: "#5FE58F",
    shadowOpacity: 0.9,
    shadowRadius: 6,
    shadowOffset: {
      width: 0,
      height: 0,
    },

    elevation: 5,
  },

  liveBadgeText: {
    color: "#8CFFB1",
    fontSize: 8,
    letterSpacing: 1.2,
  },

  featuredMiniBadge: {
    minHeight: 26,
    borderRadius: 999,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    backgroundColor: "rgba(244,181,71,0.06)",
    borderWidth: 1,
    borderColor: "rgba(244,181,71,0.22)",
  },

  featuredMiniBadgeText: {
    color: "#F4B547",
    fontSize: 7.5,
    letterSpacing: 1,
  },

  liveCardIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(244,181,71,0.06)",
    borderWidth: 1,
    borderColor: "rgba(244,181,71,0.2)",
    marginBottom: 12,
  },

  liveCardTitle: {
    color: "#FFFFFF",
    fontSize: 17,
    lineHeight: 22,
  },

  liveCardCuisine: {
    color: "rgba(255,255,255,0.53)",
    fontSize: 11.5,
    lineHeight: 17,
    marginTop: 3,
  },

  liveCardMessage: {
    color: "rgba(255,255,255,0.62)",
    fontSize: 10.5,
    lineHeight: 16,
    marginTop: 9,
  },

  liveCardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: "auto",
    paddingTop: 14,
  },

  liveCardInfo: {
    minHeight: 29,
    borderRadius: 999,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    backgroundColor: "rgba(244,181,71,0.055)",
    borderWidth: 1,
    borderColor: "rgba(244,181,71,0.16)",
  },

  liveCardInfoText: {
    color: "rgba(255,255,255,0.78)",
    fontSize: 10,
  },

  featuredList: {
    gap: 10,
  },

  featuredVendorOuter: {
    borderRadius: 19,
  },

  featuredVendorCard: {
    minHeight: 76,
    borderRadius: 19,
    borderWidth: 1.3,
    borderColor: "rgba(244,181,71,0.42)",

    backgroundColor: "rgba(255,255,255,0.035)",

    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    overflow: "hidden",
  },

  featuredAccent: {
    position: "absolute",
    top: 8,
    bottom: 8,
    left: 0,
    width: 5,
    borderTopRightRadius: 999,
    borderBottomRightRadius: 999,
    backgroundColor: "#F4B547",
  },

  featuredVendorIcon: {
    width: 47,
    height: 47,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(244,181,71,0.07)",
    borderWidth: 1,
    borderColor: "rgba(244,181,71,0.23)",
    marginRight: 12,
  },

  featuredVendorText: {
    flex: 1,
    paddingRight: 9,
  },

  featuredVendorName: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "800",
    lineHeight: 21,
    letterSpacing: 0.2,

    textShadowColor: "rgba(255,255,255,0.12)",
    textShadowRadius: 6,
  },

  featuredVendorCuisine: {
    color: "rgba(255,255,255,0.52)",
    fontSize: 11.5,
    lineHeight: 17,
    marginTop: 2,
  },

  featuredVendorMeta: {
    alignItems: "flex-end",
    justifyContent: "center",
    minWidth: 56,
  },

  featuredVendorDistance: {
    color: "#F4B547",
    fontSize: 10.5,
    marginBottom: 5,
  },

  compactLiveBadge: {
    minHeight: 25,
    borderRadius: 999,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    backgroundColor: "rgba(54,216,115,0.09)",
    borderWidth: 1,
    borderColor: "rgba(83,231,139,0.28)",
  },

  compactLiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#5FE58F",
  },

  compactLiveBadgeText: {
    color: "#8CFFB1",
    fontSize: 7.5,
    letterSpacing: 1,
  },

  controlsSection: {
    marginBottom: 26,
  },

  filterPanel: {
    position: "relative",
    borderRadius: 20,

    borderWidth: 0,

    backgroundColor: "rgba(4,14,23,0.86)",

    paddingTop: 13,
    paddingBottom: 12,

    overflow: "hidden",
  },

  filterRow: {
    paddingHorizontal: 12,
    gap: 8,
  },

  filterChip: {
    minHeight: 41,

    borderRadius: 999,

    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",

    gap: 6,

    paddingHorizontal: 16,

    backgroundColor: "rgba(6,18,30,0.96)",

    borderWidth: 1.1,
    borderColor: "rgba(255,255,255,0.07)",

    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 6,
    shadowOffset: {
      width: 0,
      height: 2,
    },

    elevation: 2,
  },

  filterChipActive: {
    backgroundColor: "rgba(244,181,71,0.14)",

    borderColor: "rgba(244,181,71,0.56)",

    shadowColor: "#F4B547",
    shadowOpacity: 0.26,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 0,
    },

    elevation: 5,
  },

  filterStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.34)",
  },

  filterStatusDotActive: {
    backgroundColor: "#5FE58F",

    shadowColor: "#5FE58F",
    shadowOpacity: 0.8,
    shadowRadius: 5,
    shadowOffset: {
      width: 0,
      height: 0,
    },

    elevation: 4,
  },

  filterChipText: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 10.5,
  },

  filterChipTextActive: {
    color: "#F4C35B",
  },

  filterSummary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 14,
    paddingTop: 12,
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.06)",
  },

  filterSummaryText: {
    flex: 1,
    color: "rgba(255,255,255,0.48)",
    fontSize: 10.5,
    lineHeight: 16,
  },

  nearbyHeadingWrap: {
    marginBottom: 2,
  },

  emptyStateOuter: {
    flex: 1,
    justifyContent: "center",
    paddingTop: 8,
    paddingBottom: 28,
  },

  emptyStateCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(244,181,71,0.24)",
    alignItems: "center",
    paddingHorizontal: 22,
    paddingTop: 27,
    paddingBottom: 24,
    overflow: "hidden",
  },

  emptyStateIcon: {
    width: 82,
    height: 82,
    borderRadius: 41,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(244,181,71,0.06)",
    borderWidth: 1,
    borderColor: "rgba(244,181,71,0.24)",
    marginBottom: 18,

    shadowColor: "#FF9C24",
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: {
      width: 0,
      height: 0,
    },

    elevation: 4,
  },

  emptyStateEyebrow: {
    color: "#F4B547",
    fontSize: 8.5,
    letterSpacing: 2,
    textAlign: "center",
    marginBottom: 7,
  },

  emptyStateTitle: {
    color: "#FFFFFF",
    fontSize: 23,
    lineHeight: 29,
    textAlign: "center",
  },

  emptyStateDivider: {
    width: 38,
    height: 2.5,
    borderRadius: 999,
    backgroundColor: "#F4B547",
    marginTop: 14,
    marginBottom: 14,

    shadowColor: "#FF9C24",
    shadowOpacity: 0.6,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 0,
    },

    elevation: 5,
  },

  emptyStateText: {
    maxWidth: 300,
    color: "rgba(255,255,255,0.6)",
    fontSize: 12.5,
    lineHeight: 19,
    textAlign: "center",
  },

  resetFiltersButton: {
    width: "100%",
    borderRadius: 17,
    marginTop: 20,

    shadowColor: "#FF9C24",
    shadowOpacity: 0.22,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 5,
    },

    elevation: 6,
  },

  resetFiltersButtonInner: {
    minHeight: 52,
    borderRadius: 17,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 15,
  },

  resetFiltersButtonText: {
    color: "#071421",
    fontSize: 13,
  },

  vendorSeparator: {
    height: 15,
  },

  loadMoreOuter: {
    borderRadius: 18,
    marginTop: 18,

    shadowColor: "#FF9C24",
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 5,
    },

    elevation: 4,
  },

  loadMoreButton: {
    minHeight: 56,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(244,181,71,0.25)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    paddingHorizontal: 15,
  },

  loadMoreText: {
    color: "#FFFFFF",
    fontSize: 13,
  },

  loadMoreCountBadge: {
    minWidth: 27,
    minHeight: 27,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 7,
    backgroundColor: "rgba(244,181,71,0.09)",
    borderWidth: 1,
    borderColor: "rgba(244,181,71,0.25)",
  },

  loadMoreCountText: {
    color: "#F4B547",
    fontSize: 8,
  },

  endOfList: {
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 24,
    paddingHorizontal: 4,
  },

  endOfListLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(244,181,71,0.18)",
  },

  endOfListIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 12,
    backgroundColor: "rgba(244,181,71,0.05)",
    borderWidth: 1,
    borderColor: "rgba(244,181,71,0.18)",
  },

  endOfListText: {
    width: "100%",
    color: "rgba(255,255,255,0.4)",
    fontSize: 10.5,
    textAlign: "center",
    marginTop: 10,
  },

  cardPressed: {
    opacity: 0.86,
    transform: [{ scale: 0.985 }],
  },

  smallPressed: {
    opacity: 0.72,
  },

  primaryPressed: {
    opacity: 0.87,
    transform: [{ scale: 0.985 }],
  },

  heroBeaconLogo: {
    width: 42,
    height: 42,
  },

  heroRadarWrap: {
    width: 140,
    height: 140,
    alignItems: "center",
    justifyContent: "center",
    opacity: 0.95,
  },

  heroRadarBackground: {
    position: "absolute",
    top: -34,
    right: -42,
    width: 240,
    height: 240,
    opacity: 0.68,
    transform: [{ scale: 1.18 }],
  },
});