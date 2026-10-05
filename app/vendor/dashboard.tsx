import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
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
import Svg, { Circle, Defs, Path, Stop, LinearGradient as SvgLinearGradient } from "react-native-svg";
import AppText from "../../components/AppText";
import CardGlowBorder from "../../components/CardGlowBorder";
import MapTextureBackground from "../../components/MapTextureBackground";
import MetallicFrame from "../../components/MetallicFrame";
import SectionGlowLine from "../../components/SectionGlowLine";
import { getSubscriptionFeatures } from "../../lib/subscriptionFeatures";
import { supabase } from "../../lib/supabase";
import { createListingRemovalRequest } from "../../services/accountDeletionService";
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

function getDashboardSectionIcon(title: string) {
  switch (title) {
    case "Performance Insights":
      return "chart-bar";
    case "Branding":
    case "Brand & Media":
      return "image-multiple-outline";
    case "Tier Growth":
    case "Plan Guide":
    case "Plan & Features":
      return "crown-outline";
    case "Listing Health":
      return "heart-pulse";
    case "Listing Assets":
      return "image-multiple-outline";
    case "Edit Listing":
    case "Business Details":
      return "pencil-outline";
    case "Account Actions":
      return "account-outline";
    default:
      return "dots-horizontal-circle-outline";
  }
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
  const iconName = getDashboardSectionIcon(title);

  return (
    <LinearGradient
      colors={
        isOpen
          ? ["rgba(14,39,62,0.97)", "rgba(6,22,38,0.99)"]
          : ["rgba(10,31,51,0.90)", "rgba(5,19,33,0.95)"]
      }
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.sectionWrap, isOpen && styles.sectionWrapOpen]}
    >
      <Pressable style={styles.sectionHeader} onPress={onToggle}>
        <View style={styles.sectionIconShell}>
          <MaterialCommunityIcons
            name={iconName as any}
            size={19}
            color="#F4B547"
          />
        </View>

        <View style={styles.sectionHeaderTextWrap}>
          <AppText variant="bodyBold" style={styles.sectionTitle}>
            {title}
          </AppText>

          <AppText variant="body" style={styles.sectionSubtitle} numberOfLines={1}>
            {subtitle}
          </AppText>
        </View>

        <View style={[styles.sectionTogglePill, isOpen && styles.sectionTogglePillOpen]}>
          <AppText variant="button" style={styles.sectionToggleText}>
            {isOpen ? "−" : "+"}
          </AppText>
        </View>
      </Pressable>

      {isOpen ? (
        <View style={styles.sectionBody}>
          <SectionGlowLine />
          {children}
        </View>
      ) : null}
    </LinearGradient>
  );
}

