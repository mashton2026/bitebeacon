import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
    Alert,
    Animated,
    Dimensions,
    Easing,
    Image,
    ImageBackground,
    Modal,
    Pressable,
    ScrollView,
    StatusBar,
    StyleSheet,
    TextInput,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AppText from "../../components/AppText";
import MapTextureBackground from "../../components/MapTextureBackground";
import MetallicFrame from "../../components/MetallicFrame";
import SectionGlowLine from "../../components/SectionGlowLine";
import { typography } from "../../constants/typography";

// Marketplace design preview. Listings are DEMO ONLY: no database, payments or messages.
const NAVY = "#07131F";
const GOLD = "#FFE6A1";
const GOLD_LIGHT = "#FFF5C9";
const GOLD_BRIGHT = "#FFD05C";
const GOLD_DARK = "#FFBE43";
const MUTED = "#A8B4BF";
const WIDTH = Dimensions.get("window").width;
const CARD_WIDTH = Math.min(WIDTH * 0.69, 292);

type Category = "All" | "Vans & Trailers" | "Cooking" | "Refrigeration" | "Power" | "Trading Gear";
type Listing = {
  id: string;
  title: string;
  price: string;
  place: string;
  category: Exclude<Category, "All">;
  condition: string;
  image: string;
  gallery: string[];
  specs: { label: string; value: string }[];
  badge?: string;
  description: string;
};

const CATEGORIES: { label: Category; icon: keyof typeof Ionicons.glyphMap }[] = [
  { label: "All", icon: "grid-outline" },
  { label: "Vans & Trailers", icon: "car-sport-outline" },
  { label: "Cooking", icon: "flame-outline" },
  { label: "Refrigeration", icon: "snow-outline" },
  { label: "Power", icon: "flash-outline" },
  { label: "Trading Gear", icon: "construct-outline" },
];

// Illustrative stock photography only. Photos are not of real items for sale.
const LISTINGS: Listing[] = [
  {
    id: "1", title: "Professional mobile catering trailer", price: "£12,950", place: "Bristol", category: "Vans & Trailers", condition: "Ready to trade",
    image: "https://images.unsplash.com/photo-1565123409695-7b5ef63a2efb?w=900&q=85",
    gallery: ["https://images.unsplash.com/photo-1565123409695-7b5ef63a2efb?w=900&q=85"],
    badge: "READY TO ROLL", description: "Illustrative catering setup. Ask for an equipment inventory, current photographs, dimensions and service history before arranging a viewing.",
    specs: [{label:"Type",value:"Mobile catering"},{label:"Condition",value:"Ready to trade"},{label:"Location",value:"Bristol area"}],
  },
  {
    id: "2", title: "Stainless steel commercial kitchen", price: "£2,450", place: "Manchester", category: "Cooking", condition: "Excellent condition",
    image: "https://images.unsplash.com/photo-1556911220-bff31c812dba?w=900&q=85",
    gallery: ["https://images.unsplash.com/photo-1556911220-bff31c812dba?w=900&q=85", "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=900&q=85"],
    badge: "JUST LISTED", description: "Illustrative commercial kitchen equipment. Ask for measurements, power requirements, manufacturer details and servicing records.",
    specs: [{label:"Category",value:"Cooking"},{label:"Condition",value:"Excellent"},{label:"Location",value:"Manchester area"}],
  },
  {
    id: "3", title: "Heavy-duty catering generator", price: "£1,100", place: "Birmingham", category: "Power", condition: "Used · tested",
    image: "https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=900&q=85",
    gallery: ["https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=900&q=85"],
    description: "Illustrative power equipment. Confirm generator output, fuel type, running hours, noise rating and maintenance with the seller.",
    specs: [{label:"Category",value:"Power"},{label:"Condition",value:"Used · tested"},{label:"Location",value:"Birmingham area"}],
  },
  {
    id: "4", title: "Commercial refrigeration setup", price: "£1,875", place: "Cardiff", category: "Refrigeration", condition: "Very good",
    image: "https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?w=900&q=85",
    gallery: ["https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?w=900&q=85"],
    description: "Illustrative commercial cooling equipment. Confirm operating temperatures, dimensions, power supply and servicing records.",
    specs: [{label:"Category",value:"Refrigeration"},{label:"Condition",value:"Very good"},{label:"Location",value:"Cardiff area"}],
  },
  {
    id: "5", title: "Fully equipped food truck", price: "£24,500", place: "Leeds", category: "Vans & Trailers", condition: "Ready to trade",
    image: "https://images.unsplash.com/photo-1565123409695-7b5ef63a2efb?w=900&q=85",
    gallery: ["https://images.unsplash.com/photo-1565123409695-7b5ef63a2efb?w=900&q=85"],
    badge: "READY TO ROLL", description: "Illustrative mobile food business. Request a current photo gallery, full equipment inventory, vehicle documents and inspection before buying.",
    specs: [{label:"Type",value:"Food truck"},{label:"Condition",value:"Ready to trade"},{label:"Location",value:"Leeds area"}],
  },
];

