import * as Location from "expo-location";
import { supabase } from "../../lib/supabase";
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
import { getAllVendors } from "../../services/vendorService";
import { type Van } from "../../types/van";

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

  async function checkVendorAccess() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || !user.email_confirmed_at) {
      await supabase.auth.signOut();
      router.replace("/auth/login");
      return;
    }
  }

  useFocusEffect(
    useCallback(() => {
      isActiveRef.current = true;

      async function init() {
        await checkVendorAccess(); // 🚨 BLOCK FIRST
        await loadSpottedVans();   // ✅ only runs if allowed
      }

      init();

      return () => {
        isActiveRef.current = false;
      };
    }, [])
  );

  useEffect(() => {
    loadUserLocation();
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
    if (!vanLat || !vanLng) return Infinity;

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
      // safe fallback
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
          (
            vendor.listingSource === "user_spotted" ||
            vendor.listingSource === "admin_seeded"
          )
      );

      setSpottedVans(claimableVans);
    } catch {
      if (isActiveRef.current) {
        setSpottedVans([]);
      }
    } finally {
      if (isActiveRef.current) {
        setLoading(false);
      }
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

      const distanceA = getDistanceMiles(
        userLocation.latitude,
        userLocation.longitude,
        a.lat,
        a.lng
      );

      const distanceB = getDistanceMiles(
        userLocation.latitude,
        userLocation.longitude,
        b.lat,
        b.lng
      );

      return distanceA - distanceB;
    });

  function getLocationText(van: Van) {
    if (!van.lat || !van.lng) return "Location unavailable";
    return `${van.lat.toFixed(3)}, ${van.lng.toFixed(3)}`;
  }

  function handleSelectVan(van: Van) {
    if (isNavigating) return;

    setIsNavigating(true);

    router.push({
      pathname: "/vendor/claim",
      params: { id: van.id },
    });

    setTimeout(() => setIsNavigating(false), 500);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.kicker}>VENDOR SETUP</Text>
      <Text style={styles.title}>Find Your Van</Text>
      <Text style={styles.subtitle}>
        We may already have your business listed from a community sighting.
        Search for your business first to avoid creating a duplicate listing.
        If you find it, claim it to take control of that listing.
        If you do not find it, you can create a new vendor listing instead.
      </Text>

      <TextInput
        style={styles.searchInput}
        placeholder="Search by van name or cuisine"
        placeholderTextColor="rgba(255,255,255,0.6)"
        value={searchQuery}
        onChangeText={setSearchQuery}
      />

      {loading ? (
        <Text style={styles.helperText}>Loading spotted vans...</Text>
      ) : filteredVans.length === 0 ? (
        <Text style={styles.helperText}>
          {searchQuery.trim()
            ? "No matching vans found. Try another search or create a new vendor listing if your van is not listed."
            : "We could not find any unclaimed spotted vans right now. If your van is not listed yet, create a new vendor listing."}
        </Text>
      ) : (
        <FlatList
          data={filteredVans}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          initialNumToRender={6}
          renderItem={({ item }) => (
            <Pressable
              style={styles.vanCard}
              onPress={() => handleSelectVan(item)}
              disabled={isNavigating}
            >
              <Text style={styles.vanName}>{item.name}</Text>
              <Text style={styles.vanMeta}>{item.cuisine}</Text>
              <Text style={styles.vanLocation}>
                📍 {getLocationText(item)}
              </Text>
              <Text style={styles.vanHint}>Tap to start claim request</Text>
            </Pressable>
          )}
        />
      )}

      <Pressable
        style={styles.primaryButton}
        onPress={() => router.replace("/vendor/register")}
      >
        <Text style={styles.primaryButtonText}>My Van Is Not Listed</Text>
      </Pressable>

      <Pressable style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backButtonText}>Back</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0B2A5B",
    padding: 24,
  },
  kicker: {
    fontSize: 12,
    fontWeight: "800",
    color: "#FFC107",
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  title: {
    fontSize: 30,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: "rgba(255,255,255,0.75)",
    lineHeight: 22,
    marginBottom: 20,
  },
  searchInput: {
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 2,
    borderColor: "#FF7A00",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 20,
    color: "#FFFFFF",
  },
  helperText: {
    fontSize: 15,
    color: "rgba(255,255,255,0.75)",
    lineHeight: 22,
    marginBottom: 20,
  },
  listContent: {
    paddingBottom: 20,
  },
  vanCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: "#FF7A00",
  },
  vanName: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0B2A5B",
    marginBottom: 4,
  },
  vanMeta: {
    fontSize: 14,
    color: "#666666",
    marginBottom: 6,
  },
  vanLocation: {
    fontSize: 13,
    color: "#0B2A5B",
    marginBottom: 6,
    fontWeight: "600",
  },
  vanHint: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FF7A00",
  },
  primaryButton: {
    backgroundColor: "#FF7A00",
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 8,
    marginBottom: 10,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  backButton: {
    backgroundColor: "#D9D9D9",
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 8,
  },
  backButtonText: {
    color: "#222222",
    fontSize: 16,
    fontWeight: "700",
  },
});