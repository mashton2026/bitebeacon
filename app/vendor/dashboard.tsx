import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { getSubscriptionFeatures } from "../../lib/subscriptionFeatures";
import { supabase } from "../../lib/supabase";
import {
  getCurrentUser,
  signOutCurrentUser,
} from "../../services/authService";
import { getVendorById } from "../../services/vendorService";
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
export default function VendorDashboardScreen() {
  const params = useLocalSearchParams();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [accessChecked, setAccessChecked] = useState(false);
  const [van, setVan] = useState<Van | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [vendorName, setVendorName] = useState("");
  const [cuisine, setCuisine] = useState("");
  const [menu, setMenu] = useState("");
  const [schedule, setSchedule] = useState("");
  const [vendorMessage, setVendorMessage] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [isLive, setIsLive] = useState(false);
  const [foodCategories, setFoodCategories] = useState<string[]>([]);

  useEffect(() => {
    loadDashboard();
  }, [id]);

  async function loadDashboard() {
    setLoading(true);
    setAccessChecked(false);

    const user = await getCurrentUser();

    if (!user) {
      setCurrentUserId(null);
      setVan(null);
      setAccessChecked(true);
      setLoading(false);
      return;
    }

    setCurrentUserId(user.id);

    try {
      const vendor = await getVendorById(id);

      if (!vendor) {
        setVan(null);
        setAccessChecked(true);
        setLoading(false);
        return;
      }

      if (vendor.owner_id !== user.id) {
        setVan(null);
        setAccessChecked(true);
        setLoading(false);
        return;
      }

      setVan(vendor);
      setName(vendor.name);
      setVendorName(vendor.vendorName ?? "");
      setCuisine(vendor.cuisine);
      setMenu(vendor.menu ?? "");
      setSchedule(vendor.schedule ?? "");
      setVendorMessage(vendor.vendorMessage ?? "");
      setPhoto(vendor.photo ?? null);
      setIsLive(vendor.isLive);
      setFoodCategories(vendor.foodCategories ?? []);
      setAccessChecked(true);
      setLoading(false);
    } catch {
      setVan(null);
      setAccessChecked(true);
      setLoading(false);
    }
  }
  function toggleFoodCategory(category: string) {
    setFoodCategories((current) =>
      current.includes(category)
        ? current.filter((item) => item !== category)
        : [...current, category]
    );
  }
  async function pickPhoto() {
    if (!van) return;

    const features = getSubscriptionFeatures(van.subscriptionTier);

    if (!features.images) {
      Alert.alert(
        "Growth plan required",
        "Upgrade to Growth or above to upload listing photos."
      );
      return;
    }

    const permission =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        "Permission needed",
        "Please allow photo library access to upload a vendor photo."
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.7,
      allowsEditing: true,
    });

    if (!result.canceled) {
      setPhoto(result.assets[0].uri);
    }
  }

  async function saveChanges() {
    if (!van) {
      Alert.alert("Vendor not found");
      return;
    }

    const features = getSubscriptionFeatures(van.subscriptionTier);

    if (!name.trim() || !vendorName.trim() || !cuisine.trim()) {
      Alert.alert(
        "Missing details",
        "Please make sure van name, vendor name, and cuisine are filled in."
      );
      return;
    }

    const user = await getCurrentUser();

    if (!user || user.id !== van.owner_id) {
      Alert.alert("Access denied", "You can only edit your own listing.");
      return;
    }

    const { error } = await supabase
      .from("vendors")
      .update({
        name: name.trim(),
        vendor_name: vendorName.trim(),
        cuisine: cuisine.trim(),
        menu: menu.trim() || "Menu coming soon",
        schedule: schedule.trim() || "Schedule coming soon",
        vendor_message: features.reviews ? vendorMessage.trim() : null,
        photo: features.images ? photo : null,
        is_live: features.liveStatus ? isLive : false,
        food_categories: foodCategories,
      })
      .eq("id", van.id);

    if (error) {
      Alert.alert("Save failed", error.message);
      return;
    }

    Alert.alert("Saved", "Your vendor listing has been updated.");

    router.replace({
      pathname: "/vendor/[id]",
      params: {
        id: van.id,
      },
    });
  }

  async function deleteListing() {
    if (!van) return;

    Alert.alert(
      "Delete listing",
      "Are you sure you want to delete this vendor listing?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const user = await getCurrentUser();

            if (!user || user.id !== van.owner_id) {
              Alert.alert(
                "Access denied",
                "You can only delete your own listing."
              );
              return;
            }

            const { error } = await supabase
              .from("vendors")
              .delete()
              .eq("id", van.id);

            if (error) {
              Alert.alert("Delete failed", error.message);
              return;
            }

            Alert.alert("Deleted", "Your vendor listing has been removed.");
            router.replace("/welcome");
          },
        },
      ]
    );
  }

  async function handleLogout() {
    try {
      await signOutCurrentUser();
      router.replace("/welcome");
    } catch (error) {
      Alert.alert(
        "Logout failed",
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  if (
    !loading &&
    accessChecked &&
    (!van || !currentUserId || van.owner_id !== currentUserId)
  ) {
    return (
      <View style={styles.centered}>
        <Text style={styles.notFoundTitle}>Access denied</Text>
        <Text style={styles.subtitle}>
          You can only manage your own vendor listing.
        </Text>

        <Pressable style={styles.secondaryButton} onPress={() => router.back()}>
          <Text style={styles.secondaryButtonText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  if (!van) {
    return null;
  }

  const features = getSubscriptionFeatures(van.subscriptionTier);
  const listingReady = !!menu.trim() && !!schedule.trim();
  const currentPlanLabel =
    van.subscriptionTier === "growth"
      ? "Growth"
      : van.subscriptionTier === "pro"
        ? "Pro"
        : "Free";

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Vendor Dashboard</Text>
      <Text style={styles.subtitle}>
        Manage your listing and keep your profile ready for customers.
      </Text>

      <View style={styles.heroCard}>
        <View style={styles.heroHeaderRow}>
          <View style={styles.heroTextWrap}>
            <Text style={styles.heroTitle}>{van.name}</Text>
            <Text style={styles.heroSubtitle}>{vendorName || van.vendorName}</Text>
          </View>

          <View
            style={[
              styles.statusBadge,
              features.liveStatus
                ? isLive
                  ? styles.statusBadgeLive
                  : styles.statusBadgeOffline
                : styles.statusBadgeListed,
            ]}
          >
            <Text style={styles.statusBadgeText}>
              {features.liveStatus ? (isLive ? "LIVE" : "OFFLINE") : "LISTED"}
            </Text>
          </View>
        </View>

        <Text style={styles.heroMeta}>
          {cuisine || "Cuisine not added yet"} • ⭐ {van.rating.toFixed(1)}
        </Text>

        <Text style={styles.heroSupportText}>
          {listingReady
            ? "Your listing is ready for customers."
            : "Complete your menu and schedule to strengthen your listing."}
        </Text>
      </View>

      <View style={styles.planCard}>
        <Text style={styles.planCardLabel}>Current Plan</Text>
        <Text style={styles.planCardTier}>{currentPlanLabel}</Text>
        <Text style={styles.planCardText}>
          {van.subscriptionTier === "pro"
            ? "You have access to all premium vendor features."
            : van.subscriptionTier === "growth"
              ? "You can use images, live status, analytics, and more."
              : "Upgrade to unlock images, live status, analytics, and premium visibility tools."}
        </Text>
      </View>

      <View style={styles.sectionHeader}>
        {van.subscriptionTier !== "pro" ? (
          <View style={styles.upgradeCard}>
            <Text style={styles.upgradeCardTitle}>
              {van.subscriptionTier === "growth"
                ? "Move up to Pro"
                : "Upgrade your plan"}
            </Text>

            <Text style={styles.upgradeCardText}>
              {van.subscriptionTier === "growth"
                ? "Unlock priority placement, featured status, promotions, and more premium visibility tools."
                : "Unlock images, live status, analytics, and stronger visibility for your listing."}
            </Text>

            <Pressable
              style={styles.upgradeButton}
              onPress={() => router.push("/vendor/upgrade")}
            >
              <Text style={styles.upgradeButtonText}>
                {van.subscriptionTier === "growth"
                  ? "Upgrade to Pro"
                  : "Upgrade to Growth"}
              </Text>
            </Pressable>
          </View>
        ) : null}
        <Text style={styles.sectionTitle}>Performance</Text>
        <Text style={styles.sectionSubtitle}>
          Track how your listing is performing.
        </Text>
      </View>

      {features.analytics ? (
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Rating</Text>
            <Text style={styles.statValue}>{van.rating.toFixed(1)}</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Status</Text>
            <Text style={styles.statValue}>{isLive ? "LIVE" : "OFFLINE"}</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Views</Text>
            <Text style={styles.statValue}>{van.views ?? 0}</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Directions</Text>
            <Text style={styles.statValue}>{van.directions ?? 0}</Text>
          </View>
        </View>
      ) : (
        <View style={styles.lockedCard}>
          <Text style={styles.lockedTitle}>Growth plan required</Text>
          <Text style={styles.lockedText}>
            Upgrade to unlock analytics and track how customers engage with your
            listing.
          </Text>
        </View>
      )}

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Listing Health</Text>
        <Text style={styles.sectionSubtitle}>
          Make sure your listing looks complete and trustworthy.
        </Text>
      </View>

      <View style={styles.healthCard}>
        <Text style={styles.healthSummary}>
          {listingReady ? "Ready to publish" : "Needs attention"}
        </Text>

        <View style={styles.healthRow}>
          <Text style={styles.healthLabel}>Photo</Text>
          <Text style={styles.healthValue}>
            {features.images ? (photo ? "Added" : "Missing") : "Growth required"}
          </Text>
        </View>

        <View style={styles.healthRow}>
          <Text style={styles.healthLabel}>Menu</Text>
          <Text style={styles.healthValue}>
            {menu.trim() ? "Added" : "Missing"}
          </Text>
        </View>

        <View style={styles.healthRow}>
          <Text style={styles.healthLabel}>Schedule</Text>
          <Text style={styles.healthValue}>
            {schedule.trim() ? "Added" : "Missing"}
          </Text>
        </View>

        <View style={styles.healthRowLast}>
          <Text style={styles.healthLabel}>Live Status</Text>
          <Text style={styles.healthValue}>
            {features.liveStatus ? (isLive ? "Enabled" : "Off") : "Growth required"}
          </Text>
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <Text style={styles.sectionSubtitle}>
          Access your most-used tools in one place.
        </Text>
      </View>

      <View style={styles.quickActionsCard}>
        <View style={styles.quickActionsRow}>
          {features.liveStatus ? (
            <Pressable
              style={styles.quickActionButton}
              onPress={() => setIsLive((current) => !current)}
            >
              <Text style={styles.quickActionButtonText}>
                {isLive ? "Go OFFLINE" : "Go LIVE"}
              </Text>
            </Pressable>
          ) : (
            <View style={[styles.quickActionButton, styles.quickActionButtonLocked]}>
              <Text style={styles.quickActionButtonText}>Growth required</Text>
            </View>
          )}

          <Pressable
            style={styles.quickActionButton}
            onPress={() =>
              router.push({
                pathname: "/vendor/[id]",
                params: { id: van.id },
              })
            }
          >
            <Text style={styles.quickActionButtonText}>View Listing</Text>
          </Pressable>
        </View>

        <View style={styles.quickActionsRow}>
          <Pressable
            style={styles.quickActionButton}
            onPress={() =>
              router.push({
                pathname: "/(tabs)/explore",
                params: { highlight: van.id },
              })
            }
          >
            <Text style={styles.quickActionButtonText}>View on Map</Text>
          </Pressable>
          <Pressable
            style={styles.quickActionButton}
            onPress={() =>
              Linking.openURL(
                `https://www.google.com/maps/dir/?api=1&destination=${van.lat},${van.lng}`
              )
            }
          >
            <Text style={styles.quickActionButtonText}>Get Directions</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Edit Listing</Text>
        <Text style={styles.sectionSubtitle}>
          Update the details customers see on your public profile.
        </Text>
      </View>

      <View style={styles.formCard}>
        <Text style={styles.label}>Van name</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Van name"
        />

        <Text style={styles.label}>Vendor name</Text>
        <TextInput
          style={styles.input}
          value={vendorName}
          onChangeText={setVendorName}
          placeholder="Vendor name"
        />

        <Text style={styles.label}>Cuisine</Text>
        <TextInput
          style={styles.input}
          value={cuisine}
          onChangeText={setCuisine}
          placeholder="Cuisine"
        />

        <Text style={styles.label}>Menu</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={menu}
          onChangeText={setMenu}
          placeholder="Menu"
          multiline
        />

        <Text style={styles.label}>Schedule</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={schedule}
          onChangeText={setSchedule}
          placeholder="Weekly schedule"
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

        {features.reviews ? (
          <>
            <Text style={styles.label}>Today’s Update</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={vendorMessage}
              onChangeText={setVendorMessage}
              placeholder="Share a special deal or update for today"
              multiline
              maxLength={140}
            />
          </>
        ) : (
          <View style={styles.lockedCard}>
            <Text style={styles.lockedTitle}>Growth plan required</Text>
            <Text style={styles.lockedText}>
              Upgrade to post daily updates and special deal messages.
            </Text>
          </View>
        )}

        {features.liveStatus ? (
          <View style={styles.liveRow}>
            <Text style={styles.liveLabel}>LIVE NOW</Text>
            <Switch value={isLive} onValueChange={setIsLive} />
          </View>
        ) : (
          <View style={styles.liveRow}>
            <Text style={styles.liveLabel}>LIVE NOW</Text>
            <Text style={styles.liveLockedText}>Growth required</Text>
          </View>
        )}

        {features.images ? (
          <>
            <Pressable style={styles.secondaryButton} onPress={pickPhoto}>
              <Text style={styles.secondaryButtonText}>Upload Photo</Text>
            </Pressable>

            {photo ? (
              <Image source={{ uri: photo }} style={styles.previewImage} />
            ) : null}
          </>
        ) : (
          <View style={styles.lockedCard}>
            <Text style={styles.lockedTitle}>Growth plan required</Text>
            <Text style={styles.lockedText}>
              Upgrade to add a photo to your listing.
            </Text>
          </View>
        )}

        <Pressable style={styles.primaryButton} onPress={saveChanges}>
          <Text style={styles.primaryButtonText}>Save Changes</Text>
        </Pressable>

        <Pressable
          style={styles.secondaryButton}
          onPress={() =>
            router.replace({
              pathname: "/vendor/[id]",
              params: { id: van.id },
            })
          }
        >
          <Text style={styles.secondaryButtonText}>Back to Vendor Page</Text>
        </Pressable>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Account Actions</Text>
        <Text style={styles.sectionSubtitle}>
          Sign out or permanently remove your listing.
        </Text>
      </View>

      <View style={styles.footerCard}>
        <Pressable style={styles.secondaryButton} onPress={handleLogout}>
          <Text style={styles.secondaryButtonText}>Log Out</Text>
        </Pressable>

        <Pressable style={styles.deleteButton} onPress={deleteListing}>
          <Text style={styles.deleteButtonText}>Delete Listing</Text>
        </Pressable>
      </View>
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

  centered: {
    flex: 1,
    backgroundColor: "#F7F4F2",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },

  loadingText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0B2A5B",
  },

  notFoundTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#0B2A5B",
    marginBottom: 16,
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

  heroCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#D9D9D9",
  },

  heroHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 10,
  },

  heroTextWrap: {
    flex: 1,
  },

  heroTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0B2A5B",
    marginBottom: 4,
  },

  heroSubtitle: {
    fontSize: 15,
    color: "#5F6368",
    fontWeight: "600",
  },

  heroMeta: {
    fontSize: 14,
    color: "#444",
    marginBottom: 8,
  },

  heroSupportText: {
    fontSize: 14,
    color: "#5F6368",
    lineHeight: 21,
  },

  planCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#D9D9D9",
  },

  planCardLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#5F6368",
    marginBottom: 4,
  },

  planCardTier: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0B2A5B",
    marginBottom: 6,
  },

  planCardText: {
    fontSize: 14,
    color: "#5F6368",
    lineHeight: 20,
  },

  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },

  statusBadgeLive: {
    backgroundColor: "#1DB954",
  },

  statusBadgeOffline: {
    backgroundColor: "#888888",
  },

  statusBadgeListed: {
    backgroundColor: "#4F6B94",
  },

  statusBadgeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },

  sectionHeader: {
    marginTop: 4,
    marginBottom: 12,
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0B2A5B",
    marginBottom: 4,
  },

  sectionSubtitle: {
    fontSize: 14,
    color: "#5F6368",
    lineHeight: 20,
  },

  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 20,
  },

  statCard: {
    width: "48%",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#D9D9D9",
  },

  statLabel: {
    fontSize: 13,
    color: "#5F6368",
    marginBottom: 6,
    fontWeight: "600",
  },

  statValue: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0B2A5B",
  },
  upgradeCard: {
    backgroundColor: "#0B2A5B",
    borderRadius: 18,
    padding: 18,
    marginBottom: 20,
  },

  upgradeCardTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 6,
  },

  upgradeCardText: {
    fontSize: 14,
    color: "rgba(255,255,255,0.82)",
    lineHeight: 21,
    marginBottom: 14,
  },

  upgradeButton: {
    backgroundColor: "#FF7A00",
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
  },

  upgradeButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },

  lockedCard: {
    backgroundColor: "#FFF3E0",
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: "#FFD8A8",
    marginBottom: 20,
  },

  lockedTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#8A4B00",
    marginBottom: 6,
    textAlign: "center",
  },

  lockedText: {
    fontSize: 14,
    color: "#8A4B00",
    lineHeight: 21,
    textAlign: "center",
  },

  healthCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#D9D9D9",
    marginBottom: 20,
  },

  healthSummary: {
    fontSize: 15,
    color: "#0B2A5B",
    marginBottom: 12,
    fontWeight: "700",
  },

  healthRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#EFEFEF",
  },

  healthRowLast: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 10,
  },

  healthLabel: {
    fontSize: 14,
    color: "#5F6368",
    fontWeight: "600",
  },

  healthValue: {
    fontSize: 14,
    color: "#0B2A5B",
    fontWeight: "700",
  },

  quickActionsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#D9D9D9",
    marginBottom: 20,
  },

  quickActionsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },

  quickActionButton: {
    flex: 1,
    minHeight: 52,
    backgroundColor: "#0B2A5B",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  quickActionButtonLocked: {
    opacity: 0.8,
  },

  quickActionButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
  },

  formCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#D9D9D9",
    marginBottom: 20,
  },

  label: {
    fontSize: 15,
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
    marginBottom: 16,
  },

  textArea: {
    minHeight: 110,
    textAlignVertical: "top",
  },

  liveRow: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D9D9D9",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  liveLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0B2A5B",
  },

  liveLockedText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#8A4B00",
  },

  previewImage: {
    width: "100%",
    height: 200,
    borderRadius: 16,
    marginBottom: 16,
    backgroundColor: "#EAEAEA",
  },

  primaryButton: {
    backgroundColor: "#0B2A5B",
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
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
    marginBottom: 12,
  },

  secondaryButtonText: {
    color: "#222222",
    fontSize: 16,
    fontWeight: "700",
  },

  footerCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#D9D9D9",
  },

  deleteButton: {
    backgroundColor: "#C62828",
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 4,
  },

  deleteButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  checkboxGroup: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 16,
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