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

function getSingleParam(
  value: string | string[] | undefined,
  fallback = ""
): string {
  if (Array.isArray(value)) {
    return value[0] ?? fallback;
  }
  return value ?? fallback;
}

export default function PickLocationScreen() {
  const params = useLocalSearchParams();
  const mapRef = useRef<MapView | null>(null);
  const isMountedRef = useRef(true);

  const [pin, setPin] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [mapRegion, setMapRegion] = useState<Region>(DEFAULT_REGION);
  const [locationReady, setLocationReady] = useState(false);

  useEffect(() => {
    isMountedRef.current = true;

    loadStartingLocation();

    return () => {
      isMountedRef.current = false;
    };
  }, [params.lat, params.lng]);

  function applyMapLocation(region: Region) {
    if (!isMountedRef.current) return;

    setMapRegion(region);
    setPin({
      latitude: region.latitude,
      longitude: region.longitude,
    });
    setLocationReady(true);

    setTimeout(() => {
      mapRef.current?.animateToRegion(region, 600);
    }, 250);
  }

  async function loadStartingLocation() {
    const lat = Number(getSingleParam(params.lat));
    const lng = Number(getSingleParam(params.lng));

    if (!Number.isNaN(lat) && !Number.isNaN(lng) && lat !== 0 && lng !== 0) {
      const existingRegion: Region = {
        latitude: lat,
        longitude: lng,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
      applyMapLocation(existingRegion);
      return;
    }

    try {
      const permission = await Location.requestForegroundPermissionsAsync();

      if (permission.status !== "granted") {
        if (!isMountedRef.current) return;

        setLocationReady(true);
        Alert.alert(
          "Location permission needed",
          "We could not access your current location, so the map opened in the default area."
        );
        return;
      }

      const current = await Location.getCurrentPositionAsync({});
      const currentRegion: Region = {
        latitude: current.coords.latitude,
        longitude: current.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };

      applyMapLocation(currentRegion);
    } catch {
      if (!isMountedRef.current) return;

      setLocationReady(true);
      Alert.alert(
        "Location unavailable",
        "We could not get your current location, so the map opened in the default area."
      );
    }
  }

  function handleMapPress(event: MapPressEvent) {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    setPin({ latitude, longitude });
  }

  async function confirmLocation() {
    if (!pin) {
      Alert.alert(
        "Select a location",
        "Please tap the map to place your pin before confirming."
      );
      return;
    }

    const returnTo = getSingleParam(params.returnTo);

    if (returnTo === "dashboard") {
      router.replace({
        pathname: "/vendor/dashboard",
        params: {
          id: getSingleParam(params.id),
          lat: String(pin.latitude),
          lng: String(pin.longitude),
          locationUpdated: "true",
          name: getSingleParam(params.name),
          vendorName: getSingleParam(params.vendorName),
          cuisine: getSingleParam(params.cuisine),
          menu: getSingleParam(params.menu),
          schedule: getSingleParam(params.schedule),
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
        lat: String(pin.latitude),
        lng: String(pin.longitude),
        vanName: getSingleParam(params.vanName),
        vendorName: getSingleParam(params.vendorName),
        cuisine: getSingleParam(params.cuisine),
        menu: getSingleParam(params.menu),
        schedule: getSingleParam(params.schedule),
        claimId: getSingleParam(params.claimId),
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
          {pin ? <Marker coordinate={pin} /> : null}
        </MapView>
      ) : (
        <View style={styles.loadingWrap}>
          <Text style={styles.loadingText}>Loading map...</Text>
        </View>
      )}

      <View style={styles.controls}>
        <Pressable
          style={[
            styles.confirmButton,
            !pin && styles.confirmButtonDisabled,
          ]}
          onPress={confirmLocation}
          disabled={!pin}
        >
          <Text style={styles.confirmText}>Confirm Location</Text>
        </Pressable>

        <Pressable style={styles.cancelButton} onPress={() => router.back()}>
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F7F4F2",
  },
  loadingText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0B2A5B",
  },
  controls: {
    position: "absolute",
    left: 20,
    right: 20,
    bottom: 30,
    gap: 10,
  },
  confirmButton: {
    backgroundColor: "#0B2A5B",
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
  },
  confirmButtonDisabled: {
    opacity: 0.55,
  },
  confirmText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  cancelButton: {
    backgroundColor: "#FFFFFF",
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#D9D9D9",
  },
  cancelText: {
    color: "#222222",
    fontSize: 16,
    fontWeight: "700",
  },
});