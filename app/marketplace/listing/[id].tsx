import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
    Alert,
    Animated,
    Easing,
    Image,
    NativeScrollEvent,
    NativeSyntheticEvent,
    Pressable,
    ScrollView,
    StatusBar,
    StyleSheet,
    useWindowDimensions,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import AppText from "../../../components/AppText";
import MapTextureBackground from "../../../components/MapTextureBackground";
import MetallicFrame from "../../../components/MetallicFrame";

type DemoListing = {
  id: string;
  title: string;
  price: string;
  location: string;
  category: string;
  condition: string;
  photos: string[];
  description: string;
  specs: { label: string; value: string }[];
  delivery?: string;
  serviceHistory?: string;
  reasonForSale?: string;
  paperwork?: boolean;
  workingCondition?: string;
  knownFaults?: string;
  isDraft?: boolean;
};

const DRAFT_KEY = "bitebeacon:marketplace:sell-draft:v1";
const hasText = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

// The Seller Studio draft uses these exact keys. Draft preview stays on this
// device and is never mistaken for a published listing.
function parseSellerDraft(raw: string): DemoListing | null {
  try {
    const data: Record<string, unknown> = JSON.parse(raw);
    if (!data || typeof data !== "object" || Array.isArray(data)) return null;
    const specValues = data.specs && typeof data.specs === "object" &&
      !Array.isArray(data.specs) ? data.specs as Record<string, unknown> : {};
    const specs = Object.entries(specValues)
      .filter((entry): entry is [string, string] => hasText(entry[1]))
      .map(([label, value]) => ({ label, value: value.trim() }));
    const photos = Array.isArray(data.photos)
      ? data.photos.filter(hasText).slice(0, 5) : [];
    return {
      id: "draft",
      title: hasText(data.title) ? data.title.trim() : "Untitled equipment",
      price: hasText(data.price) && Number.isFinite(Number(data.price.replace(/[,£]/g, "")))
        ? `£${Number(data.price.replace(/[,£]/g, "")).toLocaleString("en-GB")}`
        : "Price not entered",
      category: hasText(data.category) ? data.category.trim() : "Equipment",
      condition: hasText(data.condition) ? data.condition.trim() : "Not specified",
      location: hasText(data.location) ? data.location.trim() : "Location not entered",
      photos,
      description: hasText(data.description) ? data.description.trim() : "No description added yet.",
      specs,
      delivery: hasText(data.delivery) ? data.delivery.trim() : undefined,
      serviceHistory: hasText(data.serviceHistory) ? data.serviceHistory.trim() : undefined,
      reasonForSale: hasText(data.reasonForSale) ? data.reasonForSale.trim() : undefined,
      paperwork: data.paperwork === true,
      workingCondition: hasText(data.workingCondition) ? data.workingCondition.trim() : undefined,
      knownFaults: hasText(data.knownFaults) ? data.knownFaults.trim() : undefined,
      isDraft: true,
    };
  } catch {
    return null;
  }
}


