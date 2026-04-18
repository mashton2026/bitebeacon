import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useRef, useState } from "react";
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
import {
  getSubscriptionFeatures,
  isFreeTier,
  isProTier,
} from "../../lib/subscriptionFeatures";
import { ensureHttps } from "../../lib/url";
import {
  getCurrentUser,
  getCurrentUserVendor,
} from "../../services/authService";
import {
  addFavourite,
  getCurrentUserId,
  isVendorFavourite,
  removeFavourite,
} from "../../services/favouritesService";
import { getVendorMenuPdfSignedUrl } from "../../services/storageService";
import {
  canCountVendorInteraction,
  getUserVendorRating,
  getVendorById,
  getVendorRatingCount,
  incrementVendorDirections,
  incrementVendorViews,
  recordVendorInteraction,
  refreshVendorRating,
  setVendorLiveStatus,
  upsertVendorRating,
  adminDeleteVendor,
} from "../../services/vendorService";
import { type Van } from "../../types/van";

type AssetAwareVan = Van & {
  photos?: string[];
  menuPdfUrl?: string | null;
  menuPdfName?: string | null;
  logoUrl?: string | null;
  logoPath?: string | null;
};

const vendorCache = new Map<string, AssetAwareVan>();

const NAVY = "#061A38";
const NAVY_DARK = "#0A2347";
const PANEL = "#14386E";
const PANEL_DEEP = "#1A3F77";
const PANEL_ALT = "#1A315C";
const ORANGE = "#FF7A00";
const ORANGE_SOFT = "#FFB067";
const WHITE = "#FFFFFF";
const TEXT_MUTED = "rgba(255,255,255,0.72)";
const GREEN = "#1DB954";
const OFFLINE = "#6F84AA";

function getExpiryText(expiresAt?: string | null) {
  if (!expiresAt) return null;

  const now = new Date();
  const expiry = new Date(expiresAt);
  const diffMs = expiry.getTime() - now.getTime();

  if (diffMs <= 0) return "Expired";

  const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  if (days === 1) return "Expires in 1 day";
  return `Expires in ${days} days`;
}

