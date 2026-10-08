import { LinearGradient } from "expo-linear-gradient";
import * as Location from "expo-location";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import MapView, { MapPressEvent, Marker, Region } from "react-native-maps";

const DEFAULT_REGION: Region = {
  latitude: 51.5074,
  longitude: -0.1278,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

const GOLD = "#FFD66B";
const GOLD_LIGHT = "#FFF5CC";
const NAVY = "#081725";

function getSingleParam(value: string | string[] | undefined, fallback = ""): string {
  if (Array.isArray(value)) return value[0] ?? fallback;
  return value ?? fallback;
}

export default function PickLocationScreen() {
  const params = useLocalSearchParams();
  const mapRef = useRef<MapView | null>(null);
  const isMountedRef = useRef(true);

  const [pin, setPin] = useState<{ latitude: number; longitude: number } | null>(null);
  const [mapRegion, setMapRegion] = useState<Region>(DEFAULT_REGION);
  const [locationReady, setLocationReady] = useState(false);

  useEffect(() => {
    isMountedRef.current = true;
    loadStartingLocation();
    return () => { isMountedRef.current = false; };
  }, [params.lat, params.lng]);

  function applyMapLocation(region: Region) {
    if (!isMountedRef.current) return;
    setMapRegion(region);
    setPin({ latitude: region.latitude, longitude: region.longitude });
    setLocationReady(true);
    setTimeout(() => {
      if (isMountedRef.current) mapRef.current?.animateToRegion(region, 600);
    }, 250);
  }

  async function loadStartingLocation() {
    const rawLat = getSingleParam(params.lat);
    const rawLng = getSingleParam(params.lng);
    const lat = Number(rawLat);
    const lng = Number(rawLng);

    // Only use actual supplied, valid coordinates. Zero is a valid coordinate.
    if (rawLat.trim() !== "" && rawLng.trim() !== "" &&
        Number.isFinite(lat) && Number.isFinite(lng) &&
        lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      applyMapLocation({ latitude: lat, longitude: lng, latitudeDelta: 0.01, longitudeDelta: 0.01 });
      return;
    }

    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== "granted") {
        if (!isMountedRef.current) return;
        setLocationReady(true);
        Alert.alert("Location permission needed", "We could not access your current location, so the map opened in the default area.");
        return;
      }
      const current = await Location.getCurrentPositionAsync({});
      applyMapLocation({
        latitude: current.coords.latitude,
        longitude: current.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    } catch {
      if (!isMountedRef.current) return;
      setLocationReady(true);
      Alert.alert("Location unavailable", "We could not get your current location, so the map opened in the default area.");
    }
  }

  function handleMapPress(event: MapPressEvent) {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    setPin({ latitude, longitude });
  }

  function confirmLocation() {
    if (!pin) {
      Alert.alert("Select a location", "Please tap the map to place your pin before confirming.");
      return;
    }
    const returnTo = getSingleParam(params.returnTo);
    if (returnTo === "dashboard") {
      router.replace({
        pathname: "/vendor/dashboard",
        params: {
          id: getSingleParam(params.id), lat: String(pin.latitude), lng: String(pin.longitude),
          locationUpdated: "true", name: getSingleParam(params.name),
          vendorName: getSingleParam(params.vendorName), cuisine: getSingleParam(params.cuisine),
          menu: getSingleParam(params.menu), schedule: getSingleParam(params.schedule),
          vendorMessage: getSingleParam(params.vendorMessage),
          isLive: getSingleParam(params.isLive, "false"),
          foodCategories: getSingleParam(params.foodCategories, "[]"),
        },
      });
      return;
    }
    router.replace({
      pathname: "/vendor/register",
      params: {
        lat: String(pin.latitude), lng: String(pin.longitude),
        vanName: getSingleParam(params.vanName), vendorName: getSingleParam(params.vendorName),
        cuisine: getSingleParam(params.cuisine), menu: getSingleParam(params.menu),
        schedule: getSingleParam(params.schedule), claimId: getSingleParam(params.claimId),
        photo: getSingleParam(params.photo),
        foodCategories: getSingleParam(params.foodCategories, "[]"),
      },
    });
  }

  return (
    <View style={styles.container}>
      {locationReady ? (
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={mapRegion}
          showsUserLocation
          onPress={handleMapPress}
        >
          {pin ? <Marker coordinate={pin} pinColor="#D9A329" /> : null}
        </MapView>
      ) : (
        <View style={styles.loadingWrap}>
          <Text style={styles.loadingText}>Loading map...</Text>
        </View>
      )}

      <View style={styles.controls}>
        <View style={styles.headingCard}>
          <Text style={styles.kicker}>VENDOR LOCATION</Text>
          <Text style={styles.heading}>Place your pin</Text>
          <Text style={styles.instructions}>Tap the map to set your van's location, then confirm below.</Text>
        </View>
        <LinearGradient
          colors={["#FFF5CC", "#FFD66B", "#B7750E", "#FFE59A"]}
          locations={[0, 0.32, 0.72, 1]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={styles.goldFrame}
        >
          <Pressable
            style={[styles.confirmButton, !pin && styles.confirmButtonDisabled]}
            onPress={confirmLocation}
            disabled={!pin}
          >
            <Text style={styles.confirmText}>Confirm Location</Text>
          </Pressable>
        </LinearGradient>
        <Pressable style={styles.cancelButton} onPress={() => router.back()}>
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: NAVY },
  map: { flex: 1 },
  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: NAVY },
  loadingText: { fontSize: 16, fontWeight: "700", color: GOLD_LIGHT },
  controls: { position: "absolute", left: 18, right: 18, bottom: 28, gap: 10 },
  headingCard: {
    backgroundColor: "rgba(8,23,37,0.96)", borderRadius: 18,
    paddingHorizontal: 18, paddingVertical: 14,
    borderWidth: 1, borderColor: "rgba(255,214,107,0.65)",
  },
  kicker: { fontSize: 11, fontWeight: "900", letterSpacing: 1.7, color: GOLD, marginBottom: 5 },
  heading: { fontSize: 22, fontWeight: "900", color: GOLD_LIGHT, marginBottom: 5 },
  instructions: { fontSize: 13, lineHeight: 19, color: "rgba(255,255,255,0.82)" },
  goldFrame: { borderRadius: 16, padding: 2 },
  confirmButton: {
    backgroundColor: "#152D3C", paddingVertical: 14, borderRadius: 14,
    alignItems: "center", justifyContent: "center",
  },
  confirmButtonDisabled: { opacity: 0.55 },
  confirmText: { color: GOLD_LIGHT, fontSize: 16, fontWeight: "900" },
  cancelButton: {
    backgroundColor: "rgba(8,23,37,0.97)", paddingVertical: 14,
    borderRadius: 16, alignItems: "center", borderWidth: 1, borderColor: GOLD,
  },
  cancelText: { color: GOLD_LIGHT, fontSize: 16, fontWeight: "800" },
});
