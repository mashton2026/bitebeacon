import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
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
import AppText from "../../components/AppText";
import CardGlowBorder from "../../components/CardGlowBorder";
import MapTextureBackground from "../../components/MapTextureBackground";
import MetallicFrame from "../../components/MetallicFrame";
import SectionGlowLine from "../../components/SectionGlowLine";
import {
  getSubscriptionFeatures,
  isProTier
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
  upsertVendorRating,
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

const BG = "#07162F";
const BG_ALT = "#0B1F42";
const CARD = "#0F2A57";
const CARD_ALT = "#13346A";
const CARD_SOFT = "#10264D";
const STROKE = "rgba(255,255,255,0.10)";
const STROKE_STRONG = "rgba(255,122,0,0.45)";
const ORANGE = "#FF7A00";
const ORANGE_SOFT = "#FFB067";
const WHITE = "#FFFFFF";
const TEXT_MUTED = "rgba(255,255,255,0.72)";
const TEXT_SOFT = "rgba(255,255,255,0.58)";
const GREEN = "#1DB954";
const OFFLINE = "#6F84AA";
const RED = "#E35D5D";

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

function StatCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.sectionBlock}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Badge({
  label,
  style,
  textStyle,
}: {
  label: string;
  style?: object;
  textStyle?: object;
}) {
  return (
    <View style={[styles.badge, style]}>
      <Text style={[styles.badgeText, textStyle]}>{label}</Text>
    </View>
  );
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

  async function openDirections() {
    if (!van || isOpeningDirections) return;

    setIsOpeningDirections(true);

    try {
      const userId = await getCurrentUserId();
      let nextDirections: number | null = null;

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
        Alert.alert(
          "Menu unavailable",
          "This vendor has not uploaded a menu PDF."
        );
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
          ? "LIVE NOW"
          : "LISTED"
        : "LISTED";

  const canShowPremiumBranding = features.images;
  const primaryVisual = galleryPhotos[0] ?? (canShowPremiumBranding ? van.logoUrl : null) ?? null;
  const showSocialLinks =
    showSocials && (van.instagramUrl || van.facebookUrl || van.websiteUrl);
  const showPreciseLocation = !!van.what3words && showSocials;
  const ratingDisplay = ratingCount >= 3 ? van.rating.toFixed(1) : "New";
  const isSpotted = van.listingSource === "user_spotted";
  const isExpiredSpotted =
    isSpotted && !!van.expiresAt && new Date(van.expiresAt) < new Date();
  const hasGallery = canShowPremiumBranding && galleryPhotos.length > 1;
  const hasVendorMessage = features.reviews && !!van.vendorMessage?.trim();
  const hasMenu = !!van.menu?.trim();
  const hasSchedule = !!van.schedule?.trim();
  const hasFoodCategories = (van.foodCategories ?? []).length > 0;
  const hasMainPhoto = galleryPhotos.length > 0;
  const hasDistinctVendorName =
    !!van.vendorName?.trim() &&
    van.vendorName.trim().toLowerCase() !== van.name.trim().toLowerCase() &&
    van.vendorName.trim().toLowerCase() !== (van.cuisine ?? "").trim().toLowerCase();

  const ownerMissingEssentials = [
    !hasMainPhoto ? "a main photo" : null,
    !hasMenu ? "your menu" : null,
    !hasSchedule ? "your trading schedule" : null,
    !van.cuisine?.trim() ? "your cuisine" : null,
  ].filter(Boolean) as string[];

  const ownerMissingText =
    ownerMissingEssentials.length === 1
      ? `Add ${ownerMissingEssentials[0]} to make this public advert feel complete.`
      : ownerMissingEssentials.length > 1
        ? `Add ${ownerMissingEssentials.slice(0, 3).join(", ")} to make this public advert work harder for you.`
        : null;

  return (
    <MapTextureBackground>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topBar}>
          <Pressable style={styles.circleButton} onPress={() => router.back()}>
            <MaterialCommunityIcons name="chevron-left" size={27} color={WHITE} />
          </Pressable>

          <AppText variant="label" style={styles.topBarEyebrow}>
            DISCOVER ON BITEBEACON
          </AppText>

          {!isOwner ? (
            <Pressable
              style={[styles.circleButton, isFavourite && styles.circleButtonActive]}
              onPress={toggleFavourite}
              disabled={isSavingFavourite}
            >
              <MaterialCommunityIcons
                name={isFavourite ? "heart" : "heart-outline"}
                size={22}
                color={isFavourite ? "#FF6B7A" : WHITE}
              />
            </Pressable>
          ) : (
            <Pressable
              style={styles.circleButton}
              onPress={() =>
                router.push({ pathname: "/vendor/dashboard", params: { id: van.id } })
              }
            >
              <MaterialCommunityIcons name="cog-outline" size={22} color="#F4B547" />
            </Pressable>
          )}
        </View>

        <View style={[styles.heroShell, !hasMainPhoto && styles.heroShellCompact]}>
          <CardGlowBorder
            accentColor={van.isLive ? "#45E27B" : "#F4B547"}
            borderColor={van.isLive ? "rgba(69,226,123,0.40)" : "rgba(244,181,71,0.42)"}
            borderRadius={28}
          />

          <MetallicFrame
            tone={van.isLive ? "blue" : "gold"}
            borderWidth={3}
            style={styles.heroFrame}
            contentStyle={{ borderRadius: 27 }}
          >
            {hasMainPhoto ? (
              <View style={styles.heroCard}>
                <Image source={{ uri: galleryPhotos[0] }} style={styles.heroPhoto} />
                <LinearGradient
                  colors={["rgba(3,12,23,0.02)", "rgba(3,12,23,0.70)", "rgba(3,12,23,0.98)"]}
                  locations={[0.15, 0.58, 1]}
                  style={styles.heroOverlay}
                />

                <View style={styles.heroTopBadges}>
                  <View
                    style={[
                      styles.statusPill,
                      van.isLive && !isSpotted
                        ? styles.statusPillLive
                        : isSpotted
                          ? styles.statusPillSpotted
                          : styles.statusPillListed,
                    ]}
                  >
                    <View style={styles.statusDot} />
                    <AppText variant="label" style={styles.statusPillText}>{statusText}</AppText>
                  </View>

                  {isProTier(van.subscriptionTier) ? (
                    <View style={styles.proPill}>
                      <MaterialCommunityIcons name="crown" size={14} color="#F4B547" />
                      <AppText variant="label" style={styles.proPillText}>PRO</AppText>
                    </View>
                  ) : null}
                </View>

                <View style={styles.heroBottom}>
                  <View style={styles.heroTitleRow}>
                    {canShowPremiumBranding && van.logoUrl ? <Image source={{ uri: van.logoUrl }} style={styles.logoBadge} /> : null}
                    <View style={styles.heroTitleCopy}>
                      <AppText variant="heading" style={styles.heroTitle}>{van.name}</AppText>
                      {hasDistinctVendorName ? (
                        <AppText variant="body" style={styles.heroVendorName}>{van.vendorName}</AppText>
                      ) : null}
                      <AppText variant="body" style={styles.heroCuisine}>
                        {van.cuisine || "Street food vendor"}
                      </AppText>
                    </View>
                  </View>

                  <View style={styles.heroMetaRow}>
                    <View style={styles.heroMetaItem}>
                      <MaterialCommunityIcons name="star" size={17} color="#F4B547" />
                      <AppText variant="body" style={styles.heroMetaValue}>{ratingDisplay}</AppText>
                      {ratingCount > 0 ? <AppText variant="body" style={styles.heroMetaMuted}>({ratingCount})</AppText> : null}
                    </View>
                    {hasFoodCategories ? (
                      <>
                        <View style={styles.metaDivider} />
                        <AppText variant="body" style={styles.heroMetaMuted} numberOfLines={1}>
                          {(van.foodCategories ?? []).slice(0, 2).join(" · ")}
                        </AppText>
                      </>
                    ) : null}
                  </View>
                </View>
              </View>
            ) : (
              <LinearGradient
                colors={["rgba(12,37,61,0.98)", "rgba(5,20,35,0.99)", "rgba(3,13,24,1)"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.compactHeroCard}
              >
                <View style={styles.compactHeroTop}>
                  <View style={styles.compactIdentityVisual}>
                    {canShowPremiumBranding && van.logoUrl ? (
                      <Image source={{ uri: van.logoUrl }} style={styles.compactIdentityLogo} />
                    ) : (
                      <AppText variant="heading" style={styles.compactIdentityInitial}>
                        {van.name?.charAt(0)?.toUpperCase() ?? "V"}
                      </AppText>
                    )}
                  </View>
                  <View style={styles.compactHeroCopy}>
                    <AppText variant="heading" style={styles.heroTitle}>{van.name}</AppText>
                    {hasDistinctVendorName ? (
                      <AppText variant="body" style={styles.heroVendorName}>{van.vendorName}</AppText>
                    ) : null}
                    <AppText variant="body" style={styles.heroCuisine}>{van.cuisine || "Street food vendor"}</AppText>
                  </View>
                </View>
                <View style={styles.compactHeroBottom}>
                  <View style={[styles.statusPill, van.isLive && !isSpotted ? styles.statusPillLive : isSpotted ? styles.statusPillSpotted : styles.statusPillListed]}>
                    <View style={styles.statusDot} />
                    <AppText variant="label" style={styles.statusPillText}>{statusText}</AppText>
                  </View>
                  <View style={styles.heroMetaItem}>
                    <MaterialCommunityIcons name="star" size={17} color="#F4B547" />
                    <AppText variant="body" style={styles.heroMetaValue}>{ratingDisplay}</AppText>
                    {ratingCount > 0 ? <AppText variant="body" style={styles.heroMetaMuted}>({ratingCount})</AppText> : null}
                  </View>
                </View>
              </LinearGradient>
            )}
          </MetallicFrame>
        </View>

        <View style={styles.primaryActionsRow}>
          <Pressable
            style={[styles.primaryAction, styles.primaryActionGold]}
            onPress={openDirections}
            disabled={isOpeningDirections}
          >
            <MaterialCommunityIcons name="navigation-variant" size={20} color="#F4B547" />
            <View style={styles.actionCopy}>
              <AppText variant="button" style={styles.primaryActionTitle}>
                {isOpeningDirections ? "Opening..." : "Directions"}
              </AppText>
              <AppText variant="body" style={styles.primaryActionHint}>Open in Maps</AppText>
            </View>
          </Pressable>

          {isOwner ? (
            <Pressable
              style={[styles.primaryAction, styles.primaryActionBlue]}
              onPress={() =>
                router.push({ pathname: "/vendor/dashboard", params: { id: van.id } })
              }
            >
              <MaterialCommunityIcons name="view-dashboard-outline" size={20} color="#62B5FF" />
              <View style={styles.actionCopy}>
                <AppText variant="button" style={styles.primaryActionTitle}>Manage</AppText>
                <AppText variant="body" style={styles.primaryActionHint}>Vendor dashboard</AppText>
              </View>
            </Pressable>
          ) : (
            <Pressable
              style={[styles.primaryAction, styles.primaryActionBlue]}
              onPress={toggleFavourite}
              disabled={isSavingFavourite}
            >
              <MaterialCommunityIcons
                name={isFavourite ? "heart" : "heart-outline"}
                size={20}
                color={isFavourite ? "#FF6B7A" : "#62B5FF"}
              />
              <View style={styles.actionCopy}>
                <AppText variant="button" style={styles.primaryActionTitle}>
                  {isSavingFavourite ? "Updating..." : isFavourite ? "Saved" : "Favourite"}
                </AppText>
                <AppText variant="body" style={styles.primaryActionHint}>Keep for later</AppText>
              </View>
            </Pressable>
          )}
        </View>

        {isOwner ? (
          <View style={styles.ownerStrip}>
            <MaterialCommunityIcons name="eye-check-outline" size={18} color="#62B5FF" />
            <AppText variant="body" style={styles.ownerStripText}>
              You are viewing the customer version of your listing.
            </AppText>
          </View>
        ) : null}

        {isOwner && ownerMissingText ? (
          <View style={styles.ownerQualityCard}>
            <View style={styles.ownerQualityIcon}>
              <MaterialCommunityIcons name="storefront-outline" size={21} color="#F4B547" />
            </View>
            <View style={styles.ownerQualityCopy}>
              <AppText variant="button" style={styles.ownerQualityTitle}>
                Strengthen your public advert
              </AppText>
              <AppText variant="body" style={styles.ownerQualityText}>
                {ownerMissingText}
              </AppText>
            </View>
            <Pressable
              style={styles.ownerQualityButton}
              onPress={() =>
                router.push({ pathname: "/vendor/dashboard", params: { id: van.id } })
              }
            >
              <MaterialCommunityIcons name="pencil-outline" size={19} color="#F4B547" />
            </Pressable>
          </View>
        ) : null}

        {isSpotted ? (
          <View style={styles.communityCard}>
            <View style={styles.sectionHeadingRow}>
              <View style={styles.sectionIconGold}>
                <MaterialCommunityIcons name="map-marker-star-outline" size={20} color="#F4B547" />
              </View>
              <View style={styles.sectionHeadingCopy}>
                <AppText variant="heading" style={styles.sectionTitleSmall}>Community spotted</AppText>
                <AppText variant="body" style={styles.sectionSubtitle}>
                  This listing was added by the BiteBeacon community and has not yet been claimed.
                </AppText>
              </View>
            </View>
            {getExpiryText(van.expiresAt) ? (
              <View style={styles.expiryPill}>
                <AppText variant="label" style={styles.expiryPillText}>{getExpiryText(van.expiresAt)}</AppText>
              </View>
            ) : null}
          </View>
        ) : null}

        {hasVendorMessage ? (
          <View style={styles.messageShell}>
            <CardGlowBorder
              accentColor="#F4B547"
              borderColor="rgba(244,181,71,0.32)"
              borderRadius={22}
            />
            <LinearGradient
              colors={["rgba(13,39,62,0.97)", "rgba(5,19,33,0.99)"]}
              style={styles.messageCard}
            >
              <View style={styles.messageHeader}>
                <MaterialCommunityIcons name="bullhorn-outline" size={19} color="#F4B547" />
                <AppText variant="label" style={styles.messageEyebrow}>FROM THE VENDOR</AppText>
              </View>
              <AppText variant="heading" style={styles.messageTitle}>A note from {van.name}</AppText>
              <AppText variant="body" style={styles.messageText}>{van.vendorMessage}</AppText>
            </LinearGradient>
          </View>
        ) : null}

        {hasFoodCategories ? (
          <View style={styles.chipSection}>
            <AppText variant="label" style={styles.sectionEyebrow}>FOOD & SPECIALITIES</AppText>
            <View style={styles.chipWrap}>
              {(van.foodCategories ?? []).map((category) => (
                <View key={category} style={styles.chip}>
                  <AppText variant="body" style={styles.chipText}>{category}</AppText>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {hasGallery ? (
          <View style={styles.gallerySection}>
            <View style={styles.sectionHeadingRowStandalone}>
              <View>
                <AppText variant="label" style={styles.sectionEyebrow}>GALLERY</AppText>
                <AppText variant="heading" style={styles.sectionTitle}>A closer look</AppText>
              </View>
              <AppText variant="body" style={styles.galleryCount}>{galleryPhotos.length} photos</AppText>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.galleryRow}
            >
              {galleryPhotos.map((photoUri, index) => (
                <View key={`${photoUri}-${index}`} style={styles.galleryImageShell}>
                  <Image source={{ uri: photoUri }} style={styles.galleryImage} />
                </View>
              ))}
            </ScrollView>
          </View>
        ) : null}

        <MetallicFrame
          tone="blue"
          borderWidth={2}
          style={styles.contentFrame}
          contentStyle={{ borderRadius: 23 }}
        >
          <LinearGradient
            colors={["rgba(9,31,50,0.97)", "rgba(4,17,29,0.99)"]}
            style={styles.contentCard}
          >
            <View style={styles.sectionHeadingRow}>
              <View style={styles.sectionIconBlue}>
                <MaterialCommunityIcons name="silverware-fork-knife" size={20} color="#62B5FF" />
              </View>
              <View style={styles.sectionHeadingCopy}>
                <AppText variant="heading" style={styles.sectionTitle}>Menu</AppText>
                <AppText variant="body" style={styles.sectionSubtitle}>What’s on offer.</AppText>
              </View>
            </View>
            <SectionGlowLine />
            <AppText variant="body" style={styles.largeBodyText}>
              {hasMenu ? van.menu : "Menu details coming soon."}
            </AppText>

            {canShowPremiumBranding && van.menuPdfName ? (
              <Pressable
                style={[styles.inlineButton, isOpeningMenuPdf && styles.disabledButton]}
                onPress={openMenuPdf}
                disabled={isOpeningMenuPdf}
              >
                <MaterialCommunityIcons name="file-pdf-box" size={20} color="#F4B547" />
                <AppText variant="button" style={styles.inlineButtonText}>
                  {isOpeningMenuPdf ? "Opening menu..." : "Open full menu PDF"}
                </AppText>
                <MaterialCommunityIcons name="arrow-top-right" size={18} color="#F4B547" />
              </Pressable>
            ) : null}
          </LinearGradient>
        </MetallicFrame>

        <MetallicFrame
          tone="gold"
          borderWidth={1}
          style={styles.contentFrame}
          contentStyle={{ borderRadius: 23 }}
        >
          <LinearGradient
            colors={["rgba(12,36,56,0.97)", "rgba(5,19,32,0.99)"]}
            style={styles.contentCard}
          >
            <View style={styles.sectionHeadingRow}>
              <View style={styles.sectionIconGold}>
                <MaterialCommunityIcons name="clock-outline" size={20} color="#F4B547" />
              </View>
              <View style={styles.sectionHeadingCopy}>
                <AppText variant="heading" style={styles.sectionTitle}>When to find us</AppText>
                <AppText variant="body" style={styles.sectionSubtitle}>
                  Trading times and current availability.
                </AppText>
              </View>
            </View>
            <SectionGlowLine />

            <View style={styles.scheduleRow}>
              <View style={styles.scheduleCopy}>
                <AppText variant="label" style={styles.miniLabel}>SCHEDULE</AppText>
                <AppText variant="body" style={styles.largeBodyText}>
                  {hasSchedule ? van.schedule : "Schedule coming soon."}
                </AppText>
              </View>
              <View
                style={[
                  styles.liveStatePill,
                  van.isLive ? styles.liveStatePillLive : styles.liveStatePillOffline,
                ]}
              >
                <View style={[styles.liveDot, !van.isLive && styles.liveDotOffline]} />
                <AppText variant="label" style={styles.liveStateText}>
                  {van.isLive ? "LIVE NOW" : "OFFLINE"}
                </AppText>
              </View>
            </View>
          </LinearGradient>
        </MetallicFrame>

        {showSocialLinks || showPreciseLocation ? (
          <MetallicFrame
            tone="blue"
            borderWidth={1}
            style={styles.contentFrame}
            contentStyle={{ borderRadius: 23 }}
          >
            <LinearGradient
              colors={["rgba(9,30,50,0.97)", "rgba(4,17,29,0.99)"]}
              style={styles.contentCard}
            >
              <View style={styles.sectionHeadingRow}>
                <View style={styles.sectionIconBlue}>
                  <MaterialCommunityIcons name="link-variant" size={20} color="#62B5FF" />
                </View>
                <View style={styles.sectionHeadingCopy}>
                  <AppText variant="heading" style={styles.sectionTitle}>Find & follow</AppText>
                  <AppText variant="body" style={styles.sectionSubtitle}>Follow, browse and find out more.</AppText>
                </View>
              </View>
              <SectionGlowLine />

              {showSocialLinks ? (
                <View style={styles.linkGrid}>
                  {van.instagramUrl ? (
                    <Pressable
                      style={styles.linkTile}
                      onPress={() => Linking.openURL(ensureHttps(van.instagramUrl!))}
                    >
                      <MaterialCommunityIcons name="instagram" size={21} color="#F4B547" />
                      <AppText variant="button" style={styles.linkTileText}>Instagram</AppText>
                    </Pressable>
                  ) : null}

                  {van.facebookUrl ? (
                    <Pressable
                      style={styles.linkTile}
                      onPress={() => Linking.openURL(ensureHttps(van.facebookUrl!))}
                    >
                      <MaterialCommunityIcons name="facebook" size={21} color="#62B5FF" />
                      <AppText variant="button" style={styles.linkTileText}>Facebook</AppText>
                    </Pressable>
                  ) : null}

                  {van.websiteUrl ? (
                    <Pressable
                      style={styles.linkTile}
                      onPress={() => Linking.openURL(ensureHttps(van.websiteUrl!))}
                    >
                      <MaterialCommunityIcons name="web" size={21} color="#45E27B" />
                      <AppText variant="button" style={styles.linkTileText}>Website</AppText>
                    </Pressable>
                  ) : null}
                </View>
              ) : null}

              {showPreciseLocation ? (
                <Pressable
                  style={styles.preciseLocationRow}
                  onPress={() => Linking.openURL(`https://what3words.com/${van.what3words}`)}
                >
                  <View style={styles.preciseLocationIcon}>
                    <MaterialCommunityIcons name="map-marker-radius-outline" size={21} color="#F4B547" />
                  </View>
                  <View style={styles.preciseLocationCopy}>
                    <AppText variant="label" style={styles.miniLabel}>PRECISE LOCATION</AppText>
                    <AppText variant="body" style={styles.preciseLocationText}>///{van.what3words}</AppText>
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={22} color="#F4B547" />
                </Pressable>
              ) : null}
            </LinearGradient>
          </MetallicFrame>
        ) : null}

        {!isOwner ? (
          <MetallicFrame
            tone="gold"
            borderWidth={1}
            style={styles.contentFrame}
            contentStyle={{ borderRadius: 23 }}
          >
            <LinearGradient
              colors={["rgba(12,35,54,0.97)", "rgba(5,18,31,0.99)"]}
              style={styles.contentCard}
            >
              <View style={styles.sectionHeadingRow}>
                <View style={styles.sectionIconGold}>
                  <MaterialCommunityIcons name="star-outline" size={21} color="#F4B547" />
                </View>
                <View style={styles.sectionHeadingCopy}>
                  <AppText variant="heading" style={styles.sectionTitle}>Rate this vendor</AppText>
                  <AppText variant="body" style={styles.sectionSubtitle}>Help other customers discover great traders.</AppText>
                </View>
              </View>
              <SectionGlowLine />

              <View style={styles.ratingRow}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Pressable
                    key={star}
                    onPress={() => submitRating(star)}
                    disabled={isSubmittingRating}
                    style={styles.ratingStarButton}
                  >
                    <MaterialCommunityIcons
                      name={userRating && star <= userRating ? "star" : "star-outline"}
                      size={34}
                      color="#F4B547"
                    />
                  </Pressable>
                ))}
              </View>
              <AppText variant="body" style={styles.ratingHelp}>
                {userRating ? `Your rating: ${userRating}/5` : "Tap a star to leave your rating."}
              </AppText>
            </LinearGradient>
          </MetallicFrame>
        ) : null}

        {isSpotted && !isExpiredSpotted ? (
          <View style={styles.spottedActionsCard}>
            <AppText variant="heading" style={styles.sectionTitleSmall}>Is this your van?</AppText>
            <AppText variant="body" style={styles.sectionSubtitle}>
              Claim this community listing to manage its details on BiteBeacon.
            </AppText>
            <Pressable style={styles.claimButton} onPress={openClaimScreen}>
              <MaterialCommunityIcons name="shield-check-outline" size={20} color="#081521" />
              <AppText variant="button" style={styles.claimButtonText}>Claim this van</AppText>
            </Pressable>
          </View>
        ) : null}

        {!isOwner ? (
          <Pressable
            style={styles.reportLink}
            onPress={() => router.push({ pathname: "/vendor/report", params: { id: van.id } })}
          >
            <MaterialCommunityIcons name="flag-outline" size={17} color="rgba(255,255,255,0.56)" />
            <AppText variant="body" style={styles.reportLinkText}>Report this listing</AppText>
          </Pressable>
        ) : null}

        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <MaterialCommunityIcons name="chevron-left" size={20} color="#C7D2E0" />
          <AppText variant="button" style={styles.backButtonText}>Back</AppText>
        </Pressable>
      </ScrollView>
    </MapTextureBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent",
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 46,
  },
  centeredScreen: {
    flex: 1,
    backgroundColor: BG,
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
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  topBarEyebrow: {
    color: "#F4B547",
    letterSpacing: 1.7,
    fontSize: 11,
  },
  circleButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(6,24,40,0.92)",
    borderWidth: 1,
    borderColor: "rgba(244,181,71,0.40)",
  },
  circleButtonActive: {
    borderColor: "rgba(255,107,122,0.60)",
    backgroundColor: "rgba(54,19,29,0.80)",
  },
  heroShell: {
    position: "relative",
    marginBottom: 14,
  },
  heroFrame: {
    borderRadius: 28,
  },
  heroCard: {
    height: 410,
    borderRadius: 27,
    overflow: "hidden",
    position: "relative",
    backgroundColor: "#071827",
  },
  heroPhoto: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
  },
  heroPhotoPlaceholder: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  heroLogoOnly: {
    width: 132,
    height: 132,
    borderRadius: 32,
    backgroundColor: "rgba(255,255,255,0.96)",
    borderWidth: 2,
    borderColor: "rgba(244,181,71,0.72)",
  },
  heroPhotoPlaceholderText: {
    fontSize: 82,
    color: "rgba(244,181,71,0.92)",
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  heroTopBadges: {
    position: "absolute",
    top: 16,
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  statusPillLive: {
    backgroundColor: "rgba(18,71,46,0.88)",
    borderColor: "rgba(69,226,123,0.65)",
  },
  statusPillListed: {
    backgroundColor: "rgba(9,28,45,0.88)",
    borderColor: "rgba(98,181,255,0.45)",
  },
  statusPillSpotted: {
    backgroundColor: "rgba(74,48,11,0.88)",
    borderColor: "rgba(244,181,71,0.65)",
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#F4B547",
  },
  statusPillText: {
    color: WHITE,
    fontSize: 11,
    letterSpacing: 0.5,
  },
  proPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: "rgba(7,20,33,0.86)",
    borderWidth: 1,
    borderColor: "rgba(244,181,71,0.50)",
  },
  proPillText: {
    color: "#F4B547",
    fontSize: 11,
  },
  heroBottom: {
    position: "absolute",
    left: 18,
    right: 18,
    bottom: 18,
  },
  heroTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  logoBadge: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.96)",
    borderWidth: 2,
    borderColor: "#F4B547",
  },
  heroTitleCopy: {
    flex: 1,
  },
  heroTitle: {
    color: WHITE,
    fontSize: 31,
    lineHeight: 36,
  },
  heroCuisine: {
    color: "rgba(255,255,255,0.76)",
    marginTop: 2,
    fontSize: 15,
  },
  heroMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    minHeight: 26,
  },
  heroMetaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  heroMetaValue: {
    color: WHITE,
    fontWeight: "800",
  },
  heroMetaMuted: {
    color: "rgba(255,255,255,0.66)",
    flexShrink: 1,
  },
  metaDivider: {
    width: 1,
    height: 18,
    backgroundColor: "rgba(255,255,255,0.18)",
    marginHorizontal: 12,
  },
  primaryActionsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },
  primaryAction: {
    flex: 1,
    minHeight: 72,
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    gap: 10,
  },
  primaryActionGold: {
    backgroundColor: "rgba(34,32,22,0.91)",
    borderColor: "rgba(244,181,71,0.48)",
  },
  primaryActionBlue: {
    backgroundColor: "rgba(8,31,51,0.94)",
    borderColor: "rgba(98,181,255,0.42)",
  },
  actionCopy: {
    flex: 1,
  },
  primaryActionTitle: {
    color: WHITE,
    fontSize: 14,
  },
  primaryActionHint: {
    color: "rgba(255,255,255,0.54)",
    fontSize: 11,
    marginTop: 2,
  },
  ownerStrip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 16,
    backgroundColor: "rgba(8,31,51,0.82)",
    borderWidth: 1,
    borderColor: "rgba(98,181,255,0.28)",
    marginBottom: 14,
  },
  ownerStripText: {
    flex: 1,
    color: "rgba(255,255,255,0.70)",
    fontSize: 12,
  },
  communityCard: {
    padding: 16,
    borderRadius: 22,
    backgroundColor: "rgba(48,37,19,0.92)",
    borderWidth: 1,
    borderColor: "rgba(244,181,71,0.45)",
    marginBottom: 14,
  },
  expiryPill: {
    marginTop: 12,
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 7,
    backgroundColor: "rgba(244,181,71,0.14)",
    borderWidth: 1,
    borderColor: "rgba(244,181,71,0.38)",
  },
  expiryPillText: {
    color: "#F4B547",
    fontSize: 10,
  },
  messageShell: {
    position: "relative",
    marginBottom: 14,
  },
  messageCard: {
    padding: 18,
    borderRadius: 22,
    minHeight: 140,
  },
  messageHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  messageEyebrow: {
    color: "#F4B547",
    fontSize: 10,
    letterSpacing: 1.35,
  },
  messageTitle: {
    color: WHITE,
    fontSize: 20,
    marginBottom: 8,
  },
  messageText: {
    color: "rgba(255,255,255,0.80)",
    fontSize: 15,
    lineHeight: 23,
  },
  chipSection: {
    marginBottom: 16,
  },
  sectionEyebrow: {
    color: "#F4B547",
    fontSize: 10,
    letterSpacing: 1.35,
    marginBottom: 10,
  },
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    borderRadius: 999,
    paddingHorizontal: 13,
    paddingVertical: 8,
    backgroundColor: "rgba(9,32,52,0.90)",
    borderWidth: 1,
    borderColor: "rgba(98,181,255,0.30)",
  },
  chipText: {
    color: "rgba(255,255,255,0.82)",
    fontSize: 12,
  },
  contentFrame: {
    borderRadius: 24,
    marginBottom: 14,
  },
  contentCard: {
    borderRadius: 23,
    padding: 18,
  },
  sectionHeadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  sectionHeadingRowStandalone: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sectionHeadingCopy: {
    flex: 1,
  },
  sectionIconGold: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(244,181,71,0.09)",
    borderWidth: 1,
    borderColor: "rgba(244,181,71,0.28)",
  },
  sectionIconBlue: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(98,181,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(98,181,255,0.26)",
  },
  sectionTitle: {
    color: WHITE,
    fontSize: 20,
  },
  sectionTitleSmall: {
    color: WHITE,
    fontSize: 17,
  },
  sectionSubtitle: {
    color: "rgba(255,255,255,0.60)",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 2,
  },
  largeBodyText: {
    color: "rgba(255,255,255,0.86)",
    fontSize: 15,
    lineHeight: 23,
  },
  inlineButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    marginTop: 16,
    minHeight: 50,
    borderRadius: 16,
    paddingHorizontal: 14,
    backgroundColor: "rgba(244,181,71,0.08)",
    borderWidth: 1,
    borderColor: "rgba(244,181,71,0.34)",
  },
  inlineButtonText: {
    color: "#F4B547",
    flex: 1,
    fontSize: 13,
  },
  scheduleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  scheduleCopy: {
    flex: 1,
  },
  miniLabel: {
    color: "rgba(255,255,255,0.48)",
    fontSize: 9,
    letterSpacing: 1.1,
    marginBottom: 5,
  },
  liveStatePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
  },
  liveStatePillLive: {
    backgroundColor: "rgba(24,76,49,0.80)",
    borderColor: "rgba(69,226,123,0.44)",
  },
  liveStatePillOffline: {
    backgroundColor: "rgba(20,33,46,0.80)",
    borderColor: "rgba(255,255,255,0.12)",
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#45E27B",
  },
  liveDotOffline: {
    backgroundColor: "#718197",
  },
  liveStateText: {
    color: WHITE,
    fontSize: 10,
  },
  linkGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  linkTile: {
    flexGrow: 1,
    minWidth: "30%",
    minHeight: 50,
    borderRadius: 15,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    backgroundColor: "rgba(13,39,62,0.84)",
    borderWidth: 1,
    borderColor: "rgba(98,181,255,0.22)",
  },
  linkTileText: {
    color: WHITE,
    fontSize: 11,
  },
  preciseLocationRow: {
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
    paddingTop: 14,
    flexDirection: "row",
    alignItems: "center",
  },
  preciseLocationIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(244,181,71,0.08)",
  },
  preciseLocationCopy: {
    flex: 1,
    marginLeft: 11,
  },
  preciseLocationText: {
    color: WHITE,
    fontSize: 14,
  },
  gallerySection: {
    marginBottom: 16,
  },
  galleryCount: {
    color: "rgba(255,255,255,0.52)",
    fontSize: 11,
  },
  galleryRow: {
    paddingRight: 8,
    gap: 12,
  },
  galleryImageShell: {
    width: 270,
    height: 190,
    borderRadius: 22,
    padding: 2,
    backgroundColor: "rgba(244,181,71,0.62)",
  },
  galleryImage: {
    width: "100%",
    height: "100%",
    borderRadius: 20,
    backgroundColor: "#0A2137",
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    maxWidth: 300,
    alignSelf: "center",
    width: "100%",
  },
  ratingStarButton: {
    padding: 4,
  },
  ratingHelp: {
    marginTop: 10,
    textAlign: "center",
    color: "rgba(255,255,255,0.58)",
    fontSize: 12,
  },
  spottedActionsCard: {
    borderRadius: 22,
    padding: 18,
    marginBottom: 14,
    backgroundColor: "rgba(40,32,18,0.92)",
    borderWidth: 1,
    borderColor: "rgba(244,181,71,0.38)",
  },
  claimButton: {
    marginTop: 14,
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: "#F4B547",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  claimButtonText: {
    color: "#081521",
  },
  reportLink: {
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  reportLinkText: {
    color: "rgba(255,255,255,0.52)",
    fontSize: 12,
  },
  ownerQualityCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
    padding: 14,
    borderRadius: 18,
    backgroundColor: "rgba(19,34,39,0.94)",
    borderWidth: 1,
    borderColor: "rgba(244,181,71,0.34)",
  },
  ownerQualityIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(244,181,71,0.08)",
    borderWidth: 1,
    borderColor: "rgba(244,181,71,0.22)",
  },
  ownerQualityCopy: {
    flex: 1,
  },
  ownerQualityTitle: {
    color: WHITE,
    marginBottom: 3,
  },
  ownerQualityText: {
    color: TEXT_MUTED,
    fontSize: 12,
    lineHeight: 17,
  },
  ownerQualityButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(244,181,71,0.08)",
    borderWidth: 1,
    borderColor: "rgba(244,181,71,0.32)",
  },
  backButton: {
    minHeight: 50,
    borderRadius: 17,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    backgroundColor: "rgba(8,29,48,0.88)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  backButtonText: {
    color: "#C7D2E0",
  },
  disabledButton: {
    opacity: 0.6,
  },

  // Legacy helper styles retained so existing helper components remain valid.
  statCard: {
    flex: 1,
    backgroundColor: "rgba(13,40,65,0.90)",
    borderRadius: 16,
    padding: 12,
    alignItems: "center",
  },
  statLabel: {
    color: "rgba(255,255,255,0.52)",
    fontSize: 10,
  },
  statValue: {
    color: WHITE,
    fontSize: 18,
    fontWeight: "800",
  },
  sectionBlock: {
    marginBottom: 18,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  badgeText: {
    color: WHITE,
    fontSize: 10,
    fontWeight: "800",
  },
  heroShellCompact: {
    minHeight: 0,
  },
  compactHeroCard: {
    padding: 22,
    minHeight: 210,
    justifyContent: "space-between",
  },
  compactHeroTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  compactIdentityVisual: {
    width: 88,
    height: 88,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: "rgba(244,181,71,0.55)",
    backgroundColor: "rgba(19,52,106,0.72)",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  compactIdentityLogo: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  compactIdentityInitial: {
    color: "#F4B547",
    fontSize: 36,
  },
  compactHeroCopy: {
    flex: 1,
  },
  compactHeroBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 20,
  },
  heroVendorName: {
    color: "rgba(255,255,255,0.82)",
    marginBottom: 2,
  },
  snapshotFrame: {
    marginBottom: 16,
  },
  snapshotCard: {
    padding: 18,
    borderRadius: 21,
  },
  snapshotHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  snapshotTitle: {
    color: WHITE,
    fontSize: 22,
    marginTop: 2,
  },
  managedPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(69,226,123,0.34)",
    backgroundColor: "rgba(69,226,123,0.08)",
  },
  managedPillText: {
    color: "#45E27B",
    fontSize: 9,
  },
  snapshotGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 2,
  },
  snapshotItem: {
    width: "48%",
    minHeight: 94,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(98,181,255,0.20)",
    backgroundColor: "rgba(8,29,49,0.70)",
    padding: 12,
  },
  snapshotLabel: {
    color: "rgba(255,255,255,0.52)",
    fontSize: 10,
    marginTop: 8,
    marginBottom: 3,
  },
  snapshotValue: {
    color: "rgba(255,255,255,0.90)",
    fontSize: 14,
    lineHeight: 19,
  },

});
