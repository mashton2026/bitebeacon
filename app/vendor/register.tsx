import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import MapView, {
  Marker,
  type MapPressEvent,
  type Region,
} from "react-native-maps";
import { supabase } from "../../lib/supabase";

import { getCurrentUser } from "../../services/authService";
import { createVendor } from "../../services/vendorService";

const DEFAULT_REGION: Region = {
  latitude: 50.266,
  longitude: -5.0527,
  latitudeDelta: 0.18,
  longitudeDelta: 0.18,
};

export default function RegisterVendorScreen() {
  const isMountedRef = useRef(true);

  const [name, setName] = useState("");
  const [vendorName, setVendorName] = useState("");
  const [cuisine, setCuisine] = useState("");
  const [menu, setMenu] = useState("");
  const [schedule, setSchedule] = useState("");
  const [what3words, setWhat3words] = useState("");

  const [region, setRegion] = useState<Region>(DEFAULT_REGION);

  const [selectedLocation, setSelectedLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  const [isSaving, setIsSaving] = useState(false);

  async function checkVendorAccess() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || !user.email_confirmed_at) {
      await supabase.auth.signOut();
      router.replace("/auth/login");
      return false;
    }

    return true;
  }

  useEffect(() => {
    isMountedRef.current = true;

    checkVendorAccess();

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  function handleMapPress(event: MapPressEvent) {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    setSelectedLocation({ latitude, longitude });
  }

  function clearLocation() {
    setSelectedLocation(null);
    setRegion(DEFAULT_REGION);
  }

  async function handleCreateVendor() {
    // 🔒 HARD GUARD (prevents double submit)
    if (isSaving) return;

    const allowed = await checkVendorAccess();

    if (!allowed) return;

    try {
      if (
        !name.trim() ||
        !vendorName.trim() ||
        !cuisine.trim() ||
        !menu.trim() ||
        !schedule.trim() ||
        !selectedLocation
      ) {
        Alert.alert(
          "Missing fields",
          "Please complete all fields and place your vendor on the map."
        );
        return;
      }

      const currentUser = await getCurrentUser();

      if (!currentUser) {
        Alert.alert(
          "Login required",
          "Please log in to create a vendor listing."
        );
        return;
      }

      setIsSaving(true);

      const id = `vendor-${Date.now()}`;

      await createVendor({
        id,
        name: name.trim(),
        vendorName: vendorName.trim(),
        cuisine: cuisine.trim(),
        menu: menu.trim(),
        schedule: schedule.trim(),
        lat: selectedLocation.latitude,
        lng: selectedLocation.longitude,
        temporary: false,
        listingSource: "admin_seeded",
        isLive: false,
        owner_id: currentUser.id,
        subscriptionTier: "free",
        foodCategories: [],
        what3words: what3words.trim() || null,
      });

      if (!isMountedRef.current) return;

      Alert.alert("Success", "Vendor listing created successfully.", [
        {
          text: "OK",
          onPress: () => router.replace("/vendor/dashboard"),
        },
      ]);
    } catch (error) {
      if (!isMountedRef.current) return;

      Alert.alert(
        "Error",
        error instanceof Error ? error.message : "Failed to create vendor"
      );
    } finally {
      if (isMountedRef.current) {
        setIsSaving(false);
      }
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.keyboardContainer}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>Create Vendor</Text>

          <Text style={styles.subtitle}>
            Build your listing, place it on the map, and get ready to go live.
          </Text>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Basic Info</Text>

            <TextInput
              style={styles.input}
              placeholder="Van name"
              placeholderTextColor="#7A7A7A"
              value={name}
              onChangeText={setName}
            />

            <TextInput
              style={styles.input}
              placeholder="Vendor name"
              placeholderTextColor="#7A7A7A"
              value={vendorName}
              onChangeText={setVendorName}
            />

            <TextInput
              style={styles.input}
              placeholder="Cuisine"
              placeholderTextColor="#7A7A7A"
              value={cuisine}
              onChangeText={setCuisine}
            />
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Listing Details</Text>

            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Menu"
              placeholderTextColor="#7A7A7A"
              value={menu}
              onChangeText={setMenu}
              multiline
              textAlignVertical="top"
            />

            <TextInput
              style={[styles.input, styles.textAreaSmall]}
              placeholder="Schedule"
              placeholderTextColor="#7A7A7A"
              value={schedule}
              onChangeText={setSchedule}
              multiline
              textAlignVertical="top"
            />

            <Text style={styles.sectionTitle}>Verification (optional)</Text>

            <TextInput
              style={styles.input}
              placeholder="what3words (e.g. filled.count.soap)"
              placeholderTextColor="#7A7A7A"
              value={what3words}
              onChangeText={setWhat3words}
            />
          </View>

          <View style={styles.card}>
            <View style={styles.locationHeader}>
              <View style={styles.locationTextWrap}>
                <Text style={styles.sectionTitle}>Location</Text>

                <Text style={styles.locationSubtext}>
                  {selectedLocation
                    ? "Tap elsewhere on the map to move the marker."
                    : "Tap the map to choose your trading location."}
                </Text>
              </View>

              {selectedLocation ? (
                <Pressable style={styles.clearChip} onPress={clearLocation}>
                  <Text style={styles.clearChipText}>Clear</Text>
                </Pressable>
              ) : null}
            </View>

            <View style={styles.mapWrap}>
              <MapView
                style={styles.map}
                region={region}
                onRegionChangeComplete={setRegion}
                onPress={handleMapPress}
              >
                {selectedLocation ? (
                  <Marker coordinate={selectedLocation} />
                ) : null}
              </MapView>

              <View style={styles.mapOverlay}>
                <Text style={styles.mapOverlayText}>
                  {selectedLocation
                    ? "Location selected"
                    : "Tap anywhere on the map"}
                </Text>
              </View>
            </View>
          </View>

          <Pressable
            style={[styles.button, isSaving && styles.buttonDisabled]}
            onPress={handleCreateVendor}
            disabled={isSaving}
          >
            <Text style={styles.buttonText}>
              {isSaving ? "Creating..." : "Create Vendor"}
            </Text>
          </Pressable>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const NAVY = "#0B2A5B";
const ORANGE = "#FF7A00";
const LIGHT_BLUE = "#EAF2FF";
const INPUT_BG = "#F8FBFF";
const TEXT_DARK = "#16335C";
const TEXT_MUTED = "#5D6F8F";
const BORDER = "rgba(255,122,0,0.75)";

const styles = StyleSheet.create({
  keyboardContainer: { flex: 1 },
  container: { flex: 1, backgroundColor: NAVY },
  content: { padding: 20, paddingBottom: 140, flexGrow: 1 },

  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 8,
  },

  subtitle: {
    fontSize: 15,
    color: "rgba(255,255,255,0.8)",
    lineHeight: 22,
    marginBottom: 18,
  },

  card: {
    backgroundColor: LIGHT_BLUE,
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: BORDER,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: TEXT_DARK,
    marginBottom: 12,
  },

  input: {
    backgroundColor: INPUT_BG,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: BORDER,
    color: "#222222",
  },

  textArea: { minHeight: 96 },
  textAreaSmall: { minHeight: 72 },

  locationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 12,
  },

  locationTextWrap: { flex: 1 },

  locationSubtext: {
    fontSize: 13,
    color: TEXT_MUTED,
    lineHeight: 18,
    marginTop: -4,
  },

  clearChip: {
    backgroundColor: "#FFFFFF",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1.5,
    borderColor: BORDER,
  },

  clearChipText: {
    color: TEXT_DARK,
    fontSize: 12,
    fontWeight: "800",
  },

  mapWrap: {
    overflow: "hidden",
    borderRadius: 18,
    borderWidth: 2,
    borderColor: BORDER,
  },

  map: { width: "100%", height: 270 },

  mapOverlay: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 12,
    backgroundColor: "rgba(11,42,91,0.88)",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
  },

  mapOverlayText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
  },

  button: {
    backgroundColor: ORANGE,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 6,
  },

  buttonDisabled: { opacity: 0.7 },

  buttonText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 16,
  },
});