// These are the same five illustrative items used on the Marketplace landing page.
// No real sellers, transactions, messages, or database reads are involved.
const DEMO_LISTINGS: DemoListing[] = [
  {
    id: "1",
    title: "Professional mobile catering trailer",
    price: "£12,950",
    location: "Bristol",
    category: "Vans & Trailers",
    condition: "Ready to trade",
    photos: [
      "https://images.unsplash.com/photo-1565123409695-7b5ef63a2efb?w=1200&q=85",
    ],
    description:
      "Illustrative catering setup. Ask for an equipment inventory, current photographs, dimensions and service history before arranging a viewing.",
    specs: [
      { label: "Type", value: "Mobile catering" },
      { label: "Condition", value: "Ready to trade" },
      { label: "Location", value: "Bristol area" },
    ],
  },
  {
    id: "2",
    title: "Stainless steel commercial kitchen",
    price: "£2,450",
    location: "Manchester",
    category: "Cooking",
    condition: "Excellent condition",
    photos: [
      "https://images.unsplash.com/photo-1556911220-bff31c812dba?w=1200&q=85",
      "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=1200&q=85",
    ],
    description:
      "Illustrative commercial kitchen equipment. Ask for measurements, power requirements, manufacturer details and servicing records.",
    specs: [
      { label: "Category", value: "Cooking" },
      { label: "Condition", value: "Excellent" },
      { label: "Location", value: "Manchester area" },
    ],
  },
  {
    id: "3",
    title: "Heavy-duty catering generator",
    price: "£1,100",
    location: "Birmingham",
    category: "Power",
    condition: "Used · tested",
    photos: [
      "https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=1200&q=85",
    ],
    description:
      "Illustrative power equipment. Confirm generator output, fuel type, running hours, noise rating and maintenance with the seller.",
    specs: [
      { label: "Category", value: "Power" },
      { label: "Condition", value: "Used · tested" },
      { label: "Location", value: "Birmingham area" },
    ],
  },
  {
    id: "4",
    title: "Commercial refrigeration setup",
    price: "£1,875",
    location: "Cardiff",
    category: "Refrigeration",
    condition: "Very good",
    photos: [
      "https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?w=1200&q=85",
    ],
    description:
      "Illustrative commercial cooling equipment. Confirm operating temperatures, dimensions, power supply and servicing records.",
    specs: [
      { label: "Category", value: "Refrigeration" },
      { label: "Condition", value: "Very good" },
      { label: "Location", value: "Cardiff area" },
    ],
  },
  {
    id: "5",
    title: "Fully equipped food truck",
    price: "£24,500",
    location: "Leeds",
    category: "Vans & Trailers",
    condition: "Ready to trade",
    photos: [
      "https://images.unsplash.com/photo-1565123409695-7b5ef63a2efb?w=1200&q=85",
    ],
    description:
      "Illustrative mobile food business. Request a current photo gallery, full equipment inventory, vehicle documents and inspection before buying.",
    specs: [
      { label: "Type", value: "Food truck" },
      { label: "Condition", value: "Ready to trade" },
      { label: "Location", value: "Leeds area" },
    ],
  },
];

const NAVY = "#07131F";
const GOLD = "#FFE29A";
const BRIGHT_GOLD = "#FFD05C";
const MUTED = "#A8B4BF";

// Decorative section heading only. Listing data and interactions are unchanged.
function SectionHeading({
  number,
  kicker,
  title,
}: {
  number: string;
  kicker: string;
  title: string;
}) {
  return (
    <View style={styles.sectionHeading}>
      <View style={styles.sectionNumber}>
        <AppText variant="label" style={styles.sectionNumberText}>
          {number}
        </AppText>
      </View>
      <View style={styles.sectionHeadingCopy}>
        <AppText variant="label" style={styles.sectionKicker}>
          {kicker}
        </AppText>
        <AppText variant="heading" style={styles.sectionTitle}>
          {title}
        </AppText>
      </View>
      <View style={styles.sectionRule} />
    </View>
  );
}

