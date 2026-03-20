import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { getCurrentUser } from "../../services/authService";
import { createVendor, getVendorByOwnerId } from "../../services/vendorService";
import { type Van } from "../../types/van";
const FOOD_CATEGORY_OPTIONS = [
  "Burgers",
  "Smash Burgers",
  "BBQ",
  "Vegan",
  "Vegetarian",
  "Desserts",
  "Coffee",
];
export default function RegisterVendorScreen() {
  const params = useLocalSearchParams();

  const [vanName, setVanName] = useState((params.vanName as string) ?? "");
  const [vendorName, setVendorName] = useState(
    (params.vendorName as string) ?? ""
  );
  const [cuisine, setCuisine] = useState((params.cuisine as string) ?? "");
  const [menu, setMenu] = useState((params.menu as string) ?? "");
  const [schedule, setSchedule] = useState((params.schedule as string) ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [foodCategories, setFoodCategories] = useState<string[]>(() => {
    const raw = params.foodCategories as string | undefined;

    if (!raw) return [];

    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  });

  const hasSelectedLocation = !!params.lat && !!params.lng;

  function toggleFoodCategory(category: string) {
    setFoodCategories((current) =>
      current.includes(category)
        ? current.filter((item) => item !== category)
        : [...current, category]
    );
  }
  async function handleRegister() {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      if (!vanName.trim() || !vendorName.trim() || !cuisine.trim()) {
        Alert.alert(
          "Missing details",
          "Please add the van name, vendor name, and cuisine."
        );
        return;
      }

      if (!params.lat || !params.lng) {
        Alert.alert("Location required", "Please choose a location on the map.");
        return;
      }

      const lat = Number(params.lat);
      const lng = Number(params.lng);

      if (Number.isNaN(lat) || Number.isNaN(lng)) {
        Alert.alert(
          "Invalid coordinates",
          "Please enter valid latitude and longitude values."
        );
        return;
      }

      const user = await getCurrentUser();

      if (!user) {
        Alert.alert("Login required", "Please log in as a vendor first.");
        return;
      }

      const existingVendor = await getVendorByOwnerId(user.id);

      if (existingVendor) {
        Alert.alert(
          "Vendor listing already exists",
          "You already have a vendor listing. You will be taken to your dashboard."
        );

        router.replace({
          pathname: "/vendor/dashboard",
          params: { id: existingVendor.id },
        });
        return;
      }

      const claimId = params.claimId as string | undefined;

      const newVan: Van = {
        id: claimId ? `custom-${claimId}` : `custom-${Date.now()}`,
        name: vanName.trim(),
        vendorName: vendorName.trim(),
        cuisine: cuisine.trim(),
        menu: menu.trim() || "Menu coming soon",
        schedule: schedule.trim() || "Schedule coming soon",
        lat,
        lng,
        rating: 0,
        temporary: false,
        photo: (params.photo as string) || null,
        isLive: false,
        owner_id: user.id,
        views: 0,
        directions: 0,
        foodCategories,
      };

      try {
        await createVendor({
          id: newVan.id,
          name: newVan.name,
          vendorName: newVan.vendorName ?? "",
          cuisine: newVan.cuisine,
          menu: newVan.menu ?? "",
          schedule: newVan.schedule ?? "",
          lat: newVan.lat,
          lng: newVan.lng,
          photo: newVan.photo ?? null,
          temporary: newVan.temporary ?? false,
          isLive: newVan.isLive,
          owner_id: newVan.owner_id ?? null,
          views: newVan.views ?? 0,
          directions: newVan.directions ?? 0,
          rating: newVan.rating,
          foodCategories: newVan.foodCategories ?? [],
        });
      } catch (error) {
        Alert.alert(
          "Save failed",
          error instanceof Error ? error.message : "Unknown error"
        );
        return;
      }

      Alert.alert("Vendor registered", "Your van has been added to BiteBeacon.");

      router.replace({
        pathname: "/vendor/dashboard",
        params: { id: newVan.id },
      });
    } finally {
      setIsSubmitting(false);
    }
  }
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>
        {params.claimId ? "Claim This Burger Van" : "Create Your Vendor Listing"}
      </Text>

      <Text style={styles.subtitle}>
        {params.claimId
          ? "Complete the details below to turn this spotted van into your official BiteBeacon listing."
          : "Set up your food vendor profile so customers can discover you on BiteBeacon."}
      </Text>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Business Details</Text>
        <Text style={styles.sectionText}>
          Add the main information customers will use to identify your food van.
        </Text>

        <Text style={styles.label}>Van name</Text>
        <TextInput
          style={styles.input}
          placeholder="Van name"
          value={vanName}
          onChangeText={setVanName}
        />

        <Text style={styles.label}>Vendor name</Text>
        <TextInput
          style={styles.input}
          placeholder="Vendor name"
          value={vendorName}
          onChangeText={setVendorName}
        />

        <Text style={styles.label}>Cuisine</Text>
        <TextInput
          style={styles.input}
          placeholder="Cuisine"
          value={cuisine}
          onChangeText={setCuisine}
        />
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Listing Details</Text>
        <Text style={styles.sectionText}>
          These details help customers decide whether to visit your van.
        </Text>

        <Text style={styles.label}>Menu</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Menu"
          value={menu}
          onChangeText={setMenu}
          multiline
        />

        <Text style={styles.label}>Weekly schedule</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Weekly schedule"
          value={schedule}
          onChangeText={setSchedule}
          multiline
        />
        <Text style={styles.label}>Food categories</Text>
        <View style={styles.checkboxGroup}>
          {FOOD_CATEGORY_OPTIONS.map((category) => {
            const isSelected = foodCategories.includes(category);

            return (
              <Pressable
                key={category}
                style={[
                  styles.checkboxChip,
                  isSelected && styles.checkboxChipSelected,
                ]}
                onPress={() => toggleFoodCategory(category)}
              >
                <Text
                  style={[
                    styles.checkboxChipText,
                    isSelected && styles.checkboxChipTextSelected,
                  ]}
                >
                  {isSelected ? "✓ " : ""}{category}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Location</Text>
        <Text style={styles.sectionText}>
          Choose where customers will find your van on the map.
        </Text>

        <Pressable
          style={styles.locationButton}
          onPress={() =>
            router.push({
              pathname: "/vendor/pick-location",
              params: {
                vanName,
                vendorName,
                cuisine,
                menu,
                schedule,
                claimId: (params.claimId as string) ?? "",
                photo: (params.photo as string) ?? "",
                foodCategories: JSON.stringify(foodCategories),
                lat: (params.lat as string) ?? "",
                lng: (params.lng as string) ?? "",
              },
            })
          }
        >
          <Text style={styles.locationButtonText}>Choose Location on Map</Text>
        </Pressable>

        <View
          style={[
            styles.locationStatusCard,
            hasSelectedLocation
              ? styles.locationStatusSuccess
              : styles.locationStatusPending,
          ]}
        >
          <Text style={styles.locationStatusTitle}>
            {hasSelectedLocation ? "Location selected" : "Location needed"}
          </Text>
          <Text style={styles.locationStatusText}>
            {hasSelectedLocation
              ? params.claimId
                ? "The spotted van location is ready to use."
                : "Your vendor listing location has been set."
              : "Please choose your location before creating the listing."}
          </Text>
        </View>
      </View>

      <Pressable
        style={styles.primaryButton}
        onPress={handleRegister}
        disabled={isSubmitting}
      >
        <Text style={styles.primaryButtonText}>
          {isSubmitting
            ? "Submitting..."
            : params.claimId
              ? "Claim Vendor Listing"
              : "Create Vendor Listing"}
        </Text>
      </Pressable>
      
      <Pressable style={styles.secondaryButton} onPress={() => router.back()}>
        <Text style={styles.secondaryButtonText}>Cancel</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F4F2",
  },

  content: {
    padding: 24,
    paddingTop: 40,
    paddingBottom: 40,
  },

  title: {
    fontSize: 30,
    fontWeight: "800",
    color: "#0B2A5B",
    marginBottom: 8,
  },

  subtitle: {
    fontSize: 15,
    color: "#5F6368",
    marginBottom: 24,
    lineHeight: 22,
  },

  sectionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 18,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "#E5E5E5",
  },

  sectionTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: "#0B2A5B",
    marginBottom: 6,
  },

  sectionText: {
    fontSize: 14,
    color: "#5F6368",
    lineHeight: 21,
    marginBottom: 16,
  },

  label: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0B2A5B",
    marginBottom: 8,
  },

  input: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D9D9D9",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 14,
  },

  textArea: {
    minHeight: 110,
    textAlignVertical: "top",
  },

  locationButton: {
    backgroundColor: "#0B2A5B",
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
    marginBottom: 14,
  },

  locationButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },

  locationStatusCard: {
    borderRadius: 14,
    padding: 14,
  },

  locationStatusPending: {
    backgroundColor: "#FFF3E0",
  },

  locationStatusSuccess: {
    backgroundColor: "#E8F5E9",
  },

  locationStatusTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0B2A5B",
    marginBottom: 4,
  },

  locationStatusText: {
    fontSize: 14,
    color: "#444",
    lineHeight: 20,
  },

  primaryButton: {
    backgroundColor: "#0B2A5B",
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 6,
    marginBottom: 12,
  },

  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },

  secondaryButton: {
    backgroundColor: "#D9D9D9",
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
  },

  secondaryButtonText: {
    color: "#222222",
    fontSize: 16,
    fontWeight: "700",
  },
  checkboxGroup: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 8,
  },

  checkboxChip: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D9D9D9",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },

  checkboxChipSelected: {
    backgroundColor: "#0B2A5B",
    borderColor: "#0B2A5B",
  },

  checkboxChipText: {
    color: "#0B2A5B",
    fontSize: 14,
    fontWeight: "700",
  },

  checkboxChipTextSelected: {
    color: "#FFFFFF",
  },
});