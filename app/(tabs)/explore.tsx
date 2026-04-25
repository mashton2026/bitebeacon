import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import MapView, { MapPressEvent, Marker, Region } from "react-native-maps";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { getSubscriptionFeatures } from "../../lib/subscriptionFeatures";
import { getCurrentUser } from "../../services/authService";
import { createVendor, getAllVendors } from "../../services/vendorService";
import { type Van } from "../../types/van";

type SpotPin = {
  latitude: number;
  longitude: number;
};

type FilterType = "all" | "live" | "spotted";

const DEFAULT_REGION: Region = {
  latitude: 50.266,
  longitude: -5.0527,
  latitudeDelta: 0.22,
  longitudeDelta: 0.22,
};

const BITEBEACON_MAP_STYLE = [
  { elementType: "geometry", stylers: [{ color: "#eaf0f6" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#355070" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#ffffff" }] },
  {
    featureType: "administrative",
    elementType: "geometry.stroke",
    stylers: [{ color: "#cfd8e3" }],
  },
  {
    featureType: "poi",
    elementType: "geometry",
    stylers: [{ color: "#f6efe8" }],
  },
  {
    featureType: "poi.park",
    elementType: "geometry",
    stylers: [{ color: "#dfeee1" }],
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#ffffff" }],
  },
  {
    featureType: "road",
    elementType: "geometry.stroke",
    stylers: [{ color: "#dbe4ef" }],
  },
  {
    featureType: "road.arterial",
    elementType: "geometry",
    stylers: [{ color: "#fff7ef" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#ffe4cc" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry.stroke",
    stylers: [{ color: "#ffb979" }],
  },
  {
    featureType: "transit",
    elementType: "geometry",
    stylers: [{ color: "#e5eaf0" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#bfd8f5" }],
  },
];

function getStatusLabel(van: Van) {
  if (van.listingSource === "user_spotted") return "SPOTTED";
  if (getSubscriptionFeatures(van.subscriptionTier).liveStatus) {
    return van.isLive ? "LIVE" : "LISTED";
  }

  return "LISTED";
}

function isTrendingVendor(van: Van) {
  if (van.subscriptionTier !== "pro") return false;
  if (van.listingSource === "user_spotted") return false;
  if ((van.views ?? 0) < 25) return false;
  if ((van.directions ?? 0) < 5) return false;
  if ((van.rating ?? 0) < 4.2) return false;

  return true;
}

function getCardImage(van: Van) {
  if (van.logoUrl) return van.logoUrl;

  const safePhotos = Array.isArray(van.photos) ? van.photos : [];

  if (safePhotos.length > 0) {
    return safePhotos[0];
  }

  return van.photo ?? null;
}

function matchesSearchQuery(van: Van, query: string) {
  const search = query.trim().toLowerCase();

  if (!search) return true;

  return (
    van.name.toLowerCase().includes(search) ||
    (van.vendorName ?? "").toLowerCase().includes(search) ||
    van.cuisine.toLowerCase().includes(search) ||
    (van.foodCategories ?? []).some((category) =>
      category.toLowerCase().includes(search)
    )
  );
}

function getMarkerColor(van: Van) {
  if (van.isLive) return "#1DB954";

  if (van.listingSource === "user_spotted") {
    if ((van.confirmationCount ?? 0) >= 2) {
      return "#FF7A00";
    }

    return "#3B82F6";
  }

  return "#E53935";
}

export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const mapRef = useRef<any>(null);
  const hasAnimatedToUserLocation = useRef(false);

  const [spotVisible, setSpotVisible] = useState(false);
  const [showMapHint, setShowMapHint] = useState(false);
  const [spotMode, setSpotMode] = useState(false);
  const [spotName, setSpotName] = useState("");
  const [spotCuisine, setSpotCuisine] = useState("");
  const [supabaseVans, setSupabaseVans] = useState<Van[]>([]);
  const [selectedSpotPin, setSelectedSpotPin] = useState<SpotPin | null>(null);
  const [selectedVan, setSelectedVan] = useState<Van | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<FilterType>("all");
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [userRegion, setUserRegion] = useState<Region>(DEFAULT_REGION);
  const [legendOpen, setLegendOpen] = useState(false);
  const [vendorsLoading, setVendorsLoading] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  const [showMapLoadingOverlay, setShowMapLoadingOverlay] = useState(true);
  const [hasResolvedUserLocation, setHasResolvedUserLocation] = useState(false);
  const [locationPermissionDenied, setLocationPermissionDenied] = useState(false);
  const selectedMarkerScale = useRef(new Animated.Value(1)).current;
  const cardTranslateY = useRef(new Animated.Value(20)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;

  function focusOnTopVendor() {
    const topVendor = filteredVans[0];

    if (!topVendor) return;

    mapRef.current?.animateToRegion(
      {
        latitude: Number(topVendor.lat),
        longitude: Number(topVendor.lng),
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      },
      600
    );
  }

  useEffect(() => {
    requestUserLocation();
  }, []);

  useEffect(() => {
    loadSupabaseVans(true);
  }, [params.refresh]);

  useEffect(() => {
    async function checkHint() {
      const seen = await AsyncStorage.getItem("seenMapHint");
      if (!seen) {
        setShowMapHint(true);
      }
    }

    checkHint();
  }, []);

  useEffect(() => {
    loadSupabaseVans();
  }, []);

  useEffect(() => {
    const parsedLat = Number(params.lat);
    const parsedLng = Number(params.lng);

    if (
      params.lat &&
      params.lng &&
      !Number.isNaN(parsedLat) &&
      !Number.isNaN(parsedLng)
    ) {
      const nextRegion: Region = {
        latitude: parsedLat,
        longitude: parsedLng,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };

      setUserRegion(nextRegion);

      if (mapReady) {
        mapRef.current?.animateToRegion(nextRegion, 700);
      }
      return;
    }

    if (!params.highlight) return;

    const highlightedVendor = supabaseVans.find(
      (van) => van.id === params.highlight
    );

    if (!highlightedVendor) return;

    setSelectedVan(highlightedVendor);
    setSpotMode(false);
    setSelectedSpotPin(null);

    const nextRegion: Region = {
      latitude: Number(highlightedVendor.lat),
      longitude: Number(highlightedVendor.lng),
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    };

    setUserRegion(nextRegion);

    if (mapReady) {
      mapRef.current?.animateToRegion(nextRegion, 700);
    }
  }, [params.lat, params.lng, params.highlight, supabaseVans, mapReady]);

  useEffect(() => {
    if (!selectedVan) {
      Animated.parallel([
        Animated.timing(cardOpacity, {
          toValue: 0,
          duration: 140,
          useNativeDriver: true,
        }),
        Animated.timing(cardTranslateY, {
          toValue: 20,
          duration: 140,
          useNativeDriver: true,
        }),
      ]).start();

      Animated.spring(selectedMarkerScale, {
        toValue: 1,
        useNativeDriver: true,
        friction: 6,
        tension: 120,
      }).start();

      return;
    }

    selectedMarkerScale.setValue(0.9);

    Animated.spring(selectedMarkerScale, {
      toValue: 1.12,
      useNativeDriver: true,
      friction: 5,
      tension: 140,
    }).start();

    cardOpacity.setValue(0);
    cardTranslateY.setValue(20);

    Animated.parallel([
      Animated.timing(cardOpacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.spring(cardTranslateY, {
        toValue: 0,
        useNativeDriver: true,
        friction: 7,
        tension: 110,
      }),
    ]).start();
  }, [selectedVan, cardOpacity, cardTranslateY, selectedMarkerScale]);

  async function requestUserLocation() {
    try {
      const existingPermission = await Location.getForegroundPermissionsAsync();

      let permission = existingPermission;

      if (!existingPermission.granted) {
        permission = await Location.requestForegroundPermissionsAsync();
      }

      if (permission.status !== "granted") {
        setLocationPermissionDenied(true);
        setHasResolvedUserLocation(true);
        return;
      }

      setLocationPermissionDenied(false);
      const lastKnown = await Location.getLastKnownPositionAsync();

      if (lastKnown) {
        const fastRegion: Region = {
          latitude: lastKnown.coords.latitude,
          longitude: lastKnown.coords.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        };

        setUserRegion(fastRegion);
        setHasResolvedUserLocation(true);

        if (mapReady && !hasAnimatedToUserLocation.current) {
          mapRef.current?.animateToRegion(fastRegion, 600);
          hasAnimatedToUserLocation.current = true;
        }
      }

      const current = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const nextRegion: Region = {
        latitude: current.coords.latitude,
        longitude: current.coords.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };

      setUserRegion(nextRegion);
      setHasResolvedUserLocation(true);

      if (mapReady) {
        mapRef.current?.animateToRegion(nextRegion, 600);
        hasAnimatedToUserLocation.current = true;
      }
    } catch {
      setHasResolvedUserLocation(true);
    }
  }

  async function loadSupabaseVans(force = false) {
    if (!force && supabaseVans.length > 0) {
      setVendorsLoading(false);
      return;
    }

    setVendorsLoading(true);

    try {
      const vendors = await getAllVendors();
      setSupabaseVans(vendors);
    } catch {
      setSupabaseVans([]);
    } finally {
      setVendorsLoading(false);
    }
  }

  const liveVendorCount = useMemo(() => {
    return supabaseVans.filter((van) => van.isLive && !van.temporary).length;
  }, [supabaseVans]);

  const filteredVans = useMemo(() => {
    const baseVans =
      selectedFilter === "live"
        ? supabaseVans.filter(
          (van) => van.isLive && !van.temporary
        )
        : selectedFilter === "spotted"
          ? supabaseVans.filter((van) => van.temporary)
          : supabaseVans;

    const searchedVans = searchQuery.trim()
      ? baseVans.filter((van) => matchesSearchQuery(van, searchQuery))
      : baseVans;

    return [...searchedVans].sort((a, b) => {
      const aTrending = isTrendingVendor(a);
      const bTrending = isTrendingVendor(b);

      if (aTrending && !bTrending) return -1;
      if (!aTrending && bTrending) return 1;

      const getPriorityScore = (van: Van) => {
        let score = 0;

        if (van.subscriptionTier === "pro") score += 1000;
        else if (van.subscriptionTier === "growth") score += 500;

        if (van.isLive) score += 200;

        score += (van.directions ?? 0) * 5;
        score += van.views ?? 0;
        score += (van.rating ?? 0) * 50;

        return score;
      };

      const aScore = getPriorityScore(a);
      const bScore = getPriorityScore(b);

      return bScore - aScore;
    });
  }, [supabaseVans, selectedFilter, searchQuery]);

  const selectedVanCardImage = selectedVan ? getCardImage(selectedVan) : null;

  useEffect(() => {
    if (!mapReady) return;
    if (!hasResolvedUserLocation) return;
    if (hasAnimatedToUserLocation.current) return;

    mapRef.current?.animateToRegion(userRegion, 600);
    hasAnimatedToUserLocation.current = true;
  }, [mapReady, hasResolvedUserLocation, userRegion]);

  useEffect(() => {
    if (!selectedVan) return;

    const stillVisible = filteredVans.some((van) => van.id === selectedVan.id);

    if (!stillVisible) {
      setSelectedVan(null);
    }
  }, [filteredVans, selectedVan]);

  function handleMarkerPress(van: Van) {
    setSelectedVan(van);
    setSpotMode(false);
    setSelectedSpotPin(null);

    mapRef.current?.animateToRegion(
      {
        latitude: Number(van.lat),
        longitude: Number(van.lng),
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      },
      400
    );
  }

  function handleMapPress(event: MapPressEvent) {
    if (spotMode) {
      const { latitude, longitude } = event.nativeEvent.coordinate;

      setSelectedSpotPin({ latitude, longitude });
      setSelectedVan(null);
      setSpotMode(false);
      setSpotVisible(true);

      mapRef.current?.animateToRegion(
        {
          latitude,
          longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        },
        350
      );

      return;
    }

    setSelectedVan(null);
    setSelectedSpotPin(null);
  }

  async function startSpotMode() {
    const user = await getCurrentUser();

    if (!user) {
      Alert.alert(
        "Login required",
        "Please log in or create an account before spotting a van."
      );
      return;
    }

    setSelectedVan(null);
    setSpotMode(true);
    setSelectedSpotPin(null);

    Alert.alert("Choose location", "Tap the map where the van is located.");
  }

  function cancelSpotFlow() {
    setSpotMode(false);
    setSpotVisible(false);
    setSpotName("");
    setSpotCuisine("");
    setSelectedSpotPin(null);
  }

  async function closeMapHint() {
    setShowMapHint(false);
    await AsyncStorage.setItem("seenMapHint", "true");
  }

  async function submitSpotVan() {
    if (!spotName.trim()) {
      Alert.alert("Missing name", "Please enter the van name.");
      return;
    }

    if (!selectedSpotPin) {
      Alert.alert("Missing location", "Please choose a location.");
      return;
    }

    const user = await getCurrentUser();

    if (!user) {
      Alert.alert(
        "Login required",
        "Please log in or create an account before spotting a van."
      );
      return;
    }

    const expiresAt = new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000
    ).toISOString();

    const newVan: Van = {
      id: `spotted-${Date.now()}`,
      name: spotName.trim(),
      cuisine: spotCuisine.trim() || "Spotted Van",
      rating: 0,
      lat: selectedSpotPin.latitude,
      lng: selectedSpotPin.longitude,
      temporary: true,
      listingSource: "user_spotted",
      photo: null,
      vendorName: "Community spotted",
      menu: "Claim this van to add menu",
      schedule: "Claim to add schedule",
      isLive: false,
      views: 0,
      directions: 0,
      owner_id: null,
      subscriptionTier: "free",
      foodCategories: [],
    };

    try {
      await createVendor({
        id: newVan.id,
        name: newVan.name,
        vendorName: newVan.vendorName ?? "Community spotted",
        cuisine: newVan.cuisine,
        menu: newVan.menu ?? "Claim this van to add menu",
        schedule: newVan.schedule ?? "Claim to add schedule",
        lat: newVan.lat,
        lng: newVan.lng,
        photo: null,
        temporary: true,
        listingSource: "user_spotted",
        expiresAt,
        isLive: false,
        owner_id: null,
        views: 0,
        directions: 0,
        rating: 0,
        subscriptionTier: "free",
        foodCategories: [],
        spottedBy: user.id,
        isApproved: true,
      });

      await loadSupabaseVans(true);
      setSelectedVan(null);
      cancelSpotFlow();

      Alert.alert(
        "Spot submitted 🔥",
        "Your spotted van has been submitted for confirmation. If it is confirmed and later claimed, eligible spotters can earn scout points."
      );

    } catch (error) {
      Alert.alert(
        "Error",
        error instanceof Error ? error.message : "Could not save spotted van."
      );
    }
  }

  function openVanPage(van: Van) {
    router.push({
      pathname: "/vendor/[id]",
      params: { id: van.id },
    });
  }

  function recenterMap() {
    setSelectedVan(null);
    setSelectedSpotPin(null);

    if (locationPermissionDenied) {
      void requestUserLocation();
      return;
    }

    mapRef.current?.animateToRegion(userRegion, 600);
  }

  function closeSearch() {
    setSearchQuery("");
    setSearchVisible(false);
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={DEFAULT_REGION}
        showsUserLocation
        showsMyLocationButton={false}
        customMapStyle={BITEBEACON_MAP_STYLE}
        onPress={handleMapPress}
        onMapReady={() => {
          setMapReady(true);
          setShowMapLoadingOverlay(false);
        }}
      >
        {filteredVans.map((van) => {
          const lat = Number(van.lat);
          const lng = Number(van.lng);

          if (Number.isNaN(lat) || Number.isNaN(lng)) return null;

          return (
            <Marker
              key={van.id}
              coordinate={{
                latitude: lat,
                longitude: lng,
              }}
              onPress={() => handleMarkerPress(van)}
              pinColor={getMarkerColor(van)}
            />
          );
        })}

        {selectedSpotPin ? (
          <Marker coordinate={selectedSpotPin} pinColor="#FF7A00" />
        ) : null}
      </MapView>

      {showMapLoadingOverlay && !mapReady ? (
        <View style={styles.loadingOverlay}>
          <Text style={styles.loadingText}>Loading map...</Text>
        </View>
      ) : null}

      <View style={styles.topOverlay}>
        <View style={styles.topControlsRow}>
          <View style={styles.filterBar}>
            <Pressable
              style={[
                styles.filterChip,
                selectedFilter === "all" && styles.filterChipActive,
              ]}
              onPress={() => {
                setSelectedFilter("all");
                setSelectedVan(null);
              }}
            >
              <Text
                style={[
                  styles.filterChipText,
                  selectedFilter === "all" && styles.filterChipTextActive,
                ]}
              >
                All
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.filterChip,
                selectedFilter === "live" && styles.filterChipActive,
              ]}
              onPress={() => {
                setSelectedFilter("live");
                setSelectedVan(null);
              }}
            >
              <Text
                style={[
                  styles.filterChipText,
                  selectedFilter === "live" && styles.filterChipTextActive,
                ]}
              >
                Live ({liveVendorCount})
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.filterChip,
                selectedFilter === "spotted" && styles.filterChipActive,
              ]}
              onPress={() => {
                setSelectedFilter("spotted");
                setSelectedVan(null);
              }}
            >
              <Text
                style={[
                  styles.filterChipText,
                  selectedFilter === "spotted" && styles.filterChipTextActive,
                ]}
              >
                Spotted
              </Text>
            </Pressable>
          </View>

          <Pressable
            style={styles.searchIconButton}
            onPress={() => {
              if (searchVisible) {
                closeSearch();
              } else {
                setSearchVisible(true);
              }
            }}
          >
            <Text style={styles.searchIconText}>
              {searchVisible ? "✕" : "🔍"}
            </Text>
          </Pressable>
        </View>

        {searchVisible ? (
          <View style={styles.searchRow}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search vendor or cuisine"
              placeholderTextColor="rgba(0,0,0,0.45)"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
            />
          </View>
        ) : null}

        {vendorsLoading ? (
          <View style={styles.vendorLoadingPill}>
            <Text style={styles.vendorLoadingPillText}>
              Loading nearby vendors...
            </Text>
          </View>
        ) : null}

        {!legendOpen ? (
          <Pressable
            style={styles.legendButton}
            onPress={() => setLegendOpen(true)}
          >
            <Text style={styles.legendButtonText}>Map Guide</Text>
          </Pressable>
        ) : (
          <Pressable
            style={styles.legendCard}
            onPress={() => setLegendOpen(false)}
          >
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, styles.legendDotPro]} />
              <Text style={styles.legendText}>Pro Vendor</Text>
            </View>

            <View style={styles.legendItem}>
              <View style={[styles.legendDot, styles.legendDotLive]} />
              <Text style={styles.legendText}>Live Now</Text>
            </View>

            <View style={styles.legendItem}>
              <View style={[styles.legendDot, styles.legendDotSpottedPending]} />
              <Text style={styles.legendText}>Spotted - newly reported</Text>
            </View>

            <View style={styles.legendItem}>
              <View style={[styles.legendDot, styles.legendDotSpotted]} />
              <Text style={styles.legendText}>Spotted - community confirmed</Text>
            </View>

            <View style={styles.legendItemLast}>
              <View style={[styles.legendDot, styles.legendDotListed]} />
              <Text style={styles.legendText}>Listed / Offline</Text>
            </View>
          </Pressable>
        )}
      </View>

      {spotMode ? (
        <View style={styles.spotInstructionWrap}>
          <Text style={styles.spotInstructionTitle}>Spot Mode Active</Text>
          <Text style={styles.spotInstructionText}>
            Tap the map to place the van location.
          </Text>
        </View>
      ) : null}

      {locationPermissionDenied ? (
        <View style={styles.permissionNoticeWrap}>
          <Text style={styles.permissionNoticeTitle}>
            Location Permission Off
          </Text>
          <Text style={styles.permissionNoticeText}>
            BiteBeacon is using the default map area because location access was
            denied. You can still browse listings manually or enable location in
            your device settings.
          </Text>

          <Pressable
            style={styles.permissionButton}
            onPress={requestUserLocation}
          >
            <Text style={styles.permissionButtonText}>Enable Location</Text>
          </Pressable>
        </View>
      ) : null}

      <Pressable
        style={[styles.recenterButton, { bottom: insets.bottom + 240 }]}
        onPress={recenterMap}
      >
        <Text style={styles.recenterButtonText}>📍</Text>
      </Pressable>

      {selectedVan ? (
        <Animated.View
          style={[
            styles.bottomCardWrap,
            {
              opacity: cardOpacity,
              transform: [{ translateY: cardTranslateY }],
            },
          ]}
        >
          <Pressable
            style={styles.bottomCard}
            onPress={() => openVanPage(selectedVan)}
          >
            <View style={styles.bottomCardTopRow}>
              <View style={styles.bottomCardInfoRow}>
                {selectedVanCardImage ? (
                  <Image
                    source={{ uri: selectedVanCardImage }}
                    style={styles.bottomCardImage}
                  />
                ) : null}

                <View style={styles.bottomCardTitleBlock}>
                  <View style={styles.bottomCardTitleRow}>
                    <Text style={styles.bottomCardTitle}>{selectedVan.name}</Text>

                    {selectedVan.owner_id && !selectedVan.temporary ? (
                      <View style={styles.bottomCardFeaturedBadge}>
                        <Text style={styles.bottomCardFeaturedBadgeText}>
                          VERIFIED
                        </Text>
                      </View>
                    ) : null}

                    {selectedVan.subscriptionTier === "pro" ? (
                      <View style={styles.bottomCardFeaturedBadge}>
                        <Text style={styles.bottomCardFeaturedBadgeText}>
                          FEATURED
                        </Text>
                      </View>
                    ) : null}

                    {isTrendingVendor(selectedVan) ? (
                      <View style={styles.bottomCardTrendingBadge}>
                        <Text style={styles.bottomCardTrendingBadgeText}>
                          TRENDING
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  {selectedVan.subscriptionTier === "free" &&
                    !selectedVan.temporary &&
                    selectedVan.owner_id ? (
                    <Text style={styles.bottomCardUpgradeHint}>
                      Upgrade to Growth or Pro for stronger visibility.
                    </Text>
                  ) : null}

                  <Text style={styles.bottomCardMeta}>{selectedVan.cuisine}</Text>

                  <Text style={styles.bottomCardTrustText}>
                    {selectedVan.listingSource === "user_spotted"
                      ? "Spotted by the community (unverified)"
                      : "Managed by vendor (verified listing)"}
                  </Text>
                </View>
              </View>

              <View
                style={[
                  styles.statusPill,
                  selectedVan.temporary
                    ? styles.statusTemporary
                    : selectedVan.isLive
                      ? styles.statusLive
                      : selectedVan.subscriptionTier === "pro"
                        ? styles.statusFeatured
                        : styles.statusOffline,
                ]}
              >
                <Text
                  style={[
                    styles.statusPillText,
                    selectedVan.subscriptionTier === "pro" &&
                    !selectedVan.temporary &&
                    !selectedVan.isLive &&
                    styles.statusPillTextFeatured,
                  ]}
                >
                  {getStatusLabel(selectedVan)}
                </Text>
              </View>
            </View>

            <View style={styles.bottomCardStatsRow}>
              <View style={styles.bottomCardStatPill}>
                <Text style={styles.bottomCardStatLabel}>Rating</Text>
                <Text style={styles.bottomCardStatValue}>
                  {selectedVan.rating.toFixed(1)}
                </Text>
              </View>

              <View style={styles.bottomCardStatPill}>
                <Text style={styles.bottomCardStatLabel}>Views</Text>
                <Text style={styles.bottomCardStatValue}>
                  {selectedVan.views ?? 0}
                </Text>
              </View>
            </View>

            <View style={styles.bottomCardFooter}>
              <Text style={styles.bottomCardHint}>
                {selectedVan.temporary
                  ? "Tap to learn more about this spotted van"
                  : "Tap to open vendor details"}
              </Text>

              <View style={styles.bottomCardActionPill}>
                <Text style={styles.bottomCardActionPillText}>Open</Text>
              </View>
            </View>
          </Pressable>
        </Animated.View>
      ) : null}

      {showMapHint ? (
        <View style={[styles.mapHintWrap, { bottom: insets.bottom + 90 }]}>
          <Text style={styles.mapHintText}>
            Tap “Spot a Van” to add a new vendor to the map 📍
          </Text>

          <Pressable onPress={closeMapHint}>
            <Text style={styles.mapHintClose}>Got it</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={[styles.buttonWrap, { bottom: insets.bottom + 20 }]}>
        <Pressable style={styles.primaryButton} onPress={startSpotMode}>
          <Text style={styles.primaryButtonText}>Spot a Van</Text>
        </Pressable>
      </View>

      <Modal
        visible={spotVisible}
        transparent
        animationType="slide"
        onRequestClose={cancelSpotFlow}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            style={styles.modalKeyboardWrap}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={Platform.OS === "ios" ? 24 : 0}
          >
            <View style={styles.modalCard}>
              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="interactive"
                contentContainerStyle={styles.modalScrollContent}
              >
                <Text style={styles.modalTitle}>Spot a Van</Text>
                <Text style={styles.modalSubtitle}>
                  Add a temporary spotted van for the community.
                </Text>

                <TextInput
                  style={styles.input}
                  placeholder="Van name"
                  placeholderTextColor="#7A7A7A"
                  value={spotName}
                  onChangeText={setSpotName}
                  returnKeyType="next"
                />

                <TextInput
                  style={styles.input}
                  placeholder="Cuisine"
                  placeholderTextColor="#7A7A7A"
                  value={spotCuisine}
                  onChangeText={setSpotCuisine}
                  returnKeyType="done"
                />

                <Pressable style={styles.primaryButton} onPress={submitSpotVan}>
                  <Text style={styles.primaryButtonText}>Submit Listing</Text>
                </Pressable>

                <Pressable style={styles.cancelButton} onPress={cancelSpotFlow}>
                  <Text style={styles.cancelButtonText}>Close</Text>
                </Pressable>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  permissionButton: {
    marginTop: 10,
    backgroundColor: "#FFFFFF",
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center",
  },

  permissionButtonText: {
    color: "#0B2A5B",
    fontWeight: "800",
    fontSize: 13,
  },

  container: {
    flex: 1,
    backgroundColor: "#0B2A5B",
  },

  map: {
    flex: 1,
  },

  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(11,42,91,0.08)",
    pointerEvents: "none",
  },

  loadingText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
    backgroundColor: "rgba(11,42,91,0.76)",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },

  topOverlay: {
    position: "absolute",
    top: 56,
    left: 16,
    right: 16,
    zIndex: 10,
  },

  topControlsRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 10,
  },

  filterBar: {
    flexDirection: "row",
    gap: 10,
    flex: 1,
    flexWrap: "wrap",
  },

  searchRow: {
    marginBottom: 10,
  },

  vendorLoadingPill: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(11,42,91,0.92)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: "#FF7A00",
  },

  vendorLoadingPillText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 12,
  },

  searchInput: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 2,
    borderColor: "#FF7A00",
    color: "#222222",
    fontWeight: "600",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },

  searchIconButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FF7A00",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },

  searchIconText: {
    fontSize: 20,
  },

  filterChip: {
    backgroundColor: "rgba(255,255,255,0.96)",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,122,0,0.35)",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },

  filterChipActive: {
    backgroundColor: "#0B2A5B",
    borderColor: "#FF7A00",
  },

  filterChipText: {
    color: "#0B2A5B",
    fontWeight: "800",
    fontSize: 14,
  },

  filterChipTextActive: {
    color: "#FFFFFF",
  },

  legendButton: {
    alignSelf: "flex-start",
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1.5,
    borderColor: "#FF7A00",
  },

  legendButtonText: {
    color: "#0B2A5B",
    fontWeight: "800",
    fontSize: 12,
  },

  legendCard: {
    alignSelf: "flex-start",
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderWidth: 1.5,
    borderColor: "#FF7A00",
  },

  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 2,
  },

  legendItemLast: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  legendText: {
    color: "#0B2A5B",
    fontWeight: "700",
    fontSize: 12,
  },

  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 999,
  },

  legendDotPro: {
    backgroundColor: "#0B2A5B",
  },

  legendDotLive: {
    backgroundColor: "#1DB954",
  },

  legendDotSpottedPending: {
    backgroundColor: "#3B82F6",
  },

  legendDotSpotted: {
    backgroundColor: "#FF7A00",
  },

  legendDotListed: {
    backgroundColor: "#E53935",
  },

  spotInstructionWrap: {
    position: "absolute",
    top: 164,
    left: 16,
    right: 16,
    backgroundColor: "rgba(11,42,91,0.96)",
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 2,
    borderColor: "#FF7A00",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },

  spotInstructionTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 4,
  },

  spotInstructionText: {
    fontSize: 13,
    lineHeight: 19,
    color: "rgba(255,255,255,0.82)",
    fontWeight: "600",
  },

  permissionNoticeWrap: {
    position: "absolute",
    top: 164,
    left: 16,
    right: 16,
    backgroundColor: "rgba(11,42,91,0.96)",
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 2,
    borderColor: "#FF7A00",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },

  permissionNoticeTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 4,
  },

  permissionNoticeText: {
    fontSize: 13,
    lineHeight: 19,
    color: "rgba(255,255,255,0.82)",
    fontWeight: "600",
  },

  recenterButton: {
    position: "absolute",
    right: 16,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FF7A00",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },

  recenterButtonText: {
    fontSize: 20,
  },

  buttonWrap: {
    position: "absolute",
    left: 20,
    right: 20,
    gap: 10,
  },

  primaryButton: {
    backgroundColor: "#0B2A5B",
    paddingVertical: 15,
    borderRadius: 16,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FF7A00",
    shadowColor: "#000",
    shadowOpacity: 0.14,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },

  primaryButtonText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 16,
  },

  bottomCardWrap: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 100,
  },

  bottomCard: {
    backgroundColor: "rgba(11,42,91,0.96)",
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 15,
    borderWidth: 2,
    borderColor: "#FF7A00",
    shadowColor: "#000",
    shadowOpacity: 0.16,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },

  bottomCardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 12,
  },

  bottomCardInfoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    flex: 1,
  },

  bottomCardImage: {
    width: 58,
    height: 58,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#FF7A00",
  },

  bottomCardTitleBlock: {
    flex: 1,
  },

  bottomCardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 6,
  },

  bottomCardTitle: {
    fontSize: 21,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  bottomCardFeaturedBadge: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },

  bottomCardTrendingBadge: {
    backgroundColor: "#FF7A00",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },

  bottomCardTrendingBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
  },

  bottomCardFeaturedBadgeText: {
    color: "#FF7A00",
    fontSize: 10,
    fontWeight: "800",
  },

  bottomCardUpgradeHint: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFB357",
    marginBottom: 6,
  },

  bottomCardMeta: {
    fontSize: 15,
    color: "rgba(255,255,255,0.88)",
    fontWeight: "700",
    marginBottom: 2,
  },

  bottomCardTrustText: {
    fontSize: 12,
    color: "rgba(255,255,255,0.68)",
    fontWeight: "700",
  },

  statusPill: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
  },

  statusPillText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },

  statusPillTextFeatured: {
    color: "#0B2A5B",
  },

  statusLive: {
    backgroundColor: "#1DB954",
  },

  statusOffline: {
    backgroundColor: "#888888",
  },

  statusTemporary: {
    backgroundColor: "#FF7A00",
  },

  statusFeatured: {
    backgroundColor: "#FFFFFF",
  },

  bottomCardStatsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
    marginBottom: 12,
  },

  bottomCardStatPill: {
    width: "46%",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },

  bottomCardStatLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "rgba(255,255,255,0.68)",
    textTransform: "uppercase",
    marginBottom: 4,
  },

  bottomCardStatValue: {
    fontSize: 17,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  bottomCardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },

  bottomCardHint: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },

  bottomCardActionPill: {
    backgroundColor: "#FFFFFF",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },

  bottomCardActionPillText: {
    color: "#0B2A5B",
    fontSize: 13,
    fontWeight: "800",
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-end",
  },

  modalKeyboardWrap: {
    width: "100%",
    justifyContent: "flex-end",
  },

  modalCard: {
    backgroundColor: "#FFFFFF",
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 24,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,122,0,0.35)",
    maxHeight: "82%",
    minHeight: 320,
  },

  modalScrollContent: {
    paddingBottom: 24,
  },

  modalTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#0B2A5B",
    marginBottom: 6,
  },

  modalSubtitle: {
    fontSize: 14,
    color: "#5F6368",
    lineHeight: 20,
    marginBottom: 14,
    fontWeight: "600",
  },

  input: {
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: "#FF7A00",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
    color: "#1F1F1F",
  },

  cancelButton: {
    backgroundColor: "#EEF2F7",
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
  },

  cancelButtonText: {
    color: "#0B2A5B",
    fontWeight: "700",
    fontSize: 15,
  },

  mapHintWrap: {
    position: "absolute",
    left: 20,
    right: 20,
    backgroundColor: "rgba(11,42,91,0.96)",
    borderRadius: 16,
    padding: 14,
    borderWidth: 2,
    borderColor: "#FF7A00",
    zIndex: 20,
  },

  mapHintText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 14,
    marginBottom: 6,
  },

  mapHintClose: {
    color: "#FF7A00",
    fontWeight: "800",
    fontSize: 13,
  },
});