import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import MapView, { Marker } from "react-native-maps";
import { getSubscriptionFeatures } from "../../lib/subscriptionFeatures";
import { supabase } from "../../lib/supabase";
import {
  getCurrentUser,
  signOutCurrentUser
} from "../../services/authService";
import {
  getVendorMenuPdfSignedUrl,
  uploadVendorLogo,
  uploadVendorMenuPdf,
  uploadVendorPhotos,
} from "../../services/storageService";
import {
  getMyVendorClaims,
  type VendorClaim,
} from "../../services/vendorClaimService";
import { getVendorByOwnerId } from "../../services/vendorService";
import { type Van } from "../../types/van";

type AssetAwareVan = Van & {
  photos?: string[];
  menuPdfUrl?: string | null;
  menuPdfName?: string | null;
  logoUrl?: string | null;
  logoPath?: string | null;
};

type InsightPoint = {
  day?: string;
  hour?: number;
  total: number;
};

type AdvancedInsights = {
  views: number;
  directions: number;
  conversion_rate: number;
  daily_views: InsightPoint[];
  peak_hours: InsightPoint[];
};

type HeatmapPoint = {
  lat: number;
  lng: number;
  weight: number;
};

type DashboardSectionKey =
  | "insights"
  | "branding"
  | "growth"
  | "guide"
  | "health"
  | "assets"
  | "edit"
  | "account";

const NAVY = "#0B2A5B";
const NAVY_DEEP = "#081F45";
const WHITE = "#FFFFFF";
const ORANGE = "#FF7A00";
const ORANGE_SOFT = "#FFB357";
const GREEN = "#1DB954";
const OFFLINE = "#888888";
const CARD_BG = "#FFFFFF";
const MUTED_TEXT = "#5F6368";
const SOFT_BG = "#F5F7FA";
const SOFT_BORDER = "rgba(255,122,0,0.35)";
const THIN_BLACK = "rgba(0,0,0,0.14)";
const SOFT_ORANGE_BG = "#FFF4E8";
const SOFT_ORANGE_BORDER = "#FFD1A6";
const DARK_TEXT = "#0B2A5B";

const DEFAULT_FOOD_CATEGORY_SUGGESTIONS = [
  "Burgers",
  "Smash Burgers",
  "Fries",
  "Loaded Fries",
  "Hot Dogs",
  "BBQ",
  "Fried Chicken",
  "Pizza",
  "Tacos",
  "Mexican",
  "Sandwiches",
  "Wraps",
  "Kebabs",
  "Asian",
  "Indian",
  "Caribbean",
  "Seafood",
  "Vegan",
  "Vegetarian",
  "Desserts",
  "Ice Cream",
  "Donuts",
  "Cakes",
  "Coffee",
  "Drinks",
  "Breakfast",
  "Greek",
  "Turkish",
  "Middle Eastern",
  "Persian",
  "Thai",
  "Chinese",
  "Japanese",
  "Korean",
  "Filipino",
  "Vietnamese",
  "Street Food",
  "Steak",
  "Grill",
  "Peri Peri",
  "Rotisserie",
  "Wings",
  "Loaded Wraps",
  "Loaded Nachos",
  "Quesadillas",
  "Burritos",
  "Milkshakes",
  "Smoothies",
  "Bubble Tea",
  "Waffles",
  "Churros",
  "Sweet Treats",
];

function isLocalFileUri(uri: string) {
  return /^(file|content|ph|asset|assets-library):/i.test(uri);
}

function getPeakHourLabel(hour: number) {
  const safeHour = Number.isFinite(hour) ? hour : 0;
  const suffix = safeHour >= 12 ? "PM" : "AM";
  const normalized = safeHour % 12 || 12;
  return `${normalized}${suffix}`;
}

function formatInsightDay(dateString: string) {
  const date = new Date(`${dateString}T00:00:00`);
  return date.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

async function getReadableLocation(lat: number, lng: number) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
    );

    if (!res.ok) {
      return "Unknown area";
    }

    const data = await res.json();
    const address = data.address;

    return (
      address?.town ||
      address?.city ||
      address?.village ||
      address?.county ||
      "Unknown area"
    );
  } catch {
    return "Unknown area";
  }
}
function getTopDay(points: InsightPoint[]) {
  const valid = points.filter(
    (point): point is InsightPoint & { day: string } => !!point.day
  );

  if (valid.length === 0) return null;

  return [...valid].sort((a, b) => (b.total ?? 0) - (a.total ?? 0))[0];
}

function getLowestDay(points: InsightPoint[]) {
  const valid = points.filter(
    (point): point is InsightPoint & { day: string } => !!point.day
  );

  if (valid.length === 0) return null;

  return [...valid].sort((a, b) => (a.total ?? 0) - (b.total ?? 0))[0];
}

function getTopHours(points: InsightPoint[]) {
  return [...points]
    .filter(
      (point) =>
        Number.isInteger(point.hour) &&
        Number(point.hour) >= 0 &&
        Number(point.hour) <= 23
    )
    .sort((a, b) => (b.total ?? 0) - (a.total ?? 0))
    .slice(0, 3);
}

function getTopHeatmapLocations(points: HeatmapPoint[]) {
  return [...points].sort((a, b) => b.weight - a.weight).slice(0, 3);
}

function DashboardAccordionSection({
  title,
  subtitle,
  isOpen,
  onToggle,
  children,
}: {
  title: string;
  subtitle: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.sectionWrap}>
      <Pressable style={styles.sectionHeader} onPress={onToggle}>
        <View style={styles.sectionHeaderTextWrap}>
          <Text style={styles.sectionTitle}>{title}</Text>
          <Text style={styles.sectionSubtitle}>{subtitle}</Text>
        </View>

        <View style={styles.sectionTogglePill}>
          <Text style={styles.sectionToggleText}>{isOpen ? "Hide" : "Show"}</Text>
        </View>
      </Pressable>

      {isOpen ? <View style={styles.sectionBody}>{children}</View> : null}
    </View>
  );
}

function TierExplanationCard({
  title,
  subtitle,
  isExpanded,
  onToggle,
  accent,
  children,
}: {
  title: string;
  subtitle: string;
  isExpanded: boolean;
  onToggle: () => void;
  accent: "free" | "growth" | "pro";
  children: React.ReactNode;
}) {
  return (
    <View
      style={[
        styles.tierExplainCard,
        accent === "growth" && styles.tierExplainCardGrowth,
        accent === "pro" && styles.tierExplainCardPro,
      ]}
    >
      <Pressable style={styles.tierExplainHeader} onPress={onToggle}>
        <View style={{ flex: 1 }}>
          <Text style={styles.tierExplainTitle}>{title}</Text>
          <Text style={styles.tierExplainSubtitle}>{subtitle}</Text>
        </View>

        <Text style={styles.tierExplainToggle}>{isExpanded ? "−" : "+"}</Text>
      </Pressable>

      {isExpanded ? <View style={styles.tierExplainBody}>{children}</View> : null}
    </View>
  );
}

