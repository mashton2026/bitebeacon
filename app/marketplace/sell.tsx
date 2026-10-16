import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { File } from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Easing,
  Image,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AppText from "../../components/AppText";
import MapTextureBackground from "../../components/MapTextureBackground";
import MetallicFrame from "../../components/MetallicFrame";
import PremiumInput from "../../components/PremiumInput";
import { typography } from "../../constants/typography";
import { supabase } from "../../lib/supabase";

// Marketplace seller experience — local autosave, private online drafts, and secure free-listing publishing.
const HERO = require("../../assets/images/marketplace-sell-hero.png");
const GOLD = "#D89A27";
const PALE = "#FFE29A";
const INK = "#071421";
const PANEL = "rgba(7, 24, 37, 0.94)";
const DRAFT_KEY = "bitebeacon:marketplace:sell-draft:v1";
const MUTED = "#B3C2CC";
const CATEGORIES = [
  { label: "Vans & Trailers", icon: "car-outline" },
  { label: "Cooking", icon: "flame-outline" },
  { label: "Refrigeration", icon: "snow-outline" },
  { label: "Power & Utilities", icon: "flash-outline" },
  { label: "Drinks Equipment", icon: "cafe-outline" },
  { label: "Trading Gear", icon: "storefront-outline" },
  { label: "Complete Setups", icon: "restaurant-outline" },
] as const;
const CONDITIONS = [
  "New",
  "Excellent",
  "Good",
  "Used / Working",
  "For parts",
] as const;
const STEPS = [
  "Equipment",
  "Photos",
  "Details",
  "Location",
  "Preview",
] as const;
const DELIVERY = ["Collection", "Delivery available", "Both"] as const;
// Optional questions adapt to the equipment being sold. Values stay in this local draft.
const SPEC_FIELDS: Record<string, { label: string; placeholder: string }[]> = {
  "Vans & Trailers": [
    {
      label: "What make and model is it?",
      placeholder: "e.g. Ifor Williams BV126",
    },
    { label: "What year was it made?", placeholder: "e.g. 2021" },
    {
      label: "How many miles has it covered, if applicable?",
      placeholder: "e.g. 65,000 miles / not applicable",
    },
    {
      label: "What are its dimensions?",
      placeholder: "e.g. 3m long x 2m wide",
    },
    {
      label: "What fuel or power does it use?",
      placeholder: "e.g. Diesel / LPG / electric / none",
    },
  ],

  Cooking: [
    { label: "Who made it?", placeholder: "e.g. Blue Seal" },
    { label: "What is the model?", placeholder: "e.g. GT46" },
    { label: "How old is it approximately?", placeholder: "e.g. 4 years" },
    {
      label: "What power source does it use?",
      placeholder: "e.g. LPG / natural gas / electric",
    },
    {
      label: "What power connection or rating is required?",
      placeholder: "e.g. 13A / 32A / three-phase",
    },
    { label: "What are its dimensions?", placeholder: "e.g. 120 x 80 x 90 cm" },
  ],

  Refrigeration: [
    {
      label: "Who made it and what model is it?",
      placeholder: "e.g. Polar G-Series",
    },
    { label: "What is its capacity?", placeholder: "e.g. 600 litres" },
    {
      label: "What power connection does it need?",
      placeholder: "e.g. Standard 13A plug",
    },
    {
      label: "What temperature range can it reach?",
      placeholder: "e.g. -2 to +8°C",
    },
    { label: "What are its dimensions?", placeholder: "e.g. 180 x 70 x 85 cm" },
  ],

  "Power & Utilities": [
    {
      label: "Who made it and what model is it?",
      placeholder: "e.g. Honda EU30is",
    },
    { label: "What is its power output?", placeholder: "e.g. 3 kVA / 2.8 kW" },
    {
      label: "What fuel or power source does it use?",
      placeholder: "e.g. Petrol / diesel / battery",
    },
    {
      label: "How many running hours has it had?",
      placeholder: "e.g. 450 hours / unknown",
    },
    {
      label: "What connections does it have?",
      placeholder: "e.g. 2 x 13A sockets",
    },
  ],

  "Drinks Equipment": [
    {
      label: "Who made it and what model is it?",
      placeholder: "e.g. Fracino Bambino",
    },
    {
      label: "What capacity does it have?",
      placeholder: "e.g. Two-group coffee machine",
    },
    {
      label: "What power or water connection is needed?",
      placeholder: "e.g. 13A and plumbed water",
    },
    { label: "What are its dimensions?", placeholder: "e.g. 60 x 50 x 45 cm" },
  ],

  "Trading Gear": [
    {
      label: "What brand or model is it?",
      placeholder: "e.g. Gala Tent Pro 50",
    },
    { label: "What are its dimensions?", placeholder: "e.g. 3 x 3 metres" },
    {
      label: "What is included?",
      placeholder: "e.g. Frame, canopy and sidewalls",
    },
  ],

  "Complete Setups": [
    {
      label: "What equipment is included?",
      placeholder: "e.g. Trailer, fryer, fridge and generator",
    },
    { label: "What size is the setup?", placeholder: "e.g. 4-metre trailer" },
    {
      label: "What power and utilities does it require?",
      placeholder: "e.g. LPG and 32A electric",
    },
    {
      label: "Is it ready to trade?",
      placeholder: "e.g. Yes, subject to buyer checks",
    },
  ],
};
// Lightweight local suggestions: no network, location permissions or API keys needed.
// These are examples, not a complete UK place-name database.
const PLACE_SUGGESTIONS = [
  "Aberdeen",
  "Bath",
  "Belfast",
  "Birmingham",
  "Bolton",
  "Bournemouth",
  "Bradford",
  "Brighton",
  "Bristol",
  "Cambridge",
  "Cardiff",
  "Carlisle",
  "Chelmsford",
  "Cheltenham",
  "Chester",
  "Coventry",
  "Derby",
  "Dundee",
  "Edinburgh",
  "Exeter",
  "Glasgow",
  "Gloucester",
  "Guildford",
  "Hull",
  "Inverness",
  "Ipswich",
  "Leeds",
  "Leicester",
  "Lincoln",
  "Liverpool",
  "London",
  "Luton",
  "Manchester",
  "Milton Keynes",
  "Newcastle upon Tyne",
  "Newport",
  "Northampton",
  "Norwich",
  "Nottingham",
  "Oxford",
  "Peterborough",
  "Plymouth",
  "Portsmouth",
  "Preston",
  "Reading",
  "Sheffield",
  "Southampton",
  "Southend-on-Sea",
  "St Austell",
  "St Ives",
  "Stoke-on-Trent",
  "Sunderland",
  "Swansea",
  "Swindon",
  "Taunton",
  "Torquay",
  "Truro",
  "Wakefield",
  "Warrington",
  "Winchester",
  "Wolverhampton",
  "Worcester",
  "York",
];
const ITEM_SUGGESTIONS: Record<string, string[]> = {
  "Vans & Trailers": [
    "Mobile catering trailer",
    "Food truck",
    "Burger van",
    "Coffee van",
    "Converted horsebox",
    "Catering trailer",
  ],

  Cooking: [
    "Commercial fryer",
    "Twin basket fryer",
    "Commercial griddle",
    "Pizza oven",
    "Gas chargrill",
    "Commercial bain marie",
  ],

  Refrigeration: [
    "Commercial upright fridge",
    "Display fridge",
    "Chest freezer",
    "Undercounter fridge",
    "Refrigerated prep counter",
  ],

  "Power & Utilities": [
    "Silent generator",
    "Diesel generator",
    "LPG generator",
    "Portable power station",
    "Water pump",
  ],

  "Drinks Equipment": [
    "Espresso machine",
    "Coffee grinder",
    "Hot water boiler",
    "Slush machine",
    "Drinks fridge",
  ],

  "Trading Gear": [
    "Pop-up gazebo",
    "Market stall",
    "Serving counter",
    "Outdoor signage",
    "Catering canopy",
  ],

  "Complete Setups": [
    "Ready-to-trade catering setup",
    "Complete coffee setup",
    "Mobile catering business setup",
    "Festival trading setup",
  ],
};
type Step = 0 | 1 | 2 | 3 | 4;
type OnlinePhoto = {
  id: string;
  display_order: number;
  storage_path: string;
  signedUrl?: string;
};

