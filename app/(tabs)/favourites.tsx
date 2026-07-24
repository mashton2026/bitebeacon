import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import AppText from "../../components/AppText";
import BurgerVanCard from "../../components/BurgerVanCard";
import MapTextureBackground from "../../components/MapTextureBackground";
import PremiumCard from "../../components/PremiumCard";
import PrimaryButton from "../../components/PrimaryButton";
import SecondaryButton from "../../components/SecondaryButton";
import {
  getCurrentUserId,
  getUserFavouriteVendorIds,
} from "../../services/favouritesService";
import { getAllVendors } from "../../services/vendorService";
import { type Van } from "../../types/van";

export default function FavouritesScreen() {
  const [favouriteVans, setFavouriteVans] = useState<Van[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isGuest, setIsGuest] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);

  useFocusEffect(
    useCallback(() => {
      void loadFavourites();
    }, [])
  );

  async function loadFavourites(showRefreshIndicator = false) {
    if (showRefreshIndicator) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setLoadFailed(false);

    try {
      const userId = await getCurrentUserId();

      if (!userId) {
        setIsGuest(true);
        setFavouriteVans([]);
        return;
      }

      setIsGuest(false);

      const favouriteVendorIds =
        await getUserFavouriteVendorIds(userId);

      if (favouriteVendorIds.length === 0) {
        setFavouriteVans([]);
        return;
      }

      const allVendors = await getAllVendors();
      const favouriteVendorIdSet = new Set(favouriteVendorIds);

      const filteredFavourites = allVendors.filter(
        (vendor) =>
          favouriteVendorIdSet.has(vendor.id) &&
          !vendor.isSuspended
      );

      filteredFavourites.sort((firstVendor, secondVendor) =>
        firstVendor.name.localeCompare(secondVendor.name)
      );

      setFavouriteVans(filteredFavourites);
    } catch (error) {
      console.log(
        "Error loading favourites:",
        error instanceof Error ? error.message : "Unknown error"
      );

      setFavouriteVans([]);
      setLoadFailed(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  function handleRefresh() {
    void loadFavourites(true);
  }

  function handleLogin() {
    router.push("/auth/user-login");
  }

  function handleCreateAccount() {
    router.push("/auth/user-signup");
  }

  function handleExplore() {
    router.push("/(tabs)/explore");
  }

  function renderEmptyState() {
    let iconName:
      | "heart-search"
      | "account-heart-outline"
      | "alert-circle-outline"
      | "heart-outline" = "heart-outline";

    let eyebrow = "YOUR COLLECTION";
    let title = "No favourites saved yet";
    let description =
      "Save a food business from its listing and it will appear here for you to find again.";

    if (loading) {
      iconName = "heart-search";
      eyebrow = "LOADING";
      title = "Finding your favourites";
      description =
        "Please wait while we load the food businesses you have saved.";
    } else if (loadFailed) {
      iconName = "alert-circle-outline";
      eyebrow = "SOMETHING WENT WRONG";
      title = "We couldn’t load your favourites";
      description =
        "Check your connection and try loading your saved businesses again.";
    } else if (isGuest) {
      iconName = "account-heart-outline";
      eyebrow = "SAVE YOUR FAVOURITES";
      title = "Keep your best finds";
      description =
        "Log in or create a free account to save food businesses and return to them whenever you like.";
    }

    return (
      <View style={styles.emptyStateWrapper}>
        <PremiumCard>
          <View style={styles.emptyStateContent}>
            <View style={styles.emptyIconOuter}>
              <View style={styles.emptyIconInner}>
                <MaterialCommunityIcons
                  name={iconName}
                  size={38}
                  color="#F4B547"
                />
              </View>
            </View>

            <AppText variant="label" style={styles.emptyEyebrow}>
              {eyebrow}
            </AppText>

            <AppText variant="heading" style={styles.emptyStateTitle}>
              {title}
            </AppText>

            <View style={styles.emptyDivider} />

            <AppText variant="body" style={styles.emptyStateText}>
              {description}
            </AppText>

            {!loading && isGuest && !loadFailed ? (
              <View style={styles.actionSection}>
                <PrimaryButton
                  onPress={handleLogin}
                  style={styles.actionButton}
                >
                  Log In
                </PrimaryButton>

                <SecondaryButton
                  onPress={handleCreateAccount}
                  style={styles.secondaryActionButton}
                >
                  Create Account
                </SecondaryButton>
              </View>
            ) : null}

            {!loading && !isGuest && !loadFailed ? (
              <View style={styles.actionSection}>
                <PrimaryButton
                  onPress={handleExplore}
                  style={styles.actionButton}
                >
                  Explore Food Businesses
                </PrimaryButton>
              </View>
            ) : null}

            {!loading && loadFailed ? (
              <View style={styles.actionSection}>
                <PrimaryButton
                  onPress={() => void loadFavourites()}
                  style={styles.actionButton}
                >
                  Try Again
                </PrimaryButton>
              </View>
            ) : null}
          </View>
        </PremiumCard>
      </View>
    );
  }

  return (
    <MapTextureBackground>
      <SafeAreaView style={styles.safeArea}>
        <FlatList
          data={favouriteVans}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.listContent,
            favouriteVans.length === 0 && styles.emptyListContent,
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#F4B547"
              colors={["#F4B547"]}
              progressBackgroundColor="#101820"
            />
          }
          ListHeaderComponent={
            <View style={styles.header}>
              <View style={styles.headerTopRow}>
                <View style={styles.headerIconGlow}>
                  <View style={styles.headerIcon}>
                    <MaterialCommunityIcons
                      name="heart"
                      size={30}
                      color="#F4B547"
                    />
                  </View>
                </View>

                {!loading && !isGuest ? (
                  <View style={styles.countBadge}>
                    <AppText
                      variant="bodyBold"
                      style={styles.countNumber}
                    >
                      {favouriteVans.length}
                    </AppText>

                    <AppText
                      variant="body"
                      style={styles.countLabel}
                    >
                      {favouriteVans.length === 1
                        ? "saved"
                        : "saved"}
                    </AppText>
                  </View>
                ) : null}
              </View>

              <AppText variant="label" style={styles.headerEyebrow}>
                YOUR SAVED PLACES
              </AppText>

              <AppText variant="heading" style={styles.title}>
                Your Favourites
              </AppText>

              <AppText variant="body" style={styles.subtitle}>
                Keep your favourite food businesses close and find them
                again whenever hunger strikes.
              </AppText>

              <View style={styles.headerDivider}>
                <View style={styles.headerDividerGlow} />
              </View>
            </View>
          }
          ListEmptyComponent={renderEmptyState}
          ItemSeparatorComponent={() => (
            <View style={styles.cardSeparator} />
          )}
          renderItem={({ item }) => (
            <View style={styles.vendorCardWrapper}>
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
            </View>
          )}
        />
      </SafeAreaView>
    </MapTextureBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "transparent",
  },

  listContent: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 110,
  },

  emptyListContent: {
    flexGrow: 1,
  },

  header: {
    marginBottom: 24,
  },

  headerTopRow: {
    minHeight: 66,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },

  headerIconGlow: {
    borderRadius: 31,

    shadowColor: "#FF9C24",
    shadowOpacity: 0.35,
    shadowRadius: 15,
    shadowOffset: {
      width: 0,
      height: 0,
    },

    elevation: 7,
  },

  headerIcon: {
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,122,0,0.09)",
    borderWidth: 1,
    borderColor: "rgba(255,181,71,0.36)",
  },

  countBadge: {
    minWidth: 72,
    minHeight: 48,
    borderRadius: 18,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "rgba(5,13,22,0.74)",
    borderWidth: 1,
    borderColor: "rgba(255,181,71,0.28)",
  },

  countNumber: {
    color: "#F4B547",
    fontSize: 17,
  },

  countLabel: {
    color: "rgba(255,255,255,0.56)",
    fontSize: 10,
  },

  headerEyebrow: {
    color: "#F4B547",
    fontSize: 10,
    letterSpacing: 2.5,
    marginBottom: 7,
  },

  title: {
    color: "#FFFFFF",
    fontSize: 31,
    lineHeight: 37,
  },

  subtitle: {
    maxWidth: 360,
    color: "rgba(255,255,255,0.7)",
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
  },

  headerDivider: {
    width: 150,
    height: 10,
    justifyContent: "center",
    marginTop: 15,
  },

  headerDividerGlow: {
    width: 46,
    height: 3,
    borderRadius: 999,
    backgroundColor: "#F4B547",

    shadowColor: "#FF9C24",
    shadowOpacity: 0.72,
    shadowRadius: 9,
    shadowOffset: {
      width: 0,
      height: 0,
    },

    elevation: 6,
  },

  emptyStateWrapper: {
    flex: 1,
    justifyContent: "center",
    paddingTop: 8,
    paddingBottom: 30,
  },

  emptyStateContent: {
    alignItems: "center",
    paddingVertical: 4,
  },

  emptyIconOuter: {
    width: 94,
    height: 94,
    borderRadius: 47,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,122,0,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,181,71,0.18)",
    marginBottom: 21,

    shadowColor: "#FF9C24",
    shadowOpacity: 0.2,
    shadowRadius: 15,
    shadowOffset: {
      width: 0,
      height: 0,
    },

    elevation: 5,
  },

  emptyIconInner: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,122,0,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,181,71,0.3)",
  },

  emptyEyebrow: {
    color: "#F4B547",
    fontSize: 9.5,
    letterSpacing: 2.2,
    textAlign: "center",
    marginBottom: 9,
  },

  emptyStateTitle: {
    maxWidth: 300,
    color: "#FFFFFF",
    fontSize: 24,
    lineHeight: 30,
    textAlign: "center",
  },

  emptyDivider: {
    width: 38,
    height: 2.5,
    borderRadius: 999,
    backgroundColor: "#F4B547",
    marginTop: 14,
    marginBottom: 15,

    shadowColor: "#FF9C24",
    shadowOpacity: 0.55,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 0,
    },

    elevation: 5,
  },

  emptyStateText: {
    maxWidth: 310,
    color: "rgba(255,255,255,0.66)",
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
  },

  actionSection: {
    width: "100%",
    marginTop: 22,
  },

  actionButton: {
    width: "100%",
  },

  secondaryActionButton: {
    width: "100%",
    marginTop: 11,
  },

  vendorCardWrapper: {
    borderRadius: 22,

    shadowColor: "#FF9C24",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 4,
    },

    elevation: 3,
  },

  cardSeparator: {
    height: 14,
  },
});