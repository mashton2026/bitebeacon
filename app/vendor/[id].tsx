import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import {
  Alert,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { getSubscriptionFeatures } from "../../lib/subscriptionFeatures";
import { supabase } from "../../lib/supabase";
import {
  addFavourite,
  getCurrentUserId,
  isVendorFavourite,
  removeFavourite,
} from "../../services/favouritesService";
import {
  getVendorById,
  incrementVendorDirections,
  setVendorLiveStatus,
} from "../../services/vendorService";
import { type Van } from "../../types/van";

export default function VendorScreen() {
  const params = useLocalSearchParams();
  const id = params.id as string;

  const [van, setVan] = useState<Van | null>(null);
  const [isSavingFavourite, setIsSavingFavourite] = useState(false);
  const [isFavourite, setIsFavourite] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      async function loadScreen() {
        await loadCurrentUser();
        await loadVan();
        await checkIfFavourite();
      }

      loadScreen();
    }, [id])
  );

  async function loadCurrentUser() {
    const { data, error } = await supabase.auth.getUser();

    if (error || !data.user) {
      setCurrentUserId(null);
      return;
    }

    setCurrentUserId(data.user.id);
  }

  async function loadVan() {
    try {
      const vendor = await getVendorById(id);

      if (!vendor) {
        setVan(null);
        return;
      }

      setVan(vendor);
    } catch (error) {
      console.log(
        "Error loading vendor:",
        error instanceof Error ? error.message : "Unknown error"
      );
      setVan(null);
    }
  }

  async function checkIfFavourite() {
    try {
      const userId = await getCurrentUserId();

      if (!userId) {
        setIsFavourite(false);
        return;
      }

      const favourite = await isVendorFavourite(userId, id);
      setIsFavourite(favourite);
    } catch (error) {
      console.log(
        "Error checking favourite:",
        error instanceof Error ? error.message : "Unknown error"
      );
      setIsFavourite(false);
    }
  }

  async function toggleLive() {
    if (!van) return;

    const newStatus = !van.isLive;

    try {
      await setVendorLiveStatus(van.id, newStatus);

      setVan({ ...van, isLive: newStatus });

      Alert.alert(newStatus ? "Vendor is now LIVE" : "Vendor is now OFFLINE");
    } catch (error) {
      Alert.alert(
        "Error updating vendor status",
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }

  async function openDirections() {
    if (!van) return;

    try {
      const nextDirections = await incrementVendorDirections(
        van.id,
        van.directions ?? 0
      );

      setVan({ ...van, directions: nextDirections });

      const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${van.lat},${van.lng}`;
      Linking.openURL(mapsUrl);
    } catch (error) {
      console.log(
        "Error updating directions:",
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }

  async function toggleFavourite() {
    if (!van) return;

    setIsSavingFavourite(true);

    try {
      const userId = await getCurrentUserId();

      if (!userId) {
        Alert.alert(
          "Login required",
          "Please log in or create an account to save favourites."
        );
        return;
      }

      if (isFavourite) {
        await removeFavourite(userId, van.id);
        setIsFavourite(false);
        Alert.alert("Removed", "This vendor has been removed from your favourites.");
        return;
      }

      const alreadyFavourite = await isVendorFavourite(userId, van.id);

      if (alreadyFavourite) {
        setIsFavourite(true);
        Alert.alert("Already saved", "This vendor is already in your favourites.");
        return;
      }

      await addFavourite(userId, van.id);
      setIsFavourite(true);
      Alert.alert("Saved", "This vendor has been added to your favourites.");
    } catch (error) {
      Alert.alert(
        isFavourite ? "Remove failed" : "Save failed",
        error instanceof Error ? error.message : "Unknown error"
      );
    } finally {
      setIsSavingFavourite(false);
    }
  }

  if (!van) {
    return (
      <View style={styles.container}>
        <Text style={styles.notFound}>Vendor not found</Text>

        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const isOwner = !!currentUserId && van.owner_id === currentUserId;
  const features = getSubscriptionFeatures(van.subscriptionTier);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>{van.name}</Text>

        {van.subscriptionTier === "pro" ? (
          <View style={styles.featuredBadge}>
            <Text style={styles.featuredBadgeText}>FEATURED</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.statusRow}>
        <Text style={styles.meta}>{van.cuisine}</Text>

        <Text
          style={[
            styles.statusBadge,
            features.liveStatus
              ? van.isLive
                ? styles.statusGreen
                : styles.statusGray
              : styles.statusGray,
          ]}
        >
          {features.liveStatus ? (van.isLive ? "LIVE" : "OFFLINE") : "LISTED"}
        </Text>
      </View>

      {features.images && van.photo ? (
        <Image source={{ uri: van.photo }} style={styles.image} />
      ) : null}

      {isOwner ? (
        <View style={styles.ownerNotice}>
          <Text style={styles.ownerNoticeText}>
            You are viewing your own listing.
          </Text>
        </View>
      ) : null}
      {van.subscriptionTier === "growth" ? (
        <View style={styles.planHighlightCard}>
          <Text style={styles.planHighlightTitle}>Growth Vendor</Text>
          <Text style={styles.planHighlightText}>
            This vendor has unlocked richer listing features on BiteBeacon.
          </Text>
        </View>
      ) : van.subscriptionTier === "pro" ? (
        <View style={styles.planHighlightCard}>
          <Text style={styles.planHighlightTitle}>Featured Vendor</Text>
          <Text style={styles.planHighlightText}>
            This vendor is part of BiteBeacon Pro and receives premium visibility.
          </Text>
        </View>
      ) : null}
      {features.reviews && van.vendorMessage ? (
        <View style={styles.announcementCard}>
          <Text style={styles.announcementTitle}>Today’s Update</Text>
          <Text style={styles.announcementText}>{van.vendorMessage}</Text>
        </View>
      ) : null}
      <Text style={styles.sectionTitle}>Vendor</Text>
      <View style={styles.infoCard}>
        <Text style={styles.text}>{van.vendorName}</Text>
      </View>

      <Text style={styles.sectionTitle}>Menu</Text>
      <View style={styles.infoCard}>
        <Text style={styles.text}>{van.menu}</Text>
      </View>

      <Text style={styles.sectionTitle}>Schedule</Text>
      <View style={styles.infoCard}>
        <Text style={styles.text}>{van.schedule}</Text>
      </View>

      {isOwner ? (
        <>
          {features.liveStatus ? (
            <Pressable
              style={[
                styles.liveButton,
                van.isLive ? styles.liveActive : styles.liveInactive,
              ]}
              onPress={toggleLive}
            >
              <Text style={styles.liveText}>
                {van.isLive ? "LIVE NOW" : "GO LIVE"}
              </Text>
            </Pressable>
          ) : null}

          <Pressable style={styles.manageButton} onPress={openDirections}>
            <Text style={styles.manageButtonText}>Get Directions</Text>
          </Pressable>

          <Pressable
            style={styles.manageButton}
            onPress={() =>
              router.push({
                pathname: "/vendor/dashboard",
                params: { id: van.id },
              })
            }
          >
            <Text style={styles.manageButtonText}>Manage Listing</Text>
          </Pressable>
        </>
      ) : (
        <>
          <Pressable style={styles.manageButton} onPress={openDirections}>
            <Text style={styles.manageButtonText}>Get Directions</Text>
          </Pressable>

          <Pressable
            style={[
              styles.manageButton,
              isSavingFavourite && styles.disabledButton,
            ]}
            onPress={toggleFavourite}
            disabled={isSavingFavourite}
          >
            <Text style={styles.manageButtonText}>
              {isSavingFavourite
                ? "Updating..."
                : isFavourite
                  ? "★ Saved to Favourites"
                  : "☆ Save to Favourites"}
            </Text>
          </Pressable>
        </>
      )}

      <Pressable style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backText}>Back</Text>
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
    paddingBottom: 40,
  },

  notFound: {
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 20,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 10,
  },

  featuredBadge: {
    backgroundColor: "#FF7A00",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },

  featuredBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
  },

  title: {
    fontSize: 30,
    fontWeight: "800",
    marginBottom: 10,
    color: "#0B2A5B",
  },

  meta: {
    fontSize: 16,
    color: "#666",
    marginBottom: 20,
  },

  image: {
    width: "100%",
    height: 220,
    borderRadius: 18,
    marginBottom: 20,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginTop: 18,
    marginBottom: 8,
  },

  text: {
    fontSize: 15,
    lineHeight: 22,
  },

  liveButton: {
    marginTop: 30,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
  },

  liveActive: {
    backgroundColor: "#1DB954",
  },

  liveInactive: {
    backgroundColor: "#999",
  },

  liveText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },

  manageButton: {
    marginTop: 14,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
    backgroundColor: "#0B2A5B",
  },
  disabledButton: {
    opacity: 0.7,
  },

  manageButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },

  backButton: {
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
    backgroundColor: "#D9D9D9",
  },

  backText: {
    fontWeight: "700",
  },

  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },

  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    color: "#fff",
    fontWeight: "700",
  },

  statusGreen: {
    backgroundColor: "#1DB954",
  },

  statusGray: {
    backgroundColor: "#888",
  },

  announcementCard: {
    backgroundColor: "#FFF8E1",
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#FFD54F",
  },

  announcementTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#8A4B00",
    marginBottom: 6,
  },

  announcementText: {
    fontSize: 14,
    color: "#6D4C00",
    lineHeight: 20,
  },

  planHighlightCard: {
    backgroundColor: "#FFF3E0",
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#FFD8A8",
  },

  planHighlightTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#8A4B00",
    marginBottom: 4,
  },

  planHighlightText: {
    fontSize: 14,
    color: "#8A4B00",
    lineHeight: 20,
  },

  infoCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    marginTop: 4,
  },
  ownerNotice: {
    backgroundColor: "#E8F0FE",
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
  },

  ownerNoticeText: {
    color: "#0B2A5B",
    fontWeight: "600",
  },
});