function PerformanceChart({
  points,
  locked,
}: {
  points: InsightPoint[];
  locked: boolean;
}) {
  const values = locked
    ? [2, 3.5, 3, 5.2, 4.4, 6.8, 5.9, 7.6, 6.5]
    : points
        .filter((point) => typeof point.total === "number")
        .slice(-9)
        .map((point) => point.total);

  const safeValues = values.length >= 2 ? values : [0, 0, 0, 0, 0, 0];
  const maxValue = Math.max(...safeValues, 1);
  const minValue = Math.min(...safeValues, 0);
  const range = Math.max(maxValue - minValue, 1);
  const width = 320;
  const height = 104;
  const padX = 8;
  const padY = 12;

  const coordinates = safeValues.map((value, index) => {
    const x =
      padX +
      (index / Math.max(safeValues.length - 1, 1)) * (width - padX * 2);
    const y =
      height -
      padY -
      ((value - minValue) / range) * (height - padY * 2);
    return { x, y };
  });

  const path = coordinates
    .map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(1)},${point.y.toFixed(1)}`)
    .join(" ");

  const first = coordinates[0];
  const last = coordinates[coordinates.length - 1];
  const areaPath = `${path} L${last.x.toFixed(1)},${(height - padY).toFixed(1)} L${first.x.toFixed(1)},${(height - padY).toFixed(1)} Z`;
  const active = coordinates[Math.max(coordinates.length - 2, 0)];

  return (
    <View style={styles.performanceChartShell}>
      <Svg width="100%" height={112} viewBox="0 0 320 104">
        <Defs>
          <SvgLinearGradient id="performanceArea" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#F4B547" stopOpacity="0.34" />
            <Stop offset="1" stopColor="#F4B547" stopOpacity="0" />
          </SvgLinearGradient>
          <SvgLinearGradient id="performanceLine" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#4FA7FF" />
            <Stop offset="0.46" stopColor="#F4B547" />
            <Stop offset="1" stopColor="#FFE39A" />
          </SvgLinearGradient>
        </Defs>

        {[28, 52, 76].map((y) => (
          <Path
            key={y}
            d={`M8,${y} L312,${y}`}
            stroke="rgba(255,255,255,0.07)"
            strokeWidth="1"
          />
        ))}

        <Path d={areaPath} fill="url(#performanceArea)" />
        <Path
          d={path}
          fill="none"
          stroke="rgba(79,167,255,0.30)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Path
          d={path}
          fill="none"
          stroke="url(#performanceLine)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {active ? (
          <>
            <Circle cx={active.x} cy={active.y} r="7" fill="rgba(244,181,71,0.16)" />
            <Circle cx={active.x} cy={active.y} r="3.5" fill="#FFF1C2" />
          </>
        ) : null}
      </Svg>

      {locked ? (
        <View style={styles.performanceChartLock}>
          <MaterialCommunityIcons name="lock-outline" size={15} color="#F4B547" />
          <AppText variant="bodyBold" style={styles.performanceChartLockText}>
            Pro trend preview
          </AppText>
        </View>
      ) : null}
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
  const currentScrollY = useRef(0);
  const editSectionRef = useRef<View | null>(null);
  const liveDurationRef = useRef<View | null>(null);
  const editSectionY = useRef(0);
  const liveDurationY = useRef(0);
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
  const [liveDurationHours, setLiveDurationHours] = useState<1 | 2 | 4 | 8>(4);
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
    edit: false,
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

          if (!vendor.isApproved) {
            router.replace("/vendor/pending");
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

    const isFreePlan = van.subscriptionTier === "free";
    const photoLimit = isFreePlan ? 1 : 5;

    if (photos.length >= photoLimit) {
      if (isFreePlan) {
        Alert.alert(
          "Your free photo is already added",
          "Free includes one main listing photo. Growth unlocks a full gallery of up to 5 photos, plus logo and menu PDF tools.",
          [
            { text: "Not now", style: "cancel" },
            { text: "Explore Growth", onPress: () => router.push("/vendor/upgrade") },
          ]
        );
      } else {
        Alert.alert(
          "Photo limit reached",
          "You can upload up to 5 listing photos for now."
        );
      }
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
      quality: 0.6,
      allowsEditing: false,
      allowsMultipleSelection: !isFreePlan,
      selectionLimit: Math.max(0, photoLimit - photos.length),
    });

    if (result.canceled) return;

    const selectedUris = result.assets.map((asset) => asset.uri).filter(Boolean);

    setPhotos((current) => {
      const merged = [...current, ...selectedUris];
      return Array.from(new Set(merged)).slice(0, photoLimit);
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

      if (file.size && file.size > 5 * 1024 * 1024) {
        Alert.alert(
          "File too large",
          "Menu PDFs must be under 5MB."
        );
        return;
      }

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

  function scrollMeasuredTarget(target: View | null, topOffset = 90) {
    if (!target) return false;

    target.measureInWindow((_x, y) => {
      scrollRef.current?.scrollTo({
        y: Math.max(currentScrollY.current + y - topOffset, 0),
        animated: true,
      });
    });

    return true;
  }

  function jumpToEditSection() {
    openSection("edit");

    // Business Details now sits inside the Management panel, so its old
    // onLayout Y value is no longer a ScrollView content coordinate.
    // Measure the actual rendered section instead so the shortcut always lands correctly.
    setTimeout(() => {
      if (!scrollMeasuredTarget(editSectionRef.current, 90)) {
        setTimeout(() => scrollMeasuredTarget(editSectionRef.current, 90), 250);
      }
    }, 320);
  }

  function jumpToLiveDuration() {
    openSection("edit");

    if (!isLive) {
      setIsLive(true);
    }

    // Wait for the accordion and conditional timer controls to render, then
    // measure the timer itself. This keeps the original Go Live -> timer behaviour.
    setTimeout(() => {
      if (!scrollMeasuredTarget(liveDurationRef.current, 115)) {
        setTimeout(() => scrollMeasuredTarget(liveDurationRef.current, 115), 300);
      }
    }, 700);
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
      const nextLiveUntil = newStatus ? van.liveUntil ?? null : null;

      await supabase
        .from("vendors")
        .update({
          is_live: newStatus,
          live_until: nextLiveUntil,
        })
        .eq("id", van.id);

      setIsLive(newStatus);
      setVan({
        ...van,
        isLive: newStatus,
        liveUntil: nextLiveUntil,
      });
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

      // Every vendor gets a useful listing: Free can keep one main photo,
      // while Growth/Pro can build a gallery of up to five.
      const photoLimit = van.subscriptionTier === "free" ? 1 : 5;
      const existingRemotePhotos = photos.filter((uri) => !isLocalFileUri(uri));
      const localPhotos = photos.filter((uri) => isLocalFileUri(uri));
      const uniqueLocalPhotos = Array.from(new Set(localPhotos));

      const uploadedPhotoUrls =
        uniqueLocalPhotos.length > 0
          ? await uploadVendorPhotos(user.id, uniqueLocalPhotos)
          : [];

      nextPhotos = [...existingRemotePhotos, ...uploadedPhotoUrls].slice(0, photoLimit);

      if (features.images) {
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

      let liveUntil: string | null = null;

      if (isLive) {
        const expiry = new Date();
        expiry.setHours(expiry.getHours() + liveDurationHours);
        liveUntil = expiry.toISOString();
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
          photo: nextPhotos[0] ?? null,
          photos: nextPhotos,
          logo_url: features.images ? nextLogoUri : null,
          logo_path: features.images ? nextLogoPath : null,
          menu_pdf_url: features.images ? nextMenuPdfStoragePath : null,
          menu_pdf_name: features.images ? nextMenuPdfName : null,
          is_live: isLive,
          live_until: liveUntil,
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
        liveUntil: liveUntil,
        foodCategories,
        instagramUrl: features.socialLinks ? instagram.trim() || null : null,
        facebookUrl: features.socialLinks ? facebook.trim() || null : null,
        websiteUrl: features.socialLinks ? website.trim() || null : null,
        what3words: features.socialLinks ? what3words.trim() || null : null,
        photo: nextPhotos[0] ?? null,
        photos: nextPhotos,
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
      "Request listing removal",
      "Your listing will not be deleted immediately. A removal request will be sent to BiteBeacon for review.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Request Removal",
          style: "destructive",
          onPress: async () => {
            try {
              const user = await getCurrentUser();

              if (!user || user.id !== van.owner_id) {
                Alert.alert(
                  "Access denied",
                  "You can only request removal of your own listing."
                );
                return;
              }

              await createListingRemovalRequest({
                userId: user.id,
                email: user.email ?? null,
                vendorId: van.id,
                reason: null,
              });

              Alert.alert(
                "Request submitted",
                "Your listing removal request has been sent to BiteBeacon for review. Your listing will remain active until the request is reviewed."
              );
            } catch (error) {
              Alert.alert(
                "Request failed",
                error instanceof Error
                  ? error.message
                  : "Could not submit the listing removal request."
              );
            }
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
          body: "Customers are finding you, but Free plan limitations can make it harder to convert interest into real visits. Growth unlocks a full photo gallery, branding, menu PDF uploads, social links, location tools, and stronger listing trust. LIVE is included on Free during launch.",
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
        title: "Build a stronger customer presence",
        body: "Free already gives you LIVE during launch. Growth adds the branding, media, location and customer-update tools that make your listing feel more complete.",
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
        action: jumpToEditSection,
        cta: "Go Live",
      };
    }

    // 📸 No photos = weak trust
    if (!hasPhotos) {
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

  const liveTimeRemaining = useMemo(() => {
    if (!van?.liveUntil || !isLive) return null;

    const now = Date.now();
    const expiry = new Date(van.liveUntil).getTime();

    const diffMs = expiry - now;

    if (diffMs <= 0) return null;

    const totalMinutes = Math.floor(diffMs / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    return `${hours}h ${minutes}m remaining`;
  }, [van?.liveUntil, isLive]);

  // Keep management sections collapsed by default.
  // Vendors are prompted by the compact next-step card instead of being
  // dropped into a long form automatically.


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

  const listingReady = !!menu.trim() && !!schedule.trim() && photos.length > 0;
  const missingListingEssentials = [
    photos.length === 0 ? "main photo" : null,
    !menu.trim() ? "menu" : null,
    !schedule.trim() ? "trading schedule" : null,
  ].filter((item): item is string => !!item);
  const needsListingAttention = missingListingEssentials.length > 0;
  const listingAttentionTitle =
    missingListingEssentials.length === 1
      ? `Add your ${missingListingEssentials[0]}`
      : `${missingListingEssentials.length} things left to finish`;
  const listingAttentionSubtitle = missingListingEssentials
    .map((item) => item.charAt(0).toUpperCase() + item.slice(1))
    .join(" · ");

  function handleListingAttentionPress() {
    if (photos.length === 0) {
      openSection("branding");
      return;
    }

    jumpToEditSection();
  }

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
    <MapTextureBackground>
      <ScrollView
        ref={scrollRef}
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        onScroll={(event) => {
          currentScrollY.current = event.nativeEvent.contentOffset.y;
        }}
        scrollEventThrottle={16}
      >
        <View style={styles.compactTopBar}>
          <AppText variant="label" style={styles.compactTopEyebrow}>
            VENDOR DASHBOARD
          </AppText>

          <View style={styles.compactTopActions}>
            <Pressable
              style={styles.compactIconButton}
              onPress={() => router.replace("/(tabs)")}
            >
              <MaterialCommunityIcons name="home-outline" size={20} color="#F4B547" />
            </Pressable>

            <Pressable
              style={styles.compactIconButton}
              onPress={() => router.replace("/(tabs)/account")}
            >
              <MaterialCommunityIcons name="cog-outline" size={20} color="#F4B547" />
            </Pressable>
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

        <View style={styles.identityGlowWrap}>
          <CardGlowBorder
            accentColor="#F4B547"
            borderColor="rgba(244,181,71,0.42)"
            borderRadius={24}
          />

          <MetallicFrame
            tone="gold"
            borderWidth={3}
            style={styles.identityFrame}
            contentStyle={{ borderRadius: 23 }}
          >
            <LinearGradient
              colors={[
                "rgba(12,37,61,0.97)",
                "rgba(5,20,35,0.985)",
                "rgba(4,13,23,0.995)",
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.identityCard}
            >
              <View style={styles.identityAvatarShell}>
                {heroVisualUri ? (
                  <Image source={{ uri: heroVisualUri }} style={styles.identityAvatarImage} />
                ) : (
                  <LinearGradient
                    colors={["#2E526F", "#152D43"]}
                    style={styles.identityAvatarFallback}
                  >
                    <AppText variant="heading" style={styles.identityAvatarLetter}>
                      {van.name.trim().slice(0, 1).toUpperCase() || "B"}
                    </AppText>
                  </LinearGradient>
                )}
              </View>

              <View style={styles.identityTextArea}>
                <AppText variant="heading" style={styles.identityName} numberOfLines={1}>
                  {van.name}
                </AppText>

                <AppText variant="body" style={styles.identityVendor} numberOfLines={1}>
                  {vendorName || van.vendorName || cuisine || "Your food business"}
                </AppText>

                <View style={styles.identityBadgeRow}>
                  <View style={[styles.compactPlanBadge, planBadgeStyle]}>
                    <AppText
                      variant="bodyBold"
                      style={[styles.compactPlanBadgeText, planBadgeTextStyle]}
                    >
                      {currentPlanLabel}
                    </AppText>
                  </View>

                  <View style={styles.identityStatusWrap}>
                    <View
                      style={[
                        styles.identityStatusDot,
                        isLive && features.liveStatus
                          ? styles.identityStatusDotLive
                          : styles.identityStatusDotOffline,
                      ]}
                    />
                    <AppText variant="bodyBold" style={styles.identityStatusText}>
                      {features.liveStatus ? (isLive ? "Live now" : "Offline") : "Listed"}
                    </AppText>
                  </View>
                </View>
              </View>
            </LinearGradient>
          </MetallicFrame>
        </View>

        <View style={styles.metricsPanel}>
          <LinearGradient
            colors={["rgba(10,31,51,0.97)", "rgba(4,16,28,0.99)"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.metricsPanelInner}
          >
            <View style={styles.metricCell}>
              <MaterialCommunityIcons name="eye-outline" size={20} color="#F4B547" />
              <AppText variant="heading" style={styles.metricValue}>{van.views ?? 0}</AppText>
              <AppText variant="body" style={styles.metricLabel}>Views</AppText>
            </View>

            <View style={styles.metricDivider} />

            <View style={styles.metricCell}>
              <MaterialCommunityIcons name="navigation-variant-outline" size={20} color="#4FA7FF" />
              <AppText variant="heading" style={styles.metricValue}>{van.directions ?? 0}</AppText>
              <AppText variant="body" style={styles.metricLabel}>Directions</AppText>
            </View>

            <View style={styles.metricDivider} />

            <View style={styles.metricCell}>
              <MaterialCommunityIcons name="star-outline" size={20} color="#F4B547" />
              <AppText variant="heading" style={styles.metricValue}>{(van.rating ?? 0).toFixed(1)}</AppText>
              <AppText variant="body" style={styles.metricLabel}>Rating</AppText>
            </View>

            <View style={styles.metricDivider} />

            <View style={styles.metricCell}>
              <MaterialCommunityIcons
                name={van.subscriptionTier === "pro" ? "chart-line" : listingReady ? "check-circle-outline" : "alert-circle-outline"}
                size={20}
                color={van.subscriptionTier === "pro" ? "#8ED0FF" : listingReady ? "#42D878" : "#F4B547"}
              />
              <AppText variant="heading" style={styles.metricValue}>
                {van.subscriptionTier === "pro"
                  ? `${conversionRate}%`
                  : listingReady
                    ? "Ready"
                    : "Finish"}
              </AppText>
              <AppText variant="body" style={styles.metricLabel}>
                {van.subscriptionTier === "pro" ? "Conversion" : "Listing"}
              </AppText>
            </View>
          </LinearGradient>
        </View>

        <View style={styles.performancePanel}>
          <CardGlowBorder
            accentColor="#F4B547"
            borderColor="rgba(244,181,71,0.40)"
            borderRadius={22}
          />

          <LinearGradient
            colors={["rgba(10,31,51,0.97)", "rgba(5,19,33,0.99)"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.performancePanelInner}
          >
            <View style={styles.performanceHeaderRow}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <AppText variant="label" style={styles.performanceEyebrow}>
                  {van.subscriptionTier === "pro" ? "PERFORMANCE" : "PRO INSIGHT"}
                </AppText>
                <AppText variant="heading" style={styles.performanceTitle}>
                  {van.subscriptionTier === "pro"
                    ? "Performance This Week"
                    : "Understand your customers"}
                </AppText>
              </View>

              <View style={styles.performanceRangePill}>
                <AppText variant="bodyBold" style={styles.performanceRangeText}>
                  {van.subscriptionTier === "pro" ? "7 days" : "Pro"}
                </AppText>
              </View>
            </View>

            {van.subscriptionTier !== "pro" ? (
              <AppText variant="body" style={styles.performanceExplainText}>
                Pro turns BiteBeacon activity into useful guidance — when customers find you, how interest turns into directions, and where demand is strongest.
              </AppText>
            ) : null}

            <PerformanceChart
              points={insights?.daily_views ?? []}
              locked={van.subscriptionTier !== "pro"}
            />

            {van.subscriptionTier === "pro" ? (
              <View style={styles.performanceMiniRow}>
                <View style={styles.performanceMiniCard}>
                  <MaterialCommunityIcons name="eye-outline" size={16} color="#F4B547" />
                  <View>
                    <AppText variant="bodyBold" style={styles.performanceMiniValue}>{van.views ?? 0}</AppText>
                    <AppText variant="body" style={styles.performanceMiniLabel}>Views</AppText>
                  </View>
                </View>

                <View style={styles.performanceMiniCard}>
                  <MaterialCommunityIcons name="navigation-variant-outline" size={16} color="#4FA7FF" />
                  <View>
                    <AppText variant="bodyBold" style={styles.performanceMiniValue}>{van.directions ?? 0}</AppText>
                    <AppText variant="body" style={styles.performanceMiniLabel}>Directions</AppText>
                  </View>
                </View>

                <View style={styles.performanceMiniCard}>
                  <MaterialCommunityIcons name="chart-line" size={16} color="#42D878" />
                  <View>
                    <AppText variant="bodyBold" style={styles.performanceMiniValue}>{conversionRate}%</AppText>
                    <AppText variant="body" style={styles.performanceMiniLabel}>Conversion</AppText>
                  </View>
                </View>
              </View>
            ) : (
              <View style={styles.performanceBenefitRow}>
                <View style={styles.performanceBenefitChip}>
                  <MaterialCommunityIcons name="clock-outline" size={15} color="#F4B547" />
                  <AppText variant="bodyBold" style={styles.performanceBenefitText}>Best times</AppText>
                </View>
                <View style={styles.performanceBenefitChip}>
                  <MaterialCommunityIcons name="navigation-variant-outline" size={15} color="#4FA7FF" />
                  <AppText variant="bodyBold" style={styles.performanceBenefitText}>Visit intent</AppText>
                </View>
                <View style={styles.performanceBenefitChip}>
                  <MaterialCommunityIcons name="map-marker-radius-outline" size={15} color="#42D878" />
                  <AppText variant="bodyBold" style={styles.performanceBenefitText}>Hotspots</AppText>
                </View>
              </View>
            )}
          </LinearGradient>
        </View>

        <View style={styles.quickPanel}>
          <CardGlowBorder
            accentColor="#4FA7FF"
            borderColor="rgba(79,167,255,0.40)"
            borderRadius={22}
          />

          <MetallicFrame
            tone="blue"
            borderWidth={2}
            style={styles.quickPanelFrame}
            contentStyle={{ borderRadius: 21 }}
          >
            <LinearGradient
              colors={["rgba(9,31,50,0.97)", "rgba(4,17,29,0.99)"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.quickPanelInner}
            >
              <AppText variant="label" style={styles.quickEyebrow}>DAILY CONTROLS</AppText>
              <AppText variant="heading" style={styles.quickTitle}>Quick Actions</AppText>

              <View style={styles.quickGrid}>
                <Pressable
                  style={[styles.quickTile, styles.quickTilePrimary]}
                  onPress={() => {
                    if (isLive) {
                      handleLiveToggle(false);
                    } else {
                      jumpToLiveDuration();
                    }
                  }}
                >
                  <MaterialCommunityIcons name="broadcast" size={20} color="#F4B547" />
                  <View style={styles.quickTileTextArea}>
                    <AppText variant="button" style={styles.quickTileTitleGold}>
                      {isLive ? "Go Offline" : "Go Live"}
                    </AppText>
                    <AppText variant="body" style={styles.quickTileSubtitle}>
                      {isLive && liveTimeRemaining ? liveTimeRemaining : "Choose how long you're trading"}
                    </AppText>
                  </View>
                </Pressable>

                <Pressable
                  style={styles.quickTile}
                  onPress={() => router.push({ pathname: "/vendor/[id]", params: { id: van.id } })}
                >
                  <MaterialCommunityIcons name="eye-outline" size={20} color="#8ED0FF" />
                  <View style={styles.quickTileTextArea}>
                    <AppText variant="button" style={styles.quickTileTitle}>View Public Listing</AppText>
                    <AppText variant="body" style={styles.quickTileSubtitle}>See what customers see</AppText>
                  </View>
                </Pressable>

                <Pressable style={styles.quickTile} onPress={jumpToEditSection}>
                  <MaterialCommunityIcons name="pencil-outline" size={20} color="#F4B547" />
                  <View style={styles.quickTileTextArea}>
                    <AppText variant="button" style={styles.quickTileTitle}>Edit Details</AppText>
                    <AppText variant="body" style={styles.quickTileSubtitle}>Menu, schedule & cuisine</AppText>
                  </View>
                </Pressable>

                {van.subscriptionTier === "free" ? (
                  <Pressable style={styles.quickTile} onPress={pickPhotos}>
                    <MaterialCommunityIcons name="camera-outline" size={20} color="#4FA7FF" />
                    <View style={styles.quickTileTextArea}>
                      <AppText variant="button" style={styles.quickTileTitle}>
                        {photos.length > 0 ? "Change Main Photo" : "Add Main Photo"}
                      </AppText>
                      <AppText variant="body" style={styles.quickTileSubtitle}>Included with Free</AppText>
                    </View>
                  </Pressable>
                ) : (
                  <Pressable style={styles.quickTile} onPress={updateLocation}>
                    <MaterialCommunityIcons name="map-marker-outline" size={20} color="#4FA7FF" />
                    <View style={styles.quickTileTextArea}>
                      <AppText variant="button" style={styles.quickTileTitle}>Set Trading Location</AppText>
                      <AppText variant="body" style={styles.quickTileSubtitle}>Update your map pin</AppText>
                    </View>
                  </Pressable>
                )}
              </View>
            </LinearGradient>
          </MetallicFrame>
        </View>

        {needsListingAttention ? (
          <Pressable style={styles.compactNextStep} onPress={handleListingAttentionPress}>
            <View style={styles.compactNextStepIcon}>
              <MaterialCommunityIcons name="progress-check" size={18} color="#F4B547" />
            </View>
            <View style={styles.compactNextStepText}>
              <AppText variant="bodyBold" style={styles.compactNextStepTitle}>{listingAttentionTitle}</AppText>
              <AppText variant="body" style={styles.compactNextStepSubtitle} numberOfLines={1}>
                {listingAttentionSubtitle}
              </AppText>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={21} color="#F4B547" />
          </Pressable>
        ) : null}

        <View style={styles.managementPanel}>
          <LinearGradient
            colors={["rgba(7,24,40,0.94)", "rgba(3,14,25,0.98)"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.managementPanelInner}
          >
            <AppText variant="label" style={styles.managementEyebrow}>MANAGEMENT</AppText>
        {van.subscriptionTier === "pro" ? (
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
  
          ) : null}

        <DashboardAccordionSection
          title="Brand & Media"
          subtitle={van.subscriptionTier === "free" ? "Your main photo — Growth adds the full branding toolkit." : "Logo, gallery and menu media for your customer-facing listing."}
          isOpen={openSections.branding}
          onToggle={() => toggleSection("branding")}
        >
          <View style={styles.cardBox}>
            <View style={styles.managementGroupHeader}>
              <MaterialCommunityIcons name="camera-outline" size={18} color="#4FA7FF" />
              <View style={styles.managementGroupCopy}>
                <AppText variant="bodyBold" style={styles.managementGroupTitle}>Main listing photo</AppText>
                <AppText variant="body" style={styles.managementGroupText}>
                  {van.subscriptionTier === "free"
                    ? "Free includes one photo so customers can recognise your van."
                    : "Your first image is the main listing photo. Add up to 5 in your gallery."}
                </AppText>
              </View>
            </View>

            {photos.length === 0 ? (
              <Pressable style={styles.softButton} onPress={pickPhotos}>
                <Text style={styles.softButtonText}>Add Main Photo</Text>
              </Pressable>
            ) : (
              <>
                <View style={styles.galleryGrid}>
                  {photos.map((photoUri, index) => (
                    <View key={`photo-${index}`} style={styles.galleryItem}>
                      <Image source={{ uri: photoUri }} style={styles.galleryImage} />
                      <Pressable style={styles.galleryDeleteButton} onPress={() => removePhoto(index)}>
                        <Text style={styles.galleryDeleteButtonText}>Remove</Text>
                      </Pressable>
                    </View>
                  ))}
                </View>
                <Pressable style={styles.softButton} onPress={pickPhotos}>
                  <Text style={styles.softButtonText}>
                    {van.subscriptionTier === "free" ? "Photo Added" : "Add Another Photo"}
                  </Text>
                </Pressable>
              </>
            )}

            {!features.images ? (
              <>
                <View style={styles.assetDivider} />
                <View style={styles.inlineLockedCard}>
                  <View style={styles.lockedFeatureRow}>
                    <MaterialCommunityIcons name="crown-outline" size={18} color="#F4B547" />
                    <View style={styles.lockedFeatureCopy}>
                      <AppText variant="bodyBold" style={styles.inlineLockedTitle}>Want to make your listing stand out?</AppText>
                      <AppText variant="body" style={styles.inlineLockedText}>
                        Growth adds a 5-photo gallery, business logo and PDF menu. Your free main photo stays yours.
                      </AppText>
                    </View>
                  </View>
                  <Pressable style={styles.lockedFeatureButton} onPress={() => router.push("/vendor/upgrade")}>
                    <AppText variant="button" style={styles.lockedFeatureButtonText}>See Growth Features</AppText>
                  </Pressable>
                </View>
              </>
            ) : (
              <>
                <View style={styles.assetDivider} />
                <View style={styles.managementGroupHeader}>
                  <MaterialCommunityIcons name="badge-account-outline" size={18} color="#F4B547" />
                  <View style={styles.managementGroupCopy}>
                    <AppText variant="bodyBold" style={styles.managementGroupTitle}>Business logo</AppText>
                    <AppText variant="body" style={styles.managementGroupText}>Optional — useful for stronger recognition.</AppText>
                  </View>
                </View>
                <Pressable style={styles.softButton} onPress={pickLogo}>
                  <Text style={styles.softButtonText}>{logoUri ? "Replace Logo" : "Upload Logo"}</Text>
                </Pressable>
                {logoUri ? (
                  <View style={styles.logoPreview}>
                    <Image source={{ uri: logoUri }} style={styles.logoLarge} />
                    <Pressable style={styles.galleryDeleteButton} onPress={removeLogo}>
                      <Text style={styles.galleryDeleteButtonText}>Remove</Text>
                    </Pressable>
                  </View>
                ) : null}

                <View style={styles.assetDivider} />
                <View style={styles.managementGroupHeader}>
                  <MaterialCommunityIcons name="file-pdf-box" size={18} color="#F4B547" />
                  <View style={styles.managementGroupCopy}>
                    <AppText variant="bodyBold" style={styles.managementGroupTitle}>Menu PDF</AppText>
                    <AppText variant="body" style={styles.managementGroupText}>Optional — give customers the full menu before they arrive.</AppText>
                  </View>
                </View>
                <Pressable style={styles.softButton} onPress={pickMenuPdf}>
                  <Text style={styles.softButtonText}>{menuPdfName ? "Replace Menu PDF" : "Upload Menu PDF"}</Text>
                </Pressable>
                {menuPdfName ? (
                  <View style={styles.pdfCard}>
                    <Text style={styles.pdfName}>{menuPdfName}</Text>
                    <View style={styles.pdfActionsRow}>
                      <Pressable style={styles.pdfActionButton} onPress={openMenuPdfFromDashboard}>
                        <Text style={styles.pdfActionButtonText}>View</Text>
                      </Pressable>
                      <Pressable style={styles.pdfDeleteButton} onPress={removeMenuPdf}>
                        <Text style={styles.pdfDeleteButtonText}>Remove</Text>
                      </Pressable>
                    </View>
                  </View>
                ) : null}
              </>
            )}
          </View>
        </DashboardAccordionSection>

        <DashboardAccordionSection
          title="Plan Guide"
          subtitle="See exactly what Free, Growth and Pro include."
          isOpen={openSections.guide}
          onToggle={() => toggleSection("guide")}
        >
          <View style={styles.cardBox}>
            <AppText variant="body" style={styles.planSummaryText}>
              Start with what you need today. Upgrade only when the extra tools become useful to your business.
            </AppText>

            <TierExplanationCard
              title={`Free — Get discovered${van.subscriptionTier === "free" ? " · YOUR PLAN" : ""}`}
              subtitle="A useful listing, not a stripped-back trial"
              accent="free"
              isExpanded={expandedTier === "free"}
              onToggle={() => setExpandedTier("free")}
            >
              <AppText variant="body" style={styles.tierItem}>• Public BiteBeacon listing and map discovery</AppText>
              <AppText variant="body" style={styles.tierItem}>• 1 main photo of your van or food setup</AppText>
              <AppText variant="body" style={styles.tierItem}>• Menu text, cuisine and trading schedule</AppText>
              <AppText variant="body" style={styles.tierItem}>• Customer rating, views and directions</AppText>
              <AppText variant="body" style={styles.tierItem}>• LIVE status during the BiteBeacon launch period</AppText>
              <AppText variant="bodyBold" style={styles.tierHint}>Built to help customers find you and know what to expect.</AppText>
            </TierExplanationCard>

            <TierExplanationCard
              title={`Growth — Stand out${van.subscriptionTier === "growth" ? " · YOUR PLAN" : ""}`}
              subtitle="£9.99/month · Customer-facing growth tools"
              accent="growth"
              isExpanded={expandedTier === "growth"}
              onToggle={() => setExpandedTier("growth")}
            >
              <AppText variant="body" style={styles.tierItem}>• Everything in Free</AppText>
              <AppText variant="body" style={styles.tierItem}>• Full photo gallery with up to 5 images</AppText>
              <AppText variant="body" style={styles.tierItem}>• Business logo and PDF menu</AppText>
              <AppText variant="body" style={styles.tierItem}>• Instagram, Facebook and website links</AppText>
              <AppText variant="body" style={styles.tierItem}>• what3words precise location</AppText>
              <AppText variant="body" style={styles.tierItem}>• Customer updates and offers</AppText>
              <AppText variant="body" style={styles.tierItem}>• Trading-location updates</AppText>
              <AppText variant="bodyBold" style={styles.tierHint}>Built to make your listing look stronger and convert more interest into visits.</AppText>
            </TierExplanationCard>

            <TierExplanationCard
              title={`Pro — Grow smarter${van.subscriptionTier === "pro" ? " · YOUR PLAN" : ""}`}
              subtitle="£14.99/month · Premium visibility and insight"
              accent="pro"
              isExpanded={expandedTier === "pro"}
              onToggle={() => setExpandedTier("pro")}
            >
              <AppText variant="body" style={styles.tierItem}>• Everything in Growth</AppText>
              <AppText variant="body" style={styles.tierItem}>• Advanced performance analytics</AppText>
              <AppText variant="body" style={styles.tierItem}>• Conversion and customer-intent guidance</AppText>
              <AppText variant="body" style={styles.tierItem}>• Best-hour recommendations and timing patterns</AppText>
              <AppText variant="body" style={styles.tierItem}>• Area activity hotspots</AppText>
              <AppText variant="body" style={styles.tierItem}>• Priority and featured discovery support</AppText>
              <AppText variant="bodyBold" style={styles.tierHint}>Built for vendors ready to make decisions from real BiteBeacon activity.</AppText>
            </TierExplanationCard>

            {van.subscriptionTier === "free" ? (
              <Pressable style={styles.upgradeButton} onPress={() => router.push("/vendor/upgrade")}>
                <Text style={styles.upgradeButtonText}>Compare Upgrade Options</Text>
              </Pressable>
            ) : (
              <Pressable style={styles.softButton} onPress={manageSubscriptionFromDashboard}>
                <Text style={styles.softButtonText}>
                  {van.subscriptionTier === "growth" ? "Manage or Upgrade Plan" : "Manage Subscription"}
                </Text>
              </Pressable>
            )}
          </View>
        </DashboardAccordionSection>

        <View
          ref={editSectionRef}
          onLayout={(event) => {
            editSectionY.current = event.nativeEvent.layout.y;
          }}
        >
          <DashboardAccordionSection
            title="Business Details"
            subtitle="The details customers use to decide, find and visit you."
            isOpen={openSections.edit}
            onToggle={() => toggleSection("edit")}
          >
            <View style={styles.cardBox}>
              <View style={styles.managementGroupHeader}>
                <MaterialCommunityIcons name="storefront-outline" size={18} color="#F4B547" />
                <View style={styles.managementGroupCopy}>
                  <AppText variant="bodyBold" style={styles.managementGroupTitle}>Your listing</AppText>
                  <AppText variant="body" style={styles.managementGroupText}>The essentials customers see when they open your business.</AppText>
                </View>
              </View>

              <Text style={styles.label}>Business name</Text>
              <AppText variant="body" style={styles.fieldHelp}>Your main public name on BiteBeacon.</AppText>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="e.g. Matt's Burgers"
                placeholderTextColor="rgba(255,255,255,0.34)"
              />

              <Text style={styles.label}>Secondary display name</Text>
              <AppText variant="body" style={styles.fieldHelp}>Shown beneath your business name — for example an operator, trader or short brand line.</AppText>
              <TextInput
                style={styles.input}
                value={vendorName}
                onChangeText={setVendorName}
                placeholder="Secondary display name"
                placeholderTextColor="rgba(255,255,255,0.34)"
              />

              <Text style={styles.label}>Cuisine</Text>
              <TextInput
                style={styles.input}
                value={cuisine}
                onChangeText={setCuisine}
                placeholder="e.g. Burgers & loaded fries"
                placeholderTextColor="rgba(255,255,255,0.34)"
              />

              <Text style={styles.label}>Menu</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={menu}
                onChangeText={setMenu}
                placeholder="Add the main items customers can order"
                placeholderTextColor="rgba(255,255,255,0.34)"
                multiline
              />

              <View style={styles.assetDivider} />

              <View style={styles.managementGroupHeader}>
                <MaterialCommunityIcons name="calendar-clock-outline" size={18} color="#F4B547" />
                <View style={styles.managementGroupCopy}>
                  <AppText variant="bodyBold" style={styles.managementGroupTitle}>When & what you trade</AppText>
                  <AppText variant="body" style={styles.managementGroupText}>Keep your schedule and food categories accurate so customers know what to expect.</AppText>
                </View>
              </View>

              <Text style={styles.label}>Trading schedule</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={schedule}
                onChangeText={setSchedule}
                placeholder="e.g. Mon–Fri 7am–2pm"
                placeholderTextColor="rgba(255,255,255,0.34)"
                multiline
              />

              <Text style={styles.label}>Food categories</Text>
              <TextInput
                style={styles.input}
                value={foodCategorySearch}
                onChangeText={setFoodCategorySearch}
                placeholder="Search or add food categories"
                placeholderTextColor="rgba(255,255,255,0.34)"
              />

              <View style={styles.checkboxGroup}>
                {filteredFoodCategoryOptions.map((category) => {
                  const isSelected = foodCategories.includes(category);

                  return (
                    <Pressable
                      key={category}
                      style={[styles.checkboxChip, isSelected && styles.checkboxChipSelected]}
                      onPress={() => toggleFoodCategory(category)}
                    >
                      <Text style={[styles.checkboxChipText, isSelected && styles.checkboxChipTextSelected]}>
                        {isSelected ? "✓ " : ""}{category}
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
                <Text style={styles.categorySearchEmptyText}>Start typing to add your cuisine</Text>
              ) : filteredFoodCategoryOptions.length === 0 && !canAddCustomCategory ? (
                <Text style={styles.categorySearchEmptyText}>No matching categories found.</Text>
              ) : null}

              <View style={styles.liveRow}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.liveLabel}>Show as live now</Text>
                  <AppText variant="body" style={styles.fieldHelp}>Lets customers know you are currently open and trading.</AppText>
                </View>
                <Switch value={isLive} onValueChange={(value) => handleLiveToggle(value)} />
              </View>

              {isLive ? (
                <View
                  ref={liveDurationRef}
                  style={styles.liveDurationWrap}
                  onLayout={(event) => {
                    liveDurationY.current = event.nativeEvent.layout.y;
                  }}
                >
                  <Text style={styles.liveDurationTitle}>Stay live for</Text>
                  <View style={styles.liveDurationOptions}>
                    {[1, 2, 4, 8].map((hours) => (
                      <Pressable
                        key={hours}
                        style={[styles.liveDurationChip, liveDurationHours === hours && styles.liveDurationChipActive]}
                        onPress={() => setLiveDurationHours(hours as 1 | 2 | 4 | 8)}
                      >
                        <Text style={[styles.liveDurationChipText, liveDurationHours === hours && styles.liveDurationChipTextActive]}>
                          {hours}h
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              ) : null}

              <Text style={styles.liveFutureNotice}>
                LIVE status is currently included free during launch. After launch, LIVE visibility will require Growth.
              </Text>

              <View style={styles.assetDivider} />

              <View style={styles.managementGroupHeader}>
                <MaterialCommunityIcons name="link-variant" size={18} color="#4FA7FF" />
                <View style={styles.managementGroupCopy}>
                  <AppText variant="bodyBold" style={styles.managementGroupTitle}>Online presence & precise location</AppText>
                  <AppText variant="body" style={styles.managementGroupText}>Optional tools for vendors who want customers to find and follow them beyond the core listing.</AppText>
                </View>
              </View>

              {!features.socialLinks ? (
                <View style={styles.inlineLockedCard}>
                  <AppText variant="bodyBold" style={styles.inlineLockedTitle}>Growth feature</AppText>
                  <AppText variant="body" style={styles.inlineLockedText}>
                    Growth unlocks Instagram, Facebook, your website and what3words precise location.
                  </AppText>
                </View>
              ) : (
                <>
                  <Text style={styles.label}>Instagram</Text>
                  <TextInput style={styles.input} value={instagram} onChangeText={setInstagram} placeholder="https://instagram.com/yourpage" placeholderTextColor="rgba(255,255,255,0.34)" />

                  <Text style={styles.label}>Facebook</Text>
                  <TextInput style={styles.input} value={facebook} onChangeText={setFacebook} placeholder="https://facebook.com/yourpage" placeholderTextColor="rgba(255,255,255,0.34)" />

                  <Text style={styles.label}>Website</Text>
                  <TextInput style={styles.input} value={website} onChangeText={setWebsite} placeholder="https://yourwebsite.com" placeholderTextColor="rgba(255,255,255,0.34)" />

                  <Text style={styles.label}>what3words location</Text>
                  <TextInput style={styles.input} value={what3words} onChangeText={setWhat3words} placeholder="e.g. filled.count.soap" placeholderTextColor="rgba(255,255,255,0.34)" />
                </>
              )}

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
        </View>

        <DashboardAccordionSection
          title="Account Actions"
          subtitle="Settings, sign out and listing removal."
          isOpen={openSections.account}
          onToggle={() => toggleSection("account")}
        >
          <View style={styles.cardBox}>
            <Pressable style={styles.softButton} onPress={() => router.replace("/(tabs)/account")}>
              <Text style={styles.softButtonText}>Account & Settings</Text>
            </Pressable>

            <Pressable style={styles.softButton} onPress={handleLogout}>
              <Text style={styles.softButtonText}>Log Out</Text>
            </Pressable>

            <View style={styles.dangerZone}>
              <AppText variant="bodyBold" style={styles.dangerZoneTitle}>Listing removal</AppText>
              <AppText variant="body" style={styles.dangerZoneText}>
                Only use this if you want BiteBeacon to remove this vendor listing.
              </AppText>
              <Pressable style={styles.deleteButton} onPress={deleteListing}>
                <Text style={styles.deleteButtonText}>Request Listing Removal</Text>
              </Pressable>
            </View>
          </View>
        </DashboardAccordionSection>
          </LinearGradient>
        </View>
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
    paddingHorizontal: 14,
    paddingTop: 18,
    paddingBottom: 34,
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
    fontSize: 13,
    color: "rgba(255,255,255,0.58)",
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
    minWidth: 0,
    paddingRight: 4,
  },

  headerActions: {
    flexDirection: "row",
    gap: 10,
  },

  accountIconFrame: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },

  accountIconFrameContent: {
    borderRadius: 25,
  },

  accountIconButton: {
    width: "100%",
    height: "100%",
    borderRadius: 25,
    backgroundColor: "rgba(7, 20, 33, 0.96)",
    alignItems: "center",
    justifyContent: "center",
  },

  accountIconText: {
    fontSize: 20,
  },

  headerEyebrow: {
    fontSize: 12,
    letterSpacing: 1.4,
    color: "#F4B547",
    marginBottom: 6,
  },

  headerTitle: {
    fontSize: 30,
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

  heroOuterFrame: {
    borderRadius: 24,
    marginBottom: 16,
    shadowColor: "#F4B547",
    shadowOpacity: 0.16,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },

  heroCard: {
    backgroundColor: "rgba(5,14,24,0.88)",
    borderRadius: 24,
    padding: 18,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
    overflow: "hidden",
  },

  heroCardPro: {
    borderColor: ORANGE_SOFT,
    shadowColor: ORANGE,
    shadowOpacity: 0.18,
  },

  heroGlow: {
    position: "absolute",
    top: -45,
    right: -35,
    width: 150,
    height: 150,
    borderRadius: 999,
    backgroundColor: "rgba(255,176,0,0.06)",
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
    fontSize: 26,
    fontWeight: "900",
    color: WHITE,
    marginBottom: 4,
  },

  heroVendorName: {
    fontSize: 15,
    fontWeight: "700",
    color: "rgba(255,255,255,0.72)",
    marginBottom: 4,
  },

  heroCuisine: {
    fontSize: 14,
    fontWeight: "600",
    color: "rgba(255,255,255,0.58)",
    marginBottom: 10,
  },

  heroSupport: {
    fontSize: 13,
    color: "rgba(255,255,255,0.68)",
    lineHeight: 19,
    marginBottom: 0,
  },

  heroPlanSupport: {
    fontSize: 13,
    color: "rgba(255,176,0,0.82)",
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
    marginTop: 16,
  },

  heroStatCard: {
    minWidth: "47%",
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.055)",
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 13,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },

  heroStatLabel: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.6,
    color: "rgba(255,255,255,0.58)",
    textTransform: "uppercase",
    marginBottom: 6,
  },

  heroStatValue: {
    fontSize: 24,
    fontWeight: "900",
    color: WHITE,
  },

  heroStatHint: {
    fontSize: 11,
    lineHeight: 15,
    color: "rgba(255,255,255,0.5)",
    marginTop: 4,
  },

  powerCardGlow: {
    borderRadius: 22,
    marginBottom: 16,
  },

  powerCard: {
    backgroundColor: "rgba(5,14,24,0.82)",
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 20,
  },

  guidanceBanner: {
    backgroundColor: "rgba(5,14,24,0.82)",
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(244,181,71,0.18)",
  },

  guidanceBannerTitle: {
    fontSize: 20,
    color: WHITE,
    marginBottom: 8,
  },

  guidanceBannerText: {
    fontSize: 14,
    color: "rgba(255,255,255,0.68)",
    lineHeight: 20,
    marginBottom: 4,
  },

  guidanceBannerButton: {
    marginTop: 16,
    backgroundColor: "rgba(244,181,71,0.10)",
    paddingVertical: 13,
    borderRadius: 15,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(244,181,71,0.42)",
  },

  guidanceBannerButtonText: {
    color: "#F4B547",
    fontSize: 14,
  },

  guidanceBannerEyebrow: {
    fontSize: 11,
    letterSpacing: 1.5,
    color: "#F4B547",
    marginBottom: 8,
  },

  guidanceChecklist: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 14,
  },

  guidanceChecklistItem: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(244,181,71,0.18)",
  },

  guidanceChecklistText: {
    fontSize: 12,
    color: "rgba(255,255,255,0.82)",
  },

  powerCardEyebrow: {
    fontSize: 11,
    letterSpacing: 1.5,
    color: "#F4B547",
    marginBottom: 10,
  },

  powerCardTitle: {
    fontSize: 20,
    lineHeight: 25,
    color: "#FFFFFF",
    marginBottom: 10,
  },

  powerCardText: {
    fontSize: 14,
    lineHeight: 21,
    color: "rgba(255,255,255,0.68)",
  },

  monetisationFrame: {
    borderRadius: 22,
    marginBottom: 16,
  },

  monetisationCard: {
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 20,
  },

  monetisationEyebrow: {
    fontSize: 11,
    letterSpacing: 1.5,
    color: "#F4B547",
    marginBottom: 8,
  },

  monetisationTitle: {
    fontSize: 20,
    lineHeight: 25,
    color: WHITE,
    marginBottom: 10,
  },

  monetisationText: {
    fontSize: 14,
    color: "rgba(255,255,255,0.68)",
    lineHeight: 21,
    marginBottom: 4,
  },

  monetisationButton: {
    marginTop: 16,
    backgroundColor: "rgba(244,181,71,0.10)",
    paddingVertical: 13,
    borderRadius: 15,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(244,181,71,0.42)",
  },

  monetisationButtonText: {
    color: "#F4B547",
    fontSize: 14,
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
    color: "#F4B547",
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
    color: "#F4B547",
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

  quickActionsFrame: {
    borderRadius: 24,
    marginBottom: 18,
  },

  quickActionsCard: {
    borderRadius: 22,
    paddingHorizontal: 20,
    paddingVertical: 20,
  },

  quickActionsEyebrow: {
    fontSize: 11,
    letterSpacing: 1.5,
    color: "#F4B547",
    marginBottom: 8,
  },

  quickActionsTitle: {
    fontSize: 22,
    color: WHITE,
    marginBottom: 6,
  },

  quickActionsSubtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.68)",
    lineHeight: 20,
    marginBottom: 4,
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
    backgroundColor: "rgba(244,181,71,0.12)",
    borderWidth: 1,
    borderColor: "rgba(244,181,71,0.42)",
  },

  quickActionSecondary: {
    backgroundColor: "rgba(255,255,255,0.045)",
    borderWidth: 1,
    borderColor: "rgba(79,167,255,0.28)",
  },

  quickActionLocked: {
    backgroundColor: "rgba(255,255,255,0.03)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    opacity: 0.62,
  },

  quickActionPrimaryText: {
    color: "#F4B547",
    fontSize: 15,
    textAlign: "center",
  },

  quickActionHintText: {
    color: "rgba(255,255,255,0.62)",
    fontSize: 11,
    textAlign: "center",
    marginTop: 3,
  },
  quickActionSecondaryText: {
    color: WHITE,
    fontSize: 15,
    textAlign: "center",
  },

  quickActionLockedText: {
    color: "rgba(255,255,255,0.58)",
    fontSize: 15,
    textAlign: "center",
  },

  sectionWrap: {
    borderRadius: 14,
    marginBottom: 7,
    borderWidth: 1,
    borderColor: "rgba(79,167,255,0.20)",
    overflow: "hidden",
  },

  sectionWrapOpen: {
    borderColor: "rgba(244,181,71,0.42)",
  },

  sectionAccent: {
    display: "none",
  },

  sectionHeader: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 10,
  },

  sectionIconShell: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(244,181,71,0.08)",
    borderWidth: 1,
    borderColor: "rgba(244,181,71,0.18)",
  },

  sectionHeaderTextWrap: {
    flex: 1,
    minWidth: 0,
  },

  sectionTitle: {
    color: WHITE,
    fontSize: 14,
    lineHeight: 18,
    marginBottom: 1,
  },

  sectionSubtitle: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 11,
    lineHeight: 15,
  },

  sectionTogglePill: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(244,181,71,0.04)",
    borderWidth: 1,
    borderColor: "rgba(244,181,71,0.48)",
  },

  sectionTogglePillOpen: {
    backgroundColor: "rgba(244,181,71,0.11)",
    borderColor: "rgba(255,216,129,0.72)",
  },

  sectionToggleText: {
    color: "#F4B547",
    fontSize: 18,
    lineHeight: 20,
  },

  sectionBody: {
    paddingHorizontal: 10,
    paddingBottom: 10,
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
    backgroundColor: "rgba(4,17,29,0.72)",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(79,167,255,0.16)",
  },

  insightEngineCard: {
    backgroundColor: "rgba(5,20,35,0.78)",
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(244,181,71,0.24)",
  },

  insightEngineEyebrow: {
    fontSize: 10,
    fontWeight: "900",
    color: "#F4B547",
    textTransform: "uppercase",
    letterSpacing: 1.1,
    marginBottom: 6,
  },

  insightEngineTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: WHITE,
    marginBottom: 12,
  },

  insightSection: {
    marginBottom: 14,
  },

  insightSectionLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: "#F4B547",
    marginBottom: 5,
  },

  insightSectionText: {
    fontSize: 13,
    color: "rgba(255,255,255,0.67)",
    lineHeight: 19,
  },

  insightMetricsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
  },

  insightMetricCard: {
    flex: 1,
    backgroundColor: "rgba(11,35,56,0.78)",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 11,
    borderWidth: 1,
    borderColor: "rgba(79,167,255,0.20)",
  },

  insightMetricLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "rgba(255,255,255,0.46)",
    textTransform: "uppercase",
    marginBottom: 5,
  },

  insightMetricValue: {
    fontSize: 20,
    fontWeight: "900",
    color: "#F4B547",
  },

  insightMetricValueSmall: {
    fontSize: 16,
    fontWeight: "900",
    color: WHITE,
  },

  locationListCard: {
    marginTop: 10,
    backgroundColor: "rgba(11,35,56,0.72)",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(79,167,255,0.18)",
  },

  locationListText: {
    fontSize: 13,
    color: WHITE,
    lineHeight: 19,
    fontWeight: "700",
    marginBottom: 8,
  },

  locationHintText: {
    fontSize: 11.5,
    color: "rgba(255,255,255,0.52)",
    lineHeight: 17,
  },

  lowDataNote: {
    marginTop: 4,
    backgroundColor: "rgba(244,181,71,0.08)",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(244,181,71,0.24)",
  },

  lowDataNoteTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#F4B547",
    marginBottom: 4,
  },

  lowDataNoteText: {
    fontSize: 12,
    color: "rgba(255,255,255,0.62)",
    lineHeight: 18,
  },

  mapInsightCard: {
    backgroundColor: "rgba(5,20,35,0.78)",
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(79,167,255,0.22)",
  },

  mapInsightTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: WHITE,
    marginBottom: 4,
  },

  mapInsightSubtitle: {
    fontSize: 12,
    color: "rgba(255,255,255,0.55)",
    lineHeight: 18,
    marginBottom: 12,
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
    backgroundColor: "rgba(255,255,255,0.035)",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },

  emptyInlineTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: WHITE,
    marginBottom: 4,
  },

  emptyInlineText: {
    fontSize: 12.5,
    color: "rgba(255,255,255,0.54)",
    lineHeight: 18,
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
    backgroundColor: "rgba(7,24,40,0.88)",
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(79,167,255,0.24)",
  },

  tierExplainCardGrowth: {
    borderColor: "rgba(244,181,71,0.42)",
    backgroundColor: "rgba(29,27,20,0.78)",
  },

  tierExplainCardPro: {
    borderColor: "rgba(79,167,255,0.44)",
    backgroundColor: "rgba(7,27,45,0.92)",
  },

  tierExplainHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  tierExplainTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: WHITE,
    marginBottom: 2,
  },

  tierExplainSubtitle: {
    fontSize: 13,
    color: "rgba(255,255,255,0.62)",
    lineHeight: 18,
  },

  tierExplainToggle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#F4B547",
    marginLeft: 10,
  },

  tierExplainBody: {
    marginTop: 12,
    gap: 6,
  },

  tierItem: {
    fontSize: 14,
    color: "rgba(255,255,255,0.86)",
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
    fontSize: 16,
    fontWeight: "800",
    color: WHITE,
    marginBottom: 5,
  },

  assetSectionText: {
    fontSize: 12.5,
    color: "rgba(255,255,255,0.56)",
    lineHeight: 18,
    marginBottom: 12,
  },

  galleryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },

  galleryItem: {
    width: "48%",
    backgroundColor: "rgba(11,35,56,0.72)",
    borderRadius: 14,
    padding: 7,
    borderWidth: 1,
    borderColor: "rgba(79,167,255,0.18)",
  },

  galleryImage: {
    width: "100%",
    height: 120,
    borderRadius: 12,
    marginBottom: 8,
  },

  galleryDeleteButton: {
    backgroundColor: "rgba(198,40,40,0.10)",
    borderRadius: 11,
    paddingVertical: 9,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(239,83,80,0.28)",
  },

  galleryDeleteButtonText: {
    color: "#FF7774",
    fontSize: 12,
    fontWeight: "800",
  },

  assetDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
    marginVertical: 16,
  },

  pdfCard: {
    backgroundColor: "rgba(11,35,56,0.72)",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(79,167,255,0.18)",
  },

  pdfName: {
    fontSize: 13,
    fontWeight: "700",
    color: WHITE,
    marginBottom: 10,
  },

  pdfActionsRow: {
    flexDirection: "row",
    gap: 10,
  },

  pdfActionButton: {
    flex: 1,
    backgroundColor: "rgba(79,167,255,0.14)",
    paddingVertical: 11,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(79,167,255,0.32)",
  },

  pdfActionButtonText: {
    color: WHITE,
    fontSize: 14,
    fontWeight: "700",
  },

  pdfDeleteButton: {
    flex: 1,
    backgroundColor: "rgba(198,40,40,0.08)",
    paddingVertical: 11,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(239,83,80,0.24)",
  },

  pdfDeleteButtonText: {
    color: "#FF7774",
    fontSize: 13,
    fontWeight: "700",
  },

  emptyAssetBox: {
    backgroundColor: "rgba(255,255,255,0.035)",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },

  emptyAssetTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: WHITE,
    marginBottom: 4,
  },

  emptyAssetText: {
    fontSize: 12.5,
    color: "rgba(255,255,255,0.52)",
    lineHeight: 18,
  },

  label: {
    fontSize: 13,
    fontWeight: "700",
    color: "rgba(255,255,255,0.80)",
    marginBottom: 7,
  },


  fieldHelp: {
    color: "rgba(255,255,255,0.47)",
    fontSize: 10.5,
    lineHeight: 15,
    marginTop: -5,
    marginBottom: 7,
  },

  input: {
    backgroundColor: "rgba(6,22,37,0.92)",
    borderWidth: 1,
    borderColor: "rgba(79,167,255,0.26)",
    borderRadius: 13,
    paddingHorizontal: 13,
    paddingVertical: 12,
    marginBottom: 14,
    color: WHITE,
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
    backgroundColor: "rgba(255,255,255,0.035)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },

  checkboxChipSelected: {
    backgroundColor: "rgba(244,181,71,0.12)",
    borderColor: "rgba(244,181,71,0.55)",
  },

  checkboxChipText: {
    color: "rgba(255,255,255,0.68)",
    fontSize: 12.5,
    fontWeight: "700",
  },

  checkboxChipTextSelected: {
    color: "#F4B547",
  },

  categorySearchEmptyText: {
    fontSize: 12,
    color: "rgba(255,255,255,0.42)",
    marginBottom: 14,
    fontWeight: "600",
  },

  addCustomCategoryButton: {
    backgroundColor: "rgba(79,167,255,0.12)",
    borderRadius: 13,
    paddingVertical: 11,
    paddingHorizontal: 13,
    marginBottom: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(79,167,255,0.28)",
  },

  addCustomCategoryButtonText: {
    color: WHITE,
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
  },

  inlineLockedCard: {
    backgroundColor: "rgba(244,181,71,0.07)",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(244,181,71,0.24)",
    marginBottom: 12,
  },

  inlineLockedTitle: {
    fontSize: 13.5,
    fontWeight: "800",
    color: "#F4B547",
    marginBottom: 4,
  },

  inlineLockedText: {
    fontSize: 12.5,
    color: "rgba(255,255,255,0.62)",
    lineHeight: 18,
  },

  liveRow: {
    backgroundColor: "rgba(11,35,56,0.72)",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(79,167,255,0.18)",
  },

  liveLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: WHITE,
  },

  liveLockedText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#F4B547",
  },

  primaryButton: {
    backgroundColor: "#F4B547",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    marginBottom: 11,
  },

  primaryButtonText: {
    color: "#071421",
    fontSize: 14,
    fontWeight: "900",
  },

  softButton: {
    backgroundColor: "rgba(79,167,255,0.10)",
    paddingVertical: 12,
    borderRadius: 13,
    alignItems: "center",
    marginBottom: 11,
    borderWidth: 1,
    borderColor: "rgba(79,167,255,0.24)",
  },

  softButtonText: {
    color: WHITE,
    fontSize: 13.5,
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
    backgroundColor: "rgba(198,40,40,0.14)",
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 4,
    borderWidth: 1,
    borderColor: "rgba(239,83,80,0.30)",
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
    fontSize: 15,
    fontWeight: "800",
    color: WHITE,
    marginBottom: 10,
  },

  claimNoteLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: "#F4B547",
    marginBottom: 6,
  },

  claimNote: {
    fontSize: 13,
    color: "rgba(255,255,255,0.68)",
    lineHeight: 19,
  },

  claimPending: {
    fontSize: 13,
    color: "rgba(255,255,255,0.50)",
    fontStyle: "italic",
  },

  logoPreview: {
    alignItems: "center",
    marginTop: 10,
  },

  logoLarge: {
    width: 108,
    height: 108,
    borderRadius: 22,
    alignSelf: "center",
    marginTop: 8,
    backgroundColor: "rgba(255,255,255,0.06)",
  },

  liveFutureNotice: {
    fontSize: 12,
    color: "rgba(255,255,255,0.72)",
    lineHeight: 18,
    marginTop: -8,
    marginBottom: 16,
    fontWeight: "600",
  },

  liveDurationWrap: {
    marginBottom: 16,
  },

  liveDurationTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "rgba(255,255,255,0.78)",
    marginBottom: 9,
  },

  liveDurationOptions: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },

  liveDurationChip: {
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },

  liveDurationChipActive: {
    backgroundColor: "rgba(244,181,71,0.14)",
    borderColor: "rgba(244,181,71,0.58)",
  },

  liveDurationChipText: {
    color: "rgba(255,255,255,0.62)",
    fontWeight: "700",
  },

  liveDurationChipTextActive: {
    color: "#F4B547",
  },

  managementGroupHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 11,
  },

  managementGroupCopy: {
    flex: 1,
    minWidth: 0,
  },

  managementGroupTitle: {
    color: WHITE,
    fontSize: 13.5,
  },

  managementGroupText: {
    color: "rgba(255,255,255,0.48)",
    fontSize: 11.5,
    lineHeight: 16,
    marginTop: 1,
  },

  lockedFeatureRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },

  lockedFeatureCopy: {
    flex: 1,
    minWidth: 0,
  },

  lockedFeatureButton: {
    marginTop: 12,
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: "rgba(244,181,71,0.10)",
    borderWidth: 1,
    borderColor: "rgba(244,181,71,0.34)",
  },

  lockedFeatureButtonText: {
    color: "#F4B547",
    fontSize: 12,
  },

  planSummaryTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },

  planSummaryEyebrow: {
    color: "rgba(255,255,255,0.42)",
    fontSize: 9.5,
    letterSpacing: 1.2,
    marginBottom: 3,
  },

  planSummaryTitle: {
    color: WHITE,
    fontSize: 20,
  },

  planSummaryBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(244,181,71,0.08)",
    borderWidth: 1,
    borderColor: "rgba(244,181,71,0.26)",
  },

  planSummaryText: {
    color: "rgba(255,255,255,0.62)",
    fontSize: 12.5,
    lineHeight: 18,
    marginBottom: 12,
  },

  launchNotice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 11,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: "rgba(79,167,255,0.07)",
    borderWidth: 1,
    borderColor: "rgba(79,167,255,0.18)",
    marginBottom: 12,
  },

  launchNoticeText: {
    color: "rgba(255,255,255,0.62)",
    fontSize: 11.5,
  },

  planFeatureMiniList: {
    gap: 5,
    marginBottom: 12,
  },

  planFeatureMiniItem: {
    color: "rgba(255,255,255,0.68)",
    fontSize: 12.5,
    lineHeight: 18,
  },

  dangerZone: {
    marginTop: 4,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
  },

  dangerZoneTitle: {
    color: "#FF8A87",
    fontSize: 13,
  },

  dangerZoneText: {
    color: "rgba(255,255,255,0.48)",
    fontSize: 11.5,
    lineHeight: 17,
    marginTop: 3,
    marginBottom: 10,
  },

  compactTopBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },

  compactTopEyebrow: {
    color: "#F4B547",
    fontSize: 12,
    letterSpacing: 1.6,
  },

  compactTopActions: {
    flexDirection: "row",
    gap: 8,
  },

  compactIconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(5,20,35,0.90)",
    borderWidth: 1,
    borderColor: "rgba(244,181,71,0.72)",
    shadowColor: "#F4B547",
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 3,
  },

  identityGlowWrap: {
    position: "relative",
    borderRadius: 24,
    marginBottom: 10,
  },

  identityFrame: {
    borderRadius: 24,
  },

  identityCard: {
    minHeight: 118,
    borderRadius: 23,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },

  identityAvatarShell: {
    width: 72,
    height: 72,
    borderRadius: 36,
    padding: 3,
    backgroundColor: "rgba(4,13,23,0.95)",
    borderWidth: 2,
    borderColor: "rgba(244,181,71,0.68)",
    shadowColor: "#F4B547",
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 4,
  },

  identityAvatarImage: {
    width: "100%",
    height: "100%",
    borderRadius: 32,
  },

  identityAvatarFallback: {
    flex: 1,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
  },

  identityAvatarLetter: {
    color: "#F4B547",
    fontSize: 30,
  },

  identityTextArea: {
    flex: 1,
    minWidth: 0,
  },

  identityName: {
    color: WHITE,
    fontSize: 24,
    lineHeight: 28,
    marginBottom: 2,
  },

  identityVendor: {
    color: "rgba(255,255,255,0.62)",
    fontSize: 13,
    marginBottom: 9,
  },

  identityBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 10,
  },

  compactPlanBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },

  compactPlanBadgeText: {
    fontSize: 11,
  },

  identityStatusWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  identityStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  identityStatusDotLive: {
    backgroundColor: "#42D878",
    shadowColor: "#42D878",
    shadowOpacity: 0.75,
    shadowRadius: 6,
    elevation: 3,
  },

  identityStatusDotOffline: {
    backgroundColor: "rgba(255,255,255,0.38)",
  },

  identityStatusText: {
    color: "rgba(255,255,255,0.70)",
    fontSize: 11,
  },

  metricsPanel: {
    position: "relative",
    borderRadius: 22,
    marginBottom: 10,
    overflow: "hidden",
  },

  metricsPanelInner: {
    borderRadius: 22,
    paddingVertical: 13,
    paddingHorizontal: 8,
    flexDirection: "row",
    alignItems: "center",
  },

  metricCell: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 0,
  },

  metricDivider: {
    width: 1,
    height: 48,
    backgroundColor: "rgba(255,255,255,0.09)",
  },

  metricValue: {
    color: WHITE,
    fontSize: 20,
    lineHeight: 24,
    marginTop: 3,
  },

  metricLabel: {
    color: "rgba(255,255,255,0.50)",
    fontSize: 10,
    lineHeight: 13,
  },

  performancePanel: {
    position: "relative",
    borderRadius: 22,
    marginBottom: 10,
    overflow: "hidden",
  },

  performancePanelInner: {
    borderRadius: 22,
    padding: 14,
  },

  performanceHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 4,
  },

  performanceEyebrow: {
    color: "#F4B547",
    fontSize: 10,
    letterSpacing: 1.35,
    marginBottom: 2,
  },

  performanceTitle: {
    color: WHITE,
    fontSize: 17,
    lineHeight: 21,
  },

  performanceRangePill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(244,181,71,0.38)",
    backgroundColor: "rgba(244,181,71,0.06)",
  },

  performanceRangeText: {
    color: "#F4B547",
    fontSize: 10,
  },

  performanceChartShell: {
    position: "relative",
    height: 112,
    borderRadius: 15,
    overflow: "hidden",
    backgroundColor: "rgba(2,12,21,0.58)",
    marginTop: 6,
  },

  performanceChartLock: {
    position: "absolute",
    top: 8,
    right: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: "rgba(3,13,22,0.78)",
    borderWidth: 1,
    borderColor: "rgba(244,181,71,0.24)",
  },

  performanceChartLockText: {
    color: "rgba(255,255,255,0.64)",
    fontSize: 9,
  },


  performanceExplainText: {
    color: "rgba(255,255,255,0.62)",
    fontSize: 11.5,
    lineHeight: 17,
    marginTop: 4,
    marginBottom: 3,
  },

  performanceBenefitRow: {
    flexDirection: "row",
    gap: 7,
    marginTop: 8,
  },

  performanceBenefitChip: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingHorizontal: 7,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "rgba(8,30,49,0.78)",
    borderWidth: 1,
    borderColor: "rgba(79,167,255,0.18)",
  },

  performanceBenefitText: {
    color: "rgba(255,255,255,0.78)",
    fontSize: 8.5,
    lineHeight: 11,
  },

  performanceMiniRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },

  performanceMiniCard: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    borderRadius: 12,
    paddingHorizontal: 9,
    paddingVertical: 8,
    backgroundColor: "rgba(8,30,49,0.84)",
    borderWidth: 1,
    borderColor: "rgba(79,167,255,0.22)",
  },

  performanceMiniValue: {
    color: WHITE,
    fontSize: 13,
    lineHeight: 16,
  },

  performanceMiniLabel: {
    color: "rgba(255,255,255,0.43)",
    fontSize: 8.5,
    lineHeight: 11,
  },

  quickPanel: {
    position: "relative",
    borderRadius: 22,
    marginBottom: 10,
  },

  quickPanelFrame: {
    borderRadius: 22,
  },

  quickPanelInner: {
    borderRadius: 21,
    padding: 13,
  },

  quickEyebrow: {
    color: "#F4B547",
    fontSize: 10,
    letterSpacing: 1.3,
    marginBottom: 2,
  },

  quickTitle: {
    color: WHITE,
    fontSize: 18,
    lineHeight: 22,
    marginBottom: 10,
  },

  quickGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  quickTile: {
    width: "48.8%",
    minHeight: 62,
    borderRadius: 14,
    paddingHorizontal: 11,
    paddingVertical: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    backgroundColor: "rgba(9,32,52,0.90)",
    borderWidth: 1,
    borderColor: "rgba(79,167,255,0.30)",
  },

  quickTilePrimary: {
    borderColor: "rgba(244,181,71,0.40)",
    backgroundColor: "rgba(31,35,35,0.72)",
  },

  quickTileLocked: {
    opacity: 0.52,
    borderColor: "rgba(255,255,255,0.09)",
  },

  quickTileTextArea: {
    flex: 1,
    minWidth: 0,
  },

  quickTileTitle: {
    color: WHITE,
    fontSize: 11.5,
    lineHeight: 14,
  },

  quickTileTitleGold: {
    color: "#F4B547",
    fontSize: 11.5,
    lineHeight: 14,
  },

  quickTileSubtitle: {
    color: "rgba(255,255,255,0.47)",
    fontSize: 9,
    lineHeight: 12,
    marginTop: 2,
  },

  quickTileLockedTitle: {
    color: "rgba(255,255,255,0.48)",
    fontSize: 11.5,
  },

  quickTileLockedSubtitle: {
    color: "rgba(255,255,255,0.30)",
    fontSize: 9,
    marginTop: 2,
  },

  compactNextStep: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 15,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
    backgroundColor: "rgba(8,27,44,0.88)",
    borderWidth: 1,
    borderColor: "rgba(244,181,71,0.24)",
  },

  compactNextStepIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(244,181,71,0.08)",
  },

  compactNextStepText: {
    flex: 1,
  },

  compactNextStepTitle: {
    color: WHITE,
    fontSize: 12,
  },

  compactNextStepSubtitle: {
    color: "rgba(255,255,255,0.50)",
    fontSize: 9.5,
    marginTop: 1,
  },

  managementPanel: {
    position: "relative",
    borderRadius: 22,
    overflow: "hidden",
    marginBottom: 6,
  },

  managementPanelInner: {
    borderRadius: 22,
    padding: 9,
  },

  managementEyebrow: {
    color: "#F4B547",
    fontSize: 9.5,
    letterSpacing: 1.3,
    marginLeft: 4,
    marginBottom: 7,
  },

});