import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import BurgerVanCard from "../../components/BurgerVanCard";
import { theme } from "../../constants/theme";
import {
  getCurrentUserId,
  getUserFavouriteVendorIds,
} from "../../services/favouritesService";
import { getAllVendors } from "../../services/vendorService";
import { type Van } from "../../types/van";

export default function FavouritesScreen() {
  const [favouriteVans, setFavouriteVans] = useState<Van[]>([]);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadFavourites();
    }, [])
  );

  async function loadFavourites() {
    setLoading(true);

    try {
      const userId = await getCurrentUserId();

      if (!userId) {
        setIsGuest(true);
        setFavouriteVans([]);
        return;
      }

      setIsGuest(false);

      const favouriteVendorIds = await getUserFavouriteVendorIds(userId);

      if (favouriteVendorIds.length === 0) {
        setFavouriteVans([]);
        return;
      }

      const allVendors = await getAllVendors();

      const filteredFavourites = allVendors.filter((vendor) =>
        favouriteVendorIds.includes(vendor.id)
      );

      setFavouriteVans(filteredFavourites);
    } catch (error) {
      console.log(
        "Error loading favourites:",
        error instanceof Error ? error.message : "Unknown error"
      );
      setFavouriteVans([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={favouriteVans}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>Your Favourites</Text>
            <Text style={styles.subtitle}>
              Keep track of food vendors you want to come back to.
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateTitle}>
              {loading
                ? "Loading favourites..."
                : isGuest
                ? "Save favourites with an account"
                : "No favourites yet"}
            </Text>

            <Text style={styles.emptyStateText}>
              {loading
                ? "Please wait while we load your saved vendors."
                : isGuest
                ? "Log in or create an account to save vendors and access them here any time."
                : "When you save a vendor from its page, it will appear here."}
            </Text>

            {!loading && isGuest ? (
              <View style={styles.actionRow}>
                <Pressable
                  style={styles.primaryActionButton}
                  onPress={() => router.push("/auth/user-login")}
                >
                  <Text style={styles.primaryActionButtonText}>User Login</Text>
                </Pressable>

                <Pressable
                  style={styles.secondaryActionButton}
                  onPress={() => router.push("/auth/user-signup")}
                >
                  <Text style={styles.secondaryActionButtonText}>
                    Create Account
                  </Text>
                </Pressable>
              </View>
            ) : null}

            {!loading && !isGuest ? (
              <Pressable
                style={styles.primaryActionButton}
                onPress={() => router.push("/(tabs)/explore")}
              >
                <Text style={styles.primaryActionButtonText}>
                  Explore Vendors
                </Text>
              </Pressable>
            ) : null}
          </View>
        }
        renderItem={({ item }) => (
          <BurgerVanCard
            id={item.id}
            name={item.name}
            cuisine={item.cuisine}
            rating={item.rating}
            isLive={item.isLive}
            temporary={item.temporary}
            subscriptionTier={item.subscriptionTier}
            vendorMessage={item.vendorMessage}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },

  listContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
  },

  header: {
    marginBottom: 20,
  },

  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 8,
  },

  subtitle: {
    fontSize: 15,
    color: "rgba(255,255,255,0.75)",
  },

  emptyState: {
    paddingVertical: 48,
    alignItems: "center",
    justifyContent: "center",
  },

  emptyStateTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 10,
    textAlign: "center",
  },

  emptyStateText: {
    fontSize: 14,
    color: "rgba(255,255,255,0.72)",
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 300,
  },

  actionRow: {
    width: "100%",
    gap: 12,
    marginTop: 18,
  },

  primaryActionButton: {
    backgroundColor: "#FFFFFF",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 18,
    minWidth: 180,
  },

  primaryActionButtonText: {
    color: "#0B2A5B",
    fontWeight: "700",
  },

  secondaryActionButton: {
    backgroundColor: "#FF7A00",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 14,
    alignItems: "center",
    minWidth: 180,
  },

  secondaryActionButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
});