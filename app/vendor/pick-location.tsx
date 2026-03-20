import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import MapView, { MapPressEvent, Marker } from "react-native-maps";

export default function PickLocationScreen() {
  const params = useLocalSearchParams();

  const [pin, setPin] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  useEffect(() => {
    const lat = Number(params.lat);
    const lng = Number(params.lng);

    if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
      setPin({
        latitude: lat,
        longitude: lng,
      });
    }
  }, [params.lat, params.lng]);

  function handleMapPress(event: MapPressEvent) {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    setPin({ latitude, longitude });
  }

  function confirmLocation() {
    if (!pin) return;

    router.replace({
      pathname: "/vendor/register",
      params: {
        lat: String(pin.latitude),
        lng: String(pin.longitude),
        vanName: (params.vanName as string) ?? "",
        vendorName: (params.vendorName as string) ?? "",
        cuisine: (params.cuisine as string) ?? "",
        menu: (params.menu as string) ?? "",
        schedule: (params.schedule as string) ?? "",
        claimId: (params.claimId as string) ?? "",
        photo: (params.photo as string) ?? "",
        foodCategories: (params.foodCategories as string) ?? "[]",
      },
    });
  }

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: 51.5074,
          longitude: -0.1278,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
        onPress={handleMapPress}
      >
        {pin ? <Marker coordinate={pin} /> : null}
      </MapView>

      <View style={styles.controls}>
        <Pressable style={styles.confirmButton} onPress={confirmLocation}>
          <Text style={styles.confirmText}>Confirm Location</Text>
        </Pressable>

        <Pressable
          style={styles.cancelButton}
          onPress={() => router.back()}
        >
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