export default function MarketplaceListingDetails() {
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const insets = useSafeAreaInsets();
  const listingId = Array.isArray(id) ? id[0] : id;
  const [draft, setDraft] = useState<DemoListing | null>(null);
  const [draftLoading, setDraftLoading] = useState(listingId === "draft");
  const { width: windowWidth } = useWindowDimensions();
  const galleryWidth = Math.max(240, windowWidth - 36);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [saved, setSaved] = useState(false);
  const galleryRef = useRef<ScrollView>(null);
  const reveal = useRef(new Animated.Value(0)).current;
  const photoReveal = useRef(new Animated.Value(0)).current;
  const heartScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    reveal.setValue(0);
    Animated.timing(reveal, {
      toValue: 1,
      duration: 550,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [listingId, reveal]);

  useEffect(() => {
    photoReveal.setValue(0);
    Animated.timing(photoReveal, {
      toValue: 1,
      duration: 320,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [photoIndex, listingId, photoReveal]);

  const toggleSaved = () => {
    setSaved((value) => !value);
    Animated.sequence([
      Animated.timing(heartScale, {
        toValue: 1.18,
        duration: 130,
        useNativeDriver: true,
      }),
      Animated.spring(heartScale, {
        toValue: 1,
        friction: 5,
        tension: 110,
        useNativeDriver: true,
      }),
    ]).start();
  };
  const listing = listingId === "draft"
    ? draft
    : DEMO_LISTINGS.find((item) => item.id === listingId);

  useEffect(() => {
    let active = true;
    if (listingId !== "draft") return;
    AsyncStorage.getItem(DRAFT_KEY)
      .then((raw) => { if (active) setDraft(raw ? parseSellerDraft(raw) : null); })
      .catch(() => { if (active) setDraft(null); })
      .finally(() => { if (active) setDraftLoading(false); });
    return () => { active = false; };
  }, [listingId]);

  useEffect(() => {
    setPhotoIndex(0);
    setSaved(false);
  }, [listingId]);

  const selectPhoto = (index: number) => {
    setPhotoIndex(index);
    galleryRef.current?.scrollTo({ x: index * galleryWidth, animated: true });
  };
  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(tabs)/marketplace");
    }
  };

  if (!listing) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top + 22 }]}>
        <StatusBar barStyle="light-content" backgroundColor={NAVY} />
        <Pressable onPress={goBack} style={styles.backRow}>
          <Ionicons name="arrow-back" size={22} color={GOLD} />
          <AppText variant="bodyBold" style={styles.backText}>
            BACK TO THE EXCHANGE
          </AppText>
        </Pressable>
        <View style={styles.missing}>
          <Ionicons name="search-outline" size={42} color={GOLD} />
          <AppText variant="heading" style={styles.missingTitle}>
            Listing not found
          </AppText>
          <AppText variant="body" style={styles.mutedCenter}>
            {draftLoading ? "Loading your saved draft…" : listingId === "draft" ? "No saved Seller Studio draft was found on this device." : "This listing is unavailable. Try one of the five sample listing IDs."}
          </AppText>
        </View>
      </View>
    );
  }

  const photos = listing.photos;
  const information = [
    ...listing.specs,
    ...(listing.delivery ? [{ label: "Collection / delivery", value: listing.delivery }] : []),
  ];
  const disclosures = [
    ...(listing.workingCondition ? [{ label: "Working condition", value: listing.workingCondition }] : []),
    ...(listing.knownFaults ? [{ label: "Known faults / damage", value: listing.knownFaults }] : []),
    ...(listing.serviceHistory ? [{ label: "Service history", value: listing.serviceHistory }] : []),
    ...(listing.reasonForSale ? [{ label: "Reason for sale", value: listing.reasonForSale }] : []),
    ...(listing.paperwork ? [{ label: "Paperwork", value: "Seller indicates paperwork is available" }] : []),
  ];

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={NAVY} />
      <MapTextureBackground>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingTop: insets.top + 16,
            paddingBottom: Math.max(insets.bottom, 20) + 35,
          }}
        >
          <View style={styles.topRow}>
            <Pressable
              onPress={goBack}
              style={styles.backRow}
              accessibilityRole="button"
              accessibilityLabel="Back to Marketplace"
            >
              <Ionicons name="arrow-back" size={21} color={GOLD} />
              <AppText variant="label" style={styles.backText}>
                THE TRADER'S EXCHANGE
              </AppText>
            </Pressable>
            <View style={styles.demoPill}>
              <AppText variant="label" style={styles.demoPillText}>
                {listing.isDraft ? "PRIVATE DRAFT" : "DEMO LISTING"}
              </AppText>
            </View>
          </View>

          <Animated.View
            style={{
              opacity: reveal,
              transform: [{ translateY: reveal.interpolate({
                inputRange: [0, 1],
                outputRange: [14, 0],
              }) }],
            }}
          >
          <MetallicFrame
            tone="gold"
            borderRadius={23}
            borderWidth={2}
            style={styles.galleryFrame}
            contentStyle={styles.galleryInner}
          >
            <View style={[styles.photoArea, { height: Math.round(galleryWidth * 0.72) }]}>
              {photos.length > 0 ? (
                <ScrollView
                  ref={galleryRef}
                  horizontal
                  pagingEnabled
                  nestedScrollEnabled
                  showsHorizontalScrollIndicator={false}
                  onMomentumScrollEnd={(event: NativeSyntheticEvent<NativeScrollEvent>) => {
                    const index = Math.round(event.nativeEvent.contentOffset.x / galleryWidth);
                    setPhotoIndex(Math.max(0, Math.min(photos.length - 1, index)));
                  }}
                >
                  {photos.map((uri, index) => (
                    <Animated.Image
                      key={`${uri}-${index}`}
                      source={{ uri }}
                      resizeMode="cover"
                      style={{
                        width: galleryWidth,
                        height: Math.round(galleryWidth * 0.72),
                        opacity: index === photoIndex ? photoReveal : 1,
                      }}
                    />
                  ))}
                </ScrollView>
              ) : (
                <View style={styles.photoPlaceholder}>
                  <Ionicons name="images-outline" size={43} color={GOLD} />
                  <AppText variant="body" style={styles.metaText}>No photos added yet</AppText>
                </View>
              )}
              <View pointerEvents="box-none" style={styles.photoTopRowOverlay}>
                <View style={styles.counterPill}>
                  <Ionicons name="images-outline" size={15} color={GOLD} />
                  <AppText variant="label" style={styles.counterText}>
                    {photos.length ? photoIndex + 1 : 0} / {photos.length}
                  </AppText>
                </View>
                <Pressable
                  onPress={toggleSaved}
                  style={styles.heartButton}
                  accessibilityRole="button"
                  accessibilityLabel={saved ? "Remove from saved demos" : "Save for this preview"}
                >
                  <Animated.View style={{ transform: [{ scale: heartScale }] }}>
                    <Ionicons
                      name={saved ? "heart" : "heart-outline"}
                      size={22}
                      color={GOLD}
                    />
                  </Animated.View>
                </Pressable>
              </View>
              {photos.length > 1 && (
                <View pointerEvents="box-none" style={styles.photoArrows}>
                  <Pressable
                    onPress={() => selectPhoto((photoIndex - 1 + photos.length) % photos.length)}
                    style={styles.arrowButton}
                    accessibilityLabel="Previous photo"
                  >
                    <Ionicons name="chevron-back" size={24} color={GOLD} />
                  </Pressable>
                  <Pressable
                    onPress={() => selectPhoto((photoIndex + 1) % photos.length)}
                    style={styles.arrowButton}
                    accessibilityLabel="Next photo"
                  >
                    <Ionicons name="chevron-forward" size={24} color={GOLD} />
                  </Pressable>
                </View>
              )}
              <View pointerEvents="none" style={styles.photoNoticeOverlay}>
                <AppText variant="label" style={styles.photoNoticeText}>
                  {listing.isDraft ? "PRIVATE PREVIEW · NOT PUBLISHED" : "ILLUSTRATIVE PHOTO · NOT AN ACTUAL ITEM FOR SALE"}
                </AppText>
              </View>
            </View>
          </MetallicFrame>
          </Animated.View>

          {photos.length > 1 ? (
            <View style={styles.thumbnails}>
              {photos.map((uri, index) => (
                <Pressable
                  key={`${listing.id}-${index}`}
                  onPress={() => selectPhoto(index)}
                  style={[styles.thumbFrame, photoIndex === index && styles.thumbSelected]}
                  accessibilityLabel={`View photo ${index + 1}`}
                >
                  <Image source={{ uri }} style={styles.thumbPhoto} />
                </Pressable>
              ))}
            </View>
          ) : null}

          <Animated.View
            style={[
              styles.content,
              {
                opacity: reveal,
                transform: [{ translateY: reveal.interpolate({
                  inputRange: [0, 1],
                  outputRange: [20, 0],
                }) }],
              },
            ]}
          >
            <View style={styles.categoryRow}>
              <View style={styles.categoryLine} />
              <AppText variant="label" style={styles.eyebrow}>
                {listing.category.toUpperCase()} / THE TRADER'S EXCHANGE
              </AppText>
            </View>
            <AppText variant="heading" style={styles.title}>
              {listing.title}
            </AppText>
            <View style={styles.metaRow}>
              <Ionicons name="location-outline" size={17} color={GOLD} />
              <AppText variant="body" style={styles.metaText}>
                {listing.isDraft ? listing.location : `${listing.location} area`}
              </AppText>
              <View style={styles.metaDot} />
              <AppText variant="body" style={styles.metaText}>
                {listing.condition}
              </AppText>
            </View>
            <MetallicFrame
              tone="gold"
              borderRadius={17}
              borderWidth={2}
              style={styles.priceFrame}
              contentStyle={styles.priceInner}
            >
              <View style={styles.priceCopy}>
                <AppText variant="label" style={styles.priceLabel}>
                  ASKING PRICE
                </AppText>
                <AppText variant="heading" style={styles.price}>
                  {listing.price}
                </AppText>
              </View>
              <View style={styles.priceIconRing}>
                <Ionicons name="pricetag-outline" size={25} color={GOLD} />
              </View>
            </MetallicFrame>

            <SectionHeading
              number="01"
              kicker="THE ESSENTIALS"
              title="At a glance"
            />
            <View style={styles.specGrid}>
              {information.map((spec) => (
                <View key={spec.label} style={styles.specCard}>
                  <AppText variant="label" style={styles.specLabel}>
                    {spec.label.toUpperCase()}
                  </AppText>
                  <AppText variant="bodyBold" style={styles.specValue}>
                    {spec.value}
                  </AppText>
                </View>
              ))}
            </View>

            {disclosures.length > 0 && (
              <>
                <SectionHeading
                  number="02"
                  kicker="BEHIND THE EQUIPMENT"
                  title="History & disclosures"
                />
                <View style={styles.disclosureList}>
                  {disclosures.map((item) => (
                    <View key={item.label} style={styles.disclosureRow}>
                      <AppText variant="label" style={styles.specLabel}>
                        {item.label.toUpperCase()}
                      </AppText>
                      <AppText variant="body" style={styles.disclosureValue}>
                        {item.value}
                      </AppText>
                    </View>
                  ))}
                </View>
              </>
            )}

            <SectionHeading
              number={disclosures.length > 0 ? "03" : "02"}
              kicker="IN THE SELLER'S WORDS"
              title="The full story"
            />
            <View style={styles.descriptionCard}>
              <View style={styles.descriptionHeader}>
                <Ionicons name="document-text-outline" size={20} color={GOLD} />
                <AppText variant="label" style={styles.descriptionLabel}>
                  SELLER'S DESCRIPTION
                </AppText>
              </View>
              <AppText variant="body" style={styles.description}>
                {listing.description}
              </AppText>
            </View>

            <SectionHeading
              number={disclosures.length > 0 ? "04" : "03"}
              kicker="THE NEXT STEP"
              title="Make a connection"
            />

            <MetallicFrame
              tone="gold"
              borderRadius={17}
              borderWidth={1}
              style={styles.sellerFrame}
              contentStyle={styles.sellerInner}
            >
              <Ionicons name="person-circle-outline" size={38} color={GOLD} />
              <View style={styles.sellerText}>
                <AppText variant="title" style={styles.sellerHeading}>
                  Seller profile coming soon
                </AppText>
                <AppText variant="body" style={styles.sellerDescription}>
                  Seller identities and messaging will appear when the secure Marketplace backend is connected.
                </AppText>
              </View>
              <Ionicons name="shield-outline" size={21} color={GOLD} />
            </MetallicFrame>

            <Pressable
              onPress={() =>
                Alert.alert(
                  "Design preview",
                  "Messaging isn't available yet. This is an example listing, not an item for sale."
                )
              }
              accessibilityRole="button"
              style={styles.contactButton}
            >
              <LinearGradient
                colors={["#FFF6CE", "#FFE29A", "#F8BD4C"]}
                style={styles.contactGradient}
              >
                <Ionicons name="chatbubble-ellipses-outline" size={20} color={NAVY} />
                <AppText variant="label" style={styles.contactText}>
                  MESSAGE SELLER · COMING SOON
                </AppText>
                <Ionicons name="arrow-forward" size={19} color={NAVY} />
              </LinearGradient>
            </Pressable>
            <AppText variant="body" style={styles.disclaimer}>
              {listing.isDraft ? "PRIVATE LOCAL DRAFT · NOT SUBMITTED OR PUBLISHED" : "DESIGN PREVIEW · EXAMPLE EQUIPMENT ONLY · NO LIVE SALES"}
            </AppText>
          </Animated.View>
        </ScrollView>
      </MapTextureBackground>
      <View
        pointerEvents="none"
        style={[styles.statusBarScrim, { height: insets.top }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: NAVY },
  statusBarScrim: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: NAVY,
  },
  topRow: {
    paddingHorizontal: 20,
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  backRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  backText: { color: GOLD, fontSize: 10, letterSpacing: 1 },
  demoPill: {
    borderWidth: 1,
    borderColor: BRIGHT_GOLD,
    borderRadius: 18,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  demoPillText: { color: GOLD, fontSize: 8, letterSpacing: 1 },
  galleryFrame: {
    marginHorizontal: 16,
    shadowColor: BRIGHT_GOLD,
    shadowOpacity: 0.27,
    shadowRadius: 19,
    elevation: 4,
  },
  galleryInner: { borderRadius: 20, overflow: "hidden", backgroundColor: "#0D1D2A" },
  photoArea: { position: "relative", backgroundColor: "#0D1D2A" },
  photoPlaceholder: {
    flex: 1, alignItems: "center", justifyContent: "center", gap: 12,
  },
  photoTopRowOverlay: {
    position: "absolute", top: 0, left: 0, right: 0, padding: 13,
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
  },
  photoNoticeOverlay: {
    position: "absolute", bottom: 12, alignSelf: "center",
    paddingHorizontal: 10, paddingVertical: 7,
    borderRadius: 8, backgroundColor: "rgba(3,13,22,0.86)",
  },
  mainPhoto: { ...StyleSheet.absoluteFillObject, width: "100%", height: "100%" },
  photoTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 13,
  },
  counterPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#AA8546",
    backgroundColor: "rgba(3,13,22,0.84)",
  },
  counterText: { color: GOLD, fontSize: 10 },
  heartButton: {
    height: 40,
    width: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#AA8546",
    backgroundColor: "rgba(3,13,22,0.84)",
    justifyContent: "center",
    alignItems: "center",
  },
  photoArrows: {
    position: "absolute",
    left: 12,
    right: 12,
    top: "43%",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  arrowButton: {
    width: 39,
    height: 39,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#AA8546",
    backgroundColor: "rgba(3,13,22,0.84)",
    justifyContent: "center",
    alignItems: "center",
  },
  photoNotice: {
    alignSelf: "center",
    marginBottom: 12,
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: "rgba(3,13,22,0.85)",
    borderRadius: 8,
  },
  photoNoticeText: { color: GOLD, fontSize: 8, letterSpacing: 0.5 },
  thumbnails: { flexDirection: "row", gap: 9, marginHorizontal: 18, marginTop: 13 },
  thumbFrame: {
    width: 67,
    height: 53,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "#66737B",
    overflow: "hidden",
  },
  thumbSelected: { borderColor: BRIGHT_GOLD, borderWidth: 2 },
  thumbPhoto: { width: "100%", height: "100%" },
  content: { paddingHorizontal: 19, paddingTop: 23 },
  eyebrow: { color: BRIGHT_GOLD, fontSize: 9, letterSpacing: 1.6, flexShrink: 1 },
  categoryRow: { flexDirection: "row", alignItems: "center", gap: 11 },
  categoryLine: { width: 30, height: 2, backgroundColor: GOLD },
  priceFrame: {
    marginTop: 24,
    shadowColor: BRIGHT_GOLD,
    shadowOpacity: 0.22,
    shadowRadius: 16,
  },
  priceInner: {
    backgroundColor: "#122635",
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 19,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  priceCopy: { flex: 1, paddingRight: 8 },
  priceIconRing: {
    width: 51,
    height: 51,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: "#AC8342",
    alignItems: "center",
    justifyContent: "center",
  },
  priceLabel: { color: BRIGHT_GOLD, fontSize: 10, letterSpacing: 1.5 },
  price: { color: GOLD, fontSize: 35, marginTop: 7 },
  title: { color: "#FFFFFF", fontSize: 28, lineHeight: 35, marginTop: 18 },
  metaRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 7, marginTop: 12 },
  metaText: { color: "#D3DCE0", fontSize: 12 },
  metaDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: BRIGHT_GOLD },
  divider: { height: 1, backgroundColor: "#334652", marginVertical: 24 },
  sectionLabel: { color: GOLD, fontSize: 10, letterSpacing: 1.5, marginBottom: 13 },
  sectionHeading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 34,
    marginBottom: 19,
  },
  sectionNumber: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#132A38",
    borderWidth: 1,
    borderColor: "#C18C39",
    alignItems: "center",
    justifyContent: "center",
  },
  sectionNumberText: { color: GOLD, fontSize: 11 },
  sectionHeadingCopy: { flexShrink: 1 },
  sectionKicker: { color: BRIGHT_GOLD, fontSize: 9, letterSpacing: 1.2 },
  sectionTitle: { color: "#FFFFFF", fontSize: 22, marginTop: 3 },
  sectionRule: { flex: 1, height: 1, backgroundColor: "#806539", marginLeft: 3 },
  specGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 28 },
  specCard: {
    width: "47%",
    flexGrow: 1,
    padding: 14,
    minHeight: 80,
    borderWidth: 1,
    borderColor: "#92733F",
    borderRadius: 13,
    backgroundColor: "#112432",
    borderTopColor: "#FFE29A",
    justifyContent: "center",
  },
  specLabel: { color: BRIGHT_GOLD, fontSize: 9, letterSpacing: 0.8 },
  specValue: { color: "#FFFFFF", fontSize: 13, marginTop: 6 },
  descriptionCard: {
    backgroundColor: "#112635",
    shadowColor: BRIGHT_GOLD,
    shadowOpacity: 0.09,
    shadowRadius: 10,
    borderWidth: 1,
    borderColor: "#A17A3E",
    borderRadius: 17,
    padding: 19,
  },
  descriptionHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14 },
  descriptionLabel: { color: GOLD, fontSize: 10, letterSpacing: 1.2 },
  description: { color: "#D3DCE0", fontSize: 14, lineHeight: 24 },
  disclosureList: { gap: 10, marginBottom: 28 },
  disclosureRow: {
    padding: 15, borderRadius: 13, backgroundColor: "#112432",
    borderWidth: 1, borderColor: "#92733F", borderLeftColor: "#E6B85F",
  },
  disclosureValue: { color: "#E3E9EC", fontSize: 13, lineHeight: 21, marginTop: 7 },
  sellerFrame: { marginTop: 0, shadowColor: BRIGHT_GOLD, shadowOpacity: 0.11, shadowRadius: 10 },
  sellerInner: {
    padding: 15,
    borderRadius: 15,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#132635",
  },
  sellerText: { flex: 1 },
  sellerHeading: { color: "#FFFFFF", fontSize: 13 },
  sellerDescription: { color: MUTED, fontSize: 11, lineHeight: 17, marginTop: 5 },
  contactButton: { marginTop: 25, borderRadius: 14, overflow: "hidden" },
  contactGradient: {
    paddingVertical: 17,
    paddingHorizontal: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  contactText: { color: NAVY, fontSize: 10, letterSpacing: 0.7, flex: 1 },
  disclaimer: { color: "#8A9AA5", textAlign: "center", fontSize: 9, marginTop: 18 },
  missing: { flex: 1, alignItems: "center", justifyContent: "center", padding: 25, gap: 15 },
  missingTitle: { color: "#FFFFFF", fontSize: 23 },
  mutedCenter: { color: MUTED, textAlign: "center", fontSize: 13 },
});
