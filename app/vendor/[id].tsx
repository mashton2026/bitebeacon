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
          ? "LIVE"
          : "LISTED"
        : "LISTED";

  const primaryVisual = van.logoUrl ?? galleryPhotos[0] ?? null;
  const showLogoSection = !!van.logoUrl;

  const showSocialLinks =
    (van.subscriptionTier === "growth" || van.subscriptionTier === "pro") &&
    (van.instagramUrl || van.facebookUrl || van.websiteUrl);

  const showPreciseLocation =
    !!van.what3words &&
    (van.subscriptionTier === "growth" || van.subscriptionTier === "pro");

  const ratingDisplay = ratingCount >= 3 ? van.rating.toFixed(1) : "N/A";

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerAccent} />

      <View style={styles.heroWrap}>
        <View style={styles.heroGlow} />

        <View style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View style={styles.heroCopy}>
              <Text style={styles.heroEyebrow}>BiteBeacon Listing</Text>
              <Text style={styles.heroTitle}>{van.name}</Text>
              <Text style={styles.heroSubtitle}>{van.cuisine}</Text>

              <View style={styles.badgeRow}>
                <Badge
                  label={statusText}
                  style={
                    van.listingSource === "user_spotted"
                      ? styles.badgeOrange
                      : features.liveStatus
                        ? van.isLive
                          ? styles.badgeGreen
                          : styles.badgeBlue
                        : styles.badgeBlue
                  }
                />

                {isProTier(van.subscriptionTier) ? (
                  <Badge label="PRO" style={styles.badgeMuted} />
                ) : null}

                {van.owner_id && van.listingSource !== "user_spotted" ? (
                  <Badge label="VENDOR MANAGED" style={styles.badgeOutline} />
                ) : null}

                {isProTier(van.subscriptionTier) ? (
                  <Badge label="FEATURED" style={styles.badgeOrange} />
                ) : null}

                {isProTier(van.subscriptionTier) &&
                  (van.views ?? 0) >= 25 &&
                  (van.directions ?? 0) >= 5 &&
                  (van.rating ?? 0) >= 4.2 ? (
                  <Badge
                    label="TRENDING"
                    style={styles.badgeLight}
                    textStyle={styles.badgeLightText}
                  />
                ) : null}
              </View>
            </View>

            {primaryVisual ? (
              <Image source={{ uri: primaryVisual }} style={styles.heroImage} />
            ) : (
              <View style={styles.heroImagePlaceholder}>
                <Text style={styles.heroImagePlaceholderText}>
                  {van.name?.charAt(0)?.toUpperCase() ?? "V"}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.statsRow}>
            <StatCard label="Rating" value={ratingDisplay} />
            <StatCard label="Views" value={van.views ?? 0} />
            <StatCard label="Directions" value={van.directions ?? 0} />
          </View>

          {isProTier(van.subscriptionTier) &&
            showSocials &&
            (van.instagramUrl || van.facebookUrl || van.websiteUrl) ? (
            <View style={styles.heroActionsInline}>
              {van.instagramUrl ? (
                <Pressable
                  style={styles.iconButton}
                  onPress={() => Linking.openURL(ensureHttps(van.instagramUrl!))}
                >
                  <Text style={styles.iconButtonText}>📸</Text>
                </Pressable>
              ) : null}

              {van.facebookUrl ? (
                <Pressable
                  style={styles.iconButton}
                  onPress={() => Linking.openURL(ensureHttps(van.facebookUrl!))}
                >
                  <Text style={styles.iconButtonText}>📘</Text>
                </Pressable>
              ) : null}

              {van.websiteUrl ? (
                <Pressable
                  style={styles.iconButton}
                  onPress={() => Linking.openURL(ensureHttps(van.websiteUrl!))}
                >
                  <Text style={styles.iconButtonText}>🌐</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}
        </View>
      </View>

      {isOwner ? (
        <View style={[styles.noticeCard, styles.noticeBlue]}>
          <Text style={styles.noticeTitle}>Your Listing</Text>
          <Text style={styles.noticeText}>
            You are viewing your own vendor listing.
          </Text>
        </View>
      ) : null}

      {isOwner && isFreeTier(van.subscriptionTier) ? (
        <View style={[styles.noticeCard, styles.noticeOrange]}>
          <Text style={[styles.noticeTitle, styles.noticeOrangeText]}>
            Unlock More Features
          </Text>
          <Text style={styles.noticeText}>
            Upgrade your plan to go live, add more content, strengthen branding,
            and reach more customers.
          </Text>

          <Pressable
            style={styles.primaryOrangeButton}
            onPress={() => router.push("/vendor/upgrade")}
          >
            <Text style={styles.primaryOrangeButtonText}>Upgrade Now</Text>
          </Pressable>
        </View>
      ) : null}

      {van.listingSource === "user_spotted" ? (
        <View style={[styles.noticeCard, styles.noticeOrange]}>
          <Text style={[styles.noticeTitle, styles.noticeOrangeText]}>
            Community Spotted
          </Text>
          <Text style={styles.noticeText}>
            This listing was spotted by the community and is not yet verified by
            the vendor. Details may change once the vendor claims and manages this
            listing.
          </Text>

          {getExpiryText(van.expiresAt) ? (
            <View style={styles.expiryPill}>
              <Text style={styles.expiryPillText}>
                {getExpiryText(van.expiresAt)}
              </Text>
            </View>
          ) : null}
        </View>
      ) : van.owner_id ? (
        <View style={[styles.noticeCard, styles.noticeGreen]}>
          <Text style={[styles.noticeTitle, styles.noticeGreenText]}>
            Vendor Managed
          </Text>
          <Text style={styles.noticeText}>
            This listing is managed directly by the vendor through BiteBeacon and
            is a verified vendor-managed listing.
          </Text>
        </View>
      ) : null}

      {showLogoSection ? (
        <Section title="Branding">
          <View style={styles.brandCard}>
            <Image source={{ uri: van.logoUrl! }} style={styles.brandLogo} />
            <View style={styles.brandContent}>
              <Text style={styles.brandTitle}>{van.vendorName || van.name}</Text>
              <Text style={styles.brandText}>
                This vendor has added branded profile assets through BiteBeacon.
              </Text>
            </View>
          </View>
        </Section>
      ) : null}

      {features.reviews && van.vendorMessage ? (
        <Section title="Today’s Update">
          <View style={styles.featureCard}>
            <Text style={styles.featureText}>{van.vendorMessage}</Text>
          </View>
        </Section>
      ) : null}

      {(van.foodCategories ?? []).length > 0 ? (
        <Section title="Food Categories">
          <View style={styles.chipWrap}>
            {(van.foodCategories ?? []).map((category) => (
              <View key={category} style={styles.chip}>
                <Text style={styles.chipText}>{category}</Text>
              </View>
            ))}
          </View>
        </Section>
      ) : null}

      <Section title="Vendor">
        <View style={styles.infoCard}>
          <Text style={styles.infoPrimary}>
            {van.vendorName || "Vendor name coming soon"}
          </Text>

          {showSocialLinks ? (
            <View style={styles.linkList}>
              {van.instagramUrl ? (
                <Pressable
                  style={styles.linkButton}
                  onPress={() => Linking.openURL(ensureHttps(van.instagramUrl!))}
                >
                  <Text style={styles.linkButtonText}>📸 Instagram</Text>
                </Pressable>
              ) : null}

              {van.facebookUrl ? (
                <Pressable
                  style={styles.linkButton}
                  onPress={() => Linking.openURL(ensureHttps(van.facebookUrl!))}
                >
                  <Text style={styles.linkButtonText}>📘 Facebook</Text>
                </Pressable>
              ) : null}

              {van.websiteUrl ? (
                <Pressable
                  style={styles.linkButton}
                  onPress={() => Linking.openURL(ensureHttps(van.websiteUrl!))}
                >
                  <Text style={styles.linkButtonText}>🌐 Website</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}

          {isOwner && isFreeTier(van.subscriptionTier) ? (
            <Pressable
              style={styles.lockHint}
              onPress={() => router.push("/vendor/upgrade")}
            >
              <Text style={styles.lockHintText}>
                Upgrade to Growth or Pro to display social links on your listing.
              </Text>
            </Pressable>
          ) : null}
        </View>
      </Section>

      <Section title="Menu">
        <View style={styles.infoCard}>
          <Text style={styles.infoText}>{van.menu || "Menu coming soon"}</Text>

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
      </Section>

      <Section title="Schedule">
        <View style={styles.infoCard}>
          <Text style={styles.infoText}>
            {van.schedule || "Schedule coming soon"}
          </Text>
        </View>
      </Section>

      {showPreciseLocation ? (
        <Section title="Precise Location">
          <View style={styles.infoCard}>
            <Text style={styles.infoPrimary}>///{van.what3words}</Text>

            <Pressable
              style={styles.secondaryButton}
              onPress={() =>
                Linking.openURL(`https://what3words.com/${van.what3words}`)
              }
            >
              <Text style={styles.secondaryButtonText}>Open in what3words</Text>
            </Pressable>
          </View>
        </Section>
      ) : null}

      {isOwner && isFreeTier(van.subscriptionTier) ? (
        <Section title="Precise Location">
          <View style={styles.infoCard}>
            <Pressable
              style={styles.lockHint}
              onPress={() => router.push("/vendor/upgrade")}
            >
              <Text style={styles.lockHintText}>
                Upgrade to Growth or Pro to display what3words on your listing.
              </Text>
            </Pressable>
          </View>
        </Section>
      ) : null}

      {!isOwner ? (
        <Section title="Rate this vendor">
          <View style={styles.rateCard}>
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
            <Text style={styles.rateHelp}>
              Tap a star to leave your rating.
            </Text>
          </View>
        </Section>
      ) : null}

      <Section title="Actions">
        <View style={styles.actionCard}>
          {isOwner ? (
            <>
              <View style={styles.ownerStatusCard}>
                <Text style={styles.ownerStatusLabel}>Listing status</Text>
                <View
                  style={[
                    styles.ownerStatusPill,
                    van.isLive ? styles.ownerStatusPillLive : styles.ownerStatusPillOffline,
                  ]}
                >
                  <Text style={styles.ownerStatusPillText}>
                    {van.isLive ? "LIVE" : "OFFLINE"}
                  </Text>
                </View>
              </View>

              <Pressable
                style={[
                  styles.secondaryActionButton,
                  isOpeningDirections && styles.disabledButton,
                ]}
                onPress={openDirections}
                disabled={isOpeningDirections}
              >
                <Text style={styles.secondaryActionButtonText}>
                  {isOpeningDirections ? "Opening..." : "Get Directions"}
                </Text>
              </Pressable>

              <Pressable
                style={styles.secondaryActionButton}
                onPress={() =>
                  router.push({
                    pathname: "/vendor/dashboard",
                    params: { id: van.id },
                  })
                }
              >
                <Text style={styles.secondaryActionButtonText}>Manage Listing</Text>
              </Pressable>
            </>
          ) : van.listingSource === "user_spotted" &&
            !(van.expiresAt && new Date(van.expiresAt) < new Date()) ? (
            <>
              <Pressable
                style={[
                  styles.secondaryActionButton,
                  isOpeningDirections && styles.disabledButton,
                ]}
                onPress={openDirections}
                disabled={isOpeningDirections}
              >
                <Text style={styles.secondaryActionButtonText}>
                  {isOpeningDirections ? "Opening..." : "Get Directions"}
                </Text>
              </Pressable>

              <Pressable style={styles.primaryOrangeButton} onPress={openClaimScreen}>
                <Text style={styles.primaryOrangeButtonText}>Claim This Van</Text>
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
                  styles.secondaryActionButton,
                  isOpeningDirections && styles.disabledButton,
                ]}
                onPress={openDirections}
                disabled={isOpeningDirections}
              >
                <Text style={styles.secondaryActionButtonText}>
                  {isOpeningDirections ? "Opening..." : "Get Directions"}
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.secondaryActionButton,
                  isSavingFavourite && styles.disabledButton,
                ]}
                onPress={toggleFavourite}
                disabled={isSavingFavourite}
              >
                <Text style={styles.secondaryActionButtonText}>
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
      </Section>

      {galleryPhotos.length > 0 ? (
        <Section title="Gallery">
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
        </Section>
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
    backgroundColor: BG,
  },

  content: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 44,
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

  headerAccent: {
    height: 4,
    width: 96,
    borderRadius: 999,
    backgroundColor: ORANGE,
    alignSelf: "center",
    marginBottom: 16,
    opacity: 0.95,
  },

  heroWrap: {
    marginBottom: 18,
    position: "relative",
  },

  heroGlow: {
    position: "absolute",
    top: 14,
    left: 18,
    right: 18,
    height: 120,
    borderRadius: 28,
    backgroundColor: "rgba(255,122,0,0.12)",
  },

  heroCard: {
    backgroundColor: CARD,
    borderRadius: 28,
    padding: 18,
    borderWidth: 1,
    borderColor: STROKE_STRONG,
    shadowColor: "#000",
    shadowOpacity: 0.22,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 7,
  },

  heroTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
  },

  heroCopy: {
    flex: 1,
  },

  heroEyebrow: {
    fontSize: 11,
    fontWeight: "800",
    color: ORANGE_SOFT,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 6,
  },

  heroTitle: {
    fontSize: 28,
    fontWeight: "900",
    color: WHITE,
    marginBottom: 4,
  },

  heroSubtitle: {
    fontSize: 15,
    fontWeight: "700",
    color: TEXT_MUTED,
    marginBottom: 12,
  },

  heroImage: {
    width: 92,
    height: 92,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: ORANGE_SOFT,
    backgroundColor: CARD_ALT,
  },

  heroImagePlaceholder: {
    width: 92,
    height: 92,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: ORANGE_SOFT,
    backgroundColor: CARD_ALT,
    alignItems: "center",
    justifyContent: "center",
  },

  heroImagePlaceholderText: {
    color: WHITE,
    fontSize: 28,
    fontWeight: "900",
  },

  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  badge: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
  },

  badgeText: {
    color: WHITE,
    fontSize: 11,
    fontWeight: "800",
  },

  badgeOrange: {
    backgroundColor: ORANGE,
  },

  badgeGreen: {
    backgroundColor: GREEN,
  },

  badgeBlue: {
    backgroundColor: OFFLINE,
  },

  badgeMuted: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },

  badgeOutline: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: STROKE_STRONG,
  },

  badgeLight: {
    backgroundColor: WHITE,
  },

  badgeLightText: {
    color: ORANGE,
  },

  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
  },

  statCard: {
    flex: 1,
    backgroundColor: CARD_ALT,
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: STROKE,
    alignItems: "center",
  },

  statLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: TEXT_SOFT,
    textTransform: "uppercase",
    marginBottom: 5,
    textAlign: "center",
  },

  statValue: {
    fontSize: 18,
    fontWeight: "900",
    color: WHITE,
  },

  heroActionsInline: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },

  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: WHITE,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: ORANGE,
  },

  iconButtonText: {
    fontSize: 17,
  },

  sectionBlock: {
    marginBottom: 22,
  },

  sectionTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: WHITE,
    marginBottom: 12,
  },

  noticeCard: {
    borderRadius: 22,
    padding: 16,
    marginBottom: 18,
    borderWidth: 1,
  },

  noticeBlue: {
    backgroundColor: BG_ALT,
    borderColor: STROKE_STRONG,
  },

  noticeOrange: {
    backgroundColor: "rgba(255,122,0,0.10)",
    borderColor: STROKE_STRONG,
  },

  noticeGreen: {
    backgroundColor: "rgba(29,185,84,0.10)",
    borderColor: "rgba(29,185,84,0.45)",
  },

  noticeTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: WHITE,
    marginBottom: 5,
  },

  noticeOrangeText: {
    color: ORANGE_SOFT,
  },

  noticeGreenText: {
    color: GREEN,
  },

  noticeText: {
    fontSize: 14,
    lineHeight: 21,
    color: TEXT_MUTED,
  },

  expiryPill: {
    marginTop: 10,
    alignSelf: "flex-start",
    backgroundColor: ORANGE,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },

  expiryPillText: {
    color: WHITE,
    fontSize: 11,
    fontWeight: "800",
  },

  brandCard: {
    backgroundColor: CARD_SOFT,
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: STROKE_STRONG,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },

  brandLogo: {
    width: 76,
    height: 76,
    borderRadius: 20,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: STROKE,
  },

  brandContent: {
    flex: 1,
  },

  brandTitle: {
    fontSize: 17,
    fontWeight: "900",
    color: WHITE,
    marginBottom: 4,
  },

  brandText: {
    fontSize: 14,
    lineHeight: 20,
    color: TEXT_MUTED,
  },

  featureCard: {
    backgroundColor: CARD,
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: STROKE_STRONG,
  },

  featureText: {
    fontSize: 14,
    lineHeight: 21,
    color: "rgba(255,255,255,0.88)",
  },

  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },

  chip: {
    backgroundColor: CARD_ALT,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: STROKE_STRONG,
  },

  chipText: {
    color: WHITE,
    fontSize: 13,
    fontWeight: "800",
  },

  infoCard: {
    backgroundColor: CARD_SOFT,
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: STROKE,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },

  infoPrimary: {
    fontSize: 16,
    lineHeight: 23,
    color: WHITE,
    fontWeight: "800",
  },

  infoText: {
    fontSize: 15,
    lineHeight: 22,
    color: "rgba(255,255,255,0.90)",
  },

  linkList: {
    marginTop: 14,
    gap: 10,
  },

  linkButton: {
    backgroundColor: WHITE,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: ORANGE,
  },

  linkButtonText: {
    color: "#0B2A5B",
    fontWeight: "800",
    fontSize: 14,
  },

  lockHint: {
    marginTop: 14,
    backgroundColor: "rgba(255,122,0,0.12)",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: ORANGE,
  },

  lockHintText: {
    color: ORANGE_SOFT,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
  },

  rateCard: {
    backgroundColor: CARD_SOFT,
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: STROKE,
  },

  ratingRow: {
    flexDirection: "row",
    gap: 8,
  },

  ratingStar: {
    fontSize: 30,
    color: WHITE,
  },

  rateHelp: {
    marginTop: 10,
    fontSize: 13,
    color: TEXT_MUTED,
    lineHeight: 18,
  },

  ownerStatusCard: {
    backgroundColor: CARD_ALT,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderWidth: 1.2,
    borderColor: "rgba(255,255,255,0.12)",
    marginBottom: 12,
  },

  ownerStatusLabel: {
    color: "rgba(255,255,255,0.68)",
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 8,
    textTransform: "uppercase",
  },

  ownerStatusPill: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },

  ownerStatusPillLive: {
    backgroundColor: GREEN,
  },

  ownerStatusPillOffline: {
    backgroundColor: OFFLINE,
  },

  ownerStatusPillText: {
    color: WHITE,
    fontSize: 12,
    fontWeight: "800",
  },

  actionCard: {
    backgroundColor: BG_ALT,
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: STROKE_STRONG,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 4,
    gap: 12,
  },

  primaryActionButton: {
    paddingVertical: 16,
    borderRadius: 18,
    alignItems: "center",
    borderWidth: 1.5,
  },

  primaryActionButtonText: {
    color: WHITE,
    fontSize: 16,
    fontWeight: "900",
  },

  primaryActionLive: {
    backgroundColor: GREEN,
    borderColor: "rgba(255,255,255,0.22)",
  },

  primaryActionOffline: {
    backgroundColor: OFFLINE,
    borderColor: "rgba(255,255,255,0.18)",
  },

  secondaryActionButton: {
    backgroundColor: CARD_ALT,
    paddingVertical: 15,
    borderRadius: 18,
    alignItems: "center",
    borderWidth: 1,
    borderColor: STROKE_STRONG,
  },

  secondaryActionButtonText: {
    color: WHITE,
    fontSize: 15,
    fontWeight: "800",
  },

  primaryOrangeButton: {
    backgroundColor: ORANGE,
    paddingVertical: 15,
    borderRadius: 18,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: ORANGE_SOFT,
  },

  primaryOrangeButtonText: {
    color: WHITE,
    fontSize: 15,
    fontWeight: "900",
  },

  reportButton: {
    backgroundColor: "transparent",
    paddingVertical: 15,
    borderRadius: 18,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: RED,
  },

  reportButtonText: {
    color: "#FFB3B3",
    fontSize: 15,
    fontWeight: "800",
  },

  secondaryButton: {
    marginTop: 14,
    backgroundColor: CARD_ALT,
    borderWidth: 1,
    borderColor: STROKE_STRONG,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
  },

  secondaryButtonText: {
    color: WHITE,
    fontWeight: "800",
    textAlign: "center",
    fontSize: 14,
  },

  galleryRow: {
    paddingRight: 8,
  },

  galleryImage: {
    width: 280,
    height: 200,
    borderRadius: 24,
    marginRight: 12,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: STROKE_STRONG,
  },

  backButton: {
    backgroundColor: CARD_ALT,
    paddingVertical: 15,
    borderRadius: 18,
    alignItems: "center",
    marginTop: 6,
    borderWidth: 1,
    borderColor: STROKE_STRONG,
  },

  backButtonText: {
    color: WHITE,
    fontSize: 15,
    fontWeight: "900",
  },

  disabledButton: {
    opacity: 0.7,
  },
});