export default function VendorScreen() {
  const params = useLocalSearchParams();
  const id = params.id as string;

  const [van, setVan] = useState<AssetAwareVan | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSavingFavourite, setIsSavingFavourite] = useState(false);
  const [isFavourite, setIsFavourite] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isCurrentUserVendorAccount, setIsCurrentUserVendorAccount] =
    useState(false);
  const [userRating, setUserRating] = useState<number | null>(null);
  const [ratingCount, setRatingCount] = useState(0);
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);
  const [isTogglingLive, setIsTogglingLive] = useState(false);
  const [isOpeningMenuPdf, setIsOpeningMenuPdf] = useState(false);
  const [isOpeningDirections, setIsOpeningDirections] = useState(false);

  const activeVendorIdRef = useRef(id);

  function updateVanState(
    updater: (previous: AssetAwareVan | null) => AssetAwareVan | null
  ) {
    setVan((previous) => {
      const next = updater(previous);

      if (next) {
        vendorCache.set(id, next);
      } else {
        vendorCache.delete(id);
      }

      return next;
    });
  }

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      activeVendorIdRef.current = id;

      async function loadScreen() {
        setLoading(true);

        try {
          const userId = await loadCurrentUser(isActive);

          await loadVan(userId, isActive);

          void loadUserRating(userId, isActive);
          void loadRatingCount(isActive);
          void checkIfFavourite(userId, isActive);
          void loadCurrentUserVendorState(userId, isActive);
        } finally {
          if (isActive) {
            setLoading(false);
          }
        }
      }

      void loadScreen();

      return () => {
        isActive = false;
      };
    }, [id])
  );

  async function loadCurrentUser(isActive: boolean) {
    const user = await getCurrentUser();

    if (!isActive) return null;

    if (!user) {
      setCurrentUserId(null);
      return null;
    }

    setCurrentUserId(user.id);
    return user.id;
  }

  async function loadCurrentUserVendorState(
    userId?: string | null,
    isActive = true
  ) {
    try {
      if (!userId) {
        if (isActive) {
          setIsCurrentUserVendorAccount(false);
        }
        return;
      }

      const vendor = await getCurrentUserVendor();

      if (!isActive) return;

      setIsCurrentUserVendorAccount(!!vendor);
    } catch {
      if (isActive) {
        setIsCurrentUserVendorAccount(false);
      }
    }
  }

  async function loadVan(userId?: string | null, isActive = true) {
    if (vendorCache.has(id) && isActive) {
      setVan(vendorCache.get(id)!);
    }

    try {
      const vendor = (await getVendorById(id)) as AssetAwareVan | null;

      if (!isActive) return;

      if (!vendor) {
        setVan(null);
        vendorCache.delete(id);
        return;
      }

      setVan(vendor);
      vendorCache.set(id, vendor);

      void (async () => {
        try {
          if (!userId) return;

          const canCount = await canCountVendorInteraction(
            vendor.id,
            userId,
            "view",
            1440
          );

          if (!canCount) return;

          const nextViews = await incrementVendorViews(vendor.id);
          await recordVendorInteraction(vendor.id, userId, "view");

          if (!isActive || activeVendorIdRef.current !== vendor.id) return;

          updateVanState((previous) =>
            previous ? { ...previous, views: nextViews } : previous
          );
        } catch (error) {
          console.log(
            "Error updating views:",
            error instanceof Error ? error.message : "Unknown error"
          );
        }
      })();
    } catch (error) {
      console.log(
        "Error loading vendor:",
        error instanceof Error ? error.message : "Unknown error"
      );

      if (isActive) {
        setVan(null);
      }
    }
  }

  async function loadUserRating(userId?: string | null, isActive = true) {
    try {
      if (!userId) {
        if (isActive) {
          setUserRating(null);
        }
        return;
      }

      const rating = await getUserVendorRating(id, userId);

      if (!isActive) return;

      setUserRating(rating);
    } catch {
      if (isActive) {
        setUserRating(null);
      }
    }
  }

  async function loadRatingCount(isActive = true) {
    try {
      const count = await getVendorRatingCount(id);

      if (!isActive) return;

      setRatingCount(count);
    } catch {
      if (isActive) {
        setRatingCount(0);
      }
    }
  }

  async function checkIfFavourite(userId?: string | null, isActive = true) {
    try {
      if (!userId) {
        if (isActive) {
          setIsFavourite(false);
        }
        return;
      }

      const favourite = await isVendorFavourite(userId, id);

      if (!isActive) return;

      setIsFavourite(favourite);
    } catch (error) {
      console.log(
        "Error checking favourite:",
        error instanceof Error ? error.message : "Unknown error"
      );

      if (isActive) {
        setIsFavourite(false);
      }
    }
  }

  async function toggleLive() {
    if (!van || isTogglingLive) return;

    if (!currentUserId || van.owner_id !== currentUserId) {
      Alert.alert(
        "Permission denied",
        "Only the owner of this listing can change live status."
      );
      return;
    }

    const newStatus = !van.isLive;
    setIsTogglingLive(true);

    try {
      await setVendorLiveStatus(van.id, newStatus);

      const updatedVan = (await getVendorById(van.id)) as AssetAwareVan | null;

      if (updatedVan) {
        setVan(updatedVan);
        vendorCache.set(id, updatedVan);
      } else {
        updateVanState((previous) =>
          previous ? { ...previous, isLive: newStatus } : previous
        );
      }

      Alert.alert(newStatus ? "Vendor is now LIVE" : "Vendor is now OFFLINE");
    } catch (error) {
      Alert.alert(
        "Error updating vendor status",
        error instanceof Error ? error.message : "Unknown error"
      );
    } finally {
      setIsTogglingLive(false);
    }
  }

  async function openDirections() {
    if (!van || isOpeningDirections) return;

    setIsOpeningDirections(true);

    try {
      const userId = await getCurrentUserId();
      let nextDirections: number | null = null;

      // 🔒 Anti-gaming rule:
      // only logged-in users can count a direction interaction,
      // and only once per 24 hours
      if (userId) {
        const canCount = await canCountVendorInteraction(
          van.id,
          userId,
          "direction",
          1440
        );

        if (canCount) {
          nextDirections = await incrementVendorDirections(van.id);
          await recordVendorInteraction(van.id, userId, "direction");
        }
      }

      if (nextDirections !== null) {
        updateVanState((previous) =>
          previous ? { ...previous, directions: nextDirections } : previous
        );
      }

      const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${van.lat},${van.lng}`;
      await Linking.openURL(mapsUrl);
    } catch (error) {
      console.log(
        "Error updating directions:",
        error instanceof Error ? error.message : "Unknown error"
      );
    } finally {
      setIsOpeningDirections(false);
    }
  }

  async function openMenuPdf() {
    if (!van?.menuPdfUrl || isOpeningMenuPdf) {
      if (!van?.menuPdfUrl) {
        Alert.alert("Menu unavailable", "This vendor has not uploaded a menu PDF.");
      }
      return;
    }

    setIsOpeningMenuPdf(true);

    try {
      const freshUrl = await getVendorMenuPdfSignedUrl(van.menuPdfUrl);

      if (!freshUrl) {
        Alert.alert("Open failed", "We could not open the menu PDF.");
        return;
      }

      await Linking.openURL(freshUrl);
    } catch {
      Alert.alert("Open failed", "We could not open the menu PDF.");
    } finally {
      setIsOpeningMenuPdf(false);
    }
  }

  async function toggleFavourite() {
    if (!van || isSavingFavourite) return;

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

  async function submitRating(star: number) {
    if (isSubmittingRating) return;

    setIsSubmittingRating(true);

    try {
      const userId = await getCurrentUserId();

      if (!userId) {
        Alert.alert("Login required", "Please log in to rate.");
        return;
      }

      await upsertVendorRating(id, userId, star);
      setUserRating(star);

      const [nextAverage, nextCount] = await Promise.all([
        refreshVendorRating(id),
        getVendorRatingCount(id),
      ]);

      setRatingCount(nextCount);
      updateVanState((previous) =>
        previous ? { ...previous, rating: nextAverage } : previous
      );
    } catch {
      Alert.alert("Error", "Failed to submit rating");
    } finally {
      setIsSubmittingRating(false);
    }
  }

  function openClaimScreen() {
    if (!van) return;

    if (
      van.listingSource === "user_spotted" &&
      van.expiresAt &&
      new Date(van.expiresAt) < new Date()
    ) {
      Alert.alert(
        "Listing expired",
        "This spotted listing has expired and can no longer be claimed."
      );
      return;
    }

    if (!isCurrentUserVendorAccount) {
      Alert.alert(
        "Vendor login required",
        "Please log in with a vendor account to claim this spotted van."
      );
      return;
    }

    router.push({
      pathname: "/vendor/claim",
      params: { id: van.id },
    });
  }

  async function handleAdminDelete() {
    if (!van) return;

    Alert.alert(
      "Delete spotted van",
      "Are you sure you want to permanently delete this spotted listing?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await adminDeleteVendor(van.id);
              Alert.alert("Deleted", "The spotted van has been removed.");
              router.replace({
                pathname: "/(tabs)/explore",
                params: { refresh: "1" },
              });
            } catch (error) {
              Alert.alert(
                "Delete failed",
                error instanceof Error ? error.message : "Unknown error"
              );
            }
          },
        },
      ]
    );
  }

  if (loading) {
    return (
      <View style={styles.centeredScreen}>
        <Text style={styles.loadingText}>Loading listing...</Text>
      </View>
    );
  }

  if (!van) {
    return (
      <View style={styles.centeredScreen}>
        <Text style={styles.notFoundTitle}>Listing not found</Text>

        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const isOwner = !!currentUserId && van.owner_id === currentUserId;
  const features = getSubscriptionFeatures(van.subscriptionTier);
  const showSocials =
    van.subscriptionTier === "growth" || van.subscriptionTier === "pro";

  const galleryPhotos =
    Array.isArray(van.photos) && van.photos.length > 0
      ? van.photos.filter(Boolean)
      : van.photo
        ? [van.photo]
        : [];

  const statusText =
    van.listingSource === "user_spotted"
      ? "SPOTTED"
      : features.liveStatus
        ? van.isLive
          ? "LIVE"
          : "LISTED"
        : "LISTED";

  const primaryVisual = van.logoUrl ?? galleryPhotos[0] ?? null;
  const showLogoSection = !!van.logoUrl;
  const canShowSocialLinks =
    van.subscriptionTier === "growth" || van.subscriptionTier === "pro";

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.topAccent} />

      <View style={styles.heroShell}>
        <View style={styles.heroGlow} />

        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View style={styles.heroTitleBlock}>
              <Text style={styles.heroEyebrow}>BiteBeacon Listing</Text>
              <Text style={styles.title}>{van.name}</Text>
              <Text style={styles.meta}>{van.cuisine}</Text>
            </View>

            {primaryVisual ? (
              <Image source={{ uri: primaryVisual }} style={styles.heroVisual} />
            ) : null}

            {isProTier(van.subscriptionTier) &&
              showSocials &&
              (van.instagramUrl || van.facebookUrl || van.websiteUrl) ? (
              <View style={styles.heroSocialRow}>
                {van.instagramUrl ? (
                  <Pressable
                    style={styles.heroSocialButton}
                    onPress={() => Linking.openURL(ensureHttps(van.instagramUrl!))}
                  >
                    <Text style={styles.heroSocialText}>📸</Text>
                  </Pressable>
                ) : null}

                {van.facebookUrl ? (
                  <Pressable
                    style={styles.heroSocialButton}
                    onPress={() => Linking.openURL(ensureHttps(van.facebookUrl!))}
                  >
                    <Text style={styles.heroSocialText}>📘</Text>
                  </Pressable>
                ) : null}

                {van.websiteUrl ? (
                  <Pressable
                    style={styles.heroSocialButton}
                    onPress={() => Linking.openURL(ensureHttps(van.websiteUrl!))}
                  >
                    <Text style={styles.heroSocialText}>🌐</Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}
          </View>

          <View style={styles.heroBadgeRow}>
            <View
              style={[
                styles.statusBadge,
                van.listingSource === "user_spotted"
                  ? styles.statusTemporary
                  : features.liveStatus
                    ? van.isLive
                      ? styles.statusLive
                      : styles.statusOffline
                    : styles.statusOffline,
              ]}
            >
              <Text style={styles.statusBadgeText}>{statusText}</Text>
            </View>

            {isProTier(van.subscriptionTier) && (
              <View style={styles.planBadge}>
                <Text style={styles.planBadgeText}>PRO</Text>
              </View>
            )}

            {van.owner_id && van.listingSource !== "user_spotted" ? (
              <View style={styles.verifiedBadge}>
                <Text style={styles.verifiedBadgeText}>VENDOR MANAGED</Text>
              </View>
            ) : null}

            {isProTier(van.subscriptionTier) ? (
              <View style={styles.featuredBadge}>
                <Text style={styles.featuredBadgeText}>FEATURED</Text>
              </View>
            ) : null}

            {isProTier(van.subscriptionTier) &&
              (van.views ?? 0) >= 25 &&
              (van.directions ?? 0) >= 5 &&
              (van.rating ?? 0) >= 4.2 ? (
              <View style={styles.trendingBadge}>
                <Text style={styles.trendingBadgeText}>TRENDING</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.heroStatsRow}>
            <View style={styles.heroStatBox}>
              <Text style={styles.heroStatLabel}>Rating</Text>
              <Text style={styles.heroStatValue}>
                {ratingCount >= 3 ? van.rating.toFixed(1) : "N/A"}
              </Text>
            </View>

            <View style={styles.heroStatBox}>
              <Text style={styles.heroStatLabel}>Views</Text>
              <Text style={styles.heroStatValue}>{van.views ?? 0}</Text>
            </View>

            <View style={styles.heroStatBox}>
              <Text style={styles.heroStatLabel}>Directions</Text>
              <Text style={styles.heroStatValue}>{van.directions ?? 0}</Text>
            </View>
          </View>
        </View>
      </View>

      {isOwner ? (
        <View style={styles.noticeCardBlue}>
          <Text style={styles.noticeTitleBlue}>Your Listing</Text>
          <Text style={styles.noticeTextBlue}>
            You are viewing your own vendor listing.
          </Text>
        </View>
      ) : null}

      {isOwner && isFreeTier(van.subscriptionTier) ? (
        <View style={styles.noticeCardOrange}>
          <Text style={styles.noticeTitleOrange}>Unlock More Features</Text>
          <Text style={styles.noticeTextOrange}>
            Upgrade your plan to go live, add more content, strengthen branding,
            and reach more customers.
          </Text>

          <Pressable
            style={styles.orangeButton}
            onPress={() => router.push("/vendor/upgrade")}
          >
            <Text style={styles.orangeButtonText}>Upgrade Now</Text>
          </Pressable>
        </View>
      ) : null}

      {van.listingSource === "user_spotted" ? (
        <View style={styles.noticeCardOrange}>
          <Text style={styles.noticeTitleOrange}>Community Spotted</Text>
          <Text style={styles.noticeTextOrange}>
            This listing was spotted by the community and is not yet verified by the
            vendor. Details may change once the vendor claims and manages this listing.
          </Text>

          {getExpiryText(van.expiresAt) ? (
            <View style={styles.expiryBadge}>
              <Text style={styles.expiryBadgeText}>
                {getExpiryText(van.expiresAt)}
              </Text>
            </View>
          ) : null}
        </View>
      ) : van.owner_id ? (
        <View style={styles.noticeCardGreen}>
          <Text style={styles.noticeTitleGreen}>Vendor Managed</Text>
          <Text style={styles.noticeTextGreen}>
            This listing is managed directly by the vendor through BiteBeacon and is a
            verified vendor-managed listing.
          </Text>
        </View>
      ) : null}

      {showLogoSection ? (
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionTitle}>Branding</Text>
          <View style={styles.brandCard}>
            <Image source={{ uri: van.logoUrl! }} style={styles.brandLogo} />
            <View style={styles.brandTextWrap}>
              <Text style={styles.brandTitle}>{van.vendorName || van.name}</Text>
              <Text style={styles.brandText}>
                This vendor has added branded profile assets through BiteBeacon.
              </Text>
            </View>
          </View>
        </View>
      ) : null}

      {features.reviews && van.vendorMessage ? (
        <View style={styles.highlightCard}>
          <Text style={styles.highlightTitle}>Today’s Update</Text>
          <Text style={styles.highlightText}>{van.vendorMessage}</Text>
        </View>
      ) : null}

      {(van.foodCategories ?? []).length > 0 ? (
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionTitle}>Food Categories</Text>
          <View style={styles.categoriesWrap}>
            {(van.foodCategories ?? []).map((category) => (
              <View key={category} style={styles.categoryChip}>
                <Text style={styles.categoryChipText}>{category}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      <View style={styles.sectionBlock}>
        <Text style={styles.sectionTitle}>Vendor</Text>
        <View style={styles.infoCard}>
          <Text style={styles.infoText}>
            {van.vendorName || "Vendor name coming soon"}
          </Text>

          {showSocials && (
            <View style={styles.socialRow}>
              {van.instagramUrl ? (
                <Pressable
                  style={styles.socialButton}
                  onPress={() => Linking.openURL(ensureHttps(van.instagramUrl!))}
                >
                  <Text style={styles.socialText}>📸 Instagram</Text>
                </Pressable>
              ) : null}

              {van.facebookUrl ? (
                <Pressable
                  style={styles.socialButton}
                  onPress={() => Linking.openURL(ensureHttps(van.facebookUrl!))}
                >
                  <Text style={styles.socialText}>📘 Facebook</Text>
                </Pressable>
              ) : null}

              {van.websiteUrl ? (
                <Pressable
                  style={styles.socialButton}
                  onPress={() => Linking.openURL(ensureHttps(van.websiteUrl!))}
                >
                  <Text style={styles.socialText}>🌐 Website</Text>
                </Pressable>
              ) : null}
            </View>
          )}

          {isOwner && isFreeTier(van.subscriptionTier) ? (
            <Pressable
              style={styles.socialUpgradeHint}
              onPress={() => router.push("/vendor/upgrade")}
            >
              <Text style={styles.socialUpgradeHintText}>
                Upgrade to Growth or Pro to display social links on your listing.
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      <View style={styles.sectionBlock}>
        <Text style={styles.sectionTitle}>Menu</Text>
        <View style={styles.infoCard}>
          <Text style={styles.infoText}>{van.menu || "Menu coming soon"}</Text>
        </View>

        {van.menuPdfName ? (
          <Pressable
            style={[
              styles.secondaryButton,
              isOpeningMenuPdf && styles.disabledButton,
            ]}
            onPress={openMenuPdf}
            disabled={isOpeningMenuPdf}
          >
            <Text style={styles.secondaryButtonText}>
              {isOpeningMenuPdf
                ? "Opening menu..."
                : `View Menu PDF${van.menuPdfName ? ` (${van.menuPdfName})` : ""}`}
            </Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.sectionBlock}>
        <Text style={styles.sectionTitle}>Schedule</Text>
        <View style={styles.infoCard}>
          <Text style={styles.infoText}>
            {van.schedule || "Schedule coming soon"}
          </Text>
        </View>
      </View>

      {van.what3words &&
        (van.subscriptionTier === "growth" || van.subscriptionTier === "pro") && (
          <View style={styles.sectionBlock}>
            <Text style={styles.sectionTitle}>Precise Location</Text>

            <View style={styles.infoCard}>
              <Text style={styles.infoText}>
        ///{van.what3words}
              </Text>

              <Pressable
                style={styles.secondaryButton}
                onPress={() =>
                  Linking.openURL(`https://what3words.com/${van.what3words}`)
                }
              >
                <Text style={styles.secondaryButtonText}>
                  Open in what3words
                </Text>
              </Pressable>
            </View>
          </View>
        )}

      {isOwner && isFreeTier(van.subscriptionTier) ? (
        <View style={styles.sectionBlock}>
          <View style={styles.infoCard}>
            <Pressable
              style={styles.socialUpgradeHint}
              onPress={() => router.push("/vendor/upgrade")}
            >
              <Text style={styles.socialUpgradeHintText}>
                Upgrade to Growth or Pro to display what3words on your listing.
              </Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {!isOwner ? (
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionTitle}>Rate this vendor</Text>

          <View style={styles.ratingRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Pressable
                key={star}
                onPress={() => submitRating(star)}
                disabled={isSubmittingRating}
                style={isSubmittingRating ? styles.disabledButton : undefined}
              >
                <Text style={styles.ratingStar}>
                  {userRating && star <= userRating ? "★" : "☆"}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

      <View style={styles.sectionBlock}>
        <Text style={styles.sectionTitle}>Actions</Text>

        <View style={styles.actionCard}>
          {isOwner ? (
            <>
              {features.liveStatus ? (
                <Pressable
                  style={[
                    styles.primaryButton,
                    van.isLive ? styles.liveActiveButton : styles.liveInactiveButton,
                    isTogglingLive && styles.disabledButton,
                  ]}
                  onPress={toggleLive}
                  disabled={isTogglingLive}
                >
                  <Text style={styles.primaryButtonText}>
                    {isTogglingLive
                      ? "Updating..."
                      : van.isLive
                        ? "LIVE NOW"
                        : "GO LIVE"}
                  </Text>
                </Pressable>
              ) : null}

              <Pressable
                style={[
                  styles.darkButton,
                  isOpeningDirections && styles.disabledButton,
                ]}
                onPress={openDirections}
                disabled={isOpeningDirections}
              >
                <Text style={styles.darkButtonText}>
                  {isOpeningDirections ? "Opening..." : "Get Directions"}
                </Text>
              </Pressable>

              <Pressable
                style={styles.darkButton}
                onPress={() =>
                  router.push({
                    pathname: "/vendor/dashboard",
                    params: { id: van.id },
                  })
                }
              >
                <Text style={styles.darkButtonText}>Manage Listing</Text>
              </Pressable>
            </>
          ) : van.listingSource === "user_spotted" &&
            !(van.expiresAt && new Date(van.expiresAt) < new Date()) ? (
            <>
              <Pressable
                style={[
                  styles.darkButton,
                  isOpeningDirections && styles.disabledButton,
                ]}
                onPress={openDirections}
                disabled={isOpeningDirections}
              >
                <Text style={styles.darkButtonText}>
                  {isOpeningDirections ? "Opening..." : "Get Directions"}
                </Text>
              </Pressable>

              <Pressable style={styles.orangeButton} onPress={openClaimScreen}>
                <Text style={styles.orangeButtonText}>Claim This Van</Text>
              </Pressable>

              <Pressable style={styles.reportButton} onPress={handleAdminDelete}>
                <Text style={styles.reportButtonText}>Delete Spotted Van (Admin)</Text>
              </Pressable>

              <Pressable
                style={styles.reportButton}
                onPress={() =>
                  router.push({
                    pathname: "/vendor/report",
                    params: { id: van.id },
                  })
                }
              >
                <Text style={styles.reportButtonText}>Report Listing</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Pressable
                style={[
                  styles.darkButton,
                  isOpeningDirections && styles.disabledButton,
                ]}
                onPress={openDirections}
                disabled={isOpeningDirections}
              >
                <Text style={styles.darkButtonText}>
                  {isOpeningDirections ? "Opening..." : "Get Directions"}
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.darkButton,
                  isSavingFavourite && styles.disabledButton,
                ]}
                onPress={toggleFavourite}
                disabled={isSavingFavourite}
              >
                <Text style={styles.darkButtonText}>
                  {isSavingFavourite
                    ? "Updating..."
                    : isFavourite
                      ? "★ Saved to Favourites"
                      : "☆ Save to Favourites"}
                </Text>
              </Pressable>

              <Pressable
                style={styles.reportButton}
                onPress={() =>
                  router.push({
                    pathname: "/vendor/report",
                    params: { id: van.id },
                  })
                }
              >
                <Text style={styles.reportButtonText}>Report Listing</Text>
              </Pressable>
            </>
          )}
        </View>
      </View>

      {galleryPhotos.length > 0 ? (
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionTitle}>Gallery</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.galleryRow}
          >
            {galleryPhotos.map((photoUri, index) => (
              <Image
                key={`${photoUri}-${index}`}
                source={{ uri: photoUri }}
                style={styles.galleryImage}
              />
            ))}
          </ScrollView>
        </View>
      ) : null}

      <Pressable style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backButtonText}>Back</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: NAVY,
  },

  content: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 40,
  },

  centeredScreen: {
    flex: 1,
    backgroundColor: NAVY,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },

  loadingText: {
    color: WHITE,
    fontSize: 16,
    fontWeight: "700",
  },

  notFoundTitle: {
    color: WHITE,
    fontSize: 26,
    fontWeight: "800",
    marginBottom: 18,
    textAlign: "center",
  },

  topAccent: {
    height: 4,
    width: 90,
    borderRadius: 999,
    backgroundColor: ORANGE,
    alignSelf: "center",
    marginBottom: 14,
    opacity: 0.95,
  },

  heroShell: {
    marginBottom: 18,
    position: "relative",
  },

  heroGlow: {
    position: "absolute",
    top: 10,
    left: 18,
    right: 18,
    height: 88,
    borderRadius: 24,
    backgroundColor: "rgba(255,122,0,0.14)",
  },

  heroCard: {
    backgroundColor: PANEL,
    borderRadius: 22,
    padding: 14,
    borderWidth: 1.5,
    borderColor: ORANGE,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 7 },
    elevation: 6,
  },

  heroTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 8,
  },

  heroTitleBlock: {
    flex: 1,
  },

  heroEyebrow: {
    fontSize: 10,
    fontWeight: "800",
    color: ORANGE,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 5,
  },

  heroVisual: {
    width: 84,
    height: 84,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: ORANGE_SOFT,
    backgroundColor: PANEL_ALT,
  },

  title: {
    fontSize: 24,
    fontWeight: "800",
    color: WHITE,
    marginBottom: 3,
  },

  meta: {
    fontSize: 14,
    fontWeight: "700",
    color: "rgba(255,255,255,0.7)",
  },

  featuredBadge: {
    backgroundColor: ORANGE,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1.2,
    borderColor: ORANGE_SOFT,
  },

  trendingBadge: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1.2,
    borderColor: ORANGE,
  },

  trendingBadgeText: {
    color: ORANGE,
    fontSize: 10,
    fontWeight: "800",
  },

  featuredBadgeText: {
    color: WHITE,
    fontSize: 10,
    fontWeight: "800",
  },

  planBadge: {
    backgroundColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1.2,
    borderColor: "rgba(255,255,255,0.16)",
  },

  planBadgeText: {
    color: WHITE,
    fontSize: 10,
    fontWeight: "800",
  },

  heroBadgeRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
    marginBottom: 12,
  },

  statusBadge: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 999,
  },

  statusLive: {
    backgroundColor: GREEN,
  },

  statusOffline: {
    backgroundColor: OFFLINE,
  },

  statusTemporary: {
    backgroundColor: ORANGE,
  },

  statusBadgeText: {
    color: WHITE,
    fontSize: 11,
    fontWeight: "800",
  },

  verifiedBadge: {
    backgroundColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1.2,
    borderColor: ORANGE,
  },

  verifiedBadgeText: {
    color: WHITE,
    fontSize: 10,
    fontWeight: "800",
  },

  heroStatsRow: {
    flexDirection: "row",
    gap: 8,
  },

  heroStatBox: {
    flex: 1,
    backgroundColor: PANEL_DEEP,
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
  },

  heroStatLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "rgba(255,255,255,0.58)",
    textTransform: "uppercase",
    marginBottom: 4,
    textAlign: "center",
  },

  heroStatValue: {
    fontSize: 17,
    fontWeight: "800",
    color: WHITE,
  },

  sectionBlock: {
    marginBottom: 22,
  },

  sectionTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: WHITE,
    marginBottom: 10,
  },

  noticeCardBlue: {
    backgroundColor: NAVY_DARK,
    borderRadius: 20,
    padding: 16,
    marginBottom: 18,
    borderWidth: 1.5,
    borderColor: ORANGE,
  },

  noticeTitleBlue: {
    fontSize: 15,
    fontWeight: "800",
    color: WHITE,
    marginBottom: 4,
  },

  noticeTextBlue: {
    fontSize: 14,
    lineHeight: 20,
    color: TEXT_MUTED,
  },

  noticeCardOrange: {
    backgroundColor: "rgba(255,122,0,0.1)",
    borderRadius: 20,
    padding: 16,
    marginBottom: 18,
    borderWidth: 1.5,
    borderColor: ORANGE,
  },

  noticeTitleOrange: {
    fontSize: 15,
    fontWeight: "800",
    color: ORANGE,
    marginBottom: 4,
  },

  noticeTextOrange: {
    fontSize: 14,
    lineHeight: 20,
    color: "rgba(255,255,255,0.82)",
  },

  noticeCardGreen: {
    backgroundColor: "rgba(29,185,84,0.1)",
    borderRadius: 20,
    padding: 16,
    marginBottom: 18,
    borderWidth: 1.5,
    borderColor: GREEN,
  },

  noticeTitleGreen: {
    fontSize: 15,
    fontWeight: "800",
    color: GREEN,
    marginBottom: 4,
  },

  noticeTextGreen: {
    fontSize: 14,
    lineHeight: 20,
    color: "rgba(255,255,255,0.82)",
  },

  highlightCard: {
    backgroundColor: PANEL,
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: ORANGE,
    overflow: "hidden",
  },

  highlightTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: ORANGE,
    marginBottom: 6,
  },

  highlightText: {
    fontSize: 14,
    lineHeight: 20,
    color: "rgba(255,255,255,0.86)",
  },

  brandCard: {
    backgroundColor: PANEL_ALT,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1.2,
    borderColor: ORANGE,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },

  brandLogo: {
    width: 72,
    height: 72,
    borderRadius: 18,
    backgroundColor: WHITE,
    borderWidth: 1.2,
    borderColor: "rgba(255,255,255,0.2)",
  },

  brandTextWrap: {
    flex: 1,
  },

  brandTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: WHITE,
    marginBottom: 4,
  },

  brandText: {
    fontSize: 14,
    lineHeight: 20,
    color: "rgba(255,255,255,0.82)",
  },

  categoriesWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },

  categoryChip: {
    backgroundColor: PANEL_ALT,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: ORANGE,
  },

  categoryChipText: {
    color: WHITE,
    fontSize: 13,
    fontWeight: "800",
  },

  infoCard: {
    backgroundColor: PANEL_ALT,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1.2,
    borderColor: ORANGE,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },

  infoText: {
    fontSize: 15,
    lineHeight: 22,
    color: "rgba(255,255,255,0.9)",
  },

  ratingRow: {
    flexDirection: "row",
    gap: 8,
  },

  ratingStar: {
    fontSize: 28,
    color: WHITE,
  },

  actionCard: {
    backgroundColor: NAVY_DARK,
    borderRadius: 22,
    padding: 16,
    borderWidth: 1.5,
    borderColor: ORANGE,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 4,
  },

  primaryButton: {
    paddingVertical: 15,
    borderRadius: 16,
    alignItems: "center",
    marginBottom: 12,
    borderWidth: 1.5,
  },

  primaryButtonText: {
    color: WHITE,
    fontSize: 16,
    fontWeight: "800",
  },

  liveActiveButton: {
    backgroundColor: GREEN,
    borderColor: "rgba(255,255,255,0.22)",
  },

  liveInactiveButton: {
    backgroundColor: OFFLINE,
    borderColor: "rgba(255,255,255,0.18)",
  },

  darkButton: {
    backgroundColor: PANEL_DEEP,
    paddingVertical: 15,
    borderRadius: 16,
    alignItems: "center",
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: ORANGE,
  },

  darkButtonText: {
    color: WHITE,
    fontSize: 15,
    fontWeight: "800",
  },

  orangeButton: {
    backgroundColor: ORANGE,
    paddingVertical: 15,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 2,
    borderWidth: 1.5,
    borderColor: ORANGE_SOFT,
  },

  orangeButtonText: {
    color: WHITE,
    fontSize: 15,
    fontWeight: "800",
  },

  reportButton: {
    backgroundColor: "transparent",
    paddingVertical: 15,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 2,
    borderWidth: 1.5,
    borderColor: "#E53935",
  },

  reportButtonText: {
    color: "#FFB3B3",
    fontSize: 15,
    fontWeight: "800",
  },

  secondaryButton: {
    marginTop: 12,
    backgroundColor: PANEL_ALT,
    borderWidth: 1.2,
    borderColor: ORANGE,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
  },

  secondaryButtonText: {
    color: WHITE,
    fontWeight: "800",
    textAlign: "center",
  },

  galleryRow: {
    paddingRight: 8,
  },

  galleryImage: {
    width: 270,
    height: 190,
    borderRadius: 20,
    marginRight: 12,
    backgroundColor: PANEL,
    borderWidth: 1.5,
    borderColor: ORANGE,
  },

  backButton: {
    backgroundColor: PANEL_ALT,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 2,
    borderWidth: 1.2,
    borderColor: ORANGE,
  },

  backButtonText: {
    color: WHITE,
    fontSize: 15,
    fontWeight: "800",
  },

  disabledButton: {
    opacity: 0.7,
  },

  expiryBadge: {
    marginTop: 8,
    alignSelf: "flex-start",
    backgroundColor: "#FF7A00",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },

  expiryBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
  },

  socialRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 12,
  },

  socialButton: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FF7A00",
  },

  socialText: {
    color: "#0B2A5B",
    fontWeight: "700",
  },

  heroSocialRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
  },

  heroSocialButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#FF7A00",
  },

  heroSocialText: {
    fontSize: 16,
  },

  socialUpgradeHint: {
    marginTop: 12,
    backgroundColor: "rgba(255,122,0,0.12)",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: ORANGE,
  },

  socialUpgradeHintText: {
    color: ORANGE_SOFT,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
  },
});