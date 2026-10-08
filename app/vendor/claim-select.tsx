import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Location from "expo-location";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { supabase } from "../../lib/supabase";
import { getAllVendors } from "../../services/vendorService";
import { type Van } from "../../types/van";

const GOLD = "#FFD65B";
const GOLD_GRADIENT = ["#A66B00", "#FFECA3", "#FFC531", "#FFF2AE", "#C88705"] as const;

export default function ClaimSelectScreen() {
  const [spottedVans, setSpottedVans] = useState<Van[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);

  const isActiveRef = useRef(true);

  async function checkVendorAccess(): Promise<boolean> {
    try {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error || !user || !user.email_confirmed_at) {
        await supabase.auth.signOut();
        if (isActiveRef.current) router.replace("/auth/login");
        return false;
      }
      return true;
    } catch {
      if (isActiveRef.current) router.replace("/auth/login");
      return false;
    }
  }

  useFocusEffect(
    useCallback(() => {
      isActiveRef.current = true;

      async function init() {
        const allowed = await checkVendorAccess();
        if (!allowed || !isActiveRef.current) return;
        await loadSpottedVans();
      }

      void init();

      return () => {
        isActiveRef.current = false;
      };
    }, [])
  );

  useEffect(() => {
    void loadUserLocation();
    return () => {
      isActiveRef.current = false;
    };
  }, []);

  function getDistanceMiles(
    userLat: number,
    userLng: number,
    vanLat?: number,
    vanLng?: number
  ) {
    if (vanLat == null || vanLng == null) return Infinity;

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
    return earthRadiusKm * c * 0.621371;
  }

  async function loadUserLocation() {
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== "granted") return;
      const current = await Location.getCurrentPositionAsync({});
      if (!isActiveRef.current) return;
      setUserLocation({
        latitude: current.coords.latitude,
        longitude: current.coords.longitude,
      });
    } catch {
      // Location is optional; search still works without it.
    }
  }

  async function loadSpottedVans() {
    setLoading(true);
    try {
      const allVendors = await getAllVendors();
      if (!isActiveRef.current) return;
      const claimableVans = allVendors.filter(
        (vendor) =>
          !vendor.owner_id &&
          !vendor.isSuspended &&
          (vendor.listingSource === "user_spotted" ||
            vendor.listingSource === "admin_seeded")
      );
      setSpottedVans(claimableVans);
    } catch {
      if (isActiveRef.current) setSpottedVans([]);
    } finally {
      if (isActiveRef.current) setLoading(false);
    }
  }

  const filteredVans = [...spottedVans]
    .filter((van) => {
      const query = searchQuery.trim().toLowerCase();
      if (!query) return true;
      return (
        (van.name ?? "").toLowerCase().includes(query) ||
        (van.cuisine ?? "").toLowerCase().includes(query)
      );
    })
    .sort((a, b) => {
      if (!userLocation) return 0;
      return (
        getDistanceMiles(userLocation.latitude, userLocation.longitude, a.lat, a.lng) -
        getDistanceMiles(userLocation.latitude, userLocation.longitude, b.lat, b.lng)
      );
    });

  function getLocationText(van: Van) {
    if (van.lat == null || van.lng == null) return "Location unavailable";
    return `${van.lat.toFixed(3)}, ${van.lng.toFixed(3)}`;
  }

  function handleSelectVan(van: Van) {
    if (isNavigating) return;
    setIsNavigating(true);
    router.push({ pathname: "/vendor/claim", params: { id: van.id } });
    setTimeout(() => {
      if (isActiveRef.current) setIsNavigating(false);
    }, 500);
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={loading ? [] : filteredVans}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        initialNumToRender={6}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View>
            <Text style={styles.kicker}>VENDOR SETUP</Text>
            <Text style={styles.title}>Find Your Van</Text>
            <View style={styles.titleUnderline} />
            <Text style={styles.subtitle}>
              We may already have your business listed from a community sighting.
              Search for your business first to avoid creating a duplicate listing.
              If you find it, claim it to take control of that listing.
              If you do not find it, you can create a new vendor listing instead.
            </Text>
            <LinearGradient colors={GOLD_GRADIENT} style={styles.searchFrame}>
              <View style={styles.searchInner}>
                <MaterialCommunityIcons name="magnify" size={23} color={GOLD} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search by van name or cuisine"
                  placeholderTextColor="rgba(235,238,242,0.50)"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  autoCorrect={false}
                  accessibilityLabel="Search vans by name or cuisine"
                />
              </View>
            </LinearGradient>
            <Text style={styles.resultsLabel}>
              {loading ? "SEARCHING LISTINGS" : `${filteredVans.length} CLAIMABLE ${filteredVans.length === 1 ? "LISTING" : "LISTINGS"}`}
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyPanel}>
            <MaterialCommunityIcons
              name={loading ? "map-search-outline" : "map-marker-question-outline"}
              size={31}
              color={GOLD}
            />
            <Text style={styles.helperText}>
              {loading
                ? "Loading spotted vans..."
                : searchQuery.trim()
                  ? "No matching vans found. Try another search or create a new vendor listing if your van is not listed."
                  : "We could not find any unclaimed spotted vans right now. If your van is not listed yet, create a new vendor listing."}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable onPress={() => handleSelectVan(item)} disabled={isNavigating}>
            <LinearGradient colors={GOLD_GRADIENT} style={styles.vanCardFrame}>
              <View style={styles.vanCard}>
                <View style={styles.vanCardHeader}>
                  <View style={styles.vanCardIcon}>
                    <MaterialCommunityIcons name="food" size={22} color={GOLD} />
                  </View>
                  <View style={styles.vanCardTitleArea}>
                    <Text style={styles.vanName}>{item.name}</Text>
                    <Text style={styles.vanMeta}>{item.cuisine || "Street food vendor"}</Text>
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={25} color={GOLD} />
                </View>
                <View style={styles.locationRow}>
                  <MaterialCommunityIcons name="map-marker-outline" size={17} color={GOLD} />
                  <Text style={styles.vanLocation}>{getLocationText(item)}</Text>
                </View>
                <Text style={styles.vanHint}>TAP TO START CLAIM REQUEST</Text>
              </View>
            </LinearGradient>
          </Pressable>
        )}
      />
      <View style={styles.footer}>
        <Pressable onPress={() => router.replace("/vendor/register")}>
          <LinearGradient
            colors={GOLD_GRADIENT}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0.25 }}
            style={styles.primaryButton}
          >
            <Text style={styles.primaryButtonText}>My Van Is Not Listed</Text>
            <MaterialCommunityIcons name="arrow-right" size={20} color="#16140F" />
          </LinearGradient>
        </Pressable>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <MaterialCommunityIcons name="chevron-left" size={20} color={GOLD} />
          <Text style={styles.backButtonText}>Back</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#071726" },
  listContent: { paddingHorizontal: 22, paddingTop: 34, paddingBottom: 22 },
  kicker: { fontSize: 11, fontWeight: "800", color: GOLD, letterSpacing: 2.1, marginBottom: 9 },
  title: { fontSize: 32, fontWeight: "800", color: "#FFF8E9", marginBottom: 13 },
  titleUnderline: { width: 82, height: 3, backgroundColor: GOLD, borderRadius: 3, marginBottom: 19 },
  subtitle: { fontSize: 14, color: "#C5CDD7", lineHeight: 22, marginBottom: 22 },
  searchFrame: { padding: 1.6, borderRadius: 17, marginBottom: 22 },
  searchInner: { flexDirection: "row", alignItems: "center", gap: 9, backgroundColor: "#111C29", borderRadius: 15, paddingHorizontal: 13 },
  searchInput: { flex: 1, minHeight: 53, color: "#FFFFFF", fontSize: 14 },
  resultsLabel: { color: GOLD, fontSize: 10, fontWeight: "800", letterSpacing: 1.3, marginBottom: 13 },
  emptyPanel: { borderWidth: 1, borderColor: "rgba(255,214,91,0.40)", backgroundColor: "#111C29", borderRadius: 20, padding: 24, alignItems: "center", gap: 12 },
  helperText: { color: "#C5CDD7", fontSize: 14, lineHeight: 21, textAlign: "center" },
  vanCardFrame: { padding: 1.6, borderRadius: 21, marginBottom: 13, shadowColor: GOLD, shadowOpacity: 0.18, shadowRadius: 11, shadowOffset: { width: 0, height: 2 }, elevation: 3 },
  vanCard: { backgroundColor: "#111C29", borderRadius: 19, padding: 16 },
  vanCardHeader: { flexDirection: "row", alignItems: "center", gap: 11 },
  vanCardIcon: { width: 43, height: 43, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,214,91,0.08)", borderWidth: 1, borderColor: "rgba(255,214,91,0.45)" },
  vanCardTitleArea: { flex: 1 },
  vanName: { fontSize: 17, fontWeight: "800", color: "#FFF8E9", marginBottom: 3 },
  vanMeta: { fontSize: 13, color: "#B9C3CF" },
  locationRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 13 },
  vanLocation: { fontSize: 12, color: "#C5CDD7" },
  vanHint: { color: GOLD, fontSize: 10, fontWeight: "800", letterSpacing: 0.9, marginTop: 12 },
  footer: { paddingHorizontal: 22, paddingTop: 13, paddingBottom: 24, backgroundColor: "#071726", borderTopWidth: 1, borderTopColor: "rgba(255,214,91,0.22)" },
  primaryButton: { minHeight: 54, borderRadius: 16, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 9, marginBottom: 11 },
  primaryButtonText: { color: "#16140F", fontSize: 15, fontWeight: "900" },
  backButton: { minHeight: 50, borderRadius: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: "#111C29", borderWidth: 1.5, borderColor: GOLD },
  backButtonText: { color: GOLD, fontSize: 15, fontWeight: "800" },
});
