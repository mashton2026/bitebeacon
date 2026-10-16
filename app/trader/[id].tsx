import { Ionicons } from "@expo/vector-icons";
import { router, Stack, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ImageBackground,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import AppText from "../../components/AppText";
import MapTextureBackground from "../../components/MapTextureBackground";
import MetallicFrame from "../../components/MetallicFrame";
import { supabase } from "../../lib/supabase";

const NAVY = "#07131F";
const GOLD = "#FFD05C";
const GOLD_SOFT = "#F3DCA1";
const WHITE = "#F7F3EA";
const MUTED = "#AAB7C2";
const HERO = require("../../assets/images/trader-profile-hero.png");
const imageInfo = Image.resolveAssetSource(HERO);
const HERO_RATIO =
  imageInfo.width && imageInfo.height ? imageInfo.width / imageInfo.height : 3;

type SellerListing = {
  id: string;
  title: string | null;
  price_gbp: number | null;
  location: string | null;
  condition: string | null;
  photoUrl?: string;
};

type Seller = {
  display_name: string;
  location: string | null;
  about: string | null;
  created_at: string | null;
};

export default function TraderProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const [showMore, setShowMore] = useState(false);
  const [seller, setSeller] = useState<Seller | null>(null);
  const [listings, setListings] = useState<SellerListing[]>([]);
  const [listingsLoading, setListingsLoading] = useState(false);
  const [listingsError, setListingsError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setSeller(null);
      setListings([]);
      setListingsError(false);
      setErrorMessage("");
      try {
        if (
          !id ||
          !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
            id,
          )
        ) {
          throw new Error("Invalid seller ID");
        }
        // The owner can view their own profile under the existing owner SELECT
        // policy. Everyone else is subject to the public active-listing policy.
        const { data, error } = await supabase
          .from("marketplace_seller_profiles")
          .select("display_name,location,about,created_at")
          .eq("user_id", id)
          .maybeSingle();
        if (error) throw error;
        if (active) {
          if (data) setSeller(data as Seller);
          else setErrorMessage("This seller profile isn't available.");
        }
        if (!data || !active) return;

        // Fetch only this seller's currently published, unexpired inventory.
        // RLS remains the final authority on which rows and photos are public.
        setListingsLoading(true);
        try {
          const { data: rows, error: listingsFetchError } = await supabase
            .from("marketplace_listings")
            .select("id,title,price_gbp,location,condition")
            .eq("seller_id", id)
            .eq("status", "published")
            .gt("expires_at", new Date().toISOString())
            .order("published_at", { ascending: false })
            .limit(50);
          if (listingsFetchError) throw listingsFetchError;
          const enriched = await Promise.all(
            ((rows || []) as SellerListing[]).map(async (listing) => {
              try {
                const { data: photos, error: photoError } = await supabase
                  .from("marketplace_listing_photos")
                  .select("storage_path")
                  .eq("listing_id", listing.id)
                  .eq("upload_status", "uploaded")
                  .order("display_order", { ascending: true })
                  .limit(1);
                if (photoError || !photos?.[0]?.storage_path) return listing;
                const { data: urlData, error: urlError } =
                  await supabase.storage
                    .from("marketplace-photos")
                    .createSignedUrl(photos[0].storage_path, 3600);
                if (urlError || !urlData?.signedUrl) return listing;
                return { ...listing, photoUrl: urlData.signedUrl };
              } catch {
                return listing;
              }
            }),
          );
          if (active) setListings(enriched);
        } catch (listingsFetchError) {
          console.warn("Trader listings retrieval failed", listingsFetchError);
          if (active) setListingsError(true);
        } finally {
          if (active) setListingsLoading(false);
        }
      } catch (error) {
        console.warn("Trader profile load failed", error);
        if (active)
          setErrorMessage(
            "Unable to load this seller profile. Please try again.",
          );
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [id]);

  const joined = seller?.created_at
    ? new Date(seller.created_at).toLocaleDateString("en-GB", {
        month: "long",
        year: "numeric",
      })
    : null;
  const about =
    seller?.about?.trim() || "This seller hasn't added an introduction yet.";
  const shortAbout =
    about.length > 240 ? `${about.slice(0, 240).trimEnd()}…` : about;

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="light-content" backgroundColor={NAVY} />
      <MapTextureBackground>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingTop: insets.top + 10,
            paddingBottom: insets.bottom + 52,
          }}
        >
          {/* HERO: no second header and no circular business logo. */}
          <View style={styles.heroWrap}>
            <Image
              source={HERO}
              resizeMode="contain"
              style={[styles.hero, { aspectRatio: HERO_RATIO }]}
            />
            <Pressable
              onPress={() => router.back()}
              style={styles.back}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <Ionicons name="chevron-back" size={22} color={GOLD_SOFT} />
            </Pressable>
          </View>

          {loading ? (
            <ActivityIndicator
              color={GOLD}
              size="large"
              style={{ marginTop: 40 }}
            />
          ) : !seller ? (
            <View style={styles.identity}>
              <AppText variant="heading" style={styles.name}>
                Profile unavailable
              </AppText>
              <AppText variant="body" style={styles.meta}>
                {errorMessage}
              </AppText>
            </View>
          ) : (
            <>
              {/* UNIVERSAL SELLER IDENTITY: works for a person or a business. */}
              <View style={styles.identity}>
                <AppText variant="label" style={styles.eyebrow}>
                  SELLER PROFILE
                </AppText>
                <AppText variant="heading" style={styles.name}>
                  {seller.display_name}
                </AppText>
                {(seller.location || joined) && (
                  <View style={styles.metaRow}>
                    {seller.location ? (
                      <>
                        <Ionicons
                          name="location-outline"
                          size={15}
                          color={GOLD}
                        />
                        <AppText variant="body" style={styles.meta}>
                          {seller.location}
                        </AppText>
                      </>
                    ) : null}
                    {seller.location && joined ? (
                      <View style={styles.metaDot} />
                    ) : null}
                    {joined ? (
                      <AppText variant="body" style={styles.meta}>
                        Seller since {joined}
                      </AppText>
                    ) : null}
                  </View>
                )}
              </View>

              {/* SUBTLE CONTACT ACTION, NOT A GIANT GOLD PANEL. */}
              <View style={styles.contactWrap}>
                <MetallicFrame
                  tone="gold"
                  borderRadius={13}
                  borderWidth={1.5}
                  contentStyle={styles.contactInner}
                >
                  <Pressable
                    style={styles.contactButton}
                    accessibilityRole="button"
                    onPress={() =>
                      Alert.alert(
                        "Contact seller",
                        "Secure seller messaging is not connected yet.",
                      )
                    }
                  >
                    <Ionicons
                      name="chatbubble-outline"
                      size={19}
                      color={GOLD_SOFT}
                    />
                    <AppText variant="label" style={styles.contactLabel}>
                      CONTACT SELLER
                    </AppText>
                    <Ionicons
                      name="arrow-forward"
                      size={17}
                      color={GOLD_SOFT}
                    />
                  </Pressable>
                </MetallicFrame>
              </View>

              {/* MARKETPLACE FIRST: the reason buyers visit a seller profile. */}
              <View style={styles.section}>
                <View style={styles.headingRow}>
                  <View>
                    <AppText variant="label" style={styles.eyebrow}>
                      THE TRADER'S EXCHANGE
                    </AppText>
                    <AppText variant="heading" style={styles.sectionTitle}>
                      Items for Sale
                    </AppText>
                  </View>
                  <Ionicons name="pricetag-outline" size={23} color={GOLD} />
                </View>
                <View style={styles.rule} />
                {listingsLoading ? (
                  <View style={styles.emptyListings}>
                    <ActivityIndicator color={GOLD} />
                    <AppText variant="body" style={styles.emptyCopy}>
                      Loading equipment…
                    </AppText>
                  </View>
                ) : listingsError ? (
                  <View style={styles.emptyListings}>
                    <Ionicons
                      name="cloud-offline-outline"
                      size={29}
                      color={GOLD_SOFT}
                    />
                    <AppText variant="title" style={styles.emptyTitle}>
                      Listings unavailable
                    </AppText>
                    <AppText variant="body" style={styles.emptyCopy}>
                      Couldn't load this seller's equipment. Please reopen the
                      profile to try again.
                    </AppText>
                  </View>
                ) : listings.length === 0 ? (
                  <View style={styles.emptyListings}>
                    <Ionicons
                      name="images-outline"
                      size={29}
                      color={GOLD_SOFT}
                    />
                    <AppText variant="title" style={styles.emptyTitle}>
                      No equipment for sale yet
                    </AppText>
                    <AppText variant="body" style={styles.emptyCopy}>
                      This seller has no active equipment listings right now.
                    </AppText>
                  </View>
                ) : (
                  <View style={styles.listingsStack}>
                    {listings.map((listing) => (
                      <View key={listing.id} style={styles.listingCard}>
                        <View style={styles.listingPhoto}>
                          {listing.photoUrl ? (
                            <ImageBackground
                              source={{ uri: listing.photoUrl }}
                              style={styles.listingPhotoImage}
                              imageStyle={{ borderRadius: 12 }}
                            />
                          ) : (
                            <Ionicons
                              name="images-outline"
                              size={28}
                              color={GOLD_SOFT}
                            />
                          )}
                        </View>
                        <View style={styles.listingInfo}>
                          <AppText
                            variant="title"
                            style={styles.listingTitle}
                            numberOfLines={2}
                          >
                            {listing.title?.trim() || "Equipment listing"}
                          </AppText>
                          <AppText
                            variant="heading"
                            style={styles.listingPrice}
                          >
                            {listing.price_gbp == null
                              ? "Price on request"
                              : `£${Number(listing.price_gbp).toLocaleString("en-GB")}`}
                          </AppText>
                          {listing.condition || listing.location ? (
                            <AppText
                              variant="body"
                              style={styles.listingMeta}
                              numberOfLines={2}
                            >
                              {[listing.condition, listing.location]
                                .filter(Boolean)
                                .join(" · ")}
                            </AppText>
                          ) : null}
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </View>

              {/* ABOUT IS OPTIONAL AND NOT BUSINESS-SPECIFIC. */}
              <View style={styles.section}>
                <AppText variant="label" style={styles.eyebrow}>
                  A LITTLE INTRODUCTION
                </AppText>
                <AppText variant="heading" style={styles.sectionTitle}>
                  About the Seller
                </AppText>
                <View style={styles.rule} />
                <AppText variant="body" style={styles.aboutText}>
                  {showMore ? about : shortAbout}
                </AppText>
                {about.length > 240 && (
                  <Pressable
                    style={styles.moreButton}
                    onPress={() => setShowMore((v) => !v)}
                    accessibilityRole="button"
                  >
                    <AppText variant="label" style={styles.moreText}>
                      {showMore ? "SHOW LESS" : "READ MORE"}
                    </AppText>
                    <Ionicons
                      name={showMore ? "chevron-up" : "chevron-down"}
                      size={15}
                      color={GOLD}
                    />
                  </Pressable>
                )}
              </View>

              {/* No fabricated sold count, reviews, verification or business status. */}
              <View style={styles.footer}>
                <Ionicons
                  name="shield-checkmark-outline"
                  size={18}
                  color={GOLD_SOFT}
                />
                <AppText variant="body" style={styles.footerText}>
                  Buy and sell food-trade equipment. Ask questions and check
                  items before arranging payment.
                </AppText>
              </View>
            </>
          )}
        </ScrollView>
      </MapTextureBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: NAVY },
  heroWrap: {
    marginHorizontal: 15,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: NAVY,
  },
  hero: { width: "100%", height: undefined },
  back: {
    position: "absolute",
    top: 12,
    left: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(4,13,22,0.85)",
    borderWidth: 1,
    borderColor: GOLD,
    alignItems: "center",
    justifyContent: "center",
  },
  identity: { paddingHorizontal: 23, paddingTop: 22, paddingBottom: 4 },
  eyebrow: { color: GOLD, fontSize: 9, letterSpacing: 1.8, marginBottom: 8 },
  name: { color: WHITE, fontSize: 29, lineHeight: 36 },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 7,
    marginTop: 9,
  },
  meta: { color: MUTED, fontSize: 12 },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: "#768995",
    marginHorizontal: 2,
  },
  contactWrap: { marginHorizontal: 20, marginTop: 22 },
  contactInner: {
    backgroundColor: "rgba(9,24,35,0.97)",
    borderRadius: 12,
    overflow: "hidden",
  },
  contactButton: {
    minHeight: 49,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 13,
    paddingHorizontal: 18,
  },
  contactLabel: {
    color: GOLD_SOFT,
    fontSize: 11,
    letterSpacing: 1.2,
    flex: 1,
    textAlign: "center",
  },
  section: { marginTop: 35, paddingHorizontal: 21 },
  headingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: { color: WHITE, fontSize: 23 },
  rule: {
    height: 1,
    backgroundColor: "rgba(221,176,90,0.42)",
    marginTop: 14,
    marginBottom: 17,
  },
  emptyListings: {
    minHeight: 175,
    borderRadius: 16,
    backgroundColor: "rgba(8,24,35,0.92)",
    borderWidth: 1,
    borderColor: "rgba(151,171,184,0.24)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 23,
    paddingVertical: 23,
  },
  listingsStack: { gap: 12 },
  listingCard: {
    flexDirection: "row",
    padding: 12,
    gap: 13,
    borderRadius: 16,
    backgroundColor: "rgba(8,24,35,0.92)",
    borderWidth: 1,
    borderColor: "rgba(221,176,90,0.42)",
  },
  listingPhoto: {
    width: 102,
    height: 105,
    borderRadius: 12,
    backgroundColor: "#132C3C",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  listingPhotoImage: { width: "100%", height: "100%" },
  listingInfo: { flex: 1, justifyContent: "center", gap: 6 },
  listingTitle: { color: WHITE, fontSize: 16 },
  listingPrice: { color: GOLD_SOFT, fontSize: 21 },
  listingMeta: { color: MUTED, fontSize: 12, lineHeight: 17 },
  emptyTitle: { color: WHITE, fontSize: 16, marginTop: 10 },
  emptyCopy: {
    color: MUTED,
    fontSize: 12,
    lineHeight: 20,
    textAlign: "center",
    marginTop: 8,
  },
  previewTag: { color: GOLD, fontSize: 9, letterSpacing: 1.3, marginTop: 15 },
  aboutText: {
    color: "#D8E0E5",
    fontSize: 14,
    lineHeight: 24,
    marginBottom: 10,
  },
  moreButton: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    marginTop: 2,
  },
  moreText: { color: GOLD_SOFT, fontSize: 10, letterSpacing: 1.2 },
  footer: {
    marginHorizontal: 21,
    marginTop: 38,
    paddingTop: 22,
    borderTopWidth: 1,
    borderTopColor: "rgba(221,176,90,0.23)",
    alignItems: "center",
    gap: 9,
  },
  footerText: {
    color: MUTED,
    fontSize: 12,
    lineHeight: 19,
    textAlign: "center",
  },
  debug: { color: "#667987", fontSize: 10, marginTop: 15 },
});