function ListingCard({ item, onOpen, saved, onToggleSave }: { item: Listing; onOpen: (item: Listing) => void; saved: boolean; onToggleSave: (id: string) => void }) {
  const scale = useRef(new Animated.Value(1)).current;
  const animate = (toValue: number) => Animated.spring(scale, { toValue, useNativeDriver: true, speed: 28, bounciness: 4 }).start();
  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`View ${item.title}, ${item.price}`}
        style={styles.card}
        onPressIn={() => animate(0.975)}
        onPressOut={() => animate(1)}
        onPress={() => onOpen(item)}
      >
        <ImageBackground source={{ uri: item.image }} style={styles.cardImage} imageStyle={styles.cardImageInner}>
          <View style={styles.imageShade} />
          {item.badge ? <View style={styles.cardBadge}><AppText variant="label" style={styles.cardBadgeText}>{item.badge}</AppText></View> : null}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={saved ? "Remove from preview saved items" : "Save preview item"}
            onPress={() => onToggleSave(item.id)}
            style={styles.heartButton}
          >
            <Ionicons name={saved ? "heart" : "heart-outline"} size={19} color={GOLD} />
          </Pressable>
          <View style={styles.imageBottom}><Ionicons name="location-outline" size={13} color="#FFF" /><AppText variant="bodyBold" style={styles.imagePlace}>{item.place}</AppText></View>
        </ImageBackground>
        <View style={styles.cardBody}>
          <AppText variant="title" style={styles.cardPrice}>{item.price}</AppText>
          <AppText variant="title" style={styles.cardTitle} numberOfLines={2}>{item.title}</AppText>
          <View style={styles.cardFoot}><AppText variant="body" style={styles.cardCondition}>{item.condition}</AppText><Ionicons name="arrow-up-outline" size={17} color={GOLD} style={{ transform: [{ rotate: "45deg" }] }} /></View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

function SectionTitle({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle?: string }) {
  return (
    <View style={styles.sectionTitle}>
      <AppText variant="label" style={styles.eyebrow}>{eyebrow}</AppText>
      <AppText variant="heading" style={styles.sectionHeading}>{title}</AppText>
      {subtitle ? <AppText variant="body" style={styles.sectionSubtitle}>{subtitle}</AppText> : null}
    </View>
  );
}