export default function VendorDashboardScreen() {
  const params = useLocalSearchParams();
  const scrollRef = useRef<ScrollView | null>(null);
  const statusUpdateInputRef = useRef<TextInput | null>(null);
  const hasShownLocationAlert = useRef(false);
  const [loading, setLoading] = useState(true);
  const [accessChecked, setAccessChecked] = useState(false);
  const [van, setVan] = useState<Van | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [claims, setClaims] = useState<VendorClaim[]>([]);

  const [name, setName] = useState("");
  const [vendorName, setVendorName] = useState("");
  const [cuisine, setCuisine] = useState("");
  const [menu, setMenu] = useState("");
  const [schedule, setSchedule] = useState("");
  const [vendorMessage, setVendorMessage] = useState("");
  const [isLive, setIsLive] = useState(false);
  const [foodCategories, setFoodCategories] = useState<string[]>([]);
  const [instagram, setInstagram] = useState("");
  const [facebook, setFacebook] = useState("");
  const [website, setWebsite] = useState("");
  const [what3words, setWhat3words] = useState("");
  const [foodCategorySearch, setFoodCategorySearch] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [logoUri, setLogoUri] = useState<string | null>(null);
  const [logoPath, setLogoPath] = useState<string | null>(null);
  const [menuPdfName, setMenuPdfName] = useState<string | null>(null);
  const [menuPdfUri, setMenuPdfUri] = useState<string | null>(null);
  const [menuPdfStoragePath, setMenuPdfStoragePath] = useState<string | null>(
    null
  );
  const [lat, setLat] = useState<number>(0);
  const [lng, setLng] = useState<number>(0);
  const [isSaving, setIsSaving] = useState(false);
  const [insights, setInsights] = useState<AdvancedInsights | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [heatmapPoints, setHeatmapPoints] = useState<HeatmapPoint[]>([]);
  const [heatmapLoading, setHeatmapLoading] = useState(false);
  const [locationNames, setLocationNames] = useState<string[]>([]);

  useEffect(() => {
    async function resolveLocations() {
      const names = await Promise.all(
        heatmapPoints.slice(0, 3).map((point) =>
          getReadableLocation(point.lat, point.lng)
        )
      );

      setLocationNames(names);
    }

    if (heatmapPoints.length > 0) {
      resolveLocations();
    } else {
      setLocationNames([]);
    }
  }, [heatmapPoints]);

  const [expandedTier, setExpandedTier] = useState<"free" | "growth" | "pro">(
    "growth"
  );

  const [openSections, setOpenSections] = useState<
    Record<DashboardSectionKey, boolean>
  >({
    insights: false,
    branding: false,
    growth: false,
    guide: false,
    health: false,
    assets: false,
    edit: true,
    account: false,
  });

  function toggleSection(section: DashboardSectionKey) {
    setOpenSections((current) => ({
      ...current,
      [section]: !current[section],
    }));
  }

  function openSection(section: DashboardSectionKey) {
    setOpenSections((current) => ({
      ...current,
      [section]: true,
    }));
  }

  useFocusEffect(
    useCallback(() => {
      async function checkAccess() {
        try {
          const user = await getCurrentUser();

          if (!user) {
            router.replace("/vendor/register");
            return;
          }

          const vendor = await getVendorByOwnerId(user.id);

          if (!vendor) {
            router.replace("/(tabs)");
            return;
          }

          // Do NOT block suspended vendors here
          // Let loadDashboard handle that state cleanly

        } catch {
          router.replace("/vendor/register");
        }
      }

      checkAccess();
    }, [])
  );

  useFocusEffect(
    useCallback(() => {
      loadDashboard();
    }, [])
  );

  useEffect(() => {
    if (typeof params.name === "string") setName(params.name);
    if (typeof params.vendorName === "string") setVendorName(params.vendorName);
    if (typeof params.cuisine === "string") setCuisine(params.cuisine);
    if (typeof params.menu === "string") setMenu(params.menu);
    if (typeof params.schedule === "string") setSchedule(params.schedule);

    if (typeof params.vendorMessage === "string") {
      setVendorMessage(params.vendorMessage);
    }

    if (typeof params.isLive === "string") {
      setIsLive(params.isLive === "true");
    }

    if (params.lat && params.lng) {
      const nextLat = Number(params.lat);
      const nextLng = Number(params.lng);

      if (!Number.isNaN(nextLat) && !Number.isNaN(nextLng)) {
        setLat(nextLat);
        setLng(nextLng);

        if (params.locationUpdated === "true" && !hasShownLocationAlert.current) {
          hasShownLocationAlert.current = true;

          Alert.alert(
            "Location updated",
            "Your new pin is ready. Tap Save Changes to update it on the map."
          );
        }
      }
    }

    const rawFoodCategories = params.foodCategories as string | undefined;

    if (rawFoodCategories) {
      try {
        const parsed = JSON.parse(rawFoodCategories);
        if (Array.isArray(parsed)) {
          setFoodCategories(parsed);
        }
      } catch {
        // keep existing categories
      }
    }
  }, [
    params.name,
    params.vendorName,
    params.cuisine,
    params.menu,
    params.schedule,
    params.vendorMessage,
    params.isLive,
    params.foodCategories,
    params.lat,
    params.lng,
    params.locationUpdated, // 👈 add it here
  ]);

  async function loadAdvancedInsights(vendorId: string, tier: string) {
    if (tier !== "pro") {
      setInsights(null);
      return;
    }

    setInsightsLoading(true);

    try {
      const { data, error } = await supabase.rpc("get_vendor_advanced_insights", {
        p_vendor_id: vendorId,
        p_days: 30,
      });

      if (error) {
        setInsights(null);
        return;
      }

      setInsights(
        (data as AdvancedInsights) ?? {
          views: 0,
          directions: 0,
          conversion_rate: 0,
          daily_views: [],
          peak_hours: [],
        }
      );
    } finally {
      setInsightsLoading(false);
    }
  }

  async function loadHeatmapPoints(vendorId: string, tier: string) {
    if (tier !== "pro") {
      setHeatmapPoints([]);
      return;
    }

    setHeatmapLoading(true);

    try {
      const { data, error } = await supabase.rpc("get_vendor_heatmap_points", {
        p_vendor_id: vendorId,
        p_days: 30,
      });

      if (error) {
        setHeatmapPoints([]);
        return;
      }

      setHeatmapPoints((data as HeatmapPoint[]) ?? []);
    } finally {
      setHeatmapLoading(false);
    }
  }

  async function loadDashboard() {
    setLoading(true);
    setAccessChecked(false);

    try {
      const user = await getCurrentUser();

      if (!user) {
        setCurrentUserId(null);
        setVan(null);
        setAccessChecked(true);
        return;
      }

      setCurrentUserId(user.id);

      const vendor = await getVendorByOwnerId(user.id);

      if (!vendor) {
        setVan(null);
        setAccessChecked(true);
        void (async () => {
          try {
            const myClaims = await getMyVendorClaims(user.id);
            setClaims(myClaims);
          } catch {
            setClaims([]);
          }
        })();
        return;
      }

      if (vendor.isSuspended) {
        setVan(null);
        setAccessChecked(true);
        return;
      }

      if (vendor.owner_id !== user.id) {
        setVan(null);
        setAccessChecked(true);
        return;
      }

      const assetVendor = vendor as AssetAwareVan;

      const nextPhotos =
        Array.isArray(assetVendor.photos) && assetVendor.photos.length > 0
          ? assetVendor.photos.filter(Boolean)
          : vendor.photo
            ? [vendor.photo]
            : [];

      setVan(vendor);
      setName(vendor.name);
      setVendorName(vendor.vendorName ?? "");
      setCuisine(vendor.cuisine);
      setMenu(vendor.menu ?? "");
      setSchedule(vendor.schedule ?? "");
      setVendorMessage(vendor.vendorMessage ?? "");
      setIsLive(vendor.isLive);
      setFoodCategories(vendor.foodCategories ?? []);
      setInstagram(vendor.instagramUrl ?? "");
      setFacebook(vendor.facebookUrl ?? "");
      setWebsite(vendor.websiteUrl ?? "");
      setWhat3words(vendor.what3words ?? "");
      setFoodCategorySearch("");
      setPhotos(nextPhotos);
      setLogoUri(assetVendor.logoUrl ?? null);
      setLogoPath(assetVendor.logoPath ?? null);
      setMenuPdfName(assetVendor.menuPdfName ?? null);
      void (async () => {
        if (!assetVendor.menuPdfUrl) {
          setMenuPdfUri(null);
          return;
        }

        try {
          const signedUrl = await getVendorMenuPdfSignedUrl(assetVendor.menuPdfUrl);
          setMenuPdfUri(signedUrl);
        } catch {
          setMenuPdfUri(null);
        }
      })();

      setMenuPdfStoragePath(assetVendor.menuPdfUrl ?? null);

      const paramLat = typeof params.lat === "string" ? Number(params.lat) : NaN;
      const paramLng = typeof params.lng === "string" ? Number(params.lng) : NaN;

      setLat(Number.isNaN(paramLat) ? vendor.lat : paramLat);
      setLng(Number.isNaN(paramLng) ? vendor.lng : paramLng);

      setAccessChecked(true);

      void loadAdvancedInsights(vendor.id, vendor.subscriptionTier ?? "free");
      void loadHeatmapPoints(vendor.id, vendor.subscriptionTier ?? "free");

    } catch {
      setVan(null);
      setAccessChecked(true);
    } finally {
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

  async function pickPhotos() {
    if (!van) return;

    const features = getSubscriptionFeatures(van.subscriptionTier);

    if (!features.images) {
      Alert.alert(
        "Growth plan required",
        "Upgrade to Growth or above to upload listing photos."
      );
      return;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        "Permission needed",
        "Please allow photo library access to upload vendor photos."
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.7,
      allowsEditing: false,
      allowsMultipleSelection: true,
      selectionLimit: 8,
    });

    if (result.canceled) return;

    const selectedUris = result.assets.map((asset) => asset.uri).filter(Boolean);

    setPhotos((current) => {
      const merged = [...current, ...selectedUris];
      return Array.from(new Set(merged)).slice(0, 8);
    });
  }

  async function pickLogo() {
    if (!van) return;

    const features = getSubscriptionFeatures(van.subscriptionTier);

    if (!features.images) {
      Alert.alert(
        "Growth plan required",
        "Upgrade to Growth or above to upload your logo."
      );
      return;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        "Permission needed",
        "Please allow photo library access to upload your logo."
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
      allowsEditing: true,
      aspect: [1, 1],
      allowsMultipleSelection: false,
    });

    if (result.canceled) return;

    const uri = result.assets[0]?.uri;
    if (!uri) return;

    setLogoUri(uri);
    setLogoPath(null);
  }

  function removePhoto(indexToRemove: number) {
    setPhotos((current) => current.filter((_, index) => index !== indexToRemove));
  }

  function removeLogo() {
    setLogoUri(null);
    setLogoPath(null);
  }

  async function pickMenuPdf() {
    if (!van) return;

    const features = getSubscriptionFeatures(van.subscriptionTier);

    if (!features.images) {
      Alert.alert(
        "Growth plan required",
        "Upgrade to Growth or above to upload a menu PDF."
      );
      return;
    }

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "application/pdf",
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (result.canceled) return;

      const file = result.assets[0];

      setMenuPdfName(file.name ?? "menu.pdf");
      setMenuPdfUri(file.uri);
      setMenuPdfStoragePath(null);
    } catch {
      Alert.alert("Upload failed", "We could not open the PDF picker.");
    }
  }

  function removeMenuPdf() {
    setMenuPdfName(null);
    setMenuPdfUri(null);
    setMenuPdfStoragePath(null);
  }

  async function openMenuPdfFromDashboard() {
    if (!menuPdfStoragePath) {
      Alert.alert("Menu unavailable", "No menu PDF has been uploaded yet.");
      return;
    }

    try {
      const freshUrl = await getVendorMenuPdfSignedUrl(menuPdfStoragePath);

      if (!freshUrl) {
        Alert.alert("Open failed", "We could not open the menu PDF.");
        return;
      }

      await Linking.openURL(freshUrl);
    } catch {
      Alert.alert("Open failed", "We could not open the menu PDF.");
    }
  }

  function jumpToEditSection() {
    openSection("edit");

    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });

      setTimeout(() => {
        statusUpdateInputRef.current?.focus();
      }, 350);
    }, 200);
  }

  function updateLocation() {
    if (!van) return;

    const features = getSubscriptionFeatures(van.subscriptionTier);

    if (!features.locationUpdates) {
      router.push("/vendor/upgrade");
      return;
    }

    router.push({
      pathname: "/vendor/pick-location",
      params: {
        returnTo: "dashboard",
        id: van.id,
        name,
        vendorName,
        cuisine,
        menu,
        schedule,
        vendorMessage,
        isLive: String(isLive),
        foodCategories: JSON.stringify(foodCategories),
        lat: String(lat),
        lng: String(lng),
      },
    });
  }

  async function handleLiveToggle(newStatus: boolean) {
    if (!van) return;

    const features = getSubscriptionFeatures(van.subscriptionTier);

    // 🔒 HARD GUARD (prevents bypassing UI)
    if (!features.liveStatus) {
      Alert.alert(
        "Upgrade required",
        "Live status is not available on your current plan."
      );
      return;
    }

    try {
      await supabase
        .from("vendors")
        .update({ is_live: newStatus })
        .eq("id", van.id);

      setIsLive(newStatus);
    } catch (error) {
      Alert.alert(
        "Error updating live status",
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }

  async function saveChanges() {
    if (!van) {
      Alert.alert("Vendor not found");
      return;
    }

    if (isSaving) return;

    const features = getSubscriptionFeatures(van.subscriptionTier);

    if (!name.trim() || !vendorName.trim() || !cuisine.trim()) {
      Alert.alert(
        "Missing details",
        "Please make sure van name, vendor name, and cuisine are filled in."
      );
      return;
    }

    const user = await getCurrentUser();

    if (!user || user.id !== van.owner_id || van.isSuspended) {
      Alert.alert(
        "Access denied",
        "This listing is unavailable or you do not have permission to edit it."
      );
      return;
    }

    setIsSaving(true);

    try {
      let nextPhotos: string[] = [];
      let nextLogoUri: string | null = logoUri;
      let nextLogoPath: string | null = logoPath;
      let nextMenuPdfStoragePath: string | null = null;
      let nextMenuPdfName: string | null = null;
      let nextMenuPdfUri: string | null = null;

      if (features.images) {
        const existingRemotePhotos = photos.filter((uri) => !isLocalFileUri(uri));
        const localPhotos = photos.filter((uri) => isLocalFileUri(uri));
        const uniqueLocalPhotos = Array.from(new Set(localPhotos));

        const uploadedPhotoUrls =
          uniqueLocalPhotos.length > 0
            ? await uploadVendorPhotos(user.id, uniqueLocalPhotos)
            : [];

        nextPhotos = [...existingRemotePhotos, ...uploadedPhotoUrls].slice(0, 8);

        if (logoUri) {
          const isExistingStoredLogo = !!logoPath && !isLocalFileUri(logoUri);

          if (!isExistingStoredLogo) {
            const uploadedLogo = await uploadVendorLogo(user.id, logoUri);
            nextLogoUri = uploadedLogo.publicUrl;
            nextLogoPath = uploadedLogo.storagePath;
          }
        } else {
          nextLogoUri = null;
          nextLogoPath = null;
        }

        if (menuPdfUri && menuPdfName) {
          const isExistingStoredPdf =
            !!menuPdfStoragePath && !isLocalFileUri(menuPdfUri);

          if (isExistingStoredPdf) {
            nextMenuPdfStoragePath = menuPdfStoragePath;
            nextMenuPdfName = menuPdfName;
            nextMenuPdfUri = await getVendorMenuPdfSignedUrl(menuPdfStoragePath);
          } else {
            const uploadedPdf = await uploadVendorMenuPdf(
              user.id,
              menuPdfUri,
              menuPdfName
            );

            nextMenuPdfStoragePath = uploadedPdf.storagePath;
            nextMenuPdfName = uploadedPdf.fileName;
            nextMenuPdfUri = uploadedPdf.signedUrl;
          }
        } else {
          nextMenuPdfStoragePath = null;
          nextMenuPdfName = null;
          nextMenuPdfUri = null;
        }
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
          photo: features.images ? nextPhotos[0] ?? van.photo ?? null : null,
          photos: features.images ? nextPhotos : [],
          logo_url: features.images ? nextLogoUri : null,
          logo_path: features.images ? nextLogoPath : null,
          menu_pdf_url: features.images ? nextMenuPdfStoragePath : null,
          menu_pdf_name: features.images ? nextMenuPdfName : null,
          is_live: isLive,
          food_categories: foodCategories,
          website_url: features.socialLinks ? website.trim() || null : null,
          instagram_url: features.socialLinks ? instagram.trim() || null : null,
          facebook_url: features.socialLinks ? facebook.trim() || null : null,
          what3words: features.socialLinks ? what3words.trim() || null : null,
          lat,
          lng,
        })
        .eq("id", van.id);

      if (error) {
        Alert.alert("Save failed", error.message);
        return;
      }

      setPhotos(nextPhotos);
      setLogoUri(nextLogoUri);
      setLogoPath(nextLogoPath);
      setMenuPdfName(nextMenuPdfName);
      setMenuPdfUri(nextMenuPdfUri);
      setMenuPdfStoragePath(nextMenuPdfStoragePath);

      const updatedVan: AssetAwareVan = {
        ...van,
        name: name.trim(),
        vendorName: vendorName.trim(),
        cuisine: cuisine.trim(),
        menu: menu.trim() || "Menu coming soon",
        schedule: schedule.trim() || "Schedule coming soon",
        vendorMessage: features.reviews ? vendorMessage.trim() : "",
        isLive: isLive,
        foodCategories,
        instagramUrl: features.socialLinks ? instagram.trim() || null : null,
        facebookUrl: features.socialLinks ? facebook.trim() || null : null,
        websiteUrl: features.socialLinks ? website.trim() || null : null,
        what3words: features.socialLinks ? what3words.trim() || null : null,
        photo: features.images ? nextPhotos[0] ?? null : null,
        photos: features.images ? nextPhotos : [],
        logoUrl: features.images ? nextLogoUri : null,
        logoPath: features.images ? nextLogoPath : null,
        menuPdfUrl: features.images ? nextMenuPdfStoragePath : null,
        menuPdfName: features.images ? nextMenuPdfName : null,
        lat,
        lng,
      };

      setVan(updatedVan);

      await Promise.all([
        loadAdvancedInsights(updatedVan.id, updatedVan.subscriptionTier ?? "free"),
        loadHeatmapPoints(updatedVan.id, updatedVan.subscriptionTier ?? "free"),
      ]);

      Alert.alert("Saved", "Your dashboard changes were saved.");
    } catch (error) {
      Alert.alert(
        "Save failed",
        error instanceof Error ? error.message : "Unknown error"
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteListing() {
    if (!van) return;

    Alert.alert(
      "Delete listing",
      "Are you sure you want to delete this vendor listing?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const user = await getCurrentUser();

            if (!user || user.id !== van.owner_id) {
              Alert.alert("Access denied", "You can only delete your own listing.");
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

  async function manageSubscriptionFromDashboard() {
    try {
      if (!van?.stripe_customer_id) {
        Alert.alert(
          "Unavailable",
          "No active subscription found for this vendor."
        );
        return;
      }

      const response = await supabase.functions.invoke(
        "create-portal-session",
        {
          body: {
            vendorId: van.id,
          },
        }
      );

      if (response.error) {
        const message =
          typeof response.error === "object" &&
            response.error !== null &&
            "message" in response.error &&
            typeof response.error.message === "string"
            ? response.error.message
            : "Edge Function returned a non-2xx status code";

        Alert.alert("Error", message);
        return;
      }

      if (response.data?.url) {
        await Linking.openURL(response.data.url);
      } else {
        Alert.alert("Error", "No portal URL returned.");
      }
    } catch (error) {
      Alert.alert(
        "Error",
        error instanceof Error ? error.message : "Something went wrong"
      );
    }
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

  const upgradeSignal = useMemo(() => {
    if (!van) return null;

    const views = van.views ?? 0;
    const directions = van.directions ?? 0;
    const conversion = views > 0 ? (directions / views) * 100 : 0;

    if (van.subscriptionTier === "free") {
      if (views >= 20 && directions < 5) {
        return {
          title: "You are getting noticed, but your listing looks limited",
          body: "Customers are finding you, but Free plan limitations can make it harder to convert interest into real visits. Growth unlocks LIVE status, branding, menu PDF uploads, and stronger listing trust.",
          cta: "Upgrade to Growth",
        };
      }

      return {
        title: "You are visible, but not yet competitive enough",
        body: "Free gets you listed, but Growth gives you the tools to look more active, more complete, and more trustworthy to customers deciding where to go.",
        cta: "Upgrade to Growth",
      };
    }

    if (van.subscriptionTier === "growth") {
      if (views >= 30 && conversion < 12) {
        return {
          title: "You have visibility, but you need sharper performance insight",
          body: "Growth helps you look professional, but Pro helps you understand exactly when and where customers engage most so you can make smarter trading decisions.",
          cta: "Upgrade to Pro",
        };
      }

      return {
        title: "You have the tools — Pro adds decision advantage",
        body: "Pro gives you premium discovery support plus interpreted analytics, timing signals, and stronger competitive visibility across BiteBeacon.",
        cta: "Upgrade to Pro",
      };
    }

    return null;
  }, [van]);

  const performanceSignal = useMemo(() => {
    if (!van) return null;

    const views = van.views ?? 0;
    const directions = van.directions ?? 0;
    const numericConversion = views > 0 ? (directions / views) * 100 : 0;

    if (van.subscriptionTier === "pro" && insights) {
      if ((insights.views ?? 0) < 10) {
        return {
          title: "Early-stage data",
          body: "You are still building enough activity for stronger patterns. More views, directions, and LIVE sessions will make your analytics more specific.",
        };
      }

      if ((insights.views ?? 0) >= 30 && (insights.conversion_rate ?? 0) < 10) {
        return {
          title: "Seen, but not converting enough",
          body: "Customers are finding your listing, but too few are taking the next step. Stronger branding, clearer menu detail, and more LIVE consistency should help.",
        };
      }

      if ((insights.conversion_rate ?? 0) >= 20) {
        return {
          title: "Strong intent building",
          body: "Your recent listing activity shows healthy customer intent. Keep your menu, timings, and LIVE windows consistent to maintain momentum.",
        };
      }

      return {
        title: "Activity is building steadily",
        body: "Your recent analytics show a usable level of visibility and intent. Tightening your timing and listing strength should improve results.",
      };
    }

    if (views < 15) {
      return {
        title: "Visibility still needs to build",
        body: "Your listing needs more exposure before stronger patterns can form. Going LIVE consistently and keeping your public profile complete will help.",
      };
    }

    if (numericConversion >= 20) {
      return {
        title: "Good momentum",
        body: "Your listing is converting interest well. Keep your schedule, menu, and LIVE status updated to maintain that performance.",
      };
    }

    return {
      title: "Keep sharpening the listing",
      body: "Your vendor tools are in place. Strong visuals, a clear menu, and consistent LIVE status will help turn more discovery into real visits.",
    };
  }, [van, insights]);

  const monetisationInsight = useMemo(() => {
    if (!van) return null;

    const views = van.views ?? 0;
    const directions = van.directions ?? 0;
    const conversion = views > 0 ? (directions / views) * 100 : 0;

    if (van.subscriptionTier === "free") {
      if (views >= 20 && directions < 5) {
        return {
          title: "You are getting noticed, but your listing still feels limited",
          body: "Customers are finding you, but Free plan limitations can make it harder to turn interest into real visits. Growth helps your listing look more active, complete, and trustworthy.",
        };
      }

      return {
        title: "You are missing live visibility",
        body: "Customers are more likely to visit vendors that appear LIVE at the right time. Growth lets you control that visibility and stay more relevant when people are searching.",
      };

    }


    return null;
  }, [van]);

  const actionRecommendation = useMemo(() => {
    if (!van) return null;

    const hour = new Date().getHours();
    const views = van.views ?? 0;
    const directions = van.directions ?? 0;
    const hasPhotos = photos.length > 0;

    // 🔥 Peak-time LIVE suggestion (5pm–9pm)
    if (
      van.subscriptionTier !== "free" &&
      !isLive &&
      hour >= 17 &&
      hour <= 21
    ) {
      return {
        title: "Go LIVE now",
        body: "You are entering peak food hours. Turning LIVE on now increases your chances of being discovered.",
        action: () => handleLiveToggle(true),
        cta: "Go Live",
      };
    }

    // 📸 No photos = weak trust
    if (van.subscriptionTier !== "free" && !hasPhotos) {
      return {
        title: "Add photos to your listing",
        body: "Listings with photos build more trust and get more engagement from customers.",
        action: pickPhotos,
        cta: "Add Photos",
      };
    }

    // 🧾 Missing basics
    if (!menu.trim() || !schedule.trim()) {
      return {
        title: "Complete your listing",
        body: "Adding your menu and schedule helps customers decide and improves trust.",
        action: jumpToEditSection,
        cta: "Complete Listing",
      };
    }

    // 💬 No recent activity
    if (van.subscriptionTier !== "free" && !vendorMessage.trim()) {
      return {
        title: "Post a quick update",
        body: "Keeping your listing active with updates helps you stay relevant to customers.",
        action: jumpToEditSection,
        cta: "Add Update",
      };
    }

    // 📉 Low engagement fallback
    if (views < 10 && directions === 0) {
      return {
        title: "Increase your visibility",
        body: "Going LIVE consistently and improving your listing will help you get discovered.",
        action: jumpToEditSection,
        cta: "Improve Listing",
      };
    }

    return null;
  }, [
    van,
    isLive,
    photos,
    menu,
    schedule,
    vendorMessage,
  ]);

  const proInsight = useMemo(() => {
    if (!van || van.subscriptionTier !== "pro") return null;

    const recentViews = insights?.views ?? 0;
    const recentDirections = insights?.directions ?? 0;
    const recentConversion = Number(insights?.conversion_rate ?? 0);
    const topDay = getTopDay(insights?.daily_views ?? []);
    const quietDay = getLowestDay(insights?.daily_views ?? []);
    const topHours = getTopHours(insights?.peak_hours ?? []);
    const topLocations = getTopHeatmapLocations(heatmapPoints);

    const bestHoursText =
      topHours.length > 0
        ? topHours.map((item) => getPeakHourLabel(Number(item.hour ?? 0))).join(", ")
        : null;

    const locationText =
      topLocations.length > 0 && locationNames.length > 0
        ? topLocations
          .slice(0, locationNames.length)
          .map(
            (point, index) =>
              `${index + 1}. ${locationNames[index]} (activity score ${point.weight})`
          )
          .join("\n")
        : null;

    let summary =
      "We need more recent activity before we can give you highly specific performance guidance.";

    if (recentViews >= 30 && recentConversion < 10) {
      summary =
        "After assessing your last 30 days of views, directions, timing, and location engagement, your listing is getting noticed but not converting strongly enough yet.";
    } else if (recentViews >= 20 && recentConversion >= 10 && recentConversion < 20) {
      summary =
        "After assessing your last 30 days of views, directions, timing, and location engagement, your listing is building solid interest but still has room to convert more customers.";
    } else if (recentViews >= 20 && recentConversion >= 20) {
      summary =
        "After assessing your last 30 days of views, directions, timing, and location engagement, your listing is showing strong intent from customers discovering you.";
    } else if (recentViews > 0) {
      summary =
        "After assessing your recent listing activity, your analytics are starting to form early performance patterns, but you still need more data for deeper precision.";
    }

    let recommendation =
      "Keep building data by going LIVE consistently, keeping your listing updated, and making sure your public profile looks complete.";

    if (recentViews >= 30 && recentConversion < 10) {
      recommendation =
        "Your next move should be improving conversion: strengthen your logo and visuals, tighten menu clarity, and go LIVE before your busiest hours.";
    } else if (recentViews >= 20 && recentConversion >= 20) {
      recommendation =
        "Your next move should be timing discipline: go LIVE before your busiest windows and keep your strongest listing assets up to date.";
    } else if (bestHoursText) {
      recommendation =
        "Your next move should be to concentrate service around your strongest engagement windows and keep your LIVE status aligned with them.";
    }

    return {
      recentViews,
      recentDirections,
      recentConversion,
      summary,
      recommendation,
      bestHoursText,
      locationText,
      topDay,
      quietDay,
      hasSpecificTiming: !!bestHoursText,
      hasSpecificLocation: !!locationText,
      hasEnoughData: recentViews >= 10 || recentDirections >= 3,
    };
  }, [heatmapPoints, insights, van]);

  useEffect(() => {
    if (!van) return;

    const currentFeatures = getSubscriptionFeatures(van.subscriptionTier);
    const missingMenu = !menu.trim();
    const missingSchedule = !schedule.trim();
    const missingPhotos = photos.length === 0 && currentFeatures.images;

    if (missingMenu || missingSchedule || missingPhotos) {
      openSection("edit");
    }
  }, [van, menu, schedule, photos.length]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  const latestClaim = claims[0] ?? null;

  if (!loading && accessChecked && !van && latestClaim) {
    return (
      <View style={styles.centered}>
        <Text style={styles.notFoundTitle}>
          {latestClaim.status === "pending"
            ? "Claim Under Review"
            : latestClaim.status === "rejected"
              ? "Claim Not Approved"
              : "Claim Approved"}
        </Text>

        <Text style={styles.accessText}>
          {latestClaim.status === "pending"
            ? "Your claim is being reviewed. Send your selected proof to support@bitebeacon.uk and wait for approval before you can manage this listing."
            : latestClaim.status === "rejected"
              ? "Your claim was not approved. Review the admin note below before trying again."
              : "Your claim has been approved. Please log in again if your listing access has not updated yet."}
        </Text>

        <View style={styles.cardBox}>
          <Text style={styles.claimStatus}>
            Status: {latestClaim.status.toUpperCase()}
          </Text>

          {latestClaim.admin_note ? (
            <>
              <Text style={styles.claimNoteLabel}>Admin Note</Text>
              <Text style={styles.claimNote}>{latestClaim.admin_note}</Text>
            </>
          ) : latestClaim.status === "pending" ? (
            <Text style={styles.claimPending}>Waiting for admin review...</Text>
          ) : null}
        </View>

        <Pressable
          style={styles.softButtonDark}
          onPress={() => router.replace("/welcome")}
        >
          <Text style={styles.softButtonDarkText}>Back to Home</Text>
        </Pressable>
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
        <Text style={styles.accessText}>
          This vendor listing is unavailable, suspended, or not assigned to your
          account.
        </Text>

        <Pressable style={styles.softButtonDark} onPress={() => router.back()}>
          <Text style={styles.softButtonDarkText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  if (!van) {
    return null;
  }

  const features = getSubscriptionFeatures(van.subscriptionTier);

  const listingReady = !!menu.trim() && !!schedule.trim();
  const needsListingAttention =
    !menu.trim() || !schedule.trim() || (features.images && photos.length === 0);

  const currentPlanLabel =
    van.subscriptionTier === "growth"
      ? "Growth plan"
      : van.subscriptionTier === "pro"
        ? "Pro plan"
        : "Free plan";

  const planBadgeStyle =
    van.subscriptionTier === "pro"
      ? styles.planBadgePro
      : van.subscriptionTier === "growth"
        ? styles.planBadgeGrowth
        : styles.planBadgeFree;

  const planBadgeTextStyle =
    van.subscriptionTier === "pro"
      ? styles.planBadgeTextPro
      : van.subscriptionTier === "growth"
        ? styles.planBadgeTextGrowth
        : styles.planBadgeTextFree;

  const filteredFoodCategoryOptions =
    foodCategorySearch.trim().length > 0
      ? DEFAULT_FOOD_CATEGORY_SUGGESTIONS.filter((category) =>
        category.toLowerCase().includes(foodCategorySearch.trim().toLowerCase())
      )
      : [];

  // 👇 NEW: allow custom category creation
  const canAddCustomCategory =
    foodCategorySearch.trim().length > 0 &&
    !foodCategories
      .map((c) => c.toLowerCase())
      .includes(foodCategorySearch.trim().toLowerCase());

  const conversionRate =
    (van.views ?? 0) > 0
      ? (((van.directions ?? 0) / (van.views ?? 0)) * 100).toFixed(1)
      : "0.0";

  const hasLogo = !!logoUri;
  const heroVisualUri = hasLogo ? logoUri : photos[0] ?? null;

  const proVisualSupport =
    van.subscriptionTier === "pro"
      ? "Your Pro plan gives you premium visibility and deeper commercial insight."
      : van.subscriptionTier === "growth"
        ? "Growth helps your business look more established and convert more customers."
        : "Free gets you listed. Growth and Pro are built to help you stand out faster.";

  return (
    <ScrollView
      ref={scrollRef}
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.headerBlock}>
        <View style={styles.headerTopRow}>
          <View style={styles.headerTextWrap}>
            <Text style={styles.headerTitle}>Vendor Dashboard</Text>
            <Text style={styles.headerSubtitle}>
              Run your BiteBeacon presence like a business.
            </Text>
          </View>

          <View style={styles.headerActions}>
            <Pressable
              style={styles.accountIconButton}
              onPress={() => router.replace("/(tabs)")}
            >
              <Text style={styles.accountIconText}>🏠</Text>
            </Pressable>

            <Pressable
              style={styles.accountIconButton}
              onPress={() => router.replace("/(tabs)/account")}
            >
              <Text style={styles.accountIconText}>⚙️</Text>
            </Pressable>
          </View>
        </View>
      </View>

      {claims.length > 0 ? (
        <View style={styles.claimBanner}>
          <Text style={styles.claimBannerTitle}>Your Claim</Text>
          <Text style={styles.claimBannerText}>
            {claims[0]?.status === "pending"
              ? "Your ownership request is being reviewed."
              : claims[0]?.status === "rejected"
                ? "Your last claim was not approved."
                : "Your claim has been approved."}
          </Text>
        </View>
      ) : null}

      <View
        style={[
          styles.heroCard,
          van.subscriptionTier === "pro" && styles.heroCardPro,
        ]}
      >
        <View style={styles.heroGlow} />

        <View style={styles.heroTopRow}>
          <View style={styles.heroTextWrap}>
            <View style={styles.heroBadgeRow}>
              <View
                style={[
                  styles.heroStatusBadge,
                  features.liveStatus
                    ? isLive
                      ? styles.heroStatusBadgeLive
                      : styles.heroStatusBadgeOffline
                    : styles.heroStatusBadgeListed,
                ]}
              >
                <Text style={styles.heroStatusBadgeText}>
                  {features.liveStatus ? (isLive ? "LIVE" : "OFFLINE") : "LISTED"}
                </Text>
              </View>

              <View style={[styles.planBadge, planBadgeStyle]}>
                <Text style={[styles.planBadgeText, planBadgeTextStyle]}>
                  {currentPlanLabel}
                </Text>
              </View>
            </View>

            <Text style={styles.heroTitle}>{van.name}</Text>
            <Text style={styles.heroVendorName}>
              {vendorName || van.vendorName || "Vendor name not added"}
            </Text>
            <Text style={styles.heroCuisine}>
              {cuisine || "Cuisine not added yet"}
            </Text>

            <Text style={styles.heroSupport}>
              {listingReady
                ? "Your listing is looking customer-ready."
                : "Complete your menu and schedule to strengthen trust."}
            </Text>

            <Text style={styles.heroPlanSupport}>{proVisualSupport}</Text>
          </View>

          {heroVisualUri ? (
            <Image source={{ uri: heroVisualUri }} style={styles.heroImage} />
          ) : null}
        </View>

        <View style={styles.heroStatsRow}>
          <View style={styles.heroStatCard}>
            <Text style={styles.heroStatLabel}>Views</Text>
            <Text style={styles.heroStatValue}>{van.views ?? 0}</Text>
          </View>

          <View style={styles.heroStatCard}>
            <Text style={styles.heroStatLabel}>Directions</Text>
            <Text style={styles.heroStatValue}>{van.directions ?? 0}</Text>
          </View>

          <View style={styles.heroStatCard}>
            <Text style={styles.heroStatLabel}>
              {van.subscriptionTier === "pro" ? "Conversion" : "Analytics"}
            </Text>
            <Text style={styles.heroStatValue}>
              {van.subscriptionTier === "pro" ? `${conversionRate}%` : "Locked"}
            </Text>

            {van.subscriptionTier === "pro" ? (
              <Text style={styles.heroStatHint}>
                Conversion = the percentage of listing views that turned into direction taps.
              </Text>
            ) : (
              <Text style={styles.heroStatHint}>Pro unlocks conversion insight</Text>
            )}
          </View>

          <View style={styles.heroStatCard}>
            <Text style={styles.heroStatLabel}>Rating</Text>
            <Text style={styles.heroStatValue}>{(van.rating ?? 0).toFixed(1)}</Text>
          </View>
        </View>
      </View>

      <View style={styles.powerCard}>
        <Text style={styles.powerCardEyebrow}>Performance Signal</Text>
        <Text style={styles.powerCardTitle}>{performanceSignal?.title}</Text>
        <Text style={styles.powerCardText}>{performanceSignal?.body}</Text>
      </View>

      {needsListingAttention ? (
        <View style={styles.guidanceBanner}>
          <Text style={styles.guidanceBannerTitle}>
            Start here: complete your listing
          </Text>
          <Text style={styles.guidanceBannerText}>
            To get your listing ready for customers, complete these steps:

            • Add your menu
            • Add your schedule
            • Upload photos

            We have already opened your Edit section to make this easy.
          </Text>

          <Pressable
            style={styles.guidanceBannerButton}
            onPress={jumpToEditSection}
          >
            <Text style={styles.guidanceBannerButtonText}>
              Finish My Listing
            </Text>
          </Pressable>
        </View>
      ) : null}

      {monetisationInsight ? (
        <View style={styles.monetisationCard}>
          <Text style={styles.monetisationTitle}>
            {monetisationInsight.title}
          </Text>
          <Text style={styles.monetisationText}>
            {monetisationInsight.body}
          </Text>

          <Pressable
            style={styles.monetisationButton}
            onPress={() => {
              if (van.subscriptionTier === "free") {
                router.push("/vendor/upgrade");
                return;
              }

              manageSubscriptionFromDashboard();
            }}
          >
            <Text style={styles.monetisationButtonText}>
              {van.subscriptionTier === "free"
                ? "Upgrade to improve performance"
                : "Manage or Upgrade Subscription"}
            </Text>
          </Pressable>
        </View>
      ) : null}

      {upgradeSignal && !monetisationInsight && van.subscriptionTier !== "pro" ? (
        <View style={styles.upgradeSignalCard}>
          <Text style={styles.upgradeSignalEyebrow}>
            {van.subscriptionTier === "free"
              ? "Free Plan Limitation"
              : "Growth Plan Opportunity"}
          </Text>

          <Text style={styles.upgradeSignalTitle}>{upgradeSignal.title}</Text>
          <Text style={styles.upgradeSignalText}>{upgradeSignal.body}</Text>

          <Text style={styles.upgradeSignalSupportText}>
            {van.subscriptionTier === "free"
              ? "Higher tiers give vendors stronger trust signals, better visibility tools, and a more complete customer-facing presence."
              : "Pro gives vendors stronger discovery support and interpreted performance insight that Growth does not include."}
          </Text>

          <Pressable
            style={styles.upgradeSignalButton}
            onPress={() => {
              if (van.subscriptionTier === "free") {
                router.push("/vendor/upgrade");
                return;
              }

              manageSubscriptionFromDashboard();
            }}
          >
            <Text style={styles.upgradeSignalButtonText}>
              {van.subscriptionTier === "free"
                ? upgradeSignal.cta
                : "Manage or Upgrade Subscription"}
            </Text>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.quickActionsCard}>
        <Text style={styles.quickActionsTitle}>Quick Actions</Text>
        <Text style={styles.quickActionsSubtitle}>
          The controls you are most likely to use every day.
        </Text>

        <View style={styles.quickActionsGrid}>
          <Pressable
            style={[styles.quickActionButton, styles.quickActionPrimary]}
            onPress={() => handleLiveToggle(!isLive)}
          >
            <Text style={styles.quickActionPrimaryText}>
              {isLive ? "Go Offline" : "Go Live"}
            </Text>
          </Pressable>

          <Pressable
            style={[styles.quickActionButton, styles.quickActionSecondary]}
            onPress={() =>
              router.push({
                pathname: "/vendor/[id]",
                params: { id: van.id },
              })
            }
          >
            <Text style={styles.quickActionSecondaryText}>View Public Listing</Text>
          </Pressable>

          {features.reviews ? (
            <Pressable
              style={[styles.quickActionButton, styles.quickActionSecondary]}
              onPress={jumpToEditSection}
            >
              <Text style={styles.quickActionSecondaryText}>
                Post Update to Listing
              </Text>
            </Pressable>
          ) : (
            <Pressable
              style={[styles.quickActionButton, styles.quickActionLocked]}
              onPress={() => router.push("/vendor/upgrade")}
            >
              <Text style={styles.quickActionLockedText}>Post Update 🔒</Text>
            </Pressable>
          )}

          {features.locationUpdates ? (
            <Pressable
              style={[styles.quickActionButton, styles.quickActionSecondary]}
              onPress={updateLocation}
            >
              <Text style={styles.quickActionSecondaryText}>
                Set Trading Location
              </Text>
            </Pressable>
          ) : (
            <Pressable
              style={[styles.quickActionButton, styles.quickActionLocked]}
              onPress={() => router.push("/vendor/upgrade")}
            >
              <Text style={styles.quickActionLockedText}>Set Trading Location 🔒</Text>
            </Pressable>
          )}

          {van.subscriptionTier === "growth" || van.subscriptionTier === "pro" ? (
            <Pressable
              style={[styles.quickActionButton, styles.quickActionSecondary]}
              onPress={manageSubscriptionFromDashboard}
            >
              <Text style={styles.quickActionSecondaryText}>
                Manage Plan
              </Text>
            </Pressable>
          ) : null}
        </View>
        {actionRecommendation ? (
          <View style={styles.recommendationCard}>
            <Text style={styles.recommendationTitle}>
              {actionRecommendation.title}
            </Text>
            <Text style={styles.recommendationText}>
              {actionRecommendation.body}
            </Text>

            <Pressable
              style={styles.recommendationButton}
              onPress={actionRecommendation.action}
            >
              <Text style={styles.recommendationButtonText}>
                {actionRecommendation.cta}
              </Text>
            </Pressable>
          </View>
        ) : null}
      </View>

      <DashboardAccordionSection
        title="Performance Insights"
        subtitle="Use customer behaviour to sharpen visibility and conversion."
        isOpen={openSections.insights}
        onToggle={() => toggleSection("insights")}
      >
        {van.subscriptionTier === "pro" ? (
          insightsLoading || heatmapLoading ? (
            <View style={styles.cardBox}>
              <Text style={styles.loadingInlineText}>Loading insights...</Text>
            </View>
          ) : (
            <>
              <View style={styles.insightEngineCard}>
                <Text style={styles.insightEngineEyebrow}>BiteBeacon Insight</Text>
                <Text style={styles.insightEngineTitle}>
                  Intelligence based on your recent vendor activity
                </Text>

                <View style={styles.insightSection}>
                  <Text style={styles.insightSectionLabel}>What we analysed</Text>
                  <Text style={styles.insightSectionText}>
                    Based on your last 30 days of listing activity, including
                    views, directions, customer timing patterns, and recorded
                    location interaction points.
                  </Text>
                </View>

                <View style={styles.insightSection}>
                  <Text style={styles.insightSectionLabel}>What we’re seeing</Text>
                  <Text style={styles.insightSectionText}>
                    {proInsight?.summary}
                  </Text>
                </View>

                <View style={styles.insightMetricsRow}>
                  <View style={styles.insightMetricCard}>
                    <Text style={styles.insightMetricLabel}>Recent Views</Text>
                    <Text style={styles.insightMetricValue}>
                      {proInsight?.recentViews ?? 0}
                    </Text>
                  </View>

                  <View style={styles.insightMetricCard}>
                    <Text style={styles.insightMetricLabel}>Recent Directions</Text>
                    <Text style={styles.insightMetricValue}>
                      {proInsight?.recentDirections ?? 0}
                    </Text>
                  </View>
                </View>

                <View style={styles.insightMetricsRow}>
                  <View style={styles.insightMetricCard}>
                    <Text style={styles.insightMetricLabel}>Conversion</Text>
                    <Text style={styles.insightMetricValue}>
                      {Number(proInsight?.recentConversion ?? 0).toFixed(1)}%
                    </Text>
                  </View>

                  <View style={styles.insightMetricCard}>
                    <Text style={styles.insightMetricLabel}>Data Strength</Text>
                    <Text style={styles.insightMetricValueSmall}>
                      {proInsight?.hasEnoughData ? "Usable" : "Early"}
                    </Text>
                  </View>
                </View>

                <View style={styles.insightSection}>
                  <Text style={styles.insightSectionLabel}>
                    Best hours to concentrate service
                  </Text>
                  <Text style={styles.insightSectionText}>
                    {proInsight?.hasSpecificTiming
                      ? `Your strongest engagement windows are ${proInsight.bestHoursText}.`
                      : "We need more customer activity before we can identify your strongest trading hours with confidence."}
                  </Text>
                </View>

                <View style={styles.insightSection}>
                  <Text style={styles.insightSectionLabel}>Strongest day signal</Text>
                  <Text style={styles.insightSectionText}>
                    {proInsight?.topDay?.day
                      ? `Your strongest recent day was ${formatInsightDay(
                        proInsight.topDay.day
                      )} with ${proInsight.topDay.total} view${proInsight.topDay.total === 1 ? "" : "s"
                      }.`
                      : "We need more daily activity before we can identify a strongest day."}
                  </Text>
                </View>

                <View style={styles.insightSection}>
                  <Text style={styles.insightSectionLabel}>Quietest day signal</Text>
                  <Text style={styles.insightSectionText}>
                    {proInsight?.quietDay?.day
                      ? `Your quietest recent day was ${formatInsightDay(
                        proInsight.quietDay.day
                      )} with ${proInsight.quietDay.total} view${proInsight.quietDay.total === 1 ? "" : "s"
                      }.`
                      : "We need more daily activity before we can identify a weaker day pattern."}
                  </Text>
                </View>

                <View style={styles.insightSection}>
                  <Text style={styles.insightSectionLabel}>
                    Main activity areas we can see
                  </Text>
                  <Text style={styles.insightSectionText}>
                    {proInsight?.hasSpecificLocation
                      ? "These are the strongest recorded interaction points from your recent location data."
                      : "We need more location-based interactions before we can identify your strongest demand areas with confidence."}
                  </Text>

                  {proInsight?.hasSpecificLocation ? (
                    <View style={styles.locationListCard}>
                      <Text style={styles.locationListText}>
                        {proInsight.locationText}
                      </Text>
                      <Text style={styles.locationHintText}>
                        These coordinates are approximate hotspots from customer
                        interaction locations, not guessed place names.
                      </Text>
                    </View>
                  ) : null}
                </View>

                <View style={styles.insightSection}>
                  <Text style={styles.insightSectionLabel}>Recommended action</Text>
                  <Text style={styles.insightSectionText}>
                    {proInsight?.recommendation}
                  </Text>
                </View>

                {!proInsight?.hasEnoughData ? (
                  <View style={styles.lowDataNote}>
                    <Text style={styles.lowDataNoteTitle}>Need more data</Text>
                    <Text style={styles.lowDataNoteText}>
                      We need more customer interactions to give you sharper,
                      more specific commercial guidance.
                    </Text>
                  </View>
                ) : null}
              </View>

              <View style={styles.mapInsightCard}>
                <Text style={styles.mapInsightTitle}>Interaction Map</Text>
                <Text style={styles.mapInsightSubtitle}>
                  Visual view of the strongest recorded interaction points for
                  your listing.
                </Text>

                {heatmapPoints.length === 0 ? (
                  <View style={styles.emptyInlineCard}>
                    <Text style={styles.emptyInlineTitle}>No map signal yet</Text>
                    <Text style={styles.emptyInlineText}>
                      We need more location-based interactions before your map
                      becomes useful.
                    </Text>
                  </View>
                ) : (
                  <MapView
                    style={styles.heatmapMap}
                    pointerEvents="none"
                    initialRegion={{
                      latitude: lat || van.lat,
                      longitude: lng || van.lng,
                      latitudeDelta: 0.18,
                      longitudeDelta: 0.18,
                    }}
                    scrollEnabled={false}
                    zoomEnabled={false}
                    rotateEnabled={false}
                    pitchEnabled={false}
                    toolbarEnabled={false}
                  >
                    <Marker
                      coordinate={{
                        latitude: lat || van.lat,
                        longitude: lng || van.lng,
                      }}
                      title={van.name}
                      pinColor={NAVY}
                    />

                    {heatmapPoints.map((point, index) => (
                      <Marker
                        key={`heatmap-${index}`}
                        coordinate={{
                          latitude: point.lat,
                          longitude: point.lng,
                        }}
                        anchor={{ x: 0.5, y: 0.5 }}
                      >
                        <View
                          style={[
                            styles.heatmapVisualDot,
                            point.weight >= 8
                              ? styles.heatmapVisualDotHot
                              : point.weight >= 4
                                ? styles.heatmapVisualDotWarm
                                : styles.heatmapVisualDotCool,
                          ]}
                        >
                          <Text style={styles.heatmapVisualDotText}>
                            {point.weight}
                          </Text>
                        </View>
                      </Marker>
                    ))}
                  </MapView>
                )}
              </View>
            </>
          )
        ) : (
          <View style={styles.inlineLockedCard}>
            <Text style={styles.inlineLockedTitle}>Pro feature</Text>
            <Text style={styles.inlineLockedText}>
              Upgrade to Pro to unlock interpreted insights from your views,
              directions, timing patterns, and location interaction data.
            </Text>
          </View>
        )}
      </DashboardAccordionSection>

      <DashboardAccordionSection
        title="Branding"
        subtitle="Strengthen trust and make your business look more premium."
        isOpen={openSections.branding}
        onToggle={() => toggleSection("branding")}
      >
        <View style={styles.cardBox}>
          {!features.images ? (
            <View style={styles.inlineLockedCard}>
              <Text style={styles.inlineLockedTitle}>Growth required</Text>
              <Text style={styles.inlineLockedText}>
                Add your logo to build trust and stand out more clearly.
              </Text>
            </View>
          ) : (
            <>
              <Pressable style={styles.softButton} onPress={pickLogo}>
                <Text style={styles.softButtonText}>
                  {logoUri ? "Replace Logo" : "Upload Logo"}
                </Text>
              </Pressable>

              {logoUri ? (
                <View style={styles.logoPreview}>
                  <Image source={{ uri: logoUri }} style={styles.logoLarge} />

                  <Pressable
                    style={styles.galleryDeleteButton}
                    onPress={removeLogo}
                  >
                    <Text style={styles.galleryDeleteButtonText}>Remove</Text>
                  </Pressable>
                </View>
              ) : (
                <View style={styles.emptyAssetBox}>
                  <Text style={styles.emptyAssetTitle}>No logo uploaded yet</Text>
                  <Text style={styles.emptyAssetText}>
                    Add a square logo to give your listing a stronger brand identity.
                  </Text>
                </View>
              )}
            </>
          )}
        </View>
      </DashboardAccordionSection>

      <DashboardAccordionSection
        title="Tier Growth"
        subtitle="See exactly what your next plan adds to your business."
        isOpen={openSections.growth}
        onToggle={() => toggleSection("growth")}
      >
        <View style={styles.cardBox}>
          {van.subscriptionTier !== "pro" ? (
            <>
              <View style={styles.upgradeBadge}>
                <Text style={styles.upgradeBadgeText}>{currentPlanLabel}</Text>
              </View>

              <Text style={styles.upgradeTitle}>
                {van.subscriptionTier === "free"
                  ? "Upgrade to Growth"
                  : "Upgrade to Pro"}
              </Text>

              <Text style={styles.upgradeText}>
                {van.subscriptionTier === "free"
                  ? "Turn a basic listing into a stronger customer-facing presence with live visibility, branding, menu uploads, and status updates."
                  : "Unlock BiteBeacon’s strongest vendor advantage with interpreted analytics, priority discovery, and deeper commercial guidance."}
              </Text>

              <View style={styles.upgradeFeatureList}>
                {van.subscriptionTier === "free" ? (
                  <>
                    <Text style={styles.upgradeFeature}>• Go LIVE when you are open</Text>
                    <Text style={styles.upgradeFeature}>• Add photos and logo branding</Text>
                    <Text style={styles.upgradeFeature}>• Upload a menu PDF</Text>
                    <Text style={styles.upgradeFeature}>• Post daily status updates</Text>
                    <Text style={styles.upgradeFeature}>• Update your trading location</Text>
                    <Text style={styles.upgradeFeature}>• Unlock Instagram, Facebook and website links</Text>
                    <Text style={styles.upgradeFeature}>• Unlock what3words precise location</Text>
                    <Text style={styles.upgradeFeature}>• Build more trust with customers</Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.upgradeFeature}>• Priority visibility on the map</Text>
                    <Text style={styles.upgradeFeature}>• Featured vendor presence</Text>
                    <Text style={styles.upgradeFeature}>• Trending vendor boost</Text>
                    <Text style={styles.upgradeFeature}>• Interpreted insight engine</Text>
                    <Text style={styles.upgradeFeature}>• Best-hour recommendations</Text>
                    <Text style={styles.upgradeFeature}>• Area activity hotspots</Text>
                    <Text style={styles.upgradeFeature}>• Conversion guidance</Text>
                  </>
                )}
              </View>

              <Text style={styles.upgradeSupportText}>
                {van.subscriptionTier === "free"
                  ? "Growth is built to help your listing look more active, more complete, and more likely to convert views into visits."
                  : "Pro is built for vendors who want sharper guidance from real activity, not just raw numbers."}
              </Text>

              <Pressable
                style={styles.upgradeButton}
                onPress={() => {
                  if (van.subscriptionTier === "free") {
                    router.push("/vendor/upgrade");
                    return;
                  }

                  manageSubscriptionFromDashboard();
                }}
              >
                <Text style={styles.upgradeButtonText}>
                  {van.subscriptionTier === "free"
                    ? "Upgrade to Growth"
                    : "Manage or Upgrade Subscription"}
                </Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text style={styles.proNoteTitle}>Pro Active</Text>
              <Text style={styles.proNoteText}>
                Your listing already has BiteBeacon’s highest level of visibility,
                premium presentation, and interpreted performance insight.
              </Text>
            </>
          )}
        </View>
      </DashboardAccordionSection>

      <DashboardAccordionSection
        title="Plan Guide"
        subtitle="Understand what each subscription tier unlocks."
        isOpen={openSections.guide}
        onToggle={() => toggleSection("guide")}
      >
        <View style={styles.cardBox}>
          <TierExplanationCard
            title="Free — Get discovered"
            subtitle="Your starting point"
            accent="free"
            isExpanded={expandedTier === "free"}
            onToggle={() => setExpandedTier("free")}
          >
            <Text style={styles.tierItem}>• Appear on the BiteBeacon map</Text>
            <Text style={styles.tierItem}>• Let customers view your listing</Text>
            <Text style={styles.tierItem}>
              • Track customer interest through views and directions
            </Text>
            <Text style={styles.tierItem}>• Build early traction and awareness</Text>

            <Text style={styles.tierHint}>
              Best for getting listed and starting your presence.
            </Text>
          </TierExplanationCard>

          <TierExplanationCard
            title="Growth — Turn views into customers"
            subtitle="Professional vendor tools"
            accent="growth"
            isExpanded={expandedTier === "growth"}
            onToggle={() => setExpandedTier("growth")}
          >
            <Text style={styles.tierItem}>• Go LIVE when you are open</Text>
            <Text style={styles.tierSub}>
              Shown more actively when customers are looking for food
            </Text>

            <Text style={styles.tierItem}>• Add photos and logo branding</Text>
            <Text style={styles.tierSub}>
              Build trust faster with a stronger visual presence
            </Text>

            <Text style={styles.tierItem}>• Upload a menu PDF</Text>
            <Text style={styles.tierSub}>
              Help customers decide before they arrive
            </Text>

            <Text style={styles.tierItem}>• Post status updates</Text>
            <Text style={styles.tierSub}>
              Keep your listing fresh with daily updates or offers
            </Text>

            <Text style={styles.tierItem}>• Update your location</Text>
            <Text style={styles.tierSub}>
              Stay relevant if you trade in different places
            </Text>

            <Text style={styles.tierItem}>• Unlock Instagram, Facebook and website links</Text>
            <Text style={styles.tierSub}>
              Let customers find, trust and follow your business more easily
            </Text>

            <Text style={styles.tierItem}>• Unlock what3words precise location</Text>
            <Text style={styles.tierSub}>
              Share a more precise trading location with customers
            </Text>

            <Text style={styles.tierHint}>
              Built to improve trust, visibility, and conversion.
            </Text>
          </TierExplanationCard>

          <TierExplanationCard
            title="Pro — Dominate visibility with real insight"
            subtitle="Premium discovery and performance intelligence"
            accent="pro"
            isExpanded={expandedTier === "pro"}
            onToggle={() => setExpandedTier("pro")}
          >
            <Text style={styles.tierItem}>• Everything in Growth</Text>

            <Text style={styles.tierItem}>• Priority visibility on the map</Text>
            <Text style={styles.tierSub}>
              Pro vendors are ranked ahead of lower tiers in discovery
            </Text>

            <Text style={styles.tierItem}>• Featured vendor presence</Text>
            <Text style={styles.tierSub}>
              Reinforces a stronger premium position across the app
            </Text>

            <Text style={styles.tierItem}>• Trending vendor boost</Text>
            <Text style={styles.tierSub}>
              High-performing Pro listings gain extra social proof
            </Text>

            <Text style={styles.tierItem}>• Interpreted insight engine</Text>
            <Text style={styles.tierSub}>
              Get actionable recommendations from your real interaction data
            </Text>

            <Text style={styles.tierItem}>• Best-hour recommendations</Text>
            <Text style={styles.tierSub}>
              Understand when customer engagement is strongest
            </Text>

            <Text style={styles.tierItem}>• Area activity hotspots</Text>
            <Text style={styles.tierSub}>
              See the strongest interaction points from recorded location data
            </Text>

            <Text style={styles.tierItem}>• Conversion guidance</Text>
            <Text style={styles.tierSub}>
              Understand whether visibility is turning into real visit intent
            </Text>

            <Text style={styles.tierHint}>
              Built for vendors who want to outperform competitors and make smarter
              decisions from real data.
            </Text>
          </TierExplanationCard>
        </View>
      </DashboardAccordionSection>

      <DashboardAccordionSection
        title="Listing Health"
        subtitle="Check whether your public listing looks complete and trustworthy."
        isOpen={openSections.health}
        onToggle={() => toggleSection("health")}
      >
        <View style={styles.cardBox}>
          <View style={styles.healthHeader}>
            <Text style={styles.healthTitle}>
              {listingReady ? "Ready to publish" : "Needs attention"}
            </Text>
            <Text style={styles.healthSubtitle}>
              Keep the essentials updated so customers trust your listing.
            </Text>
          </View>

          <View style={styles.healthRow}>
            <Text style={styles.healthLabel}>Photos</Text>
            <Text style={styles.healthValue}>
              {features.images
                ? photos.length > 0
                  ? `${photos.length} added`
                  : "Missing"
                : "Growth required"}
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

          <View style={styles.healthRow}>
            <Text style={styles.healthLabel}>Menu PDF</Text>
            <Text style={styles.healthValue}>
              {menuPdfName ? "Added" : "Optional"}
            </Text>
          </View>

          <View style={styles.healthRow}>
            <Text style={styles.healthLabel}>Logo</Text>
            <Text style={styles.healthValue}>
              {!features.images
                ? "Growth required"
                : hasLogo
                  ? "Added"
                  : "Missing"}
            </Text>
          </View>

          <View style={styles.healthRowLast}>
            <Text style={styles.healthLabel}>Live Status</Text>
            <Text style={styles.healthValue}>
              {features.liveStatus ? (isLive ? "Enabled" : "Off") : "Growth required"}
            </Text>
          </View>
        </View>
      </DashboardAccordionSection>

      <DashboardAccordionSection
        title="Listing Assets"
        subtitle="Manage your gallery and optional menu PDF."
        isOpen={openSections.assets}
        onToggle={() => toggleSection("assets")}
      >
        <View style={styles.cardBox}>
          <Text style={styles.assetSectionTitle}>Photo Gallery</Text>
          <Text style={styles.assetSectionText}>
            Add multiple photos to improve your listing. The first photo becomes
            the main image for now.
          </Text>

          {features.images ? (
            <>
              <Pressable style={styles.softButton} onPress={pickPhotos}>
                <Text style={styles.softButtonText}>Add Photos</Text>
              </Pressable>

              {photos.length > 0 ? (
                <View style={styles.galleryGrid}>
                  {photos.map((photoUri, index) => (
                    <View key={`photo-${index}`} style={styles.galleryItem}>
                      <Image source={{ uri: photoUri }} style={styles.galleryImage} />
                      <Pressable
                        style={styles.galleryDeleteButton}
                        onPress={() => removePhoto(index)}
                      >
                        <Text style={styles.galleryDeleteButtonText}>Remove</Text>
                      </Pressable>
                    </View>
                  ))}
                </View>
              ) : (
                <View style={styles.emptyAssetBox}>
                  <Text style={styles.emptyAssetTitle}>No photos uploaded yet</Text>
                  <Text style={styles.emptyAssetText}>
                    Add photos to make your listing look more complete.
                  </Text>
                </View>
              )}
            </>
          ) : (
            <View style={styles.inlineLockedCard}>
              <Text style={styles.inlineLockedTitle}>Growth plan required</Text>
              <Text style={styles.inlineLockedText}>
                Upgrade to add a photo gallery to your listing.
              </Text>
            </View>
          )}

          <View style={styles.assetDivider} />

          <Text style={styles.assetSectionTitle}>Menu PDF</Text>
          <Text style={styles.assetSectionText}>
            Upload a PDF menu for customers.
          </Text>

          {features.images ? (
            <>
              <Pressable style={styles.softButton} onPress={pickMenuPdf}>
                <Text style={styles.softButtonText}>
                  {menuPdfName ? "Replace Menu PDF" : "Upload Menu PDF"}
                </Text>
              </Pressable>

              {menuPdfName ? (
                <View style={styles.pdfCard}>
                  <Text style={styles.pdfName}>{menuPdfName}</Text>

                  <View style={styles.pdfActionsRow}>
                    <Pressable
                      style={styles.pdfActionButton}
                      onPress={openMenuPdfFromDashboard}
                    >
                      <Text style={styles.pdfActionButtonText}>View</Text>
                    </Pressable>

                    <Pressable
                      style={styles.pdfDeleteButton}
                      onPress={removeMenuPdf}
                    >
                      <Text style={styles.pdfDeleteButtonText}>Remove</Text>
                    </Pressable>
                  </View>
                </View>
              ) : (
                <View style={styles.emptyAssetBox}>
                  <Text style={styles.emptyAssetTitle}>
                    No menu PDF uploaded yet
                  </Text>
                  <Text style={styles.emptyAssetText}>
                    This is optional, but useful if you want a menu file ready.
                  </Text>
                </View>
              )}
            </>
          ) : (
            <View style={styles.inlineLockedCard}>
              <Text style={styles.inlineLockedTitle}>Growth plan required</Text>
              <Text style={styles.inlineLockedText}>
                Upgrade to upload a PDF version of your menu.
              </Text>
            </View>
          )}
        </View>
      </DashboardAccordionSection>

      <DashboardAccordionSection
        title="Edit Listing"
        subtitle="Update the details customers see on your public profile."
        isOpen={openSections.edit}
        onToggle={() => toggleSection("edit")}
      >
        <View style={styles.cardBox}>
          <Text style={styles.label}>Van name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Van name"
            placeholderTextColor="#7A7A7A"
          />

          <Text style={styles.label}>Vendor name</Text>
          <TextInput
            style={styles.input}
            value={vendorName}
            onChangeText={setVendorName}
            placeholder="Vendor name"
            placeholderTextColor="#7A7A7A"
          />

          <Text style={styles.label}>Cuisine</Text>
          <TextInput
            style={styles.input}
            value={cuisine}
            onChangeText={setCuisine}
            placeholder="Cuisine"
            placeholderTextColor="#7A7A7A"
          />

          <Text style={styles.label}>Menu</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={menu}
            onChangeText={setMenu}
            placeholder="Menu"
            placeholderTextColor="#7A7A7A"
            multiline
          />

          <Text style={styles.label}>Schedule</Text>

          <Text style={styles.label}>Instagram</Text>

          {!features.socialLinks ? (
            <View style={styles.inlineLockedCard}>
              <Text style={styles.inlineLockedTitle}>Growth feature</Text>
              <Text style={styles.inlineLockedText}>
                Upgrade to Growth to add your Instagram and build customer trust.
              </Text>
            </View>
          ) : (
            <TextInput
              style={styles.input}
              value={instagram}
              onChangeText={setInstagram}
              placeholder="https://instagram.com/yourpage"
              placeholderTextColor="#7A7A7A"
            />
          )}

          <Text style={styles.label}>Facebook</Text>

          {!features.socialLinks ? (
            <View style={styles.inlineLockedCard}>
              <Text style={styles.inlineLockedTitle}>Growth feature</Text>
              <Text style={styles.inlineLockedText}>
                Upgrade to Growth to add your Facebook page.
              </Text>
            </View>
          ) : (
            <TextInput
              style={styles.input}
              value={facebook}
              onChangeText={setFacebook}
              placeholder="https://facebook.com/yourpage"
              placeholderTextColor="#7A7A7A"
            />
          )}

          <Text style={styles.label}>Website</Text>

          {!features.socialLinks ? (
            <View style={styles.inlineLockedCard}>
              <Text style={styles.inlineLockedTitle}>Growth feature</Text>
              <Text style={styles.inlineLockedText}>
                Upgrade to Growth to add your website link.
              </Text>
            </View>
          ) : (
            <TextInput
              style={styles.input}
              value={website}
              onChangeText={setWebsite}
              placeholder="https://yourwebsite.com"
              placeholderTextColor="#7A7A7A"
            />
          )}

          <Text style={styles.label}>what3words location</Text>

          {!features.socialLinks ? (
            <View style={styles.inlineLockedCard}>
              <Text style={styles.inlineLockedTitle}>Growth feature</Text>
              <Text style={styles.inlineLockedText}>
                Upgrade to Growth to add a precise what3words location.
              </Text>
            </View>
          ) : (
            <TextInput
              style={styles.input}
              value={what3words}
              onChangeText={setWhat3words}
              placeholder="e.g. filled.count.soap"
              placeholderTextColor="#7A7A7A"
            />
          )}

          <TextInput
            style={[styles.input, styles.textArea]}
            value={schedule}
            onChangeText={setSchedule}
            placeholder="Weekly schedule"
            placeholderTextColor="#7A7A7A"
            multiline
          />

          <Text style={styles.label}>Food categories</Text>
          <TextInput
            style={styles.input}
            value={foodCategorySearch}
            onChangeText={setFoodCategorySearch}
            placeholder="Search food categories"
            placeholderTextColor="#7A7A7A"
          />

          <View style={styles.checkboxGroup}>
            {filteredFoodCategoryOptions.map((category) => {
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
                    {isSelected ? "✓ " : ""}
                    {category}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {canAddCustomCategory ? (
            <Pressable
              style={styles.addCustomCategoryButton}
              onPress={() => {
                const trimmedCategory = foodCategorySearch.trim();

                if (!trimmedCategory) return;

                setFoodCategories((current) => {
                  const alreadyExists = current.some(
                    (item) => item.toLowerCase() === trimmedCategory.toLowerCase()
                  );

                  if (alreadyExists) return current;

                  return [...current, trimmedCategory];
                });

                setFoodCategorySearch("");
              }}
            >
              <Text style={styles.addCustomCategoryButtonText}>
                Add "{foodCategorySearch.trim()}" as a cuisine
              </Text>
            </Pressable>
          ) : null}

          {foodCategorySearch.trim().length === 0 ? (
            <Text style={styles.categorySearchEmptyText}>
              Start typing to add your cuisine
            </Text>
          ) : filteredFoodCategoryOptions.length === 0 && !canAddCustomCategory ? (
            <Text style={styles.categorySearchEmptyText}>
              No matching categories found.
            </Text>
          ) : null}

          {features.reviews ? (
            <>
              <Text style={styles.label}>Listing update</Text>
              <View>
                <TextInput
                  ref={statusUpdateInputRef}
                  style={[styles.input, styles.textArea]}
                  value={vendorMessage}
                  onChangeText={setVendorMessage}
                  placeholder="Post a short update customers will see on your listing"
                  placeholderTextColor="#7A7A7A"
                  multiline
                  maxLength={140}
                />
              </View>
            </>
          ) : (
            <View style={styles.inlineLockedCard}>
              <Text style={styles.inlineLockedTitle}>Growth plan required</Text>
              <Text style={styles.inlineLockedText}>
                Upgrade to post daily status updates and offers.
              </Text>
            </View>
          )}

          <View style={styles.liveRow}>
            <Text style={styles.liveLabel}>Show as live now</Text>
            <Switch
              value={isLive}
              onValueChange={(value) => handleLiveToggle(value)}
            />
          </View>

          <Pressable
            style={[styles.primaryButton, isSaving && { opacity: 0.7 }]}
            onPress={() => {
              if (!isSaving) saveChanges();
            }}
            disabled={isSaving}
          >
            <Text style={styles.primaryButtonText}>
              {isSaving ? "Saving Changes..." : "Save Changes"}
            </Text>
          </Pressable>

          <Pressable
            style={styles.softButton}
            onPress={() =>
              router.replace({
                pathname: "/vendor/[id]",
                params: { id: van.id },
              })
            }
          >
            <Text style={styles.softButtonText}>Back to Vendor Page</Text>
          </Pressable>
        </View>
      </DashboardAccordionSection>

      <DashboardAccordionSection
        title="Account Actions"
        subtitle="Sign out or permanently remove your listing."
        isOpen={openSections.account}
        onToggle={() => toggleSection("account")}
      >
        <View style={styles.cardBox}>
          <Pressable style={styles.softButton} onPress={handleLogout}>
            <Text style={styles.softButtonText}>Log Out</Text>
          </Pressable>

          <Pressable style={styles.deleteButton} onPress={deleteListing}>
            <Text style={styles.deleteButtonText}>Delete Listing</Text>
          </Pressable>
        </View>
      </DashboardAccordionSection>

      <Pressable
        style={styles.manageButton}
        onPress={() => router.replace("/(tabs)/account")}
      >
        <Text style={styles.manageButtonText}>Account & Settings</Text>
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
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
  },

  centered: {
    flex: 1,
    backgroundColor: NAVY,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },

  loadingText: {
    fontSize: 16,
    fontWeight: "700",
    color: WHITE,
  },

  loadingInlineText: {
    fontSize: 14,
    color: MUTED_TEXT,
    fontWeight: "700",
  },

  notFoundTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: WHITE,
    marginBottom: 12,
  },

  accessText: {
    fontSize: 15,
    color: "rgba(255,255,255,0.78)",
    lineHeight: 22,
    textAlign: "center",
    marginBottom: 18,
  },

  headerBlock: {
    marginBottom: 18,
  },

  headerTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },

  headerTextWrap: {
    flex: 1,
  },

  headerActions: {
    flexDirection: "row",
    gap: 10,
  },

  accountIconButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: WHITE,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: ORANGE,
  },

  accountIconText: {
    fontSize: 20,
  },

  headerTitle: {
    fontSize: 30,
    fontWeight: "800",
    color: WHITE,
    marginBottom: 8,
  },

  headerSubtitle: {
    fontSize: 15,
    color: "rgba(255,255,255,0.75)",
    lineHeight: 22,
  },

  claimBanner: {
    backgroundColor: "rgba(255,122,0,0.12)",
    borderRadius: 18,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: SOFT_BORDER,
  },

  claimBannerTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: ORANGE,
    marginBottom: 4,
  },

  claimBannerText: {
    fontSize: 14,
    color: WHITE,
    lineHeight: 20,
  },

  heroCard: {
    backgroundColor: CARD_BG,
    borderRadius: 26,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: SOFT_BORDER,
    shadowColor: "#000",
    shadowOpacity: 0.14,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
    overflow: "hidden",
  },

  heroCardPro: {
    borderColor: ORANGE_SOFT,
    shadowColor: ORANGE,
    shadowOpacity: 0.18,
  },

  heroGlow: {
    position: "absolute",
    top: -30,
    right: -20,
    width: 160,
    height: 160,
    borderRadius: 999,
    backgroundColor: "rgba(255,122,0,0.10)",
  },

  heroTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 14,
    marginBottom: 18,
  },

  heroTextWrap: {
    flex: 1,
  },

  heroBadgeRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
    marginBottom: 12,
  },

  heroStatusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
  },

  heroStatusBadgeLive: {
    backgroundColor: GREEN,
  },

  heroStatusBadgeOffline: {
    backgroundColor: OFFLINE,
  },

  heroStatusBadgeListed: {
    backgroundColor: "#4F6B94",
  },

  heroStatusBadgeText: {
    color: WHITE,
    fontSize: 12,
    fontWeight: "800",
  },

  heroTitle: {
    fontSize: 30,
    fontWeight: "900",
    color: DARK_TEXT,
    marginBottom: 4,
  },

  heroVendorName: {
    fontSize: 16,
    fontWeight: "800",
    color: MUTED_TEXT,
    marginBottom: 6,
  },

  heroCuisine: {
    fontSize: 15,
    fontWeight: "700",
    color: "#3F4B5B",
    marginBottom: 10,
  },

  heroSupport: {
    fontSize: 14,
    color: MUTED_TEXT,
    lineHeight: 21,
    marginBottom: 8,
  },

  heroPlanSupport: {
    fontSize: 13,
    color: "#8A4B00",
    lineHeight: 19,
    fontWeight: "700",
  },

  heroImage: {
    width: 90,
    height: 90,
    borderRadius: 22,
    backgroundColor: SOFT_BG,
    borderWidth: 1.5,
    borderColor: "rgba(255,122,0,0.25)",
  },

  heroStatsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },

  heroStatCard: {
    minWidth: "47%",
    flex: 1,
    backgroundColor: NAVY_DEEP,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },

  heroStatLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "rgba(255,255,255,0.68)",
    textTransform: "uppercase",
    marginBottom: 6,
  },

  heroStatValue: {
    fontSize: 22,
    fontWeight: "900",
    color: WHITE,
  },

  heroStatHint: {
    fontSize: 11,
    fontWeight: "700",
    color: "rgba(255,255,255,0.68)",
    marginTop: 4,
    lineHeight: 15,
  },

  powerCard: {
    backgroundColor: SOFT_ORANGE_BG,
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: SOFT_ORANGE_BORDER,
  },

  guidanceBanner: {
    backgroundColor: "#F4F8FF",
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#C9D9F6",
  },

  guidanceBannerTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: DARK_TEXT,
    marginBottom: 6,
  },

  guidanceBannerText: {
    fontSize: 14,
    color: MUTED_TEXT,
    lineHeight: 20,
  },

  guidanceBannerButton: {
    marginTop: 12,
    backgroundColor: NAVY,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
  },

  guidanceBannerButtonText: {
    color: WHITE,
    fontSize: 14,
    fontWeight: "800",
  },

  powerCardEyebrow: {
    fontSize: 11,
    fontWeight: "900",
    color: "#8A4B00",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 6,
  },

  powerCardTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#8A4B00",
    marginBottom: 6,
  },

  powerCardText: {
    fontSize: 14,
    color: "#8A4B00",
    lineHeight: 20,
  },

  monetisationCard: {
    backgroundColor: "#FFF8F1",
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#FFD3AD",
  },

  monetisationTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#8A4B00",
    marginBottom: 6,
  },

  monetisationText: {
    fontSize: 14,
    color: "#8A4B00",
    lineHeight: 20,
    marginBottom: 12,
  },

  monetisationButton: {
    backgroundColor: ORANGE,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
  },

  monetisationButtonText: {
    color: WHITE,
    fontWeight: "800",
  },

  upgradeSignalCard: {
    backgroundColor: CARD_BG,
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: SOFT_BORDER,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },

  upgradeSignalEyebrow: {
    fontSize: 11,
    fontWeight: "900",
    color: ORANGE,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 6,
  },

  upgradeSignalTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: DARK_TEXT,
    marginBottom: 6,
  },

  upgradeSignalText: {
    fontSize: 14,
    color: MUTED_TEXT,
    lineHeight: 21,
    marginBottom: 14,
  },

  upgradeSignalSupportText: {
    fontSize: 13,
    color: "#8A4B00",
    lineHeight: 19,
    fontWeight: "700",
    marginBottom: 14,
  },

  upgradeSignalButton: {
    backgroundColor: ORANGE,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
  },

  upgradeSignalButtonText: {
    color: WHITE,
    fontSize: 15,
    fontWeight: "800",
  },

  quickActionsCard: {
    backgroundColor: CARD_BG,
    borderRadius: 22,
    padding: 18,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: SOFT_BORDER,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },

  quickActionsTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: DARK_TEXT,
    marginBottom: 4,
  },

  quickActionsSubtitle: {
    fontSize: 14,
    color: MUTED_TEXT,
    lineHeight: 20,
    marginBottom: 14,
  },

  quickActionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 12,
  },

  recommendationCard: {
    marginTop: 16,
    backgroundColor: "#F4F8FF",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "#C9D9F6",
  },

  recommendationTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: DARK_TEXT,
    marginBottom: 4,
  },

  recommendationText: {
    fontSize: 14,
    color: MUTED_TEXT,
    lineHeight: 20,
    marginBottom: 10,
  },

  recommendationButton: {
    backgroundColor: NAVY,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center",
  },

  recommendationButtonText: {
    color: WHITE,
    fontWeight: "800",
  },

  quickActionButton: {
    width: "48%",
    minHeight: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingVertical: 14,
  },

  quickActionPrimary: {
    backgroundColor: ORANGE,
  },

  quickActionSecondary: {
    backgroundColor: NAVY,
  },

  quickActionLocked: {
    backgroundColor: "#F4F4F4",
    borderWidth: 1,
    borderColor: "#E2E2E2",
  },

  quickActionPrimaryText: {
    color: WHITE,
    fontSize: 15,
    fontWeight: "800",
    textAlign: "center",
  },

  quickActionSecondaryText: {
    color: WHITE,
    fontSize: 15,
    fontWeight: "800",
    textAlign: "center",
  },

  quickActionLockedText: {
    color: DARK_TEXT,
    fontSize: 15,
    fontWeight: "800",
    textAlign: "center",
  },

  sectionWrap: {
    marginBottom: 16,
  },

  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    marginBottom: 10,
  },

  sectionHeaderTextWrap: {
    flex: 1,
  },

  sectionTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: WHITE,
    marginBottom: 4,
  },

  sectionSubtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.72)",
    lineHeight: 20,
  },

  sectionTogglePill: {
    backgroundColor: WHITE,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: SOFT_BORDER,
  },

  sectionToggleText: {
    color: DARK_TEXT,
    fontSize: 12,
    fontWeight: "800",
  },

  sectionBody: {
    gap: 0,
  },

  planBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },

  planBadgeFree: {
    backgroundColor: "#EEF2F7",
  },

  planBadgeGrowth: {
    backgroundColor: "#DCE7F7",
  },

  planBadgePro: {
    backgroundColor: "#FFF0E3",
  },

  planBadgeText: {
    fontSize: 12,
    fontWeight: "800",
  },

  planBadgeTextFree: {
    color: "#355070",
  },

  planBadgeTextGrowth: {
    color: DARK_TEXT,
  },

  planBadgeTextPro: {
    color: ORANGE,
  },

  cardBox: {
    backgroundColor: CARD_BG,
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: SOFT_BORDER,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },

  insightEngineCard: {
    backgroundColor: CARD_BG,
    borderRadius: 24,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: SOFT_BORDER,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },

  insightEngineEyebrow: {
    fontSize: 11,
    fontWeight: "900",
    color: ORANGE,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 6,
  },

  insightEngineTitle: {
    fontSize: 24,
    fontWeight: "900",
    color: DARK_TEXT,
    marginBottom: 14,
  },

  insightSection: {
    marginBottom: 14,
  },

  insightSectionLabel: {
    fontSize: 14,
    fontWeight: "800",
    color: DARK_TEXT,
    marginBottom: 6,
  },

  insightSectionText: {
    fontSize: 14,
    color: MUTED_TEXT,
    lineHeight: 21,
  },

  insightMetricsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
  },

  insightMetricCard: {
    flex: 1,
    backgroundColor: SOFT_BG,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: THIN_BLACK,
  },

  insightMetricLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: MUTED_TEXT,
    textTransform: "uppercase",
    marginBottom: 6,
  },

  insightMetricValue: {
    fontSize: 22,
    fontWeight: "900",
    color: ORANGE,
  },

  insightMetricValueSmall: {
    fontSize: 18,
    fontWeight: "900",
    color: DARK_TEXT,
  },

  locationListCard: {
    marginTop: 10,
    backgroundColor: SOFT_BG,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: THIN_BLACK,
  },

  locationListText: {
    fontSize: 14,
    color: DARK_TEXT,
    lineHeight: 21,
    fontWeight: "700",
    marginBottom: 10,
  },

  locationHintText: {
    fontSize: 12,
    color: MUTED_TEXT,
    lineHeight: 18,
  },

  lowDataNote: {
    marginTop: 4,
    backgroundColor: SOFT_ORANGE_BG,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: SOFT_ORANGE_BORDER,
  },

  lowDataNoteTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#8A4B00",
    marginBottom: 4,
  },

  lowDataNoteText: {
    fontSize: 13,
    color: "#8A4B00",
    lineHeight: 19,
  },

  mapInsightCard: {
    backgroundColor: CARD_BG,
    borderRadius: 24,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: SOFT_BORDER,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },

  mapInsightTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: DARK_TEXT,
    marginBottom: 4,
  },

  mapInsightSubtitle: {
    fontSize: 13,
    color: MUTED_TEXT,
    lineHeight: 19,
    marginBottom: 14,
  },

  heatmapMap: {
    width: "100%",
    height: 220,
    borderRadius: 18,
    overflow: "hidden",
  },

  heatmapVisualDot: {
    minWidth: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
    borderWidth: 2,
    borderColor: WHITE,
  },

  heatmapVisualDotCool: {
    backgroundColor: "#8FB3E8",
  },

  heatmapVisualDotWarm: {
    backgroundColor: "#FFB067",
  },

  heatmapVisualDotHot: {
    backgroundColor: ORANGE,
  },

  heatmapVisualDotText: {
    color: WHITE,
    fontSize: 11,
    fontWeight: "800",
  },

  emptyInlineCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  emptyInlineTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: DARK_TEXT,
    marginBottom: 4,
  },

  emptyInlineText: {
    fontSize: 14,
    color: MUTED_TEXT,
    lineHeight: 20,
  },

  upgradeBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#EEF2F7",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    marginBottom: 12,
  },

  upgradeBadgeText: {
    color: DARK_TEXT,
    fontSize: 12,
    fontWeight: "800",
  },

  upgradeTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: DARK_TEXT,
    marginBottom: 8,
  },

  upgradeText: {
    fontSize: 15,
    color: MUTED_TEXT,
    lineHeight: 22,
    marginBottom: 14,
  },

  upgradeSupportText: {
    fontSize: 14,
    color: "#8A4B00",
    lineHeight: 20,
    fontWeight: "700",
    marginBottom: 14,
  },

  upgradeFeatureList: {
    marginBottom: 14,
  },

  upgradeFeature: {
    fontSize: 14,
    color: "#1F2937",
    marginBottom: 8,
    lineHeight: 20,
  },

  upgradeButton: {
    backgroundColor: ORANGE,
    paddingVertical: 15,
    borderRadius: 16,
    alignItems: "center",
  },

  upgradeButtonText: {
    color: WHITE,
    fontSize: 16,
    fontWeight: "800",
  },

  proNoteTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: DARK_TEXT,
    marginBottom: 8,
  },

  proNoteText: {
    fontSize: 15,
    color: MUTED_TEXT,
    lineHeight: 22,
  },

  tierExplainCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  tierExplainCardGrowth: {
    borderColor: "#C9D9F6",
    backgroundColor: "#F4F8FF",
  },

  tierExplainCardPro: {
    borderColor: "#FFD3AD",
    backgroundColor: "#FFF8F1",
  },

  tierExplainHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  tierExplainTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: DARK_TEXT,
    marginBottom: 2,
  },

  tierExplainSubtitle: {
    fontSize: 13,
    color: MUTED_TEXT,
    lineHeight: 18,
  },

  tierExplainToggle: {
    fontSize: 24,
    fontWeight: "800",
    color: DARK_TEXT,
    marginLeft: 10,
  },

  tierExplainBody: {
    marginTop: 12,
    gap: 6,
  },

  tierItem: {
    fontSize: 14,
    color: "#1F2937",
    lineHeight: 20,
  },

  tierSub: {
    fontSize: 13,
    color: MUTED_TEXT,
    lineHeight: 18,
    marginTop: 2,
    marginBottom: 8,
    marginLeft: 4,
  },

  tierHint: {
    fontSize: 13,
    fontWeight: "700",
    color: "#8A4B00",
    lineHeight: 18,
    marginTop: 10,
  },

  healthHeader: {
    marginBottom: 12,
  },

  healthTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: DARK_TEXT,
    marginBottom: 4,
  },

  healthSubtitle: {
    fontSize: 14,
    color: MUTED_TEXT,
    lineHeight: 20,
  },

  healthRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#EFEFEF",
  },

  healthRowLast: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
  },

  healthLabel: {
    fontSize: 14,
    color: MUTED_TEXT,
    fontWeight: "700",
  },

  healthValue: {
    fontSize: 14,
    color: DARK_TEXT,
    fontWeight: "800",
  },

  assetSectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: DARK_TEXT,
    marginBottom: 6,
  },

  assetSectionText: {
    fontSize: 14,
    color: MUTED_TEXT,
    lineHeight: 21,
    marginBottom: 14,
  },

  galleryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },

  galleryItem: {
    width: "48%",
    backgroundColor: SOFT_BG,
    borderRadius: 16,
    padding: 8,
    borderWidth: 1,
    borderColor: THIN_BLACK,
  },

  galleryImage: {
    width: "100%",
    height: 120,
    borderRadius: 12,
    marginBottom: 8,
  },

  galleryDeleteButton: {
    backgroundColor: WHITE,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  galleryDeleteButtonText: {
    color: "#C62828",
    fontSize: 13,
    fontWeight: "800",
  },

  assetDivider: {
    height: 1,
    backgroundColor: "#ECECEC",
    marginVertical: 18,
  },

  pdfCard: {
    backgroundColor: SOFT_BG,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: THIN_BLACK,
  },

  pdfName: {
    fontSize: 14,
    fontWeight: "700",
    color: DARK_TEXT,
    marginBottom: 12,
  },

  pdfActionsRow: {
    flexDirection: "row",
    gap: 10,
  },

  pdfActionButton: {
    flex: 1,
    backgroundColor: NAVY,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
  },

  pdfActionButtonText: {
    color: WHITE,
    fontSize: 14,
    fontWeight: "700",
  },

  pdfDeleteButton: {
    flex: 1,
    backgroundColor: WHITE,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  pdfDeleteButtonText: {
    color: "#C62828",
    fontSize: 14,
    fontWeight: "700",
  },

  emptyAssetBox: {
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  emptyAssetTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: DARK_TEXT,
    marginBottom: 4,
  },

  emptyAssetText: {
    fontSize: 14,
    color: MUTED_TEXT,
    lineHeight: 20,
  },

  label: {
    fontSize: 15,
    fontWeight: "700",
    color: DARK_TEXT,
    marginBottom: 8,
  },

  input: {
    backgroundColor: WHITE,
    borderWidth: 2,
    borderColor: ORANGE,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
    color: "#1F1F1F",
  },

  textArea: {
    minHeight: 110,
    textAlignVertical: "top",
  },

  checkboxGroup: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 16,
  },

  checkboxChip: {
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: "#D9D9D9",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },

  checkboxChipSelected: {
    backgroundColor: NAVY,
    borderColor: NAVY,
  },

  checkboxChipText: {
    color: NAVY,
    fontSize: 14,
    fontWeight: "700",
  },

  checkboxChipTextSelected: {
    color: WHITE,
  },

  categorySearchEmptyText: {
    fontSize: 14,
    color: MUTED_TEXT,
    marginBottom: 16,
    fontWeight: "600",
  },

  addCustomCategoryButton: {
    backgroundColor: NAVY,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 16,
    alignItems: "center",
  },

  addCustomCategoryButtonText: {
    color: WHITE,
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
  },

  inlineLockedCard: {
    backgroundColor: "#FFF3E0",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: SOFT_BORDER,
  },

  inlineLockedTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#8A4B00",
    marginBottom: 4,
  },

  inlineLockedText: {
    fontSize: 14,
    color: "#8A4B00",
    lineHeight: 20,
  },

  liveRow: {
    backgroundColor: SOFT_BG,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: THIN_BLACK,
  },

  liveLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: DARK_TEXT,
  },

  liveLockedText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#8A4B00",
  },

  primaryButton: {
    backgroundColor: ORANGE,
    paddingVertical: 15,
    borderRadius: 16,
    alignItems: "center",
    marginBottom: 12,
  },

  primaryButtonText: {
    color: WHITE,
    fontSize: 16,
    fontWeight: "800",
  },

  softButton: {
    backgroundColor: "#EEF2F7",
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
    marginBottom: 12,
  },

  softButtonText: {
    color: DARK_TEXT,
    fontSize: 16,
    fontWeight: "700",
  },

  softButtonDark: {
    backgroundColor: "#EEF2F7",
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 16,
    alignItems: "center",
  },

  softButtonDarkText: {
    color: DARK_TEXT,
    fontSize: 15,
    fontWeight: "700",
  },

  deleteButton: {
    backgroundColor: "#C62828",
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 4,
  },

  deleteButtonText: {
    color: WHITE,
    fontSize: 16,
    fontWeight: "700",
  },

  manageButton: {
    marginTop: 14,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
    backgroundColor: NAVY,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },

  manageButtonText: {
    color: WHITE,
    fontWeight: "700",
  },

  claimStatus: {
    fontSize: 16,
    fontWeight: "800",
    color: DARK_TEXT,
    marginBottom: 10,
  },

  claimNoteLabel: {
    fontSize: 13,
    fontWeight: "800",
    color: ORANGE,
    marginBottom: 6,
  },

  claimNote: {
    fontSize: 14,
    color: "#222222",
    lineHeight: 20,
  },

  claimPending: {
    fontSize: 14,
    color: OFFLINE,
    fontStyle: "italic",
  },

  logoPreview: {
    alignItems: "center",
    marginTop: 10,
  },

  logoLarge: {
    width: 120,
    height: 120,
    borderRadius: 24,
    alignSelf: "center",
    marginTop: 12,
    backgroundColor: SOFT_BG,
  },
});