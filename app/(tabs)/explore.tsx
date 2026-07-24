import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
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
import { uploadVendorPhotos } from "../../services/storageService";
import { createVendor, getAllVendors } from "../../services/vendorService";
import { type Van } from "../../types/van";

type SpotPin = {
  latitude: number;
  longitude: number;
};

type FilterType =
  | "all"
  | "live"
  | "spotted"
  | "food_van"
  | "restaurant_takeaway"
  | "event_vendor"
  | "market_stall";

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

function isVendorLiveNow(van: Van) {
  if (!van.isLive) return false;

  if (!van.liveUntil) return true;

  return new Date(van.liveUntil).getTime() > Date.now();
}

function getStatusLabel(van: Van) {
  if (van.listingSource === "user_spotted") return "SPOTTED";
  if (getSubscriptionFeatures(van.subscriptionTier).liveStatus) {
    return isVendorLiveNow(van) ? "LIVE" : "LISTED";
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
  if (isVendorLiveNow(van)) return "#1DB954";

  if (van.listingSource === "user_spotted") {
    if ((van.confirmationCount ?? 0) >= 1) {
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
  const [spotNotes, setSpotNotes] = useState("");
  const [spotCuisine, setSpotCuisine] = useState("");
  const [spotPhotoUri, setSpotPhotoUri] = useState<string | null>(null);
  const [submittingSpot, setSubmittingSpot] = useState(false);
  const [spotVendorType, setSpotVendorType] = useState<
    "food_van" | "restaurant_takeaway" | "event_vendor" | "market_stall"
  >("food_van");
  const [supabaseVans, setSupabaseVans] = useState<Van[]>([]);
  const [selectedSpotPin, setSelectedSpotPin] = useState<SpotPin | null>(null);
  const [selectedVan, setSelectedVan] = useState<Van | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<FilterType>("all");
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [mapType, setMapType] = useState<"standard" | "satellite">("standard");
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
    if (params.spotMode === "true") {
      setSelectedVan(null);
      setSelectedSpotPin(null);
      setSpotMode(true);
    }

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
  }, [params.spotMode, params.lat, params.lng, params.highlight, supabaseVans, mapReady]);

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
    return supabaseVans.filter((van) => isVendorLiveNow(van) && !van.temporary).length;
  }, [supabaseVans]);

  const filteredVans = useMemo(() => {
    const baseVans =
      selectedFilter === "live"
        ? supabaseVans.filter((van) => isVendorLiveNow(van) && !van.temporary)
        : selectedFilter === "spotted"
          ? supabaseVans.filter((van) => van.temporary)
          : selectedFilter === "food_van"
            ? supabaseVans.filter((van) => van.vendorType === "food_van")
            : selectedFilter === "restaurant_takeaway"
              ? supabaseVans.filter((van) => van.vendorType === "restaurant_takeaway")
              : selectedFilter === "event_vendor"
                ? supabaseVans.filter((van) => van.vendorType === "event_vendor")
                : selectedFilter === "market_stall"
                  ? supabaseVans.filter((van) => van.vendorType === "market_stall")
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

        if (isVendorLiveNow(van)) score += 200;

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

  async function pickSpotPhoto() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });

    if (!result.canceled) {
      setSpotPhotoUri(result.assets[0].uri);
    }
  }

  function cancelSpotFlow() {
    setSpotMode(false);
    setSpotVisible(false);
    setSpotName("");
    setSpotCuisine("");
    setSpotNotes("");
    setSpotPhotoUri(null);
    setSpotVendorType("food_van");
    setSelectedSpotPin(null);

    router.replace("/(tabs)/explore");
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
      Date.now() + 180 * 24 * 60 * 60 * 1000
    ).toISOString();

    let uploadedSpotPhotoUrls: string[] = [];

    if (spotPhotoUri) {
      uploadedSpotPhotoUrls = await uploadVendorPhotos(user.id, [spotPhotoUri]);
    }

    const newVan: Van = {
      id: `spotted-${Date.now()}`,
      name: spotName.trim(),
      cuisine: spotCuisine.trim() || "Spotted Van",
      rating: 0,
      lat: selectedSpotPin.latitude,
      lng: selectedSpotPin.longitude,
      temporary: true,
      listingSource: "user_spotted",
      photo: uploadedSpotPhotoUrls[0] ?? null,
      photos: uploadedSpotPhotoUrls,
      vendorName: "Community spotted",
      menu: "Claim this van to add menu",
      schedule: "Claim to add schedule",
      isLive: false,
      views: 0,
      directions: 0,
      owner_id: null,
      subscriptionTier: "free",
      vendorType: spotVendorType,
      foodCategories: [],
    };

    setSubmittingSpot(true);

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
        photo: uploadedSpotPhotoUrls[0] ?? null,
        photos: uploadedSpotPhotoUrls,
        temporary: true,
        listingSource: "user_spotted",
        expiresAt,
        isLive: false,
        owner_id: null,
        views: 0,
        directions: 0,
        rating: 0,
        subscriptionTier: "free",
        spotNotes: spotNotes.trim() || null,
        foodCategories: [],
        spottedBy: user.id,
        isApproved: false,
      });

      await loadSupabaseVans(true);
      setSelectedVan(null);
      setSubmittingSpot(false);
      cancelSpotFlow();

      Alert.alert(
        "Vendor submitted 🔥",
        "Your spotted vendor has been submitted for admin approval.\n\nOnce approved, it will appear on the BiteBeacon map for the community to discover.\n\nThanks for helping grow BiteBeacon."
      );

    } catch (error) {
      setSubmittingSpot(false);

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
        mapType={mapType}
        showsUserLocation
        showsMyLocationButton={false}
        customMapStyle={
          mapType === "standard" ? BITEBEACON_MAP_STYLE : []
        }
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
              style={[styles.filterChip, filtersOpen && styles.filterChipActive]}
              onPress={() => setFiltersOpen((current) => !current)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  filtersOpen && styles.filterChipTextActive,
                ]}
              >
                Filters
              </Text>
            </Pressable>

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
                  <Text style={styles.legendText}>Spotted - new sighting</Text>
                </View>

                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, styles.legendDotSpotted]} />
                  <Text style={styles.legendText}>Spotted - active sighting</Text>
                </View>

                <View style={styles.legendItemLast}>
                  <View style={[styles.legendDot, styles.legendDotListed]} />
                  <Text style={styles.legendText}>Listed / Offline</Text>
                </View>
              </Pressable>
            )}
          </View>

          <View style={styles.mapActionButtons}>
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

            <Pressable
              style={styles.searchIconButton}
              onPress={() =>
                setMapType((current) =>
                  current === "standard" ? "satellite" : "standard"
                )
              }
            >
              <Text style={styles.searchIconText}>
                {mapType === "standard" ? "🛰️" : "🗺️"}
              </Text>
            </Pressable>
          </View>
        </View>

        {filtersOpen ? (
          <View style={styles.extraFiltersRow}>
            {[
              { key: "all", label: "All" },
              { key: "live", label: `Live (${liveVendorCount})` },
              { key: "spotted", label: "Spotted" },
              { key: "food_van", label: "🚚 Vans" },
              { key: "restaurant_takeaway", label: "🍔 Restaurants" },
              { key: "event_vendor", label: "🎪 Events" },
              { key: "market_stall", label: "🛍️ Markets" },
            ].map((filter) => (
              <Pressable
                key={filter.key}
                style={[
                  styles.filterChip,
                  selectedFilter === filter.key && styles.filterChipActive,
                ]}
                onPress={() => {
                  setSelectedFilter(filter.key as FilterType);
                  setSelectedVan(null);
                  setFiltersOpen(false);
                }}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    selectedFilter === filter.key && styles.filterChipTextActive,
                  ]}
                >
                  {filter.label}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        {searchVisible ? (
          <View style={styles.searchRow}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search vendor or cuisine"
              placeholderTextColor="rgba(255,255,255,0.54)"
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

      </View>

      {spotMode ? (
        <View style={styles.spotInstructionWrap}>
          <Text style={styles.spotInstructionTitle}>📍 Spot a Vendor</Text>
          <Text style={styles.spotInstructionText}>
            Tap the map where you found a food vendor. Your submission will be reviewed before appearing on BiteBeacon.
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
                          CLAIMED
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

                  <Text style={styles.bottomCardMeta}>
                    {selectedVan.cuisine}
                  </Text>

                  <Text style={styles.bottomCardTrustText}>
                    {selectedVan.vendorType === "food_van"
                      ? "🚚 Food Van"
                      : selectedVan.vendorType === "restaurant_takeaway"
                        ? "🍔 Restaurant / Takeaway"
                        : selectedVan.vendorType === "event_vendor"
                          ? "🎪 Event Vendor"
                          : "🛍️ Market Stall"}
                  </Text>

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
                    : isVendorLiveNow(selectedVan)
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
                    !isVendorLiveNow(selectedVan) &&
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
            keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 40}
          >
            <View style={styles.modalCard}>
              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="interactive"
                contentContainerStyle={styles.modalScrollContent}
              >
                <View style={styles.spotHeader}>
                  <Pressable style={styles.spotCloseButton} onPress={cancelSpotFlow}>
                    <Text style={styles.spotCloseText}>×</Text>
                  </Pressable>

                  <View style={styles.spotHeaderIcon}>
                    <Image
                      source={require("../../assets/icons/spot.png")}
                      style={styles.spotHeaderIconImage}
                      resizeMode="contain"
                    />
                  </View>

                  <Text style={styles.modalTitle}>Spot a Vendor</Text>

                  <Text style={styles.modalSubtitle}>
                    Help the community by adding vendors you’ve found on the map.
                  </Text>
                </View>

                <View style={styles.spotCard}>
                  <View style={styles.spotCardIcon}>
                    <Text style={styles.spotCardEmoji}>📍</Text>
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.spotCardTitle}>1. Pin set on map</Text>

                    <Text style={styles.spotCardSubtitle}>
                      Your location has been pinned.
                    </Text>
                  </View>

                  <View style={styles.pinBadge}>
                    <Text style={styles.pinBadgeText}>✓ Pin set</Text>
                  </View>
                </View>

                <View style={styles.spotFormCard}>
                  <View style={styles.spotFormCardHeader}>
                    <View style={styles.spotCardIcon}>
                      <Text style={styles.spotCardEmoji}>🏪</Text>
                    </View>

                    <Text style={styles.spotFormCardTitle}>2. Business Name</Text>
                  </View>

                  <TextInput
                    style={styles.input}
                    placeholder="Business name (if known)"
                    placeholderTextColor="rgba(255,255,255,0.42)"
                    value={spotName}
                    onChangeText={setSpotName}
                    returnKeyType="next"
                  />

                </View>

                <View style={styles.spotFormCard}>
                  <View style={styles.spotFormCardHeader}>
                    <View style={styles.spotCardIcon}>
                      <Text style={styles.spotCardEmoji}>🚚</Text>
                    </View>

                    <Text style={styles.spotFormCardTitle}>
                      3. What did you find?
                    </Text>
                  </View>

                  <View style={styles.typeGrid}>

                    <Pressable
                      style={[
                        styles.typeCard,
                        spotVendorType === "food_van" && styles.typeCardActive,
                      ]}
                      onPress={() => setSpotVendorType("food_van")}
                    >
                      <Text style={styles.typeCardEmoji}>🚚</Text>
                      <Text
                        style={[
                          styles.typeCardText,
                          spotVendorType === "food_van" && styles.typeCardTextActive,
                        ]}
                      >
                        Food Van
                      </Text>
                    </Pressable>

                    <Pressable
                      style={[
                        styles.typeCard,
                        spotVendorType === "restaurant_takeaway" && styles.typeCardActive,
                      ]}
                      onPress={() => setSpotVendorType("restaurant_takeaway")}
                    >
                      <Text style={styles.typeCardEmoji}>🍔</Text>
                      <Text
                        style={[
                          styles.typeCardText,
                          spotVendorType === "restaurant_takeaway" && styles.typeCardTextActive,
                        ]}
                      >
                        Restaurant
                      </Text>
                    </Pressable>

                    <Pressable
                      style={[
                        styles.typeCard,
                        spotVendorType === "event_vendor" && styles.typeCardActive,
                      ]}
                      onPress={() => setSpotVendorType("event_vendor")}
                    >
                      <Text style={styles.typeCardEmoji}>🎪</Text>
                      <Text
                        style={[
                          styles.typeCardText,
                          spotVendorType === "event_vendor" && styles.typeCardTextActive,
                        ]}
                      >
                        Event
                      </Text>
                    </Pressable>

                    <Pressable
                      style={[
                        styles.typeCard,
                        spotVendorType === "market_stall" && styles.typeCardActive,
                      ]}
                      onPress={() => setSpotVendorType("market_stall")}
                    >
                      <Text style={styles.typeCardEmoji}>🛍️</Text>
                      <Text
                        style={[
                          styles.typeCardText,
                          spotVendorType === "market_stall" && styles.typeCardTextActive,
                        ]}
                      >
                        Market
                      </Text>
                    </Pressable>

                  </View>
                </View>
                <View style={styles.spotFormCard}>
                  <View style={styles.spotFormCardHeader}>
                    <View style={styles.spotCardIcon}>
                      <Text style={styles.spotCardEmoji}>🍔</Text>
                    </View>

                    <Text style={styles.spotFormCardTitle}>4. Food or cuisine</Text>
                  </View>

                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Burgers, tacos, coffee"
                    placeholderTextColor="rgba(255,255,255,0.42)"
                    value={spotCuisine}
                    onChangeText={setSpotCuisine}
                    returnKeyType="done"
                  />
                </View>

                <View style={styles.spotFormCard}>
                  <View style={styles.spotFormCardHeader}>
                    <View style={styles.spotCardIcon}>
                      <Text style={styles.spotCardEmoji}>📝</Text>
                    </View>

                    <Text style={styles.spotFormCardTitle}>5. Extra information</Text>
                  </View>

                  <TextInput
                    style={[styles.input, { height: 110, textAlignVertical: "top" }]}
                    placeholder="Anything useful? Opening hours, landmarks, colours, queues..."
                    placeholderTextColor="rgba(255,255,255,0.42)"
                    value={spotNotes}
                    onChangeText={setSpotNotes}
                    multiline
                  />
                </View>

                <View style={styles.spotFormCard}>
                  <View style={styles.spotFormCardHeader}>
                    <View style={styles.spotCardIcon}>
                      <Text style={styles.spotCardEmoji}>📷</Text>
                    </View>

                    <Text style={styles.spotFormCardTitle}>6. Add a photo</Text>
                  </View>

                  <Pressable style={styles.photoUploadCard} onPress={pickSpotPhoto}>
                    {spotPhotoUri ? (
                      <Image
                        source={{ uri: spotPhotoUri }}
                        style={styles.photoUploadPreview}
                        resizeMode="cover"
                      />
                    ) : (
                      <>
                        <Text style={styles.photoUploadIcon}>📷</Text>
                        <Text style={styles.photoUploadTitle}>Tap to add photo</Text>
                        <Text style={styles.photoUploadSubtitle}>
                          Optional, but helps us verify the spot
                        </Text>
                      </>
                    )}
                  </Pressable>
                </View>

                <View style={styles.spotActionCard}>

                  <View style={styles.spotActionRow}>
                    <Text style={styles.spotActionIcon}>⭐</Text>

                    <View style={{ flex: 1 }}>
                      <Text style={styles.spotActionTitle}>
                        Thank you for helping BiteBeacon
                      </Text>

                      <Text style={styles.spotActionSubtitle}>
                        Every approved spot helps more people discover great food.
                      </Text>
                    </View>
                  </View>

                  <Pressable
                    style={[
                      styles.primaryButton,
                      submittingSpot && styles.primaryButtonDisabled,
                    ]}
                    onPress={() => {
                      if (!submittingSpot) {
                        submitSpotVan();
                      }
                    }}
                    disabled={submittingSpot}
                  >
                    <Text style={styles.primaryButtonText}>
                      {submittingSpot
                        ? "Submitting..."
                        : "🚀 Submit Community Spot"}
                    </Text>
                  </Pressable>

                </View>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({

  label: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0B2A5B",
    marginBottom: 8,
  },

  typeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },

  typeButton: {
    backgroundColor: "#EEF2F7",
    borderWidth: 2,
    borderColor: "#FF7A00",
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },

  typeButtonActive: {
    backgroundColor: "#0B2A5B",
  },

  typeButtonText: {
    color: "#0B2A5B",
    fontWeight: "800",
    fontSize: 12,
  },

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

  mapActionButtons: {
    gap: 10,
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

  extraFiltersRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 10,
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
    minHeight: 56,

    backgroundColor: "rgba(5,15,25,0.96)",

    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(244,181,71,0.52)",

    paddingHorizontal: 18,
    paddingVertical: 0,

    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",

    shadowColor: "#F4B547",
    shadowOpacity: 0.14,
    shadowRadius: 12,
    shadowOffset: {
      width: 0,
      height: 5,
    },

    elevation: 5,
  },

  searchIconButton: {
    width: 52,
    height: 52,

    borderRadius: 26,

    backgroundColor: "rgba(5,15,25,0.96)",

    alignItems: "center",
    justifyContent: "center",

    borderWidth: 1,
    borderColor: "rgba(244,181,71,0.55)",

    shadowColor: "#F4B547",
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: {
      width: 0,
      height: 4,
    },

    elevation: 6,
  },

  searchIconText: {
    fontSize: 21,
  },

  filterChip: {
    backgroundColor: "rgba(5,15,25,0.96)",

    paddingHorizontal: 16,
    paddingVertical: 11,

    borderRadius: 18,

    borderWidth: 1,
    borderColor: "rgba(244,181,71,0.55)",

    shadowColor: "#F4B547",
    shadowOpacity: 0.16,
    shadowRadius: 12,
    shadowOffset: {
      width: 0,
      height: 4,
    },

    elevation: 5,
  },

  filterChipActive: {
    backgroundColor: "rgba(18,34,52,0.98)",
    borderColor: "#F4B547",

    shadowColor: "#F4B547",
    shadowOpacity: 0.28,
    shadowRadius: 14,
    shadowOffset: {
      width: 0,
      height: 5,
    },

    elevation: 7,
  },

  filterChipText: {
    color: "rgba(255,255,255,0.88)",
    fontWeight: "800",
    fontSize: 14,
  },

  filterChipTextActive: {
    color: "#FFFFFF",
  },

  legendButton: {
    alignSelf: "flex-start",

    backgroundColor: "rgba(5,15,25,0.96)",

    borderRadius: 18,

    paddingHorizontal: 18,
    paddingVertical: 11,

    borderWidth: 1,
    borderColor: "rgba(244,181,71,0.55)",

    shadowColor: "#F4B547",
    shadowOpacity: 0.16,
    shadowRadius: 12,
    shadowOffset: {
      width: 0,
      height: 4,
    },

    elevation: 5,
  },

  legendButtonText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 14,
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

    width: 52,
    height: 52,

    borderRadius: 26,

    backgroundColor: "rgba(5,15,25,0.96)",

    justifyContent: "center",
    alignItems: "center",

    borderWidth: 1,
    borderColor: "rgba(244,181,71,0.55)",

    shadowColor: "#F4B547",
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: {
      width: 0,
      height: 4,
    },

    elevation: 6,
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
    backgroundColor: "#FF7A00",
    paddingVertical: 18,
    borderRadius: 20,
    alignItems: "center",
    borderWidth: 0,

    shadowColor: "#FF7A00",
    shadowOpacity: 0.32,
    shadowRadius: 18,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    elevation: 8,
  },

  primaryButtonDisabled: {
    opacity: 0.65,
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
    backgroundColor: "#08131F",

    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 24,

    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,

    borderWidth: 1,
    borderColor: "rgba(244,181,71,0.35)",

    maxHeight: "82%",
    minHeight: 320,

    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 28,
    shadowOffset: {
      width: 0,
      height: -8,
    },

    elevation: 18,
  },

  modalScrollContent: {
    paddingBottom: 24,
  },

  modalTitle: {
    fontSize: 26,
    fontWeight: "900",
    color: "#FFFFFF",
    marginBottom: 8,
    letterSpacing: -0.4,
  },

  modalSubtitle: {
    maxWidth: 310,

    fontSize: 14,
    lineHeight: 21,
    fontWeight: "600",

    color: "rgba(255,255,255,0.64)",

    textAlign: "center",

    marginBottom: 14,
  },

  input: {
    backgroundColor: "rgba(5,15,25,0.9)",

    borderWidth: 1,
    borderColor: "rgba(244,181,71,0.28)",

    borderRadius: 16,

    paddingHorizontal: 18,
    paddingVertical: 16,

    marginTop: 6,

    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",

    shadowColor: "#000",
    shadowOpacity: 0.16,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 4,
    },

    elevation: 4,
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

  typeButtonTextActive: {
    color: "#FFFFFF",
  },

  spotInfoBox: {
    backgroundColor: "#F8FBFF",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.5,
    borderColor: "rgba(255,122,0,0.35)",
    marginBottom: 14,
  },

  spotInfoTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: "#0B2A5B",
    marginBottom: 5,
  },

  spotInfoText: {
    fontSize: 13,
    lineHeight: 19,
    color: "#5F6368",
    fontWeight: "600",
  },

  fieldHint: {
    marginTop: -6,
    marginBottom: 12,
    color: "#6B7280",
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "600",
  },

  photoButton: {
    backgroundColor: "#EEF6FF",
    borderWidth: 2,
    borderColor: "#0B2A5B",
    borderStyle: "dashed",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 14,
  },

  photoButtonText: {
    color: "#0B2A5B",
    fontWeight: "800",
    fontSize: 15,
  },

  spotPhotoPreview: {
    width: "100%",
    height: 190,
    borderRadius: 14,
    marginBottom: 14,
  },

  spotHeader: {
    alignItems: "center",
    marginBottom: 18,
  },

  spotCloseButton: {
    position: "absolute",

    left: 0,
    top: 0,

    width: 46,
    height: 46,

    borderRadius: 23,

    backgroundColor: "rgba(16,30,46,0.96)",

    alignItems: "center",
    justifyContent: "center",

    borderWidth: 1,
    borderColor: "rgba(244,181,71,0.45)",

    shadowColor: "#F4B547",
    shadowOpacity: 0.14,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 4,
    },

    elevation: 5,
  },

  spotCloseText: {
    fontSize: 30,
    lineHeight: 32,

    color: "#FFFFFF",

    fontWeight: "400",
  },

  spotHeaderIcon: {
    width: 72,
    height: 72,

    borderRadius: 36,

    backgroundColor: "#F4B547",

    alignItems: "center",
    justifyContent: "center",

    marginBottom: 14,

    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",

    shadowColor: "#F4B547",
    shadowOpacity: 0.32,
    shadowRadius: 20,
    shadowOffset: {
      width: 0,
      height: 8,
    },

    elevation: 10,
  },

  spotHeaderIconImage: {
    width: 52,
    height: 52,
  },

  spotCard: {
    flexDirection: "row",
    alignItems: "center",

    backgroundColor: "rgba(14,29,45,0.96)",

    borderRadius: 22,

    padding: 16,
    marginBottom: 18,

    borderWidth: 1,
    borderColor: "rgba(244,181,71,0.28)",

    shadowColor: "#000",
    shadowOpacity: 0.22,
    shadowRadius: 14,
    shadowOffset: {
      width: 0,
      height: 6,
    },

    elevation: 7,
  },

  spotCardIcon: {
    width: 54,
    height: 54,

    borderRadius: 27,

    backgroundColor: "rgba(244,181,71,0.12)",

    borderWidth: 1,
    borderColor: "rgba(244,181,71,0.35)",

    justifyContent: "center",
    alignItems: "center",

    marginRight: 14,
  },

  spotCardEmoji: {
    fontSize: 24,
  },

  spotCardTitle: {
    fontSize: 17,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: -0.2,
  },

  spotCardSubtitle: {
    marginTop: 4,

    color: "rgba(255,255,255,0.62)",

    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
  },

  pinBadge: {
    backgroundColor: "rgba(29,185,84,0.12)",

    borderRadius: 18,

    paddingHorizontal: 12,
    paddingVertical: 8,

    borderWidth: 1,
    borderColor: "rgba(29,185,84,0.35)",
  },

  pinBadgeText: {
    color: "#7DE3A2",

    fontWeight: "800",

    fontSize: 13,
  },

  spotFormCard: {
    backgroundColor: "rgba(14,29,45,0.96)",

    borderRadius: 24,

    padding: 18,

    marginBottom: 20,

    borderWidth: 1,
    borderColor: "rgba(244,181,71,0.24)",

    shadowColor: "#000",
    shadowOpacity: 0.22,
    shadowRadius: 16,
    shadowOffset: {
      width: 0,
      height: 7,
    },

    elevation: 8,
  },

  spotFormCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },

  spotFormCardTitle: {
    fontSize: 18,

    fontWeight: "900",

    color: "#FFFFFF",

    letterSpacing: -0.2,
  },

  typeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
  },

  typeCard: {
    width: "47%",

    backgroundColor: "rgba(5,15,25,0.9)",

    borderRadius: 18,

    paddingVertical: 18,

    alignItems: "center",
    justifyContent: "center",

    borderWidth: 1,
    borderColor: "rgba(244,181,71,0.24)",
  },

  typeCardActive: {
    backgroundColor: "rgba(20,36,54,0.98)",

    borderColor: "#F4B547",

    borderWidth: 1,

    shadowColor: "#F4B547",
    shadowOpacity: 0.24,
    shadowRadius: 14,
    shadowOffset: {
      width: 0,
      height: 6,
    },

    elevation: 7,
  },

  typeCardEmoji: {
    fontSize: 30,
    marginBottom: 10,
  },

  typeCardText: {
    fontSize: 15,
    fontWeight: "800",
    color: "rgba(255,255,255,0.72)",
    textAlign: "center",
  },

  typeCardTextActive: {
    color: "#FFFFFF",
  },

  photoUploadCard: {
    height: 210,

    borderRadius: 20,

    backgroundColor: "rgba(5,15,25,0.9)",

    borderWidth: 1,
    borderColor: "rgba(244,181,71,0.28)",

    borderStyle: "dashed",

    alignItems: "center",
    justifyContent: "center",

    overflow: "hidden",
  },

  photoUploadPreview: {
    width: "100%",
    height: "100%",
  },

  photoUploadIcon: {
    fontSize: 38,
    marginBottom: 8,
  },

  photoUploadTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#FFFFFF",
    marginBottom: 4,
  },

  photoUploadSubtitle: {
    fontSize: 13,
    color: "rgba(255,255,255,0.58)",
    fontWeight: "600",
  },

  spotActionCard: {
  backgroundColor: "rgba(14,29,45,0.96)",

  borderRadius: 24,

  padding: 18,

  marginTop: 10,

  borderWidth: 1,
  borderColor: "rgba(244,181,71,0.24)",

  shadowColor: "#000",
  shadowOpacity: 0.22,
  shadowRadius: 16,
  shadowOffset: {
    width: 0,
    height: 7,
  },

  elevation: 8,
},

  spotActionRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
  },

  spotActionIcon: {
    fontSize: 34,
    marginRight: 14,
  },

  spotActionTitle: {
  fontSize: 16,
  fontWeight: "900",
  color: "#FFFFFF",
},

  spotActionSubtitle: {
  marginTop: 4,
  color: "rgba(255,255,255,0.62)",
  fontSize: 13,
  lineHeight: 18,
  fontWeight: "600",
},

});