function Label({ children, detail }: { children: string; detail?: string }) {
  return (
    <View style={s.labelRow}>
      <AppText style={s.label}>{children}</AppText>
      {detail ? <AppText style={s.hint}>{detail}</AppText> : null}
    </View>
  );
}
function Panel({
  children,
  featured = false,
}: {
  children: React.ReactNode;
  featured?: boolean;
}) {
  return (
    <MetallicFrame
      tone="gold"
      borderRadius={24}
      borderWidth={2}
      style={[s.panel, featured && s.featuredPanel]}
      contentStyle={s.panelInner}
    >
      {children}
    </MetallicFrame>
  );
}
function GoldButton({
  label,
  onPress,
  secondary = false,
  icon,
}: {
  label: string;
  onPress: () => void;
  secondary?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        s.buttonOuter,
        secondary && s.secondaryOuter,
        pressed && { opacity: 0.82, transform: [{ scale: 0.99 }] },
      ]}
    >
      {secondary ? (
        <View style={s.secondaryButton}>
          <Ionicons name={icon ?? "arrow-back"} size={20} color={PALE} />
          <AppText style={s.secondaryText}>{label}</AppText>
        </View>
      ) : (
        <LinearGradient
          colors={["#FFF2BD", "#FFD66D", "#E9A32A"]}
          locations={[0, 0.58, 1]}
          style={s.button}
        >
          <AppText style={s.buttonText}>{label}</AppText>
          <Ionicons name={icon ?? "arrow-forward"} size={23} color={INK} />
        </LinearGradient>
      )}
    </Pressable>
  );
}
export default function SellScreen() {
  const insets = useSafeAreaInsets();
  const scroll = useRef<ScrollView>(null);
  const positions = useRef<number[]>([]);
  const heroHeight = useRef(375);
  const [activeSection, setActiveSection] = useState<Step>(0);
  const [category, setCategory] = useState("");
  const [title, setTitle] = useState("");
  const [titleSuggestionsOpen, setTitleSuggestionsOpen] = useState(false);
  const [condition, setCondition] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [placeSuggestionsOpen, setPlaceSuggestionsOpen] = useState(false);
  const [specs, setSpecs] = useState<Record<string, string>>({});
  const [delivery, setDelivery] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [serviceHistory, setServiceHistory] = useState("");
  const [reasonForSale, setReasonForSale] = useState("");
  const [paperwork, setPaperwork] = useState(false);
  const [workingCondition, setWorkingCondition] = useState("");
  const [knownFaults, setKnownFaults] = useState("");
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [draftStatus, setDraftStatus] = useState<
    "loading" | "saved" | "saving" | "error"
  >("loading");
  const progressAnim = useRef(new Animated.Value(0)).current;
  const celebrationAnim = useRef(new Animated.Value(0)).current;
  const lastComplete = useRef(false);
  const draftSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onlineSaveInProgress = useRef(false);
  const onlineDraftIds = useRef<Record<string, string>>({});
  const [onlineSaving, setOnlineSaving] = useState(false);
  const photoUploadInProgress = useRef(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [onlinePhotos, setOnlinePhotos] = useState<OnlinePhoto[]>([]);
  const [onlinePhotosLoading, setOnlinePhotosLoading] = useState(false);
  const [onlinePhotoBusy, setOnlinePhotoBusy] = useState(false);
  const onlinePhotoBusyRef = useRef(false);
  const publishingRef = useRef(false);
  const [publishing, setPublishing] = useState(false);

  // Load local form data once; never publish or write to Supabase here.
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(DRAFT_KEY);
        if (raw && mounted) {
          const draft = JSON.parse(raw);
          if (draft && typeof draft === "object") {
            if (typeof draft.category === "string") setCategory(draft.category);
            if (typeof draft.title === "string") setTitle(draft.title);
            if (typeof draft.condition === "string")
              setCondition(draft.condition);
            if (Array.isArray(draft.photos))
              setPhotos(
                draft.photos
                  .filter((v: unknown) => typeof v === "string")
                  .slice(0, 5),
              );
            if (typeof draft.price === "string") setPrice(draft.price);
            if (typeof draft.description === "string")
              setDescription(draft.description);
            if (typeof draft.location === "string") setLocation(draft.location);
            if (draft.specs && typeof draft.specs === "object")
              setSpecs(draft.specs);
            if (typeof draft.delivery === "string") setDelivery(draft.delivery);
            if (typeof draft.serviceHistory === "string")
              setServiceHistory(draft.serviceHistory);
            if (typeof draft.reasonForSale === "string")
              setReasonForSale(draft.reasonForSale);
            if (typeof draft.paperwork === "boolean")
              setPaperwork(draft.paperwork);
            if (typeof draft.workingCondition === "string")
              setWorkingCondition(draft.workingCondition);
            if (typeof draft.knownFaults === "string")
              setKnownFaults(draft.knownFaults);
          }
        }
      } catch (error) {
        console.warn("Marketplace draft could not be restored", error);
      } finally {
        if (mounted) {
          setDraftLoaded(true);
          setDraftStatus("saved");
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!draftLoaded) return;
    setDraftStatus("saving");
    if (draftSaveTimer.current) clearTimeout(draftSaveTimer.current);
    draftSaveTimer.current = setTimeout(async () => {
      try {
        await AsyncStorage.setItem(
          DRAFT_KEY,
          JSON.stringify({
            category,
            title,
            condition,
            photos,
            price,
            description,
            location,
            specs,
            delivery,
            serviceHistory,
            reasonForSale,
            paperwork,
            workingCondition,
            knownFaults,
          }),
        );
        setDraftStatus("saved");
      } catch (error) {
        console.warn("Marketplace draft could not be saved", error);
        setDraftStatus("error");
      }
    }, 650);
    return () => {
      if (draftSaveTimer.current) clearTimeout(draftSaveTimer.current);
    };
  }, [
    draftLoaded,
    category,
    title,
    condition,
    photos,
    price,
    description,
    location,
    specs,
    delivery,
    serviceHistory,
    reasonForSale,
    paperwork,
    workingCondition,
    knownFaults,
  ]);
  const titleSuggestions = useMemo(() => {
    const query = title.trim().toLowerCase();
    if (query.length < 2) return [];
    const options = category
      ? (ITEM_SUGGESTIONS[category] ?? [])
      : Object.values(ITEM_SUGGESTIONS).flat();
    return options
      .filter(
        (item) =>
          item.toLowerCase().includes(query) && item.toLowerCase() !== query,
      )
      .slice(0, 4);
  }, [title, category]);
  const placeSuggestions = useMemo(() => {
    const query = location.trim().toLowerCase();
    if (query.length < 2) return [];
    return PLACE_SUGGESTIONS.filter(
      (item) =>
        item.toLowerCase().includes(query) && item.toLowerCase() !== query,
    ).slice(0, 5);
  }, [location]);
  const money = useMemo(() => {
    const n = Number(price);
    return price.trim() && Number.isFinite(n)
      ? `£${n.toLocaleString("en-GB")}`
      : "£ —";
  }, [price]);
  const jump = (index: Step) => {
    setActiveSection(index);
    scroll.current?.scrollTo({
      y: Math.max(
        0,
        heroHeight.current + (positions.current[index] ?? 0) - insets.top - 14,
      ),
      animated: true,
    });
  };
  const goBack = () => router.replace("/(tabs)/marketplace");
  const choosePhotos = async () => {
    if (photos.length >= 5)
      return Alert.alert(
        "Five photos added",
        "Remove a photo before adding another.",
      );
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      selectionLimit: 5 - photos.length,
      quality: 0.75,
    });
    if (!result.canceled)
      setPhotos((prev) =>
        [...prev, ...result.assets.map((a) => a.uri)].slice(0, 5),
      );
  };
  const completed = [
    Boolean(category && title.trim() && condition),
    photos.length > 0,
    Boolean(
      Number(price) > 0 && Number.isFinite(Number(price)) && description.trim(),
    ),
    Boolean(location.trim()),
    false,
  ];
  const completedCount = completed.slice(0, 4).filter(Boolean).length;
  const ready = completedCount === 4;
  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: completedCount / 4,
      duration: 460,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
    if (ready && !lastComplete.current) {
      celebrationAnim.setValue(0);
      Animated.sequence([
        Animated.timing(celebrationAnim, {
          toValue: 1,
          duration: 450,
          useNativeDriver: true,
        }),
        Animated.timing(celebrationAnim, {
          toValue: 0,
          duration: 900,
          useNativeDriver: true,
        }),
      ]).start();
    }
    lastComplete.current = ready;
  }, [completedCount, ready]);
  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });
  const readyGlow = celebrationAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.35, 1],
  });
  // Verify the current seller before future online draft operations.
  // This does not write to Supabase or change the local draft.
  const checkMarketplaceSeller = async (): Promise<string | null> => {
    const { data, error } = await supabase.auth.getUser();

    if (error || !data.user) {
      Alert.alert(
        "Sign in required",
        "Please sign in to save your Marketplace listing online.",
      );
      return null;
    }

    return data.user.id;
  };

  // Save only listing fields. Photos stay on this device until the upload flow is built.
  // A user-scoped local ID allows subsequent saves to update the same private draft.
  const saveDraftOnline = async (quiet = false): Promise<boolean> => {
    if (onlineSaveInProgress.current) return false;
    if (!draftLoaded) {
      Alert.alert("Please wait", "Your local draft is still loading.");
      return false;
    }
    const numericPrice = price.trim() ? Number(price) : null;
    if (
      numericPrice !== null &&
      (!Number.isFinite(numericPrice) || numericPrice <= 0)
    ) {
      Alert.alert(
        "Check the price",
        "Enter a price greater than zero, or leave it empty for now.",
      );
      return false;
    }

    onlineSaveInProgress.current = true;
    setOnlineSaving(true);
    try {
      const sellerId = await checkMarketplaceSeller();
      if (!sellerId) return false;

      const payload = {
        category: category || null,
        title: title.trim() || null,
        condition: condition || null,
        description: description.trim() || null,
        price_gbp: numericPrice,
        location: location.trim() || null,
        specifications: specs,
        delivery_option: delivery || null,
        working_condition: workingCondition.trim() || null,
        known_faults: knownFaults.trim() || null,
        service_history: serviceHistory.trim() || null,
        reason_for_sale: reasonForSale.trim() || null,
        has_paperwork: paperwork,
      };
      const idKey = `bitebeacon:marketplace:online-draft-id:v1:${sellerId}`;
      let draftId = onlineDraftIds.current[sellerId];
      if (!draftId) {
        draftId = (await AsyncStorage.getItem(idKey)) || "";
      }

      if (draftId) {
        // RLS also enforces ownership; do not silently create a new listing on an update failure.
        const { data, error } = await supabase
          .from("marketplace_listings")
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq("id", draftId)
          .eq("seller_id", sellerId)
          .eq("status", "draft")
          .select("id")
          .maybeSingle();
        if (error) throw error;
        if (!data) {
          Alert.alert(
            "Draft not found",
            "Your previous online draft is unavailable. No new listing was created.",
          );
          return false;
        }
      } else {
        const { data, error } = await supabase
          .from("marketplace_listings")
          .insert(payload)
          .select("id")
          .single();
        if (error) throw error;
        draftId = data.id;
      }

      // Keep the ID in memory even if local storage fails, preventing repeat inserts this session.
      onlineDraftIds.current[sellerId] = draftId;
      try {
        await AsyncStorage.setItem(idKey, draftId);
      } catch (storageError) {
        console.warn(
          "Marketplace online draft ID could not be stored locally",
          storageError,
        );
        Alert.alert(
          "Draft saved online",
          "Your private listing was saved, but its local link could not be stored. Avoid creating another draft until this is resolved. Photos remain on this device.",
        );
        return false;
      }
      if (!quiet)
        Alert.alert(
          "Private draft saved online",
          "Your listing details are stored privately in BiteBeacon. Photos remain on this device. Nothing has been published.",
        );
      return true;
    } catch (error) {
      console.warn("Marketplace online draft save failed", error);
      Alert.alert(
        "Online save failed",
        "Your local draft is still available. Please try again when the connection is working.",
      );
      return false;
    } finally {
      onlineSaveInProgress.current = false;
      setOnlineSaving(false);
    }
  };

  // Online gallery uses server photo IDs, never local array positions. This prevents
  // reordering or removing a local preview from deleting the wrong stored file.
  const loadOnlinePhotos = async () => {
    if (onlinePhotosLoading || onlinePhotoBusyRef.current) return;
    setOnlinePhotosLoading(true);
    try {
      const sellerId = await checkMarketplaceSeller();
      if (!sellerId) return;
      const idKey = `bitebeacon:marketplace:online-draft-id:v1:${sellerId}`;
      const draftId =
        onlineDraftIds.current[sellerId] || (await AsyncStorage.getItem(idKey));
      if (!draftId) {
        Alert.alert(
          "Save online first",
          "Save your private draft online before managing uploaded photographs.",
        );
        return;
      }
      const { data: listing, error: listingError } = await supabase
        .from("marketplace_listings")
        .select("id")
        .eq("id", draftId)
        .eq("seller_id", sellerId)
        .eq("status", "draft")
        .maybeSingle();
      if (listingError) throw listingError;
      if (!listing)
        throw new Error("Your private online draft is not available.");
      const { data, error } = await supabase
        .from("marketplace_listing_photos")
        .select("id, display_order, storage_path, upload_status")
        .eq("listing_id", draftId)
        .order("display_order", { ascending: true });
      if (error) throw error;
      const confirmed = (data ?? []).filter(
        (item) => item.upload_status === "uploaded",
      );
      const next: OnlinePhoto[] = await Promise.all(
        confirmed.map(async (photo) => {
          const { data: signedData, error: signedError } =
            await supabase.storage
              .from("marketplace-photos")
              .createSignedUrl(photo.storage_path, 3600);
          if (signedError || !signedData?.signedUrl) {
            throw (
              signedError ||
              new Error("Could not retrieve a private photo URL.")
            );
          }
          return {
            id: photo.id,
            display_order: photo.display_order,
            storage_path: photo.storage_path,
            signedUrl: signedData.signedUrl,
          };
        }),
      );
      setOnlinePhotos(next);
      if ((data ?? []).some((item) => item.upload_status !== "uploaded")) {
        Alert.alert(
          "Unfinished upload",
          "An earlier photo reservation is unfinished. Review it before uploading more photos.",
        );
      }
    } catch (error) {
      console.warn("Marketplace online photo gallery failed", error);
      Alert.alert(
        "Could not load photos",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setOnlinePhotosLoading(false);
    }
  };

  const deleteOnlinePhoto = (photo: OnlinePhoto) => {
    if (onlinePhotoBusyRef.current || photoUploadInProgress.current) return;
    Alert.alert(
      "Delete uploaded photograph?",
      `Remove online photo ${photo.display_order} permanently from this private draft? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete photograph",
          style: "destructive",
          onPress: () => {
            void (async () => {
              if (onlinePhotoBusyRef.current) return;
              onlinePhotoBusyRef.current = true;
              setOnlinePhotoBusy(true);
              try {
                const { data, error } = await supabase.functions.invoke(
                  "marketplace-delete-photo",
                  {
                    body: { photo_id: photo.id },
                  },
                );
                if (error || data?.success !== true)
                  throw error || new Error("Deletion was not confirmed.");
                setOnlinePhotos((previous) =>
                  previous.filter((item) => item.id !== photo.id),
                );
                Alert.alert(
                  "Photo deleted online",
                  "The uploaded photograph was deleted. Local photo selections were not changed.",
                );
              } catch (error) {
                console.warn("Marketplace photo deletion failed", error);
                Alert.alert(
                  "Could not delete photograph",
                  "No local photos were changed. Refresh the online gallery to check its status.",
                );
              } finally {
                onlinePhotoBusyRef.current = false;
                setOnlinePhotoBusy(false);
              }
            })();
          },
        },
      ],
    );
  };

  // Replace an empty online position independently of the device's local preview list.
  const addOnlineReplacement = async () => {
    if (onlinePhotoBusyRef.current || photoUploadInProgress.current) return;
    onlinePhotoBusyRef.current = true;
    setOnlinePhotoBusy(true);
    try {
      const sellerId = await checkMarketplaceSeller();
      if (!sellerId) return;
      const idKey = `bitebeacon:marketplace:online-draft-id:v1:${sellerId}`;
      const draftId =
        onlineDraftIds.current[sellerId] || (await AsyncStorage.getItem(idKey));
      if (!draftId)
        return Alert.alert(
          "Save online first",
          "Save the private draft before adding photos.",
        );
      const { data: existing, error: existingError } = await supabase
        .from("marketplace_listing_photos")
        .select("id, upload_status")
        .eq("listing_id", draftId);
      if (existingError) throw existingError;
      if ((existing ?? []).some((row) => row.upload_status !== "uploaded")) {
        return Alert.alert(
          "Unfinished upload",
          "An earlier reservation needs attention before adding more photos.",
        );
      }
      if ((existing ?? []).length >= 5)
        return Alert.alert(
          "Five photos uploaded",
          "Delete an online photo first.",
        );
      const picked = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsMultipleSelection: false,
        quality: 0.75,
      });
      if (picked.canceled || !picked.assets[0]) return;
      const uri = picked.assets[0].uri;
      const file = new File(uri);
      if (!file.exists) throw new Error("Selected photo is unavailable.");
      if (file.size > 5 * 1024 * 1024)
        throw new Error("Selected photo exceeds 5 MB.");
      const match = uri.split("?")[0].match(/\.(jpe?g|png|webp)$/i);
      const extension =
        match?.[1]?.toLowerCase() === "jpeg"
          ? "jpg"
          : match?.[1]?.toLowerCase() || "jpg";
      const contentType =
        extension === "png"
          ? "image/png"
          : extension === "webp"
            ? "image/webp"
            : "image/jpeg";
      const { data: reservation, error: reserveError } = await supabase.rpc(
        "marketplace_reserve_photo",
        {
          p_listing_id: draftId,
          p_extension: extension,
        },
      );
      if (reserveError) throw reserveError;
      const slot = reservation?.[0];
      if (!slot?.photo_id || !slot?.storage_path)
        throw new Error("No storage reservation returned.");
      const { error: uploadError } = await supabase.storage
        .from("marketplace-photos")
        .upload(slot.storage_path, await file.arrayBuffer(), {
          contentType,
          upsert: false,
        });
      if (uploadError) throw uploadError;
      const { error: completionError } = await supabase.rpc(
        "marketplace_complete_photo_upload",
        {
          p_photo_id: slot.photo_id,
        },
      );
      if (completionError) throw completionError;
      setOnlinePhotos((previous) =>
        [
          ...previous,
          {
            id: slot.photo_id,
            display_order: slot.display_order,
            storage_path: slot.storage_path,
          },
        ].sort((a, b) => a.display_order - b.display_order),
      );
      Alert.alert(
        "Photo uploaded privately",
        "Your online photo has been added. The device preview list was not changed.",
      );
    } catch (error) {
      console.warn("Marketplace online replacement upload failed", error);
      Alert.alert(
        "Photo upload needs attention",
        `${error instanceof Error ? error.message : "Upload failed."} Refresh the gallery before retrying; a reservation may need attention.`,
      );
    } finally {
      onlinePhotoBusyRef.current = false;
      setOnlinePhotoBusy(false);
    }
  };

  // Upload only unoccupied positions. Existing uploaded photos are never re-uploaded.
  // This stage deliberately does not change or delete previously uploaded photo positions.
  const uploadPrivatePhotos = async (quiet = false): Promise<boolean> => {
    if (photoUploadInProgress.current || onlineSaveInProgress.current)
      return false;
    if (!photos.length) {
      Alert.alert("Select photographs", "Add photographs to the form first.");
      return false;
    }
    photoUploadInProgress.current = true;
    setPhotoUploading(true);
    let currentReservation = false;
    let uploadedCount = 0;
    try {
      const sellerId = await checkMarketplaceSeller();
      if (!sellerId) return false;
      const idKey = `bitebeacon:marketplace:online-draft-id:v1:${sellerId}`;
      const draftId =
        onlineDraftIds.current[sellerId] || (await AsyncStorage.getItem(idKey));
      if (!draftId) {
        Alert.alert(
          "Save your draft online first",
          "Save the private listing online before uploading photos.",
        );
        return false;
      }
      const { data: existing, error: existingError } = await supabase
        .from("marketplace_listing_photos")
        .select("id, display_order, upload_status")
        .eq("listing_id", draftId)
        .order("display_order", { ascending: true });
      if (existingError) throw existingError;
      const slots = existing ?? [];
      if (slots.some((slot) => slot.upload_status !== "uploaded")) {
        Alert.alert(
          "Upload needs attention",
          "A previous photo reservation is unfinished. No new photos were reserved. Please check the previous upload before retrying.",
        );
        return false;
      }
      if (slots.some((slot) => slot.display_order > photos.length)) {
        Alert.alert(
          "Previously uploaded photos",
          "This draft has uploaded photos beyond the number currently selected on this device. No files were changed. Photo removal and replacement need a separate secure workflow.",
        );
        return false;
      }
      // The original uploader assumes online positions match local indices.
      // After an online deletion, positions may have gaps: use the online gallery
      // replacement action rather than risk uploading a different local photo.
      if (slots.some((slot, index) => slot.display_order !== index + 1)) {
        Alert.alert(
          "Use online photo manager",
          "Uploaded photo positions have changed. Use ADD ONLINE PHOTO in the online gallery to fill an available slot safely.",
        );
        return false;
      }
      const occupied = new Set(slots.map((slot) => slot.display_order));
      if (occupied.size >= photos.length) {
        Alert.alert(
          "Photos already uploaded",
          "All selected photo positions are already stored privately. Nothing was uploaded again. If you have changed or reordered the photos, those changes have not been synced online.",
        );
        return false;
      }
      // Validate all remaining local files before making any reservations.
      const pending: {
        index: number;
        file: File;
        extension: string;
        contentType: string;
      }[] = [];
      for (let index = 0; index < photos.length; index++) {
        if (occupied.has(index + 1)) continue;
        const uri = photos[index];
        const file = new File(uri);
        if (!file.exists)
          throw new Error(
            `Photo ${index + 1} is no longer available on this device.`,
          );
        if (file.size > 5 * 1024 * 1024)
          throw new Error(`Photo ${index + 1} is larger than 5 MB.`);
        const match = uri.split("?")[0].match(/\.(jpe?g|png|webp)$/i);
        const extension =
          match?.[1]?.toLowerCase() === "jpeg"
            ? "jpg"
            : match?.[1]?.toLowerCase() || "jpg";
        const contentType =
          extension === "png"
            ? "image/png"
            : extension === "webp"
              ? "image/webp"
              : "image/jpeg";
        pending.push({ index, file, extension, contentType });
      }
      // The reservation function allocates the lowest free slot. Never overwrite an occupied one.
      for (const item of pending) {
        const { data: reservation, error: reservationError } =
          await supabase.rpc("marketplace_reserve_photo", {
            p_listing_id: draftId,
            p_extension: item.extension,
          });
        if (reservationError) throw reservationError;
        const slot = reservation?.[0];
        if (!slot?.photo_id || !slot?.storage_path)
          throw new Error("Photo reservation returned no storage path.");
        currentReservation = true;
        if (slot.display_order !== item.index + 1) {
          throw new Error(
            "Photo position differs from the selected order. Upload stopped; reservation needs review.",
          );
        }
        const bytes = await item.file.arrayBuffer();
        const { error: uploadError } = await supabase.storage
          .from("marketplace-photos")
          .upload(slot.storage_path, bytes, {
            contentType: item.contentType,
            upsert: false,
          });
        if (uploadError) throw uploadError;
        const { error: completionError } = await supabase.rpc(
          "marketplace_complete_photo_upload",
          {
            p_photo_id: slot.photo_id,
          },
        );
        if (completionError) throw completionError;
        currentReservation = false;
        uploadedCount++;
      }
      if (!quiet)
        Alert.alert(
          "Private photos uploaded",
          `${uploadedCount} new photograph${uploadedCount === 1 ? "" : "s"} stored and confirmed privately. Nothing has been published.`,
        );
      return true;
    } catch (error) {
      console.warn("Marketplace photo upload failed", error);
      const detail = error instanceof Error ? error.message : String(error);
      Alert.alert(
        "Photo upload stopped",
        `${detail}\n\n${uploadedCount} photo(s) completed in this attempt. ${currentReservation ? "An unfinished reservation may remain. Do not retry until it has been reviewed." : "Completed photos will not be uploaded again."}`,
      );
      return false;
    } finally {
      photoUploadInProgress.current = false;
      setPhotoUploading(false);
    }
  };

  // Single, explicit seller action: save the draft, upload selected photos,
  // then refresh the confirmed online gallery. Never publish automatically.
  const saveListingAndPhotos = async () => {
    if (
      onlineSaveInProgress.current ||
      photoUploadInProgress.current ||
      onlinePhotoBusyRef.current
    )
      return;
    const saved = await saveDraftOnline(true);
    if (!saved) return;
    if (!photos.length) {
      Alert.alert(
        "Draft saved",
        "Your listing is saved privately. Add at least one equipment photograph before publishing.",
      );
      return;
    }
    const uploaded = await uploadPrivatePhotos(true);
    if (!uploaded) return;
    await loadOnlinePhotos();
    Alert.alert(
      "Listing saved privately",
      "Your listing details and selected photographs have been checked online. Review the listing, then publish when ready.",
    );
  };

  // Publishing only uses an existing, saved online draft. The server RPC
  // validates ownership, required fields, uploaded photos and the free slot.
  const publishListing = () => {
    if (
      publishingRef.current ||
      onlineSaveInProgress.current ||
      photoUploadInProgress.current ||
      onlinePhotoBusyRef.current ||
      onlinePhotosLoading ||
      !draftLoaded
    ) {
      Alert.alert(
        "Please wait",
        "Finish saving and uploading before publishing.",
      );
      return;
    }

    Alert.alert(
      "Publish your listing?",
      "Your saved online listing will be visible to buyers for 30 days. You can have one free active listing at a time. Make sure your online details and photos are up to date.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Publish listing",
          onPress: () => {
            void (async () => {
              if (publishingRef.current) return;
              publishingRef.current = true;
              setPublishing(true);

              try {
                const { data: auth, error: authError } =
                  await supabase.auth.getUser();
                if (authError || !auth.user) {
                  throw new Error("Please sign in to publish your listing.");
                }

                const sellerId = auth.user.id;
                const idKey = `bitebeacon:marketplace:online-draft-id:v1:${sellerId}`;
                const draftId =
                  onlineDraftIds.current[sellerId] ||
                  (await AsyncStorage.getItem(idKey));

                if (!draftId) {
                  throw new Error(
                    "Save your listing online and upload your photos before publishing.",
                  );
                }

                // Do not silently save changed local fields here: the seller
                // must explicitly save and review the online draft first.
                const { data, error } = await supabase.rpc(
                  "marketplace_publish_listing",
                  { p_listing_id: draftId },
                );

                if (error) throw error;
                if (!data || data.status !== "published") {
                  throw new Error("Publishing could not be confirmed.");
                }

                // The online draft is now published. Clear the local link so
                // future saves cannot accidentally target a published listing.
                // If local reset fails, publication itself is still successful.
                try {
                  await clearFormForNewListing();
                } catch (resetError) {
                  console.warn(
                    "Published listing local reset failed",
                    resetError,
                  );
                  delete onlineDraftIds.current[sellerId];
                  try {
                    await AsyncStorage.removeItem(idKey);
                  } catch (storageError) {
                    console.warn(
                      "Published draft ID cleanup failed",
                      storageError,
                    );
                  }
                }

                Alert.alert(
                  "Listing published!",
                  "Your free Marketplace listing is now published for 30 days.",
                );
              } catch (error) {
                console.warn("Marketplace publishing failed", error);
                const message =
                  error instanceof Error ? error.message : String(error);
                Alert.alert(
                  "Could not publish",
                  message || "Your listing remains private. Please try again.",
                );
              } finally {
                publishingRef.current = false;
                setPublishing(false);
              }
            })();
          },
        },
      ],
    );
  };

  const saveDraftNow = async () => {
    if (draftSaveTimer.current) clearTimeout(draftSaveTimer.current);
    try {
      await AsyncStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({
          category,
          title,
          condition,
          photos,
          price,
          description,
          location,
          specs,
          delivery,
          serviceHistory,
          reasonForSale,
          paperwork,
          workingCondition,
          knownFaults,
        }),
      );
      setDraftStatus("saved");
      Alert.alert(
        "Draft saved",
        "Your details are saved on this device. Nothing has been uploaded or published.",
      );
    } catch {
      setDraftStatus("error");
      Alert.alert(
        "Could not save",
        "Please try again. Your current form is still open.",
      );
    }
  };
  // Clearing a form is separate from deleting remote files. Never claim to delete
  // an online draft until a server-side listing+Storage cleanup endpoint exists.
  const clearFormForNewListing = async () => {
    const { data: auth, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    if (auth.user) {
      const idKey = `bitebeacon:marketplace:online-draft-id:v1:${auth.user.id}`;
      await AsyncStorage.removeItem(idKey);
      delete onlineDraftIds.current[auth.user.id];
    } else if (Object.keys(onlineDraftIds.current).length) {
      throw new Error("Sign in again before starting a new listing.");
    }
    if (draftSaveTimer.current) clearTimeout(draftSaveTimer.current);
    const blank = {
      category: "",
      title: "",
      condition: "",
      photos: [],
      price: "",
      description: "",
      location: "",
      specs: {},
      delivery: "",
      serviceHistory: "",
      reasonForSale: "",
      paperwork: false,
      workingCondition: "",
      knownFaults: "",
    };
    await AsyncStorage.setItem(DRAFT_KEY, JSON.stringify(blank));
    setCategory("");
    setTitle("");
    setTitleSuggestionsOpen(false);
    setCondition("");
    setPhotos([]);
    setPrice("");
    setDescription("");
    setLocation("");
    setPlaceSuggestionsOpen(false);
    setSpecs({});
    setDelivery("");
    setHistoryOpen(false);
    setServiceHistory("");
    setReasonForSale("");
    setPaperwork(false);
    setWorkingCondition("");
    setKnownFaults("");
    setOnlinePhotos([]);
    setActiveSection(0);
    setDraftStatus("saved");
    scroll.current?.scrollTo({ y: 0, animated: true });
  };

  const startFresh = () => {
    if (
      !draftLoaded ||
      publishingRef.current ||
      onlineSaveInProgress.current ||
      photoUploadInProgress.current ||
      onlinePhotoBusyRef.current ||
      onlinePhotosLoading
    ) {
      Alert.alert(
        "Please wait",
        "Finish the current save or photo operation before starting a new listing.",
      );
      return;
    }
    const run = async (saveFirst: boolean) => {
      try {
        if (saveFirst) {
          // Do not clear the form if saving online fails.
          const saved = await saveDraftOnline(true);
          if (!saved) return;
        }
        await clearFormForNewListing();
        Alert.alert(
          "Ready for a new listing",
          saveFirst
            ? "Your previous listing is saved privately online. Your new form is empty."
            : "Your device draft has been cleared. Any previously saved online listing and uploaded photos remain private.",
        );
      } catch (error) {
        console.warn("Could not start a fresh Marketplace listing", error);
        Alert.alert(
          "Could not start fresh",
          "The operation could not finish. Please check your saved draft before trying again.",
        );
      }
    };
    Alert.alert(
      "Start a new listing?",
      "Save your current details privately online first, or clear only the device copy. Online listings and uploaded photos are not deleted by Start Fresh.",
      [
        { text: "CANCEL", style: "cancel" },
        { text: "SAVE ONLINE & START FRESH", onPress: () => void run(true) },
        {
          text: "DISCARD DEVICE DRAFT & START FRESH",
          style: "destructive",
          onPress: () => void run(false),
        },
      ],
    );
  };
  const preview = () => {
    const missing: string[] = [];
    if (!category || !title.trim() || !condition)
      missing.push("equipment category, title and condition");
    if (!photos.length) missing.push("at least one real equipment photo");
    if (
      !Number.isFinite(Number(price)) ||
      Number(price) <= 0 ||
      !description.trim()
    )
      missing.push("a valid price and description");
    if (!location.trim()) missing.push("your general location");
    if (missing.length) {
      Alert.alert("Almost there", `Please complete: ${missing.join("; ")}.`, [
        { text: "OK" },
      ]);
      const first = !completed[0]
        ? 0
        : !completed[1]
          ? 1
          : !completed[2]
            ? 2
            : 3;
      jump(first as Step);
      return;
    }
    jump(4);
  };
  const reorderPhoto = (index: number, direction: -1 | 1) => {
    setPhotos((previous) => {
      const target = index + direction;
      if (target < 0 || target >= previous.length) return previous;
      const nextPhotos = [...previous];
      [nextPhotos[index], nextPhotos[target]] = [
        nextPhotos[target],
        nextPhotos[index],
      ];
      return nextPhotos;
    });
  };
  return (
    <MapTextureBackground>
      <KeyboardAvoidingView
        style={s.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          ref={scroll}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 22 + insets.bottom }}
          showsVerticalScrollIndicator={false}
        >
          <ImageBackground
            source={HERO}
            resizeMode="cover"
            style={s.hero}
            imageStyle={s.heroImage}
            onLayout={(event) => {
              heroHeight.current = event.nativeEvent.layout.height;
            }}
          >
            <LinearGradient
              colors={[
                "rgba(3,13,24,.44)",
                "rgba(3,13,24,.22)",
                "rgba(3,13,24,.98)",
              ]}
              locations={[0, 0.43, 1]}
              style={s.heroShade}
            >
              <View style={[s.topRow, { paddingTop: insets.top + 10 }]}>
                <Pressable
                  onPress={goBack}
                  style={s.backCircle}
                  accessibilityLabel="Go back"
                >
                  <Ionicons name="arrow-back" size={25} color={PALE} />
                </Pressable>
                <AppText style={s.brand}>
                  BITEBEACON / THE TRADER'S EXCHANGE
                </AppText>
              </View>
              <View style={s.heroCopy}>
                <AppText style={s.eyebrow}>
                  GOOD EQUIPMENT DESERVES ANOTHER SHIFT
                </AppText>
                <AppText variant="heading" style={s.heroTitle}>
                  SELL YOUR{"\n"}
                  <AppText style={s.heroGold}>EQUIPMENT.</AppText>
                </AppText>
                <View style={s.shortRule} />
                <AppText style={s.heroSubtitle}>Put it back to work.</AppText>
                <AppText style={s.heroBody}>
                  Give your equipment its next chapter. Create a standout
                  listing for the food-trading community.
                </AppText>
              </View>
            </LinearGradient>
          </ImageBackground>
          <View style={s.content}>
            <View style={s.progressHead}>
              <AppText style={s.sectionKicker}>YOUR LISTING STUDIO</AppText>
              <AppText style={s.progressCount}>
                {completedCount} OF 4 ESSENTIAL SECTIONS READY
              </AppText>
            </View>
            <View style={s.progressTrack}>
              <Animated.View
                style={[s.progressFill, { width: progressWidth }]}
              />
            </View>
            {ready && (
              <Animated.View style={[s.readyBanner, { opacity: readyGlow }]}>
                <Ionicons name="sparkles" size={17} color={PALE} />
                <AppText style={s.readyText}>
                  YOUR LISTING IS READY TO PREVIEW
                </AppText>
                <Ionicons name="checkmark-circle" size={18} color={PALE} />
              </Animated.View>
            )}
            <View style={s.steps}>
              {STEPS.map((item, index) => (
                <Pressable
                  key={item}
                  onPress={() => jump(index as Step)}
                  style={s.stepItem}
                  accessibilityRole="button"
                  accessibilityLabel={`Jump to ${item}`}
                >
                  <View
                    style={[
                      s.stepCircle,
                      index === activeSection && s.stepActive,
                      completed[index] && s.stepDone,
                    ]}
                  >
                    {completed[index] ? (
                      <Ionicons name="checkmark" size={17} color={INK} />
                    ) : (
                      <AppText
                        style={[
                          s.stepNumber,
                          index === activeSection && { color: INK },
                        ]}
                      >
                        {index + 1}
                      </AppText>
                    )}
                  </View>
                  <AppText
                    style={[
                      s.stepText,
                      index === activeSection && { color: PALE },
                    ]}
                    numberOfLines={1}
                  >
                    {item}
                  </AppText>
                </Pressable>
              ))}
            </View>
            <View
              onLayout={(e) => {
                positions.current[0] = e.nativeEvent.layout.y;
              }}
              style={s.intro}
            >
              <AppText style={s.sectionKicker}>01 / EQUIPMENT</AppText>
              <AppText variant="heading" style={s.sectionTitle}>
                Start with the essentials
              </AppText>
              <AppText style={s.sectionBody}>
                Help the right trader find exactly what they need.
              </AppText>
            </View>
            <>
              <Panel>
                <Label detail="Choose one">EQUIPMENT CATEGORY</Label>
                <View style={s.categoryGrid}>
                  {CATEGORIES.map((item) => {
                    const active = category === item.label;
                    return (
                      <Pressable
                        key={item.label}
                        onPress={() => setCategory(item.label)}
                        style={({ pressed }) => [
                          s.category,
                          active && s.selected,
                          pressed && s.pressedTile,
                        ]}
                      >
                        <Ionicons
                          name={item.icon}
                          size={28}
                          color={active ? PALE : GOLD}
                        />
                        <AppText
                          style={[s.categoryText, active && { color: PALE }]}
                        >
                          {item.label}
                        </AppText>
                      </Pressable>
                    );
                  })}
                </View>
              </Panel>
              <Panel>
                <Label detail="Be clear and specific">LISTING TITLE</Label>
                <PremiumInput
                  value={title}
                  onChangeText={(value) => {
                    setTitle(value);
                    setTitleSuggestionsOpen(true);
                  }}
                  onFocus={() => setTitleSuggestionsOpen(true)}
                  maxLength={90}
                  placeholder="e.g. 3m mobile catering trailer"
                  placeholderTextColor="#718796"
                  style={s.input}
                />
                {titleSuggestionsOpen && titleSuggestions.length > 0 && (
                  <View style={s.suggestions}>
                    {titleSuggestions.map((item) => (
                      <Pressable
                        key={item}
                        style={s.suggestionRow}
                        onPress={() => {
                          setTitle(item);
                          setTitleSuggestionsOpen(false);
                        }}
                        accessibilityRole="button"
                      >
                        <Ionicons
                          name="search-outline"
                          size={16}
                          color={GOLD}
                        />
                        <AppText style={s.suggestionText}>{item}</AppText>
                        <Ionicons
                          name="arrow-undo-outline"
                          size={15}
                          color={MUTED}
                        />
                      </Pressable>
                    ))}
                  </View>
                )}
              </Panel>
              {category && (
                <Panel>
                  <Label detail="Optional · tailored to your category">
                    EQUIPMENT SPECIFICATIONS
                  </Label>
                  <View style={s.specGrid}>
                    {(SPEC_FIELDS[category] ?? []).map((field) => (
                      <View key={field.label} style={s.specField}>
                        <AppText style={s.specLabel}>{field.label}</AppText>
                        <PremiumInput
                          value={specs[field.label] ?? ""}
                          onChangeText={(value) =>
                            setSpecs((previous) => ({
                              ...previous,
                              [field.label]: value,
                            }))
                          }
                          maxLength={100}
                          placeholder={field.placeholder}
                          placeholderTextColor="#718796"
                          style={s.input}
                        />
                      </View>
                    ))}
                  </View>
                </Panel>
              )}
              <Panel>
                <Label>CONDITION</Label>
                <View style={s.pills}>
                  {CONDITIONS.map((c) => (
                    <Pressable
                      key={c}
                      onPress={() => setCondition(c)}
                      style={[s.pill, condition === c && s.selected]}
                    >
                      <Ionicons
                        name={
                          condition === c
                            ? "radio-button-on"
                            : "radio-button-off"
                        }
                        size={20}
                        color={GOLD}
                      />
                      <AppText style={s.pillText}>{c}</AppText>
                    </Pressable>
                  ))}
                </View>
              </Panel>
            </>
            <View
              onLayout={(e) => {
                positions.current[1] = e.nativeEvent.layout.y;
              }}
              style={s.intro}
            >
              <AppText style={s.sectionKicker}>02 / PHOTOS</AppText>
              <AppText variant="heading" style={s.sectionTitle}>
                Show it off
              </AppText>
              <AppText style={s.sectionBody}>
                Real photos help buyers see the equipment at its best.
              </AppText>
            </View>
            <Panel featured>
              <Label detail={`${photos.length} / 5 photos`}>
                EQUIPMENT PHOTOS
              </Label>
              <View style={s.photoGrid}>
                {photos.map((uri, i) => (
                  <View key={`${uri}-${i}`} style={s.photoSlot}>
                    <Image
                      source={{ uri }}
                      style={s.photo}
                      fadeDuration={300}
                    />
                    <View style={s.photoActions}>
                      <Pressable
                        onPress={() => reorderPhoto(i, -1)}
                        disabled={i === 0}
                        accessibilityLabel={`Move photo ${i + 1} left`}
                      >
                        <Ionicons
                          name="chevron-back-circle"
                          size={23}
                          color={i === 0 ? "#60707B" : PALE}
                        />
                      </Pressable>
                      <Pressable
                        onPress={() => reorderPhoto(i, 1)}
                        disabled={i === photos.length - 1}
                        accessibilityLabel={`Move photo ${i + 1} right`}
                      >
                        <Ionicons
                          name="chevron-forward-circle"
                          size={23}
                          color={i === photos.length - 1 ? "#60707B" : PALE}
                        />
                      </Pressable>
                    </View>
                    <Pressable
                      onPress={() =>
                        setPhotos((p) => p.filter((_, j) => j !== i))
                      }
                      style={s.removePhoto}
                      accessibilityLabel={`Remove local preview photo ${i + 1}`}
                    >
                      <Ionicons name="close" size={19} color="#FFF" />
                    </Pressable>
                  </View>
                ))}
                {photos.length < 5 && (
                  <Pressable onPress={choosePhotos} style={s.addPhoto}>
                    <Ionicons name="camera-outline" size={34} color={GOLD} />
                    <AppText style={s.addPhotoText}>Add photos</AppText>
                  </Pressable>
                )}
              </View>
              <AppText style={s.note}>
                Use photographs of the actual item. Buyers should be able to see
                its condition clearly.
              </AppText>
            </Panel>
            <View
              onLayout={(e) => {
                positions.current[2] = e.nativeEvent.layout.y;
              }}
              style={s.intro}
            >
              <AppText style={s.sectionKicker}>03 / DETAILS</AppText>
              <AppText variant="heading" style={s.sectionTitle}>
                Make it count
              </AppText>
              <AppText style={s.sectionBody}>
                A fair price and honest description build confidence.
              </AppText>
            </View>
            <>
              <Panel>
                <Label>ASKING PRICE (£)</Label>
                <PremiumInput
                  value={price}
                  onChangeText={(v) => setPrice(v.replace(/[^\d.]/g, ""))}
                  keyboardType="decimal-pad"
                  placeholder="e.g. 2450"
                  placeholderTextColor="#718796"
                  style={s.input}
                />
                <View style={s.priceCompact}>
                  <AppText style={s.mini}>ASKING PRICE</AppText>
                  <AppText style={s.priceCompactText}>{money}</AppText>
                </View>
              </Panel>
              <Panel>
                <Label detail="Be accurate">EQUIPMENT DESCRIPTION</Label>
                <PremiumInput
                  value={description}
                  onChangeText={setDescription}
                  maxLength={2000}
                  multiline
                  textAlignVertical="top"
                  placeholder="What's included? Age, dimensions, working condition, service history, and any faults..."
                  placeholderTextColor="#718796"
                  style={[s.input, s.description]}
                />
                <AppText style={s.counter}>
                  {description.length} / 2000 characters
                </AppText>
              </Panel>
              <Panel>
                <Pressable
                  onPress={() => setHistoryOpen((value) => !value)}
                  accessibilityRole="button"
                  accessibilityLabel="Toggle optional seller information"
                  style={s.expandRow}
                >
                  <View style={s.expandTitle}>
                    <Ionicons
                      name="information-circle-outline"
                      size={21}
                      color={PALE}
                    />
                    <AppText style={s.label}>A FEW MORE QUESTIONS</AppText>
                  </View>
                  <Ionicons
                    name={historyOpen ? "chevron-up" : "chevron-down"}
                    size={22}
                    color={PALE}
                  />
                </Pressable>
                <AppText style={s.note}>
                  A few optional answers can help buyers feel confident.
                </AppText>
                {historyOpen && (
                  <View style={s.extraContent}>
                    <AppText style={s.specLabel}>
                      Is everything working as it should?
                    </AppText>
                    <PremiumInput
                      value={workingCondition}
                      onChangeText={setWorkingCondition}
                      maxLength={180}
                      placeholder="e.g. Fully working and tested"
                      placeholderTextColor="#718796"
                      style={s.input}
                    />
                    <AppText style={s.specLabel}>
                      Are there any faults, damage or missing parts?
                    </AppText>
                    <PremiumInput
                      value={knownFaults}
                      onChangeText={setKnownFaults}
                      maxLength={350}
                      multiline
                      placeholder="e.g. Small dent on side; no known faults"
                      placeholderTextColor="#718796"
                      style={[s.input, s.smallMultiline]}
                    />
                    <AppText style={s.specLabel}>
                      Has the item been serviced or maintained recently?
                    </AppText>
                    <PremiumInput
                      value={serviceHistory}
                      onChangeText={setServiceHistory}
                      maxLength={350}
                      multiline
                      placeholder="e.g. Serviced in June; new parts fitted"
                      placeholderTextColor="#718796"
                      style={[s.input, s.smallMultiline]}
                    />
                    <AppText style={s.specLabel}>
                      Why are you selling it?
                    </AppText>
                    <PremiumInput
                      value={reasonForSale}
                      onChangeText={setReasonForSale}
                      maxLength={200}
                      placeholder="e.g. We have upgraded to a larger unit"
                      placeholderTextColor="#718796"
                      style={s.input}
                    />
                    <Pressable
                      style={s.checkboxRow}
                      onPress={() => setPaperwork((value) => !value)}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: paperwork }}
                    >
                      <Ionicons
                        name={paperwork ? "checkbox" : "square-outline"}
                        size={23}
                        color={PALE}
                      />
                      <AppText style={s.pillText}>
                        Do you have manuals or service paperwork?
                      </AppText>
                    </Pressable>
                  </View>
                )}
              </Panel>
            </>
            <View
              onLayout={(e) => {
                positions.current[3] = e.nativeEvent.layout.y;
              }}
              style={s.intro}
            >
              <AppText style={s.sectionKicker}>04 / LOCATION</AppText>
              <AppText variant="heading" style={s.sectionTitle}>
                Keep it local
              </AppText>
              <AppText style={s.sectionBody}>
                A town or general area is all buyers need.
              </AppText>
            </View>
            <Panel>
              <Label>GENERAL LOCATION</Label>
              <PremiumInput
                value={location}
                onChangeText={(value) => {
                  setLocation(value);
                  setPlaceSuggestionsOpen(true);
                }}
                onFocus={() => setPlaceSuggestionsOpen(true)}
                maxLength={100}
                placeholder="e.g. Bristol"
                placeholderTextColor="#718796"
                style={s.input}
              />
              {placeSuggestionsOpen && placeSuggestions.length > 0 && (
                <View style={s.suggestions}>
                  {placeSuggestions.map((place) => (
                    <Pressable
                      key={place}
                      style={s.suggestionRow}
                      onPress={() => {
                        setLocation(place);
                        setPlaceSuggestionsOpen(false);
                      }}
                      accessibilityRole="button"
                    >
                      <Ionicons
                        name="location-outline"
                        size={16}
                        color={GOLD}
                      />
                      <AppText style={s.suggestionText}>{place}</AppText>
                      <Ionicons
                        name="arrow-undo-outline"
                        size={15}
                        color={MUTED}
                      />
                    </Pressable>
                  ))}
                </View>
              )}
              <View style={s.locationNote}>
                <Ionicons name="location-outline" size={21} color={GOLD} />
                <AppText style={s.note}>
                  Enter a town or general area, not a street address.
                  Suggestions cover some UK towns and cities; you can type any
                  location.
                </AppText>
              </View>
              <View style={s.inlineDivider} />
              <Label detail="Choose one">COLLECTION OR DELIVERY</Label>
              <View style={s.pills}>
                {DELIVERY.map((option) => (
                  <Pressable
                    key={option}
                    onPress={() => setDelivery(option)}
                    style={[s.pill, delivery === option && s.selected]}
                  >
                    <Ionicons
                      name={
                        delivery === option
                          ? "radio-button-on"
                          : "radio-button-off"
                      }
                      size={18}
                      color={PALE}
                    />
                    <AppText style={s.pillText}>{option}</AppText>
                  </Pressable>
                ))}
              </View>
            </Panel>
            <View
              onLayout={(e) => {
                positions.current[4] = e.nativeEvent.layout.y;
              }}
              style={s.intro}
            >
              <AppText style={s.sectionKicker}>05 / LIVE PREVIEW</AppText>
              <AppText variant="heading" style={s.sectionTitle}>
                The finishing touch
              </AppText>
              <AppText style={s.sectionBody}>
                Your listing preview updates as you fill in the sections above.
              </AppText>
            </View>
            <Panel featured>
              <Label detail="Private draft">LISTING PREVIEW</Label>
              <View style={s.buyerCard}>
                {photos[0] ? (
                  <Image
                    source={{ uri: photos[0] }}
                    style={s.previewPhoto}
                    fadeDuration={320}
                  />
                ) : (
                  <View style={s.previewPlaceholder}>
                    <Ionicons name="images-outline" size={44} color={GOLD} />
                    <AppText style={s.placeholderText}>
                      YOUR EQUIPMENT PHOTO
                    </AppText>
                  </View>
                )}
                <LinearGradient
                  colors={["transparent", "rgba(3,13,24,.95)"]}
                  style={s.previewImageShade}
                >
                  <View style={s.previewBadge}>
                    <Ionicons name="pricetag-outline" size={13} color={PALE} />
                    <AppText style={s.previewBadgeText}>
                      THE TRADER'S EXCHANGE
                    </AppText>
                  </View>
                </LinearGradient>
                <View style={s.buyerCardCopy}>
                  <AppText style={s.buyerEyebrow}>
                    EQUIPMENT FOR SALE · PRIVATE PREVIEW
                  </AppText>
                  <AppText style={s.buyerTitle}>
                    {title.trim() || "Your equipment title"}
                  </AppText>
                  <AppText style={s.buyerPrice}>{money}</AppText>
                  <View style={s.buyerMetaRow}>
                    <Ionicons name="location-outline" size={15} color={GOLD} />
                    <AppText style={s.buyerMeta}>
                      {location || "Your town or area"}
                    </AppText>
                  </View>
                  <View style={s.buyerMetaRow}>
                    <Ionicons name="layers-outline" size={15} color={GOLD} />
                    <AppText style={s.buyerMeta}>
                      {category || "Equipment category"}
                      {condition ? `  ·  ${condition}` : ""}
                    </AppText>
                  </View>
                </View>
              </View>
              <AppText style={s.previewDetailHeading}>
                FULL LISTING DETAILS
              </AppText>
              <AppText style={s.previewPrice}>{money}</AppText>
              <AppText style={s.previewTitle}>{title}</AppText>
              <AppText style={s.previewMeta}>
                {category} · {condition}
              </AppText>
              <AppText style={s.previewMeta}>
                <Ionicons name="location-outline" color={GOLD} />{" "}
                {location || "Location not added"}
                {delivery ? `  ·  ${delivery}` : ""}
              </AppText>
              {Object.entries(specs).filter(([_, value]) => value.trim())
                .length > 0 && (
                <AppText style={s.previewMeta}>
                  {Object.entries(specs)
                    .filter(([_, value]) => value.trim())
                    .map(([key, value]) => `${key}: ${value}`)
                    .join("  ·  ")}
                </AppText>
              )}
              <View style={s.divider} />
              <AppText style={s.previewDescription}>
                {description || "Your description will appear here."}
              </AppText>
              {workingCondition.trim() ? (
                <AppText style={s.previewMeta}>
                  Working condition: {workingCondition}
                </AppText>
              ) : null}
              {knownFaults.trim() ? (
                <AppText style={s.previewMeta}>
                  Faults or damage: {knownFaults}
                </AppText>
              ) : null}
              {serviceHistory.trim() ? (
                <AppText style={s.previewMeta}>
                  Service history: {serviceHistory}
                </AppText>
              ) : null}
              {reasonForSale.trim() ? (
                <AppText style={s.previewMeta}>
                  Reason for selling: {reasonForSale}
                </AppText>
              ) : null}
              {paperwork ? (
                <AppText style={s.previewMeta}>
                  ✓ Do you have manuals or service paperwork?
                </AppText>
              ) : null}
              <View style={s.draftNotice}>
                <Ionicons
                  name="shield-checkmark-outline"
                  size={21}
                  color={GOLD}
                />
                <AppText style={s.note}>
                  Help buyers decide with clear photos, an accurate description
                  and any known faults. Your form autosaves on this device. Use
                  SAVE LISTING & PHOTOS ONLINE to save the private draft and
                  upload your selected photographs. Manage uploaded photos from
                  My Listings. Local previews are separate from confirmed online
                  photos. Only PUBLISH MY FREE LISTING makes your saved online
                  listing public. Selected photo links may need reselecting if
                  the device clears temporary files.
                </AppText>
              </View>
            </Panel>
            <View style={s.saveRow}>
              <Ionicons name="lock-closed-outline" size={16} color={PALE} />
              <AppText style={s.saveStatus}>
                {draftStatus === "loading"
                  ? "RESTORING DRAFT"
                  : draftStatus === "saving"
                    ? "SAVING ON THIS DEVICE…"
                    : draftStatus === "error"
                      ? "DRAFT SAVE FAILED — RETRY BELOW"
                      : "DRAFT SAVED ON THIS DEVICE"}
              </AppText>
            </View>
            <GoldButton
              secondary
              label="SAVE DRAFT ON THIS DEVICE"
              icon="save-outline"
              onPress={() => void saveDraftNow()}
            />
            <GoldButton
              secondary
              label="START FRESH — NEW LISTING"
              icon="add-circle-outline"
              onPress={startFresh}
            />
            <GoldButton
              label={
                onlineSaving
                  ? "SAVING LISTING…"
                  : photoUploading
                    ? "UPLOADING PHOTOS…"
                    : "SAVE LISTING & PHOTOS ONLINE"
              }
              icon="cloud-upload-outline"
              onPress={() => void saveListingAndPhotos()}
            />
            <GoldButton
              label="CHECK MY LISTING"
              icon="checkmark-circle-outline"
              onPress={preview}
            />
            <GoldButton
              label={
                publishing ? "PUBLISHING LISTING…" : "PUBLISH MY FREE LISTING"
              }
              icon="rocket-outline"
              onPress={publishListing}
            />
            <GoldButton
              secondary
              label="BACK TO MARKETPLACE"
              onPress={goBack}
            />
            <AppText style={s.footer}>
              THE TRADER'S EXCHANGE · SAVE LISTING AND PHOTOS BEFORE PUBLISHING
            </AppText>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </MapTextureBackground>
  );
}
const s = StyleSheet.create({
  featuredPanel: { shadowOpacity: 0.3, shadowRadius: 18, elevation: 6 },
  pressedTile: { transform: [{ scale: 0.975 }], opacity: 0.9 },
  readyBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E6BE67",
    backgroundColor: "#273120",
    paddingVertical: 12,
    paddingHorizontal: 9,
    marginBottom: 12,
  },
  readyText: {
    fontFamily: typography.label,
    color: PALE,
    fontSize: 10,
    letterSpacing: 0.8,
    fontWeight: "800",
  },
  saveRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 12,
  },
  saveStatus: {
    fontFamily: typography.label,
    fontSize: 10,
    letterSpacing: 0.6,
    color: MUTED,
  },
  buyerCard: {
    borderWidth: 1,
    borderColor: "#D9A83E",
    backgroundColor: "#0A1C2A",
    borderRadius: 18,
    overflow: "hidden",
  },
  previewPlaceholder: {
    height: 190,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    backgroundColor: "#102B3A",
  },
  placeholderText: {
    fontFamily: typography.label,
    color: MUTED,
    letterSpacing: 1.3,
    fontSize: 11,
  },
  previewImageShade: {
    height: 74,
    marginTop: -74,
    justifyContent: "flex-end",
    padding: 12,
  },
  previewBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 20,
    backgroundColor: "rgba(5,17,27,.88)",
    borderWidth: 1,
    borderColor: "#B88B35",
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  previewBadgeText: {
    fontFamily: typography.label,
    color: PALE,
    fontSize: 9,
    letterSpacing: 0.8,
  },
  buyerCardCopy: { padding: 16, gap: 8 },
  buyerEyebrow: {
    fontFamily: typography.label,
    color: GOLD,
    fontSize: 10,
    letterSpacing: 1.3,
  },
  buyerTitle: { fontFamily: typography.heading, color: "#FFF", fontSize: 23 },
  buyerPrice: { fontFamily: typography.heading, color: PALE, fontSize: 29 },
  buyerMetaRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  buyerMeta: { fontFamily: typography.body, color: MUTED, fontSize: 13 },
  previewDetailHeading: {
    fontFamily: typography.label,
    color: PALE,
    fontSize: 11,
    letterSpacing: 1.4,
    marginTop: 20,
  },
  suggestions: {
    marginTop: 7,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "#A56B18",
    backgroundColor: "#102735",
    overflow: "hidden",
  },

  suggestionRow: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#39505B",
  },

  suggestionText: {
    fontFamily: typography.body,
    color: "#F2F0E8",
    fontSize: 14,
    flex: 1,
  },

  specGrid: { gap: 12 },
  specField: { gap: 7 },
  specLabel: {
    fontFamily: typography.label,
    color: MUTED,
    fontSize: 11,
    letterSpacing: 0.8,
  },
  priceCompact: {
    marginTop: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 13,
    backgroundColor: "#172C3B",
    borderRadius: 12,
  },
  priceCompactText: {
    fontFamily: typography.heading,
    color: PALE,
    fontSize: 23,
  },
  expandRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  expandTitle: { flexDirection: "row", alignItems: "center", gap: 9 },
  extraContent: { marginTop: 16, gap: 10 },
  smallMultiline: { minHeight: 86, paddingTop: 12 },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 9,
  },
  inlineDivider: { height: 1, backgroundColor: "#38505C", marginVertical: 17 },

  progressHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginTop: 18,
  },
  progressCount: {
    fontFamily: typography.label,
    color: PALE,
    fontSize: 9,
    letterSpacing: 0.4,
  },
  progressTrack: {
    height: 4,
    borderRadius: 4,
    backgroundColor: "#263A48",
    overflow: "hidden",
    marginBottom: 12,
  },
  progressFill: { height: "100%", backgroundColor: PALE },
  photoActions: {
    position: "absolute",
    bottom: 5,
    left: 5,
    flexDirection: "row",
    gap: 6,
    padding: 2,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,.7)",
  },

  flex: { flex: 1 },
  root: { flex: 1, backgroundColor: INK },
  hero: { minHeight: 375 },
  heroImage: { opacity: 0.96 },
  heroShade: { flex: 1, justifyContent: "space-between" },
  topRow: {
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  backCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(2,12,23,.75)",
    borderColor: GOLD,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  brand: {
    fontFamily: typography.label,
    flex: 1,
    color: PALE,
    fontWeight: "800",
    letterSpacing: 1.1,
    fontSize: 11,
  },
  heroCopy: { paddingHorizontal: 24, paddingBottom: 21, paddingTop: 62 },
  eyebrow: {
    fontFamily: typography.label,
    color: PALE,
    fontSize: 10,
    letterSpacing: 1.8,
    fontWeight: "800",
    marginBottom: 13,
  },
  heroTitle: {
    fontFamily: typography.heading,
    fontSize: 42,
    lineHeight: 46,
    color: "#FFFFFF",
    fontWeight: "900",
    letterSpacing: -1.3,
    textShadowColor: "#000",
    textShadowRadius: 12,
  },
  heroGold: {
    fontFamily: typography.heading,
    color: PALE,
    textShadowColor: "#C78B24",
    textShadowRadius: 10,
  },
  shortRule: {
    width: 68,
    height: 4,
    backgroundColor: PALE,
    borderRadius: 4,
    marginVertical: 16,
  },
  heroSubtitle: {
    fontFamily: typography.subtitle,
    color: "#FFFFFF",
    fontSize: 21,
    fontWeight: "700",
    marginBottom: 7,
  },
  heroBody: {
    fontFamily: typography.body,
    color: "#DFE6EA",
    fontSize: 15,
    lineHeight: 23,
    maxWidth: 330,
  },
  content: { paddingHorizontal: 16 },
  steps: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: -3,
    marginBottom: 19,
    paddingTop: 11,
    borderTopWidth: 1,
    borderTopColor: GOLD,
  },
  stepItem: { alignItems: "center", width: "20%" },
  stepCircle: {
    width: 37,
    height: 37,
    borderRadius: 20,
    backgroundColor: "#0B1B28",
    borderColor: GOLD,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  stepActive: {
    backgroundColor: GOLD,
    shadowColor: GOLD,
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 6,
  },
  stepDone: { backgroundColor: PALE },
  stepNumber: {
    fontFamily: typography.label,
    color: PALE,
    fontWeight: "800",
    fontSize: 16,
  },
  stepText: {
    fontFamily: typography.body,
    color: MUTED,
    fontSize: 10,
    marginTop: 8,
    fontWeight: "600",
  },
  intro: { marginBottom: 12, paddingHorizontal: 4 },
  sectionKicker: {
    fontFamily: typography.label,
    color: GOLD,
    letterSpacing: 2.2,
    fontSize: 11,
    fontWeight: "800",
    marginBottom: 10,
  },
  sectionTitle: {
    fontFamily: typography.heading,
    color: "#FFF",
    fontSize: 31,
    fontWeight: "900",
    letterSpacing: -0.8,
    marginBottom: 8,
  },
  sectionBody: {
    fontFamily: typography.body,
    color: MUTED,
    fontSize: 15,
    lineHeight: 23,
  },
  panel: {
    borderRadius: 24,
    marginBottom: 10,
    shadowColor: "#D89A27",
    shadowOpacity: 0.12,
    shadowRadius: 11,
    elevation: 3,
  },
  panelInner: {
    borderRadius: 21,
    backgroundColor: PANEL,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(255,230,160,.15)",
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 10,
  },
  label: {
    fontFamily: typography.label,
    color: PALE,
    fontWeight: "800",
    fontSize: 13,
    letterSpacing: 0.9,
    flexShrink: 1,
  },
  hint: {
    fontFamily: typography.body,
    color: MUTED,
    fontSize: 11,
    textAlign: "right",
    flexShrink: 1,
  },
  categoryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  category: {
    width: "47.8%",
    minHeight: 80,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#A56B18",
    backgroundColor: "#071826",
    alignItems: "center",
    justifyContent: "center",
    padding: 10,
    gap: 9,
  },
  selected: {
    borderColor: PALE,
    backgroundColor: "#27301E",
    shadowColor: GOLD,
    shadowOpacity: 0.65,
    shadowRadius: 9,
    elevation: 5,
  },
  categoryText: {
    fontFamily: typography.bodyBold,
    color: "#DCE4E8",
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
  },
  input: {
    minHeight: 51,
    borderWidth: 1,
    borderColor: "#956817",
    backgroundColor: "#0C2130",
    borderRadius: 15,
    color: "#FFF",
    paddingHorizontal: 16,
    fontSize: 16,
  },
  pills: { flexDirection: "row", flexWrap: "wrap", gap: 9 },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 13,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#A56B18",
    backgroundColor: "#0C2130",
  },
  pillText: { fontFamily: typography.body, color: "#E6EBEE", fontSize: 13 },
  photoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  photoSlot: {
    width: "30%",
    aspectRatio: 0.85,
    borderRadius: 13,
    overflow: "hidden",
  },
  photo: { width: "100%", height: "100%" },
  removePhoto: {
    position: "absolute",
    top: 5,
    right: 5,
    backgroundColor: "rgba(0,0,0,.75)",
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  addPhoto: {
    width: "30%",
    aspectRatio: 0.85,
    borderRadius: 13,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: GOLD,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  addPhotoText: { fontFamily: typography.body, color: PALE, fontSize: 12 },
  note: {
    fontFamily: typography.body,
    color: MUTED,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 12,
    flex: 1,
  },
  priceBox: {
    marginTop: 14,
    padding: 17,
    backgroundColor: "#172C3B",
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#526574",
  },
  mini: {
    fontFamily: typography.label,
    color: MUTED,
    letterSpacing: 1.2,
    fontSize: 11,
    fontWeight: "700",
  },
  priceText: {
    fontFamily: typography.heading,
    color: PALE,
    fontSize: 31,
    fontWeight: "900",
    marginTop: 6,
  },
  description: { minHeight: 125, paddingTop: 15 },
  counter: {
    fontFamily: typography.body,
    color: MUTED,
    textAlign: "right",
    marginTop: 8,
    fontSize: 11,
  },
  locationNote: { flexDirection: "row", alignItems: "center", gap: 10 },
  previewPhoto: { width: "100%", height: 220 },
  previewPrice: {
    fontFamily: typography.heading,
    color: PALE,
    fontSize: 32,
    fontWeight: "900",
    marginTop: 15,
  },
  previewTitle: {
    fontFamily: typography.title,
    color: "#FFF",
    fontSize: 24,
    fontWeight: "800",
    marginTop: 5,
  },
  previewMeta: {
    fontFamily: typography.body,
    color: MUTED,
    fontSize: 14,
    marginTop: 8,
  },
  divider: { height: 1, backgroundColor: "#38505C", marginVertical: 18 },
  previewDescription: {
    fontFamily: typography.body,
    color: "#DDE5EA",
    fontSize: 15,
    lineHeight: 24,
  },
  draftNotice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 16,
    padding: 12,
    backgroundColor: "#172C3B",
    borderRadius: 13,
  },
  buttonOuter: {
    borderRadius: 19,
    overflow: "hidden",
    marginTop: 12,
    borderWidth: 1.5,
    borderColor: PALE,
    shadowColor: GOLD,
    shadowOpacity: 0.35,
    shadowRadius: 9,
    elevation: 4,
  },
  button: {
    minHeight: 62,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 13,
    paddingHorizontal: 15,
  },
  buttonText: {
    fontFamily: typography.button,
    color: INK,
    fontWeight: "900",
    letterSpacing: 0.8,
    fontSize: 15,
  },
  secondaryOuter: {
    borderColor: "#A97A29",
    backgroundColor: "#0A1A25",
    shadowOpacity: 0,
  },
  secondaryButton: {
    minHeight: 56,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 11,
  },
  secondaryText: {
    fontFamily: typography.button,
    color: PALE,
    fontWeight: "700",
    fontSize: 14,
  },
  footer: {
    fontFamily: typography.label,
    textAlign: "center",
    marginTop: 20,
    fontSize: 9,
    color: "#718796",
    letterSpacing: 1.1,
  },
});
