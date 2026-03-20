import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import MapView, { MapPressEvent, Marker, Region } from "react-native-maps";
import { getSubscriptionFeatures } from "../../lib/subscriptionFeatures";
import { getAllVendors } from "../../services/vendorService";
import { type Van } from "../../types/van";

type SpotPin = {
  latitude: number;
  longitude: number;
};

const DEFAULT_REGION: Region = {
  latitude: 51.5074,
  longitude: -0.1278,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

const SPOTTED_VANS_KEY = "bitebeacon_spotted_vans";

export default function MapScreen() {
  const params = useLocalSearchParams();
  const mapRef = useRef<MapView | null>(null);

  const [spotVisible, setSpotVisible] = useState(false);
  const [spotMode, setSpotMode] = useState(false);
  const [spotName, setSpotName] = useState("");
  const [spotCuisine, setSpotCuisine] = useState("");
  const [spotPhoto, setSpotPhoto] = useState<string | null>(null);
  const [spottedVans, setSpottedVans] = useState<Van[]>([]);
  const [supabaseVans, setSupabaseVans] = useState<Van[]>([]);
  const [selectedSpotPin, setSelectedSpotPin] = useState<SpotPin | null>(null);
  const [selectedVan, setSelectedVan] = useState<Van | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<"all" | "live" | "spotted">("all");
  const [userRegion, setUserRegion] = useState<Region>(DEFAULT_REGION);
  const [locationReady, setLocationReady] = useState(false);

  useEffect(() => {
    requestUserLocation();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadSupabaseVans();
      loadSpottedVans();
    }, [])
  );

  useEffect(() => {
    if (params.lat && params.lng) {
      const nextRegion: Region = {
        latitude: Number(params.lat),
        longitude: Number(params.lng),
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };

      setUserRegion(nextRegion);

      setTimeout(() => {
        mapRef.current?.animateToRegion(nextRegion, 1000);
      }, 400);

      return;
    }

    if (!params.highlight) return;

    const highlightedVendor = [...supabaseVans, ...spottedVans].find(
      (van) => van.id === params.highlight
    );

    if (!highlightedVendor) return;

    setSelectedVan(highlightedVendor);
    setSpotMode(false);
    setSelectedSpotPin(null);

    const nextRegion: Region = {
      latitude: highlightedVendor.lat,
      longitude: highlightedVendor.lng,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    };

    setUserRegion(nextRegion);

    setTimeout(() => {
      mapRef.current?.animateToRegion(nextRegion, 1000);
    }, 400);
  }, [params.lat, params.lng, params.highlight, supabaseVans, spottedVans]);

  async function requestUserLocation() {
    try {
      const permission = await Location.requestForegroundPermissionsAsync();

      if (permission.status !== "granted") {
        setLocationReady(true);
        return;
      }

      const current = await Location.getCurrentPositionAsync({});

      setUserRegion({
        latitude: current.coords.latitude,
        longitude: current.coords.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      });

      setLocationReady(true);
    } catch {
      setLocationReady(true);
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

  async function loadSpottedVans() {
    try {
      const stored = await AsyncStorage.getItem(SPOTTED_VANS_KEY);
      if (!stored) {
        setSpottedVans([]);
        return;
      }

      const parsed: Van[] = JSON.parse(stored);
      setSpottedVans(parsed);
    } catch {
      setSpottedVans([]);
    }
  }

  const allVans = useMemo(() => {
    return [...supabaseVans, ...spottedVans];
  }, [supabaseVans, spottedVans]);

  const filteredVans = useMemo(() => {
    const baseVans =
      selectedFilter === "live"
        ? allVans.filter((van) => van.isLive && !van.temporary)
        : selectedFilter === "spotted"
          ? allVans.filter((van) => van.temporary)
          : allVans;

    return [...baseVans].sort((a, b) => {
      const tierRank = { pro: 3, growth: 2, free: 1 };

      const aRank = tierRank[a.subscriptionTier ?? "free"];
      const bRank = tierRank[b.subscriptionTier ?? "free"];

      if (aRank !== bRank) {
        return bRank - aRank;
      }

      return b.rating - a.rating;
    });
  }, [allVans, selectedFilter]);

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
        latitude: van.lat,
        longitude: van.lng,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      },
      500
    );
  }

  function handleMapPress(event: MapPressEvent) {
    if (spotMode) {
      const { latitude, longitude } = event.nativeEvent.coordinate;

      setSelectedSpotPin({ latitude, longitude });
      setSelectedVan(null);
      setSpotMode(false);
      setSpotVisible(true);
      return;
    }

    setSelectedVan(null);
  }

  function startSpotMode() {
    setSelectedVan(null);
    setSpotMode(true);
    setSelectedSpotPin(null);

    Alert.alert("Choose location", "Tap the map where the burger van is.");
  }

  function cancelSpotFlow() {
    setSpotMode(false);
    setSpotVisible(false);
    setSpotName("");
    setSpotCuisine("");
    setSpotPhoto(null);
    setSelectedSpotPin(null);
  }

  async function pickSpotPhoto() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert("Permission needed", "Allow photo access.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 0.7,
    });

    if (!result.canceled) {
      setSpotPhoto(result.assets[0].uri);
    }
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

    const newVan: Van = {
      id: `spotted-${Date.now()}`,
      name: spotName.trim(),
      cuisine: spotCuisine.trim() || "Spotted Van",
      rating: 0,
      lat: selectedSpotPin.latitude,
      lng: selectedSpotPin.longitude,
      temporary: true,
      photo: spotPhoto,
      vendorName: "Community spotted",
      menu: "Claim this burger van to add menu",
      schedule: "Claim to add schedule",
      isLive: false,
      views: 0,
      directions: 0,
    };

    const updatedSpottedVans = [newVan, ...spottedVans];
    setSpottedVans(updatedSpottedVans);

    try {
      await AsyncStorage.setItem(
        SPOTTED_VANS_KEY,
        JSON.stringify(updatedSpottedVans)
      );
    } catch {
      Alert.alert("Error", "Could not save spotted van.");
      return;
    }

    cancelSpotFlow();
    Alert.alert("Success", "Temporary van added to map.");
  }

  function openVanPage(van: Van) {
    if (van.temporary) {
      Alert.alert(
        "Community spotted van",
        "This van has not been claimed by a vendor yet."
      );
      return;
    }

    router.push({
      pathname: "/vendor/[id]",
      params: {
        id: van.id,
      },
    });
  }

  function recenterMap() {
    mapRef.current?.animateToRegion(userRegion, 600);
  }

  return (
    <View style={styles.container}>
      {locationReady ? (
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={userRegion}
          showsUserLocation
          onPress={handleMapPress}
        >
          {filteredVans.map((van) => (
            <Marker
              key={van.id}
              coordinate={{ latitude: van.lat, longitude: van.lng }}
              pinColor={
                van.temporary
                  ? "orange"
                  : van.subscriptionTier === "pro"
                    ? "#FF7A00"
                    : getSubscriptionFeatures(van.subscriptionTier).liveStatus
                      ? van.isLive
                        ? "green"
                        : "gray"
                      : "gray"
              }
              title={van.subscriptionTier === "pro" ? `⭐ ${van.name}` : van.name}
              description={
                van.temporary
                  ? "Community spotted van"
                  : getSubscriptionFeatures(van.subscriptionTier).liveStatus
                    ? van.isLive
                      ? `${van.cuisine} • LIVE now`
                      : `${van.cuisine} • Currently offline`
                    : van.cuisine
              }
              onPress={() => handleMarkerPress(van)}
            />
          ))}

          {selectedSpotPin ? (
            <Marker coordinate={selectedSpotPin} pinColor="gray" />
          ) : null}
        </MapView>
      ) : (
        <View style={styles.loadingWrap}>
          <Text style={styles.loadingText}>Loading map...</Text>
        </View>
      )}

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
            Live
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

      <Pressable style={styles.recenterButton} onPress={recenterMap}>
        <Text style={styles.recenterButtonText}>📍</Text>
      </Pressable>

      {selectedVan ? (
        <View style={styles.bottomCardWrap}>
          <Pressable
            style={styles.bottomCard}
            onPress={() => openVanPage(selectedVan)}
          >
            {getSubscriptionFeatures(selectedVan.subscriptionTier).images &&
              selectedVan.photo ? (
              <Image
                source={{ uri: selectedVan.photo }}
                style={styles.bottomCardImage}
              />
            ) : null}

            <View style={styles.bottomCardTopRow}>
              <View style={styles.bottomCardTitleRow}>
                <Text style={styles.bottomCardTitle}>{selectedVan.name}</Text>

                {selectedVan.subscriptionTier === "pro" ? (
                  <View style={styles.bottomCardFeaturedBadge}>
                    <Text style={styles.bottomCardFeaturedBadgeText}>FEATURED</Text>
                  </View>
                ) : null}
              </View>

              <View
                style={[
                  styles.statusPill,
                  selectedVan.temporary
                    ? styles.statusTemporary
                    : getSubscriptionFeatures(selectedVan.subscriptionTier).liveStatus
                      ? selectedVan.isLive
                        ? styles.statusLive
                        : styles.statusOffline
                      : styles.statusOffline,
                ]}
              >
                <Text style={styles.statusPillText}>
                  {selectedVan.temporary
                    ? "SPOTTED"
                    : getSubscriptionFeatures(selectedVan.subscriptionTier).liveStatus
                      ? selectedVan.isLive
                        ? "LIVE"
                        : "OFFLINE"
                      : "LISTED"}
                </Text>
              </View>
            </View>

            <Text style={styles.bottomCardMeta}>{selectedVan.cuisine}</Text>

            {selectedVan.vendorName ? (
              <Text style={styles.bottomCardVendor}>
                {selectedVan.vendorName}
              </Text>
            ) : null}

            <Text style={styles.bottomCardHint}>
              {selectedVan.temporary
                ? "Tap to learn about this spotted van"
                : "Tap to open vendor details"}
            </Text>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.buttonWrap}>

        <Pressable style={styles.primaryButton} onPress={startSpotMode}>
          <Text style={styles.primaryButtonText}>Spot a Van</Text>
        </Pressable>
      </View>

      <Modal visible={spotVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <ScrollView>
              <Text style={styles.modalTitle}>Spot a Burger Van</Text>

              <TextInput
                style={styles.input}
                placeholder="Van name"
                value={spotName}
                onChangeText={setSpotName}
              />

              <TextInput
                style={styles.input}
                placeholder="Cuisine"
                value={spotCuisine}
                onChangeText={setSpotCuisine}
              />

              <Pressable style={styles.secondaryButton} onPress={pickSpotPhoto}>
                <Text style={styles.secondaryButtonText}>Choose Photo</Text>
              </Pressable>

              {spotPhoto ? (
                <Image source={{ uri: spotPhoto }} style={styles.previewImage} />
              ) : null}

              <Pressable style={styles.primaryButton} onPress={submitSpotVan}>
                <Text style={styles.primaryButtonText}>Submit Listing</Text>
              </Pressable>

              <Pressable style={styles.cancelButton} onPress={cancelSpotFlow}>
                <Text style={styles.cancelButtonText}>Close</Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },

  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  loadingText: {
    fontSize: 16,
    fontWeight: "600",
  },

  recenterButton: {
    position: "absolute",
    right: 20,
    bottom: 170,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    elevation: 6,
  },

  recenterButtonText: {
    fontSize: 22,
  },

  bottomCardWrap: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 100,
  },

  bottomCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
  },

  bottomCardImage: {
    width: "100%",
    height: 140,
    borderRadius: 16,
    marginBottom: 8,
  },

  bottomCardTitle: {
    fontSize: 18,
    fontWeight: "800",
  },

  bottomCardMeta: {
    fontSize: 14,
    color: "#666",
  },

  bottomCardHint: {
    marginTop: 6,
    fontWeight: "700",
  },

  buttonWrap: {
    position: "absolute",
    left: 20,
    right: 20,
    bottom: 24,
    gap: 10,
  },

  primaryButton: {
    backgroundColor: "#0B2A5B",
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
  },

  primaryButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },

  secondaryActionButton: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#0B2A5B",
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
  },

  secondaryActionButtonText: {
    color: "#0B2A5B",
    fontWeight: "700",
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-end",
  },

  modalCard: {
    backgroundColor: "#F7F4F2",
    padding: 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },

  modalTitle: {
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 12,
  },

  input: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D9D9D9",
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
  },

  previewImage: {
    width: "100%",
    height: 160,
    borderRadius: 16,
    marginBottom: 12,
  },

  secondaryButton: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#0B2A5B",
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
    marginBottom: 12,
  },

  secondaryButtonText: {
    color: "#0B2A5B",
    fontWeight: "700",
  },

  cancelButton: {
    backgroundColor: "#D9D9D9",
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
  },

  cancelButtonText: {
    fontWeight: "700",
  },
  bottomCardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },

  bottomCardFeaturedBadge: {
    backgroundColor: "#FF7A00",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },

  bottomCardFeaturedBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
  },

  bottomCardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },

  bottomCardVendor: {
    fontSize: 14,
    color: "#444",
    marginTop: 4,
  },

  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },

  statusPillText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
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
  filterBar: {
    position: "absolute",
    top: 60,
    left: 16,
    right: 16,
    flexDirection: "row",
    gap: 10,
    zIndex: 10,
  },

  filterChip: {
    backgroundColor: "rgba(255,255,255,0.92)",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
  },

  filterChipActive: {
    backgroundColor: "#0B2A5B",
  },

  filterChipText: {
    color: "#0B2A5B",
    fontWeight: "700",
  },

  filterChipTextActive: {
    color: "#FFFFFF",
  },
});