export default function MarketplaceScreen() {
  const insets = useSafeAreaInsets();
  const [category, setCategory] = useState<Category>("All");
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => LISTINGS.filter(item =>
    (category === "All" || item.category === category) &&
    `${item.title} ${item.category} ${item.place}`.toLowerCase().includes(query.trim().toLowerCase())
  ), [category, query]);
  const ready = filtered.filter(item => item.category === "Vans & Trailers");
  const [selected, setSelected] = useState<Listing | null>(null);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const toggleSaved = (id: string) => setSavedIds(prev => prev.includes(id) ? prev.filter(v => v !== id) : [...prev, id]);
  const openListing = (item: Listing) => { setGalleryIndex(0); setSelected(item); };
  const galleryFade = useRef(new Animated.Value(1)).current;
  const changePhoto = (index: number) => {
    galleryFade.setValue(0.35);
    setGalleryIndex(index);
    Animated.timing(galleryFade, { toValue: 1, duration: 230, useNativeDriver: true }).start();
  };
  const modalFade = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(modalFade, { toValue: selected ? 1 : 0, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [selected, modalFade]);

  return (
    <View style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={NAVY} />
      {/* Match Account: the actual map owns the background and wraps the content. */}
      <MapTextureBackground>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.content, { paddingTop: insets.top + 14 }]}>
        <View style={styles.topline}><View style={styles.brandDot} /><AppText variant="label" style={styles.toplineText}>BITEBEACON  /  MARKETPLACE</AppText><View style={styles.previewPill}><AppText variant="label" style={styles.previewText}>DESIGN PREVIEW</AppText></View></View>

        <MetallicFrame tone="gold" borderRadius={27} borderWidth={2} style={styles.heroMetalFrame} contentStyle={styles.hero}>
          <View style={styles.heroEdgeLight} />
          <View style={styles.heroInnerLine} />
          <View style={styles.heroGlow} />
          <LinearGradient pointerEvents="none" colors={["rgba(255,245,200,0.12)","transparent","rgba(240,155,30,0.05)"]} start={{x:0,y:0}} end={{x:1,y:1}} style={StyleSheet.absoluteFillObject} />
          <AppText variant="label" style={styles.heroOverline}>BUILT FOR THE PEOPLE WHO TRADE</AppText>
          <AppText variant="heading" style={styles.heroTitle}>THE TRADER'S{ "\n" }<AppText variant="heading" style={styles.heroTitleGold}>EXCHANGE.</AppText></AppText>
          <View style={styles.heroRule} />
          <AppText variant="subtitle" style={styles.heroSubtitle}>Good equipment deserves another shift.</AppText>
          <AppText variant="body" style={styles.heroDescription}>From your first pitch to your next big move. Buy, sell and discover the tools of the trade.</AppText>
          <Pressable style={styles.sellButtonFrame} onPress={() => Alert.alert("Design preview", "Selling will be available after we build and test the listing flow.")}>
            <LinearGradient colors={["#FFF6CE", "#FFE39A", "#FFC24C", "#E79C26"]} locations={[0,0.27,0.72,1]} start={{x:0,y:0}} end={{x:0,y:1}} style={styles.sellButton}>
            <View style={styles.sellButtonShine} />
            <Ionicons name="add-circle-outline" size={21} color={NAVY} /><AppText variant="label" style={styles.sellButtonText}>SELL YOUR EQUIPMENT</AppText><Ionicons name="arrow-forward" size={17} color={NAVY} />
            </LinearGradient>
          </Pressable>
          <View style={styles.heroCorner}><Ionicons name="sparkles-outline" size={22} color={GOLD_LIGHT} /></View>
        </MetallicFrame>

        <MetallicFrame tone="gold" borderRadius={20} borderWidth={2} style={styles.searchMetalFrame} contentStyle={styles.accountStyleSearch}><Ionicons name="search-outline" size={22} color={GOLD_DARK} /><TextInput placeholder="Search vans, fridges, generators..." placeholderTextColor="#8293A1" value={query} onChangeText={setQuery} style={styles.searchInput} returnKeyType="search" /><Ionicons name="options-outline" size={20} color={GOLD_DARK} accessibilityLabel="Filters coming soon" /></MetallicFrame>

        <View style={styles.categoryHeader}><AppText variant="label" style={styles.eyebrow}>FIND YOUR NEXT UPGRADE</AppText><AppText variant="heading" style={styles.categoryHeading}>Explore the trade</AppText></View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow}>
          {CATEGORIES.map(c => <Pressable key={c.label} onPress={() => setCategory(c.label)} style={[styles.categoryChip, category === c.label && styles.categoryChipActive]}><Ionicons name={c.icon} size={17} color={category === c.label ? NAVY : GOLD} /><AppText variant="button" style={[styles.categoryText, category === c.label && styles.categoryTextActive]}>{c.label}</AppText></Pressable>)}
        </ScrollView>

        <View style={styles.sectionDivider}><SectionGlowLine /></View>
        <SectionTitle eyebrow="01 / NEW ARRIVALS" title="Fresh off the trailer" subtitle="Good finds don't hang around." />
        {filtered.length ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cardsRow}>{filtered.map(item => <ListingCard key={item.id} item={item} onOpen={openListing} saved={savedIds.includes(item.id)} onToggleSave={toggleSaved} />)}</ScrollView> : <View style={styles.empty}><Ionicons name="search-outline" size={27} color={GOLD_DARK} /><AppText variant="body" style={styles.emptyText}>No demo listings match that search.</AppText><Pressable onPress={() => { setQuery(""); setCategory("All"); }}><AppText variant="label" style={styles.resetText}>Clear filters</AppText></Pressable></View>}

        <View style={styles.manifesto}><View style={styles.manifestoIcon}><Ionicons name="shield-checkmark-outline" size={23} color={GOLD} /></View><View style={{ flex: 1 }}><AppText variant="body" style={styles.manifestoHeading}>TRADE WITH CONFIDENCE</AppText><AppText variant="body" style={styles.manifestoText}>A marketplace made for food traders. Clear listings, direct conversations, equipment worth another shift.</AppText></View></View>

        <SectionTitle eyebrow="02 / BIG MOVES" title="Ready for the road" subtitle="Your next setup might be right here." />
        {ready.length ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cardsRow}>{ready.map(item => <ListingCard key={`ready-${item.id}`} item={item} onOpen={openListing} saved={savedIds.includes(item.id)} onToggleSave={toggleSaved} />)}</ScrollView> : <AppText variant="body" style={styles.noReady}>Choose “All” or “Vans & Trailers” to see ready-to-trade setups.</AppText>}

        <View style={styles.bottomBanner}><AppText variant="label" style={styles.bottomBannerOverline}>HAVE SOMETHING WORTH A SECOND SHIFT?</AppText><AppText variant="heading" style={styles.bottomBannerTitle}>Put it back to work.</AppText><Pressable onPress={() => Alert.alert("Coming next", "Selling will be enabled when the Marketplace backend is ready.")} style={styles.bottomLink}><AppText variant="label" style={styles.bottomLinkText}>BECOME A SELLER</AppText><Ionicons name="arrow-forward" size={16} color={GOLD} /></Pressable></View>
        <AppText variant="body" style={styles.disclaimer}>DESIGN PREVIEW · EXAMPLE LISTINGS ONLY · NO LIVE SALES</AppText>
      </ScrollView>
      </MapTextureBackground>
      <Modal visible={!!selected} transparent animationType="fade" onRequestClose={() => setSelected(null)} statusBarTranslucent>
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setSelected(null)} accessibilityLabel="Close listing preview" />
          {selected ? <Animated.View style={[styles.detailPanel, { opacity: modalFade, transform: [{ translateY: modalFade.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }]}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.detailGallery}>
                <Animated.Image source={{ uri: selected.gallery[galleryIndex] }} resizeMode="cover" style={[styles.detailGalleryPhoto, { opacity: galleryFade }]} />
                <View style={styles.galleryTopRow}>
                  <View style={styles.galleryCounter}><Ionicons name="images-outline" size={14} color={GOLD_LIGHT} /><AppText variant="label" style={styles.galleryCounterText}>{galleryIndex + 1} / {selected.gallery.length}</AppText></View>
                  <Pressable style={styles.closeDetail} onPress={() => setSelected(null)} accessibilityRole="button" accessibilityLabel="Close details"><Ionicons name="close" color={GOLD_LIGHT} size={22} /></Pressable>
                </View>
                {selected.gallery.length > 1 ? <View style={styles.galleryArrows}>
                  <Pressable style={styles.galleryArrow} onPress={() => changePhoto((galleryIndex - 1 + selected.gallery.length) % selected.gallery.length)} accessibilityRole="button" accessibilityLabel="Previous photo"><Ionicons name="chevron-back" size={24} color={GOLD_LIGHT} /></Pressable>
                  <Pressable style={styles.galleryArrow} onPress={() => changePhoto((galleryIndex + 1) % selected.gallery.length)} accessibilityRole="button" accessibilityLabel="Next photo"><Ionicons name="chevron-forward" size={24} color={GOLD_LIGHT} /></Pressable>
                </View> : null}
                <View style={styles.photoDisclaimer}><AppText variant="label" style={styles.photoDisclaimerText}>ILLUSTRATIVE PHOTO · NOT THE ACTUAL ITEM</AppText></View>
              </View>
              {selected.gallery.length > 1 ? <View style={styles.thumbnailRow}>{selected.gallery.map((uri, i) => <Pressable key={`${selected.id}-${i}`} onPress={() => changePhoto(i)} accessibilityRole="button" accessibilityLabel={`View photo ${i + 1}`} style={[styles.thumbnailFrame, i === galleryIndex && styles.thumbnailActive]}><Image source={{ uri }} style={styles.thumbnail} /></Pressable>)}</View> : null}
              <View style={styles.detailContent}>
                <AppText variant="label" style={styles.detailEyebrow}>THE TRADER'S EXCHANGE  /  PREVIEW</AppText>
                <AppText variant="heading" style={styles.detailPrice}>{selected.price}</AppText>
                <AppText variant="title" style={styles.detailTitle}>{selected.title}</AppText>
                <View style={styles.detailMeta}><Ionicons name="location-outline" color={GOLD} size={17} /><AppText variant="body" style={styles.detailMetaText}>{selected.place}  ·  {selected.condition}</AppText></View>
                <View style={styles.detailRule} />
                <View style={styles.detailSectionRow}><AppText variant="label" style={styles.detailSectionLabel}>EQUIPMENT DETAILS</AppText><Pressable onPress={() => toggleSaved(selected.id)} style={styles.detailSave} accessibilityRole="button" accessibilityLabel={savedIds.includes(selected.id) ? "Remove saved preview" : "Save preview listing"}><Ionicons name={savedIds.includes(selected.id) ? "heart" : "heart-outline"} size={19} color={GOLD} /><AppText variant="label" style={styles.detailSaveText}>{savedIds.includes(selected.id) ? "SAVED" : "SAVE"}</AppText></Pressable></View>
                <View style={styles.specGrid}>{selected.specs.map(spec => <MetallicFrame key={spec.label} tone="gold" borderRadius={14} borderWidth={2} style={styles.specMetalFrame} contentStyle={styles.specCell}><AppText variant="label" style={styles.specLabel}>{spec.label.toUpperCase()}</AppText><AppText variant="bodyBold" style={styles.specValue}>{spec.value}</AppText></MetallicFrame>)}</View>
                <AppText variant="body" style={styles.detailDescription}>{selected.description}</AppText>
                <View style={styles.sellerPreview}><Ionicons name="person-circle-outline" size={31} color={GOLD} /><View style={{ flex: 1 }}><AppText variant="title" style={styles.sellerTitle}>Seller profile preview</AppText><AppText variant="body" style={styles.sellerCaption}>Identity and trader badges will appear once verified.</AppText></View><Ionicons name="shield-outline" size={21} color={GOLD} /></View>
                <Pressable style={styles.detailAction} onPress={() => Alert.alert("Design preview", "Seller messaging will be enabled after we build and secure the Marketplace backend.")} accessibilityRole="button"><Ionicons name="chatbubble-ellipses-outline" color={NAVY} size={19} /><AppText variant="label" style={styles.detailActionText}>CONTACT SELLER</AppText><Ionicons name="arrow-forward" color={NAVY} size={18} /></Pressable>
                <AppText variant="body" style={styles.detailNotice}>DEMO ONLY · No real seller, verified badge or transaction</AppText>
              </View>
            </ScrollView>
          </Animated.View> : null}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  heroMetalFrame: { marginHorizontal: 16, shadowColor: "#FF9900", shadowOpacity: 0.10, shadowRadius: 9, elevation: 2 },
  heroEdgeLight: { position: "absolute", top: 0, left: 22, right: 60, height: 2, borderRadius: 4, backgroundColor: GOLD_LIGHT, opacity: 0.95 },
  heroInnerLine: { position: "absolute", top: 5, bottom: 5, left: 5, right: 5, borderRadius: 20, borderWidth: 1, borderColor: "rgba(255,229,157,0.25)" },
  sellButtonFrame: { marginTop: 2, borderRadius: 14, padding: 2, backgroundColor: "#B77513", borderWidth: 1, borderColor: GOLD_LIGHT, shadowColor: GOLD_BRIGHT, shadowOpacity: 0.32, shadowRadius: 11, elevation: 3 },
  sellButtonShine: { position: "absolute", left: 12, right: 12, top: 1, height: 2, backgroundColor: "#FFF9DC", borderRadius: 4 },
  searchMetalFrame: { marginHorizontal: 16, marginTop: 15, shadowColor: "#FFC451", shadowOpacity: 0.22, shadowRadius: 11 },
  accountStyleSearch: { height: 56, borderRadius: 16, backgroundColor: "rgba(12,12,15,0.93)", flexDirection: "row", alignItems: "center", paddingHorizontal: 17, gap: 12, shadowColor: "#FF9900", shadowOpacity: 0.14, shadowRadius: 8, elevation: 2 },
  sectionDivider: { alignItems: "center", marginTop: 18 },
  safe: { flex: 1, backgroundColor: NAVY },

  scroll: { flex: 1, backgroundColor: "transparent" },
  content: { paddingBottom: 48 },
  topline: { flexDirection: "row", alignItems: "center", paddingHorizontal: 22, paddingTop: 6, paddingBottom: 13, gap: 8, backgroundColor: "rgba(7,19,31,0.16)" },
  brandDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: GOLD },
  toplineText: { color: GOLD_LIGHT, fontSize: 9, letterSpacing: 1.4, flex: 1 },
  previewPill: { borderWidth: 1, borderColor: GOLD_BRIGHT, borderRadius: 20, paddingHorizontal: 9, paddingVertical: 5 },
  previewText: { color: GOLD_LIGHT, fontSize: 8, letterSpacing: 1.2 },
  hero: { paddingHorizontal: 22, paddingTop: 20, paddingBottom: 18, backgroundColor: "rgba(13,16,21,0.94)", overflow: "hidden" },
  heroGlow: { position: "absolute", width: 290, height: 290, borderRadius: 145, backgroundColor: "rgba(255,194,73,0.055)", top: -165, right: -115, borderWidth: 1, borderColor: "rgba(255,226,154,0.10)" },
  heroOverline: { color: GOLD_DARK, fontSize: 9, letterSpacing: 2.1, marginBottom: 9 },
  heroTitle: { color: "#F3F3F1", fontSize: WIDTH < 380 ? 30 : 35, lineHeight: WIDTH < 380 ? 36 : 40, letterSpacing: -1.2 },
  heroTitleGold: { color: "#FFF1BA", textShadowColor: "rgba(255,177,39,0.38)", textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 10 }, heroRule: { height: 3, width: 47, backgroundColor: GOLD_LIGHT, borderRadius: 3, marginTop: 11, marginBottom: 11 },
  heroSubtitle: { color: "#F4D28A", fontSize: 15 }, heroDescription: { color: "#B6C2CA", fontSize: 13, lineHeight: 21, marginTop: 7, marginBottom: 13, maxWidth: 310 },
  sellButton: { paddingHorizontal: 17, paddingVertical: 12, borderRadius: 10, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, overflow: "hidden", borderTopWidth: 1, borderTopColor: GOLD_LIGHT, borderBottomWidth: 2, borderBottomColor: "#B77617" },
  sellButtonText: { color: NAVY, fontSize: 11, letterSpacing: 1.15, flex: 1 },
  heroCorner: { position: "absolute", top: 25, right: 22 },
  searchWrap: { height: 56, backgroundColor: "#122332", flexDirection: "row", alignItems: "center", paddingHorizontal: 16, gap: 12 },
  searchInput: { flex: 1, color: "#F7F4EB", fontFamily: typography.body, fontSize: 13, paddingVertical: 8 },
  categoryHeader: { marginHorizontal: 22, marginTop: 18, marginBottom: 10, paddingVertical: 8, borderRadius: 10, backgroundColor: "rgba(7,19,31,0.16)" }, eyebrow: { color: GOLD_DARK, fontSize: 9, letterSpacing: 2.2 },
  categoryHeading: { color: "#F4F4F2", fontSize: 23, marginTop: 7 },
  categoryRow: { paddingHorizontal: 16, gap: 9, paddingBottom: 2 }, categoryChip: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 30, borderWidth: 1, borderColor: "#D6A54C", backgroundColor: "#112333", paddingHorizontal: 14, paddingVertical: 12 },
  categoryChipActive: { backgroundColor: GOLD_BRIGHT, borderColor: GOLD_LIGHT }, categoryText: { color: "#E0D6BF", fontSize: 12 }, categoryTextActive: { color: NAVY },
  divider: { height: 1, backgroundColor: "#243542", marginHorizontal: 22, marginTop: 31 },
  sectionTitle: { marginHorizontal: 22, marginTop: 17, marginBottom: 14, paddingVertical: 8, backgroundColor: "rgba(7,19,31,0.30)", borderRadius: 10 }, sectionHeading: { color: "#F3F3F1", fontSize: 25, letterSpacing: -0.5, marginTop: 7 }, sectionSubtitle: { color: MUTED, fontSize: 13, marginTop: 6 },
  cardsRow: { paddingHorizontal: 16, gap: 13, paddingBottom: 5 }, card: { width: CARD_WIDTH, borderRadius: 17, overflow: "hidden", backgroundColor: "#112331", borderWidth: 1, borderColor: "#C89A4A" },
  cardImage: { height: 171, justifyContent: "space-between" }, cardImageInner: { resizeMode: "cover" }, imageShade: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(4,14,24,0.20)" },
  cardBadge: { position: "absolute", top: 12, left: 12, backgroundColor: "#F6D990", borderRadius: 6, paddingHorizontal: 9, paddingVertical: 6 }, cardBadgeText: { fontSize: 8, letterSpacing: 1, color: NAVY },
  heartButton: { position: "absolute", right: 10, top: 10, width: 34, height: 34, borderRadius: 17, backgroundColor: "rgba(7,19,31,0.78)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#7C694A" },
  imageBottom: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 5, margin: 12, paddingHorizontal: 8, paddingVertical: 5, backgroundColor: "rgba(5,15,23,0.82)", borderRadius: 7 }, imagePlace: { color: "#FFF", fontSize: 11 },
  cardBody: { paddingHorizontal: 14, paddingTop: 14, paddingBottom: 13 }, cardPrice: { color: GOLD, fontSize: 22 }, cardTitle: { color: "#F0F2F2", fontSize: 13, lineHeight: 19, minHeight: 38, marginTop: 7 },
  cardFoot: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: "#2A3C48", paddingTop: 10, marginTop: 12 }, cardCondition: { color: MUTED, fontSize: 11 },
  manifesto: { marginHorizontal: 16, marginTop: 34, borderRadius: 16, borderWidth: 1, borderColor: "#B58A43", backgroundColor: "#102232", padding: 17, flexDirection: "row", alignItems: "center", gap: 13 },
  manifestoIcon: { height: 46, width: 46, borderRadius: 13, backgroundColor: "#23313B", borderWidth: 1, borderColor: "#C59B54", alignItems: "center", justifyContent: "center" }, manifestoHeading: { color: GOLD, fontSize: 10, letterSpacing: 1.1 }, manifestoText: { color: MUTED, fontSize: 12, lineHeight: 18, marginTop: 5 },
  bottomBanner: { marginHorizontal: 16, marginTop: 35, padding: 23, backgroundColor: "#142735", borderRadius: 18, borderWidth: 2, borderColor: GOLD_BRIGHT }, bottomBannerOverline: { color: GOLD_DARK, fontSize: 9, letterSpacing: 1.5 }, bottomBannerTitle: { color: "#F8F4EB", fontSize: 27, marginTop: 9 }, bottomLink: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 19 }, bottomLinkText: { color: GOLD, fontSize: 11, letterSpacing: 1.1 },
  disclaimer: { textAlign: "center", color: "#61717B", fontSize: 9, letterSpacing: 1, marginTop: 27, marginHorizontal: 15 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(1,7,13,0.86)", justifyContent: "center", paddingHorizontal: 18, paddingVertical: 42 },
  detailPanel: { maxHeight: "88%", borderRadius: 22, borderWidth: 2, borderColor: "#FFE29A", backgroundColor: "#0D1D2A", overflow: "hidden", shadowColor: "#FFAB36", shadowOpacity: 0.26, shadowRadius: 16, elevation: 10 },
  detailGallery: { height: 225, backgroundColor: "#101B25", overflow: "hidden" },
  detailGalleryPhoto: { ...StyleSheet.absoluteFillObject, width: "100%", height: "100%" },
  galleryTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 12 },
  galleryCounter: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(3,13,22,0.85)", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 9, borderWidth: 1, borderColor: "#80642C" },
  galleryCounterText: { color: GOLD_LIGHT, fontSize: 11 },
  galleryArrows: { flex: 1, flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 10 },
  galleryArrow: { width: 42, height: 42, borderRadius: 21, backgroundColor: "rgba(3,13,22,0.82)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#B58A43" },
  photoDisclaimer: { alignSelf: "center", marginBottom: 8, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 7, backgroundColor: "rgba(3,13,22,0.84)" },
  photoDisclaimerText: { color: GOLD_LIGHT, fontSize: 8, letterSpacing: 0.7 },
  thumbnailRow: { flexDirection: "row", gap: 9, paddingHorizontal: 18, paddingTop: 12 },
  thumbnailFrame: { width: 61, height: 49, borderRadius: 9, borderWidth: 1, borderColor: "#48535B", overflow: "hidden" },
  thumbnailActive: { borderColor: GOLD_BRIGHT, borderWidth: 2 },
  thumbnail: { width: "100%", height: "100%" },
  detailSectionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  detailSectionLabel: { color: GOLD, letterSpacing: 1.4, fontSize: 10 },
  detailSave: { flexDirection: "row", alignItems: "center", gap: 6, minHeight: 40, paddingHorizontal: 8 },
  detailSaveText: { color: GOLD, fontSize: 10 },
  specGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 17 },
  specMetalFrame: { flexGrow: 1, width: "47%", minHeight: 84, shadowColor: "#FFBA40", shadowOpacity: 0.16, shadowRadius: 7 },
  specCell: { flex: 1, backgroundColor: "rgba(17,31,43,0.97)", borderRadius: 10, padding: 12, justifyContent: "center" },
  specLabel: { color: "#FFE29A", fontSize: 9, letterSpacing: 0.8 },
  specValue: { color: "#FFFFFF", fontSize: 13, marginTop: 5 },
  sellerPreview: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: "#786238", backgroundColor: "#172635", marginTop: 18 },
  sellerTitle: { color: "#F6F3E9", fontSize: 12 },
  sellerCaption: { color: MUTED, fontSize: 10, lineHeight: 15, marginTop: 4 },
  closeDetail: { width: 42, height: 42, borderRadius: 21, backgroundColor: "rgba(3,13,22,0.88)", borderWidth: 1, borderColor: "#C08A30", alignItems: "center", justifyContent: "center" },
  detailContent: { padding: 21 },
  detailEyebrow: { fontSize: 9, letterSpacing: 1.8, color: GOLD_DARK },
  detailPrice: { color: GOLD_LIGHT, fontSize: 30, marginTop: 10 },
  detailTitle: { color: "#FFFFFF", fontSize: 21, lineHeight: 27, marginTop: 5 },
  detailMeta: { flexDirection: "row", alignItems: "center", gap: 7, marginTop: 12 },
  detailMetaText: { color: MUTED, fontSize: 12 },
  detailRule: { height: 1, backgroundColor: "#304454", marginVertical: 18 },
  detailDescription: { color: "#D2D9DD", fontSize: 13, lineHeight: 21 },
  detailAction: { marginTop: 23, minHeight: 52, borderRadius: 13, backgroundColor: "#FFD36B", flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 17 },
  detailActionText: { color: NAVY, fontSize: 12, letterSpacing: 1 },
  detailNotice: { color: "#80909B", fontSize: 10, textAlign: "center", marginTop: 13 },
  empty: { marginHorizontal: 16, padding: 35, borderWidth: 1, borderColor: "#334450", borderRadius: 16, alignItems: "center", gap: 10 }, emptyText: { color: MUTED, fontSize: 13 }, resetText: { color: GOLD, marginTop: 4 }, noReady: { marginHorizontal: 22, color: MUTED, fontSize: 12 },
});
