import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ImageBackground,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AppText from "../../components/AppText";
import MapTextureBackground from "../../components/MapTextureBackground";
import MetallicFrame from "../../components/MetallicFrame";
import { typography } from "../../constants/typography";
import { supabase } from "../../lib/supabase";

const HERO = require("../../assets/images/marketplace-my-listings-hero.png");
const GOLD = "#D89A27";
const PALE = "#FFE29A";
const MUTED = "#B3C2CC";
const DRAFT_KEY = "bitebeacon:marketplace:sell-draft:v1";
type Listing = {
  id: string;
  title: string | null;
  category: string | null;
  status: string;
  condition: string | null;
  location: string | null;
  price_gbp: number | null;
  created_at: string;
  updated_at: string | null;
  expires_at: string | null;
  sold_at: string | null;
  removed_at: string | null;
  photoUrl?: string;
};

type Filter = "all" | "draft" | "published" | "sold";
const money = (n: number | null) =>
  n == null ? "Price not set" : `£${Number(n).toLocaleString("en-GB")}`;
const readableDate = (value: string | null) =>
  value
    ? new Date(value).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "—";

export default function MyListingsScreen() {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<Listing[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [signedIn, setSignedIn] = useState(true);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setErrorMessage("");
    try {
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!auth.user) {
        setSignedIn(false);
        setItems([]);
        return;
      }
      setSignedIn(true);
      const { data, error } = await supabase
        .from("marketplace_listings")
        .select(
          "id,title,category,status,condition,location,price_gbp,created_at,updated_at,expires_at,sold_at,removed_at",
        )
        .eq("seller_id", auth.user.id)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      const listings: Listing[] = (data || []) as Listing[];
      // Photo previews are optional; a failed private signed URL must not hide listings.
      const enriched = await Promise.all(
        listings.map(async (listing) => {
          try {
            const { data: photos, error: photoError } = await supabase
              .from("marketplace_listing_photos")
              .select("storage_path")
              .eq("listing_id", listing.id)
              .eq("upload_status", "uploaded")
              .order("display_order", { ascending: true })
              .limit(1);
            if (photoError || !photos?.[0]?.storage_path) return listing;
            const { data: urlData } = await supabase.storage
              .from("marketplace-photos")
              .createSignedUrl(photos[0].storage_path, 3600);
            return { ...listing, photoUrl: urlData?.signedUrl };
          } catch {
            return listing;
          }
        }),
      );
      setItems(enriched);
    } catch (error) {
      console.warn("My Listings retrieval failed", error);
      setErrorMessage(
        "Could not load your listings. Please check your connection and try again.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const counts = useMemo(
    () => ({
      all: items.length,
      draft: items.filter((x) => x.status === "draft").length,
      published: items.filter(
        (x) =>
          x.status === "published" &&
          (!x.expires_at || new Date(x.expires_at).getTime() > Date.now()),
      ).length,
      sold: items.filter((x) => x.status === "sold").length,
    }),
    [items],
  );
  const shown = useMemo(
    () =>
      items.filter(
        (x) =>
          filter === "all" ||
          (filter === "published"
            ? x.status === "published" &&
              (!x.expires_at || new Date(x.expires_at).getTime() > Date.now())
            : x.status === filter),
      ),
    [items, filter],
  );

  const openDraft = (item: Listing) => {
    if (busy) return;
    Alert.alert(
      "Continue this draft?",
      "This will replace the unsaved form currently on this device. Save any work you want to keep first. Your uploaded photos will remain online.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Continue editing",
          onPress: () => {
            void (async () => {
              setBusy(item.id);
              try {
                const { data: auth, error: authError } =
                  await supabase.auth.getUser();
                if (authError || !auth.user)
                  throw authError || new Error("Sign in required");
                const { data: draft, error } = await supabase
                  .from("marketplace_listings")
                  .select(
                    "id,category,title,condition,description,price_gbp,location,specifications,delivery_option,working_condition,known_faults,service_history,reason_for_sale,has_paperwork",
                  )
                  .eq("id", item.id)
                  .eq("seller_id", auth.user.id)
                  .eq("status", "draft")
                  .maybeSingle();
                if (error) throw error;
                if (!draft) {
                  Alert.alert(
                    "Draft unavailable",
                    "This draft is no longer available.",
                  );
                  void load(true);
                  return;
                }
                const next = {
                  category: draft.category || "",
                  title: draft.title || "",
                  condition: draft.condition || "",
                  photos: [] as string[],
                  price: draft.price_gbp == null ? "" : String(draft.price_gbp),
                  description: draft.description || "",
                  location: draft.location || "",
                  specs:
                    draft.specifications &&
                    typeof draft.specifications === "object" &&
                    !Array.isArray(draft.specifications)
                      ? draft.specifications
                      : {},
                  delivery: draft.delivery_option || "",
                  serviceHistory: draft.service_history || "",
                  reasonForSale: draft.reason_for_sale || "",
                  paperwork: Boolean(draft.has_paperwork),
                  workingCondition: draft.working_condition || "",
                  knownFaults: draft.known_faults || "",
                };
                const idKey = `bitebeacon:marketplace:online-draft-id:v1:${auth.user.id}`;
                // Only navigate after both device records have been written successfully.
                await AsyncStorage.multiSet([
                  [idKey, draft.id],
                  [DRAFT_KEY, JSON.stringify(next)],
                ]);
                router.push("/marketplace/sell");
              } catch (err) {
                console.warn("Could not open marketplace draft", err);
                Alert.alert(
                  "Could not open draft",
                  "No online listing was changed. Please try again.",
                );
              } finally {
                setBusy(null);
              }
            })();
          },
        },
      ],
    );
  };

  const deleteDraft = (item: Listing) => {
    if (busy || item.status !== "draft") {
      return;
    }

    const title = item.title?.trim() || "Untitled equipment";

    Alert.alert(
      "Permanently delete draft?",
      `Delete "${title}" and all its uploaded photos? ` +
        "This cannot be undone.",
      [
        {
          text: "Keep listing",
          style: "cancel",
        },
        {
          text: "Delete permanently",
          style: "destructive",
          onPress: () => {
            void (async () => {
              setBusy(item.id);

              try {
                const { data, error } = await supabase.functions.invoke(
                  "marketplace-delete-listing",
                  {
                    body: {
                      listing_id: item.id,
                    },
                  },
                );

                if (error || data?.success !== true) {
                  let message =
                    typeof data?.error === "string"
                      ? data.error
                      : error?.message || "The listing could not be deleted.";

                  let status: number | undefined;
                  let responseText = "";

                  // The Edge Function response is often attached
                  // to FunctionsHttpError.context. Read a clone
                  // so that debugging cannot consume the original.
                  if (error && "context" in error) {
                    const context = error.context;

                    if (context instanceof Response) {
                      status = context.status;

                      try {
                        responseText = await context.clone().text();

                        if (responseText) {
                          try {
                            const detail = JSON.parse(responseText);

                            message =
                              detail?.error || detail?.message || responseText;
                          } catch {
                            message = responseText;
                          }
                        }
                      } catch (readError) {
                        console.warn(
                          "Could not read deletion response",
                          readError,
                        );
                      }
                    }
                  }

                  // Keep a detailed record in Metro for diagnosis.
                  // Never log access tokens or request headers.
                  console.warn("Marketplace deletion response", {
                    status: status ?? "unknown",
                    message,
                    errorName: error?.name,
                    responseText: responseText.slice(0, 1000),
                  });

                  const statusLabel =
                    status == null
                      ? "HTTP status unavailable"
                      : `HTTP ${status}`;

                  throw new Error(`${statusLabel}: ${message}`);
                }

                // Do not clear the current device draft unless
                // it belongs to the listing just deleted.
                const { data: auth } = await supabase.auth.getUser();

                if (auth.user) {
                  const idKey =
                    "bitebeacon:marketplace:online-draft-id:v1:" + auth.user.id;

                  const currentId = await AsyncStorage.getItem(idKey);

                  if (currentId === item.id) {
                    await AsyncStorage.multiRemove([idKey, DRAFT_KEY]);
                  }
                }

                // Reflect the deletion immediately, then reload
                // to confirm the server's current state.
                setItems((previous) =>
                  previous.filter((entry) => entry.id !== item.id),
                );

                Alert.alert(
                  "Draft deleted",
                  `"${title}" and its uploaded photos were removed.`,
                );

                await load(true);
              } catch (error) {
                console.warn("Draft deletion failed", error);
                Alert.alert(
                  "Could not delete draft",
                  error instanceof Error ? error.message : "Please try again.",
                );
              } finally {
                setBusy(null);
              }
            })();
          },
        },
      ],
    );
  };

  const manageListing = (item: Listing, action: "sold" | "removed") => {
    if (busy || item.status !== "published") return;

    const isSold = action === "sold";
    const title = item.title?.trim() || "Untitled equipment";

    Alert.alert(
      isSold ? "Mark this listing as sold?" : "Remove this listing?",
      isSold
        ? `Mark "${title}" as sold? It will disappear from the public Marketplace. This cannot be undone here.`
        : `Withdraw "${title}" from the public Marketplace? It will remain in your listing history. This cannot be undone here.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: isSold ? "Mark as sold" : "Remove listing",
          style: isSold ? "default" : "destructive",
          onPress: () => {
            void (async () => {
              setBusy(item.id);
              try {
                const { data, error } = await supabase.rpc(
                  "marketplace_manage_listing",
                  {
                    p_listing_id: item.id,
                    p_action: action,
                  },
                );
                if (error) throw error;
                if (!data || data.status !== action) {
                  throw new Error(
                    "The server did not confirm the status change.",
                  );
                }

                setItems((previous) =>
                  previous.map((entry) =>
                    entry.id === item.id
                      ? {
                          ...entry,
                          status: data.status,
                          updated_at: data.updated_at,
                          sold_at: data.sold_at,
                          removed_at: data.removed_at,
                        }
                      : entry,
                  ),
                );

                Alert.alert(
                  isSold ? "Marked as sold" : "Listing removed",
                  isSold
                    ? `"${title}" is no longer visible to buyers.`
                    : `"${title}" has been withdrawn from the Marketplace.`,
                );
                await load(true);
              } catch (error) {
                console.warn("Marketplace management failed", error);
                Alert.alert(
                  "Could not update listing",
                  error instanceof Error ? error.message : "Please try again.",
                );
              } finally {
                setBusy(null);
              }
            })();
          },
        },
      ],
    );
  };

  return (
    <MapTextureBackground>
      <ScrollView
        style={styles.fill}
        contentContainerStyle={{ paddingBottom: insets.bottom + 42 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void load(true)}
            tintColor={PALE}
          />
        }
      >
        <ImageBackground
          source={HERO}
          resizeMode="cover"
          style={styles.hero}
          imageStyle={styles.heroImage}
        >
          <LinearGradient
            colors={["rgba(2,11,21,.40)", "transparent", "rgba(2,11,21,.80)"]}
            style={styles.heroShade}
          >
            <Pressable
              accessibilityLabel="Back to marketplace"
              onPress={() => router.back()}
              style={[styles.back, { marginTop: insets.top + 12 }]}
            >
              <Ionicons name="arrow-back" size={23} color={PALE} />
            </Pressable>
          </LinearGradient>
        </ImageBackground>

        <View style={styles.content}>
          <AppText style={styles.kicker}>YOUR TRADING SPACE</AppText>
          <AppText style={styles.heading}>Every listing. One place.</AppText>
          <AppText style={styles.body}>
            Pick up where you left off, track your equipment and keep everything
            organised.
          </AppText>

          <MetallicFrame
            tone="gold"
            borderRadius={22}
            borderWidth={2}
            style={styles.frame}
            contentStyle={styles.frameInside}
          >
            <View style={styles.statsRow}>
              <View style={styles.stat}>
                <AppText style={styles.statNumber}>{counts.all}</AppText>
                <AppText style={styles.statLabel}>TOTAL</AppText>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.stat}>
                <AppText style={styles.statNumber}>{counts.draft}</AppText>
                <AppText style={styles.statLabel}>DRAFTS</AppText>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.stat}>
                <AppText style={styles.statNumber}>{counts.published}</AppText>
                <AppText style={styles.statLabel}>LIVE</AppText>
              </View>
            </View>
          </MetallicFrame>

          <Pressable
            style={styles.createButton}
            onPress={() => router.push("/marketplace/sell")}
          >
            <LinearGradient
              colors={["#FFF2BD", "#FFD66D", "#E9A32A"]}
              style={styles.createInside}
            >
              <Ionicons name="add-circle-outline" size={24} color="#071421" />
              <AppText style={styles.createText}>SELL MORE EQUIPMENT</AppText>
              <Ionicons name="arrow-forward" size={21} color="#071421" />
            </LinearGradient>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Manage your seller profile"
            onPress={() => router.push("/marketplace/seller-profile")}
            style={styles.sellerProfileButton}
          >
            <Ionicons name="person-circle-outline" size={21} color={PALE} />
            <AppText style={styles.sellerProfileText}>
              MANAGE YOUR SELLER PROFILE
            </AppText>
            <Ionicons name="chevron-forward" size={19} color={PALE} />
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="View my trader profile"
            disabled={!signedIn || loading}
            onPress={() => {
              void (async () => {
                try {
                  const { data, error } = await supabase.auth.getUser();
                  if (error || !data.user) {
                    Alert.alert(
                      "Sign in required",
                      "Please sign in to view your trader profile.",
                    );
                    return;
                  }
                  router.push({
                    pathname: "/trader/[id]",
                    params: { id: data.user.id },
                  });
                } catch {
                  Alert.alert("Unable to open profile", "Please try again.");
                }
              })();
            }}
            style={[styles.sellerProfileButton, styles.viewProfileButton]}
          >
            <Ionicons name="eye-outline" size={21} color={PALE} />
            <AppText style={styles.sellerProfileText}>
              VIEW MY TRADER PROFILE
            </AppText>
            <Ionicons name="chevron-forward" size={19} color={PALE} />
          </Pressable>

          <View style={styles.sectionRow}>
            <AppText style={styles.sectionTitle}>YOUR INVENTORY</AppText>
            <Pressable
              accessibilityLabel="Refresh listings"
              onPress={() => void load(true)}
            >
              <Ionicons name="refresh" size={23} color={PALE} />
            </Pressable>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filters}
          >
            {(["all", "draft", "published", "sold"] as Filter[]).map(
              (value) => (
                <Pressable
                  key={value}
                  onPress={() => setFilter(value)}
                  style={[styles.chip, filter === value && styles.chipActive]}
                >
                  <AppText
                    style={[
                      styles.chipText,
                      filter === value && styles.chipTextActive,
                    ]}
                  >
                    {value === "published" ? "LIVE" : value.toUpperCase()}{" "}
                    {counts[value]}
                  </AppText>
                </Pressable>
              ),
            )}
          </ScrollView>

          {loading && (
            <View style={styles.state}>
              <ActivityIndicator size="large" color={PALE} />
              <AppText style={styles.body}>Retrieving your listings…</AppText>
            </View>
          )}

          {!loading && !signedIn && (
            <View style={styles.state}>
              <Ionicons name="lock-closed-outline" size={36} color={PALE} />
              <AppText style={styles.emptyTitle}>
                Sign in to see your listings
              </AppText>
            </View>
          )}

          {!loading && Boolean(errorMessage) && (
            <View style={styles.state}>
              <Ionicons name="cloud-offline-outline" size={36} color={PALE} />
              <AppText style={styles.body}>{errorMessage}</AppText>
              <Pressable onPress={() => void load()}>
                <AppText style={styles.link}>TRY AGAIN</AppText>
              </Pressable>
            </View>
          )}

          {!loading && signedIn && !errorMessage && shown.length === 0 && (
            <View style={styles.state}>
              <Ionicons name="file-tray-outline" size={40} color={PALE} />
              <AppText style={styles.emptyTitle}>Nothing here yet</AppText>
              <AppText style={styles.body}>
                Your{" "}
                {filter === "all"
                  ? "equipment listings"
                  : filter === "published"
                    ? "live listings"
                    : `${filter} listings`}{" "}
                will appear here.
              </AppText>
            </View>
          )}

          {!loading &&
            !errorMessage &&
            shown.map((item) => (
              <MetallicFrame
                key={item.id}
                tone="gold"
                borderRadius={22}
                borderWidth={1.5}
                style={styles.card}
                contentStyle={styles.cardInside}
              >
                <View style={styles.cardRow}>
                  <View style={styles.thumb}>
                    {item.photoUrl ? (
                      <ImageBackground
                        source={{ uri: item.photoUrl }}
                        style={styles.thumbImage}
                        imageStyle={{ borderRadius: 13 }}
                      />
                    ) : (
                      <Ionicons name="images-outline" size={32} color={GOLD} />
                    )}
                  </View>
                  <View style={styles.cardInfo}>
                    <View style={styles.badge}>
                      <View
                        style={[
                          styles.dot,
                          {
                            backgroundColor:
                              item.status === "draft" ? "#E5AE4B" : "#37C985",
                          },
                        ]}
                      />
                      <AppText style={styles.badgeText}>
                        {item.status.toUpperCase()}
                      </AppText>
                    </View>
                    <AppText style={styles.itemTitle} numberOfLines={2}>
                      {item.title?.trim() || "Untitled equipment"}
                    </AppText>
                    <AppText style={styles.itemPrice}>
                      {money(item.price_gbp)}
                    </AppText>
                    <AppText style={styles.meta} numberOfLines={1}>
                      {item.category || "Category not set"}
                      {item.location ? ` · ${item.location}` : ""}
                    </AppText>
                  </View>
                </View>

                <View style={styles.line} />
                <View style={styles.dateRow}>
                  <Ionicons name="time-outline" size={16} color={MUTED} />
                  <AppText style={styles.meta}>
                    Last saved{" "}
                    {readableDate(item.updated_at || item.created_at)}
                  </AppText>
                </View>

                {item.status === "draft" ? (
                  <>
                    <AppText style={styles.draftNote}>
                      Private draft · Automatically deleted after 7 days of
                      inactivity.
                    </AppText>
                    <Pressable
                      disabled={busy !== null}
                      onPress={() => openDraft(item)}
                      style={[
                        styles.editButton,
                        busy === item.id && { opacity: 0.6 },
                      ]}
                    >
                      {busy === item.id ? (
                        <ActivityIndicator color={PALE} />
                      ) : (
                        <Ionicons
                          name="create-outline"
                          size={19}
                          color={PALE}
                        />
                      )}
                      <AppText style={styles.editText}>
                        {busy === item.id ? "OPENING…" : "CONTINUE EDITING"}
                      </AppText>
                      <Ionicons name="chevron-forward" size={18} color={PALE} />
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Delete ${item.title || "draft"}`}
                      disabled={busy !== null}
                      onPress={() => deleteDraft(item)}
                      style={[
                        styles.deleteButton,
                        busy !== null && styles.disabledButton,
                      ]}
                    >
                      {busy === item.id ? (
                        <ActivityIndicator color={PALE} />
                      ) : (
                        <Ionicons name="trash-outline" size={19} color={PALE} />
                      )}
                      <AppText style={styles.deleteText}>
                        {busy === item.id ? "PLEASE WAIT…" : "DELETE LISTING"}
                      </AppText>
                    </Pressable>
                  </>
                ) : item.status === "published" ? (
                  <View>
                    <View style={styles.infoBar}>
                      <Ionicons
                        name="calendar-outline"
                        size={17}
                        color={PALE}
                      />
                      <AppText style={styles.meta}>
                        {item.expires_at &&
                        new Date(item.expires_at).getTime() <= Date.now()
                          ? `Listing expired ${readableDate(item.expires_at)}`
                          : `Live until ${readableDate(item.expires_at)}`}
                      </AppText>
                    </View>
                    {item.expires_at &&
                    new Date(item.expires_at).getTime() > Date.now() ? (
                      <>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`Mark ${item.title || "listing"} as sold`}
                          disabled={busy !== null}
                          onPress={() => manageListing(item, "sold")}
                          style={[
                            styles.editButton,
                            busy !== null && styles.disabledButton,
                          ]}
                        >
                          {busy === item.id ? (
                            <ActivityIndicator color={PALE} />
                          ) : (
                            <Ionicons
                              name="checkmark-circle-outline"
                              size={19}
                              color={PALE}
                            />
                          )}
                          <AppText style={styles.editText}>
                            MARK AS SOLD
                          </AppText>
                        </Pressable>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`Remove ${item.title || "listing"}`}
                          disabled={busy !== null}
                          onPress={() => manageListing(item, "removed")}
                          style={[
                            styles.deleteButton,
                            busy !== null && styles.disabledButton,
                          ]}
                        >
                          <Ionicons
                            name="close-circle-outline"
                            size={19}
                            color={PALE}
                          />
                          <AppText style={styles.deleteText}>
                            REMOVE LISTING
                          </AppText>
                        </Pressable>
                      </>
                    ) : null}
                  </View>
                ) : (
                  <View style={styles.infoBar}>
                    <Ionicons
                      name="information-circle-outline"
                      size={17}
                      color={MUTED}
                    />
                    <AppText style={styles.meta}>
                      {item.status === "sold"
                        ? `Sold ${readableDate(item.sold_at)}`
                        : item.status === "removed"
                          ? `Removed ${readableDate(item.removed_at)}`
                          : item.status === "expired"
                            ? `Expired ${readableDate(item.expires_at)}`
                            : "This listing is not currently active."}
                    </AppText>
                  </View>
                )}
                {item.status === "published" &&
                  (!item.expires_at ||
                    new Date(item.expires_at).getTime() > Date.now()) && (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Edit ${item.title || "listing"}`}
                      disabled={busy !== null}
                      onPress={() =>
                        router.push({
                          pathname: "/marketplace/edit/[id]",
                          params: { id: item.id },
                        })
                      }
                      style={[
                        styles.editButton,
                        busy !== null && styles.disabledButton,
                      ]}
                    >
                      <Ionicons name="create-outline" size={19} color={PALE} />
                      <AppText style={styles.editText}>EDIT LISTING</AppText>
                      <Ionicons name="chevron-forward" size={18} color={PALE} />
                    </Pressable>
                  )}
                {(item.status === "draft" ||
                  (item.status === "published" &&
                    (!item.expires_at ||
                      new Date(item.expires_at).getTime() > Date.now()))) && (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Manage photos for ${item.title || "listing"}`}
                    disabled={busy !== null}
                    onPress={() =>
                      router.push({
                        pathname: "/marketplace/manage-photos/[id]",
                        params: { id: item.id },
                      })
                    }
                    style={[
                      styles.editButton,
                      busy !== null && styles.disabledButton,
                    ]}
                  >
                    <Ionicons name="images-outline" size={19} color={PALE} />
                    <AppText style={styles.editText}>MANAGE PHOTOS</AppText>
                    <Ionicons name="chevron-forward" size={18} color={PALE} />
                  </Pressable>
                )}
              </MetallicFrame>
            ))}

          <AppText style={styles.footer}>
            THE TRADER'S EXCHANGE · YOUR EQUIPMENT, YOUR SPACE
          </AppText>
        </View>
      </ScrollView>
    </MapTextureBackground>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  hero: {
    height: 295,
  },
  heroImage: {
    opacity: 0.98,
  },
  heroShade: {
    flex: 1,
  },
  back: {
    marginLeft: 17,
    width: 43,
    height: 43,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: GOLD,
    backgroundColor: "rgba(3,14,24,.82)",
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    paddingHorizontal: 16,
    marginTop: 9,
  },
  kicker: {
    fontFamily: typography.label,
    fontSize: 10,
    letterSpacing: 2.1,
    color: GOLD,
    marginTop: 10,
    marginBottom: 8,
  },
  heading: {
    fontFamily: typography.heading,
    fontSize: 29,
    color: "#FFF",
    marginBottom: 6,
  },
  body: {
    fontFamily: typography.body,
    fontSize: 14,
    lineHeight: 21,
    color: MUTED,
  },
  frame: {
    marginTop: 19,
    marginBottom: 14,
  },
  frameInside: {
    backgroundColor: "rgba(7,24,37,.96)",
    paddingVertical: 18,
    paddingHorizontal: 10,
    borderRadius: 20,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  stat: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  statNumber: {
    fontFamily: typography.heading,
    fontSize: 28,
    color: PALE,
  },
  statLabel: {
    fontFamily: typography.label,
    fontSize: 10,
    letterSpacing: 1.1,
    color: MUTED,
  },
  statDivider: {
    height: 35,
    width: 1,
    backgroundColor: "#75582D",
  },
  createButton: {
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: PALE,
    marginBottom: 26,
  },
  createInside: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  createText: {
    fontFamily: typography.button,
    color: "#071421",
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  sellerProfileButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 11,
    borderWidth: 1,
    borderColor: GOLD,
    backgroundColor: "rgba(7,24,37,.96)",
    borderRadius: 15,
    minHeight: 51,
    paddingHorizontal: 15,
    marginTop: -11,
    marginBottom: 26,
  },
  viewProfileButton: {
    marginTop: -14,
  },
  sellerProfileText: {
    flex: 1,
    textAlign: "center",
    fontFamily: typography.button,
    fontSize: 12,
    letterSpacing: 0.6,
    color: PALE,
  },
  sectionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  sectionTitle: {
    fontFamily: typography.label,
    color: PALE,
    fontSize: 13,
    letterSpacing: 1.5,
  },
  filters: {
    gap: 9,
    paddingBottom: 16,
  },
  chip: {
    paddingHorizontal: 17,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#A97A29",
    backgroundColor: "#0A1B29",
  },
  chipActive: {
    backgroundColor: "#E8B84D",
  },
  chipText: {
    fontFamily: typography.label,
    color: PALE,
    fontSize: 11,
    letterSpacing: 0.5,
  },
  chipTextActive: {
    color: "#071421",
  },
  state: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#8C6A32",
    backgroundColor: "rgba(7,24,37,.95)",
    padding: 30,
    alignItems: "center",
    gap: 13,
    marginTop: 7,
  },
  emptyTitle: {
    fontFamily: typography.heading,
    color: "#FFF",
    fontSize: 20,
    textAlign: "center",
  },
  link: {
    fontFamily: typography.button,
    color: PALE,
    fontSize: 13,
  },
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#A47A35",
    backgroundColor: "#091925",
    paddingVertical: 13,
    marginTop: 9,
  },
  deleteText: {
    fontFamily: typography.button,
    color: PALE,
    fontSize: 12,
    letterSpacing: 0.6,
  },
  disabledButton: {
    opacity: 0.5,
  },
  card: {
    marginBottom: 13,
  },
  cardInside: {
    backgroundColor: "rgba(7,24,37,.96)",
    borderRadius: 20,
    padding: 13,
  },
  cardRow: {
    flexDirection: "row",
    gap: 13,
  },
  thumb: {
    height: 119,
    width: 108,
    borderRadius: 13,
    backgroundColor: "#122B3B",
    borderWidth: 1,
    borderColor: "#7B6034",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  thumbImage: {
    width: "100%",
    height: "100%",
  },
  cardInfo: {
    flex: 1,
    alignItems: "flex-start",
    justifyContent: "center",
    gap: 5,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#182D39",
    borderRadius: 12,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  dot: {
    height: 7,
    width: 7,
    borderRadius: 4,
  },
  badgeText: {
    fontFamily: typography.label,
    color: PALE,
    fontSize: 9,
    letterSpacing: 1,
  },
  itemTitle: {
    fontFamily: typography.heading,
    color: "#FFF",
    fontSize: 18,
  },
  itemPrice: {
    fontFamily: typography.heading,
    color: PALE,
    fontSize: 21,
  },
  meta: {
    fontFamily: typography.body,
    color: MUTED,
    fontSize: 12,
    lineHeight: 18,
  },
  line: {
    height: 1,
    backgroundColor: "#42505A",
    marginVertical: 13,
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  draftNote: {
    fontFamily: typography.body,
    color: "#E1C88B",
    fontSize: 11,
    marginTop: 9,
  },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: GOLD,
    backgroundColor: "#0C2230",
    paddingVertical: 14,
    marginTop: 13,
  },
  editText: {
    fontFamily: typography.button,
    color: PALE,
    fontSize: 13,
    letterSpacing: 0.5,
  },
  infoBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginTop: 10,
  },
  footer: {
    fontFamily: typography.label,
    color: "#7B8790",
    fontSize: 9,
    letterSpacing: 0.8,
    textAlign: "center",
    marginTop: 19,
  },
});
