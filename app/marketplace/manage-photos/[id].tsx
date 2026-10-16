import { Ionicons } from "@expo/vector-icons";
import { File } from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AppText from "../../../components/AppText";
import MapTextureBackground from "../../../components/MapTextureBackground";
import MetallicFrame from "../../../components/MetallicFrame";
import { typography } from "../../../constants/typography";
import { supabase } from "../../../lib/supabase";

const GOLD = "#D89A27";
const PALE = "#FFE29A";
const MUTED = "#B3C2CC";

type Photo = {
  id: string;
  display_order: number;
  storage_path: string;
  upload_status: string;
  url?: string;
};
type Listing = {
  id: string;
  title: string | null;
  status: string;
  expires_at: string | null;
};

export default function ManagePhotosScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const [listing, setListing] = useState<Listing | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);

  const load = useCallback(
    async (refresh = false) => {
      if (refresh) setRefreshing(true);
      else setLoading(true);
      setError("");
      try {
        if (!id || typeof id !== "string") throw new Error("Invalid listing.");
        const { data: auth, error: authError } = await supabase.auth.getUser();
        if (authError || !auth.user) throw new Error("Please sign in again.");
        const { data: ownListing, error: listingError } = await supabase
          .from("marketplace_listings")
          .select("id,title,status,expires_at")
          .eq("id", id)
          .eq("seller_id", auth.user.id)
          .maybeSingle();
        if (listingError) throw listingError;
        if (!ownListing)
          throw new Error("Listing unavailable or access denied.");
        if (
          ownListing.status !== "draft" &&
          ownListing.status !== "published"
        ) {
          throw new Error("Photographs on this listing are locked.");
        }
        setListing(ownListing as Listing);
        const { data: rows, error: photoError } = await supabase
          .from("marketplace_listing_photos")
          .select("id,display_order,storage_path,upload_status")
          .eq("listing_id", id)
          .order("display_order", { ascending: true });
        if (photoError) throw photoError;
        const withUrls: Photo[] = await Promise.all(
          (rows || []).map(async (photo) => {
            if (photo.upload_status !== "uploaded") return photo;
            const { data } = await supabase.storage
              .from("marketplace-photos")
              .createSignedUrl(photo.storage_path, 3600);
            return { ...photo, url: data?.signedUrl };
          }),
        );
        setPhotos(withUrls);
      } catch (e) {
        setListing(null);
        setPhotos([]);
        setError(
          e instanceof Error ? e.message : "Could not load photographs.",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [id],
  );

  useEffect(() => {
    void load();
  }, [load]);
  // Display photos consecutively even if database display_order has gaps after deletion.
  // Keep stored display_order intact: only the server-side reorder RPC may change it.
  const galleryPhotos = photos
    .slice()
    .sort((a, b) => a.display_order - b.display_order);
  const uploaded = galleryPhotos.filter((p) => p.upload_status === "uploaded");
  const unfinished = photos.some((p) => p.upload_status !== "uploaded");
  const locked =
    listing?.status === "published" &&
    !!listing.expires_at &&
    new Date(listing.expires_at).getTime() <= Date.now();

  const canEdit = !!listing && !locked && !busy && !loading;

  const addPhoto = async () => {
    if (!canEdit || !id || typeof id !== "string") return;
    if (photos.length >= 5)
      return Alert.alert(
        "Five photographs",
        "Remove a photograph before adding another.",
      );
    if (unfinished)
      return Alert.alert(
        "Unfinished upload",
        "An existing photo reservation must be resolved first.",
      );
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: false,
      quality: 0.75,
    });
    if (picked.canceled || !picked.assets[0]) return;
    setBusy(true);
    try {
      const uri = picked.assets[0].uri;
      const file = new File(uri);
      if (!file.exists)
        throw new Error("The selected photograph is unavailable.");
      if (file.size > 5 * 1024 * 1024)
        throw new Error("Photographs must be smaller than 5 MB.");
      const extensionMatch = uri.split("?")[0].match(/\.(jpe?g|png|webp)$/i);
      const extension =
        extensionMatch?.[1]?.toLowerCase() === "jpeg"
          ? "jpg"
          : extensionMatch?.[1]?.toLowerCase() || "jpg";
      const contentType =
        extension === "png"
          ? "image/png"
          : extension === "webp"
            ? "image/webp"
            : "image/jpeg";
      const { data: reservations, error: reservationError } =
        await supabase.rpc("marketplace_reserve_photo", {
          p_listing_id: id,
          p_extension: extension,
        });
      if (reservationError) throw reservationError;
      const slot = reservations?.[0];
      if (!slot?.photo_id || !slot?.storage_path)
        throw new Error("The server did not reserve a photo slot.");
      const { error: uploadError } = await supabase.storage
        .from("marketplace-photos")
        .upload(slot.storage_path, await file.arrayBuffer(), {
          contentType,
          upsert: false,
        });
      if (uploadError) throw uploadError;
      const { error: completionError } = await supabase.rpc(
        "marketplace_complete_photo_upload",
        { p_photo_id: slot.photo_id },
      );
      if (completionError) throw completionError;
      await load(true);
    } catch (e) {
      Alert.alert(
        "Could not add photograph",
        e instanceof Error ? e.message : "Please try again.",
      );
      await load(true);
    } finally {
      setBusy(false);
    }
  };

  const deletePhoto = (photo: Photo) => {
    if (!canEdit) return;
    if (listing?.status === "published" && uploaded.length <= 1) {
      return Alert.alert(
        "Keep one photograph",
        "Published listings must have at least one photograph. Add a replacement first.",
      );
    }
    Alert.alert(
      "Delete photograph?",
      "This permanently removes the selected photograph.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            void (async () => {
              setBusy(true);
              try {
                const { data, error: deleteError } =
                  await supabase.functions.invoke("marketplace-delete-photo", {
                    body: { photo_id: photo.id },
                  });
                if (deleteError || data?.success !== true)
                  throw new Error(
                    data?.error ||
                      deleteError?.message ||
                      "The server did not confirm deletion.",
                  );
                await load(true);
              } catch (e) {
                Alert.alert(
                  "Could not delete photograph",
                  e instanceof Error ? e.message : "Please try again.",
                );
                await load(true);
              } finally {
                setBusy(false);
              }
            })();
          },
        },
      ],
    );
  };

  const movePhoto = async (photo: Photo, direction: -1 | 1) => {
    if (!canEdit || !id || typeof id !== "string") return;
    const ordered = uploaded
      .slice()
      .sort((a, b) => a.display_order - b.display_order);
    const index = ordered.findIndex((p) => p.id === photo.id);
    const other = ordered[index + direction];
    if (!other) return;
    setBusy(true);
    try {
      const newOrder = ordered.map((p) => p.id);
      [newOrder[index], newOrder[index + direction]] = [
        newOrder[index + direction],
        newOrder[index],
      ];
      const { error: reorderError } = await supabase.rpc(
        "marketplace_reorder_photos",
        { p_listing_id: id, p_photo_ids: newOrder },
      );
      if (reorderError) throw reorderError;
      await load(true);
    } catch (e) {
      Alert.alert(
        "Could not reorder photographs",
        e instanceof Error ? e.message : "Please try again.",
      );
      await load(true);
    } finally {
      setBusy(false);
    }
  };

  const setCoverPhoto = async (photo: Photo) => {
    if (
      !canEdit ||
      !id ||
      typeof id !== "string" ||
      photo.upload_status !== "uploaded"
    )
      return;
    const ordered = uploaded
      .slice()
      .sort((a, b) => a.display_order - b.display_order);
    if (ordered[0]?.id === photo.id) return;
    setBusy(true);
    try {
      const newOrder = [
        photo.id,
        ...ordered.filter((p) => p.id !== photo.id).map((p) => p.id),
      ];
      const { error: reorderError } = await supabase.rpc(
        "marketplace_reorder_photos",
        {
          p_listing_id: id,
          p_photo_ids: newOrder,
        },
      );
      if (reorderError) throw reorderError;
      await load(true);
    } catch (e) {
      Alert.alert(
        "Could not set cover photo",
        e instanceof Error ? e.message : "Please try again.",
      );
      await load(true);
    } finally {
      setBusy(false);
    }
  };

  const replacePhoto = async (photo: Photo) => {
    if (!canEdit || photo.upload_status !== "uploaded") return;

    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: false,
      quality: 0.75,
    });
    if (picked.canceled || !picked.assets[0]) return;

    setBusy(true);
    try {
      const file = new File(picked.assets[0].uri);
      if (!file.exists)
        throw new Error("The selected photograph is unavailable.");
      if (file.size <= 0 || file.size > 5 * 1024 * 1024) {
        throw new Error("Photographs must be smaller than 5 MB.");
      }

      // The Edge Function validates the image's actual bytes and format.
      const imageBase64 = await file.base64();
      const { data, error: replaceError } = await supabase.functions.invoke(
        "marketplace-replace-photo",
        {
          body: {
            photo_id: photo.id,
            image_base64: imageBase64,
          },
        },
      );

      if (replaceError || data?.success !== true) {
        throw new Error(
          data?.error ||
            replaceError?.message ||
            "The server did not confirm the replacement.",
        );
      }

      await load(true);
      if (data.cleanup_pending) {
        Alert.alert(
          "Photograph replaced",
          "Your new photograph is active. Background cleanup of the old image is still pending.",
        );
      }
    } catch (e) {
      Alert.alert(
        "Could not replace photograph",
        e instanceof Error ? e.message : "Please try again.",
      );
      await load(true);
    } finally {
      setBusy(false);
    }
  };

  const photoOptions = (photo: Photo) => {
    if (!canEdit || photo.upload_status !== "uploaded") return;
    setSelectedPhoto(photo);
  };

  const choosePhotoAction = (action: (photo: Photo) => void) => {
    const photo = selectedPhoto;
    setSelectedPhoto(null);
    if (photo) action(photo);
  };

  const selectedIndex = selectedPhoto
    ? uploaded.findIndex((photo) => photo.id === selectedPhoto.id)
    : -1;

  return (
    <MapTextureBackground>
      <ScrollView
        style={styles.fill}
        contentContainerStyle={{ paddingBottom: insets.bottom + 48 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void load(true)}
            tintColor={PALE}
          />
        }
      >
        <View style={[styles.top, { paddingTop: insets.top + 14 }]}>
          <Pressable
            onPress={() => router.back()}
            accessibilityLabel="Back to my listings"
            style={styles.back}
          >
            <Ionicons name="arrow-back" size={23} color={PALE} />
          </Pressable>
          <AppText style={styles.brand}>THE TRADER'S EXCHANGE</AppText>
        </View>
        <View style={styles.content}>
          <AppText style={styles.kicker}>YOUR LISTING STUDIO / PHOTOS</AppText>
          <AppText style={styles.title}>Manage photos</AppText>
          <AppText style={styles.subtitle}>
            Show your equipment at its best.
          </AppText>
          {loading ? (
            <View style={styles.state}>
              <ActivityIndicator color={PALE} size="large" />
            </View>
          ) : error ? (
            <MetallicFrame
              tone="gold"
              borderRadius={20}
              borderWidth={1.5}
              contentStyle={styles.panel}
            >
              <Ionicons name="alert-circle-outline" size={30} color={PALE} />
              <AppText style={styles.info}>{error}</AppText>
              <Pressable
                onPress={() => void load()}
                style={styles.outlineButton}
              >
                <AppText style={styles.outlineText}>TRY AGAIN</AppText>
              </Pressable>
            </MetallicFrame>
          ) : listing ? (
            <>
              <MetallicFrame
                tone="gold"
                borderRadius={20}
                borderWidth={1.5}
                contentStyle={styles.panel}
              >
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <AppText style={styles.small}>MANAGING LISTING</AppText>
                    <AppText style={styles.listingTitle}>
                      {listing.title?.trim() || "Untitled equipment"}
                    </AppText>
                  </View>
                  <View style={styles.badge}>
                    <AppText style={styles.badgeText}>
                      {listing.status.toUpperCase()}
                    </AppText>
                  </View>
                </View>
                <View style={styles.divider} />
                <View style={styles.row}>
                  <AppText style={styles.small}>YOUR PHOTOGRAPHS</AppText>
                  <AppText style={styles.counter}>
                    {uploaded.length} / 5
                  </AppText>
                </View>
                {busy && <ActivityIndicator color={PALE} />}
                {unfinished && (
                  <AppText style={styles.warning}>
                    An unfinished upload reservation exists. We'll need to
                    resolve it before adding more photos.
                  </AppText>
                )}
                {locked && (
                  <AppText style={styles.warning}>
                    This listing has expired. Photo editing is unavailable.
                  </AppText>
                )}
              </MetallicFrame>
              <AppText style={styles.section}>MAIN PHOTOGRAPH</AppText>
              <MetallicFrame
                tone="gold"
                borderRadius={20}
                borderWidth={2}
                contentStyle={styles.mainCard}
              >
                {uploaded[0]?.url ? (
                  <Image
                    source={{ uri: uploaded[0].url }}
                    style={styles.mainImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.mainEmpty}>
                    <Ionicons name="images-outline" size={45} color={GOLD} />
                    <AppText style={styles.info}>No preview available</AppText>
                  </View>
                )}
                <LinearGradient
                  colors={["#FFF2BD", "#E9A32A"]}
                  style={styles.mainLabel}
                >
                  <Ionicons name="star" size={14} color="#071421" />
                  <AppText style={styles.mainLabelText}>COVER PHOTO</AppText>
                </LinearGradient>
              </MetallicFrame>
              <AppText style={styles.section}>PHOTO GALLERY</AppText>
              <AppText style={styles.info}>
                The first photo is shown as the cover. Up to five photos can be
                displayed.
              </AppText>
              <View style={styles.grid}>
                {Array.from({ length: 5 }, (_, index) => {
                  const photo = galleryPhotos[index];
                  const isUploaded = photo?.upload_status === "uploaded";
                  const isCover =
                    !!photo &&
                    uploaded
                      .slice()
                      .sort((a, b) => a.display_order - b.display_order)[0]
                      ?.id === photo.id;
                  return (
                    <View key={index} style={styles.tile}>
                      <Pressable
                        disabled={!canEdit}
                        onPress={() =>
                          photo ? photoOptions(photo) : void addPhoto()
                        }
                        accessibilityRole="button"
                        accessibilityLabel={
                          photo
                            ? `Manage photograph ${index + 1}`
                            : `Add photograph in slot ${index + 1}`
                        }
                      >
                        {photo?.url ? (
                          <Image
                            source={{ uri: photo.url }}
                            style={styles.tileImage}
                          />
                        ) : (
                          <View style={styles.tileEmpty}>
                            <Ionicons
                              name={photo ? "hourglass-outline" : "add-outline"}
                              size={30}
                              color={GOLD}
                            />
                          </View>
                        )}
                        <View style={styles.tileFooter}>
                          <AppText style={styles.tileLabel}>
                            {isCover
                              ? `0${index + 1} · COVER`
                              : `0${index + 1} · PHOTO`}
                          </AppText>
                          {photo?.upload_status === "reserved" && (
                            <Ionicons
                              name="time-outline"
                              size={14}
                              color={PALE}
                            />
                          )}
                        </View>
                      </Pressable>
                      {photo && isUploaded && (
                        <View style={styles.tileActions}>
                          <Pressable
                            disabled={!canEdit || isCover}
                            onPress={() => void setCoverPhoto(photo)}
                            accessibilityRole="button"
                            accessibilityLabel={
                              isCover
                                ? "Current cover photograph"
                                : `Make photograph ${index + 1} the cover`
                            }
                            style={[
                              styles.coverButton,
                              (!canEdit || isCover) && styles.actionDisabled,
                            ]}
                          >
                            <Ionicons
                              name={isCover ? "star" : "star-outline"}
                              size={15}
                              color={PALE}
                            />
                            <AppText style={styles.actionText}>
                              {isCover ? "COVER" : "SET COVER"}
                            </AppText>
                          </Pressable>
                          <Pressable
                            disabled={
                              !canEdit ||
                              (listing.status === "published" &&
                                uploaded.length <= 1)
                            }
                            onPress={() => deletePhoto(photo)}
                            accessibilityRole="button"
                            accessibilityLabel={`Delete photograph ${index + 1}`}
                            style={[
                              styles.deleteButton,
                              (!canEdit ||
                                (listing.status === "published" &&
                                  uploaded.length <= 1)) &&
                                styles.actionDisabled,
                            ]}
                          >
                            <Ionicons
                              name="trash-outline"
                              size={15}
                              color="#FFB9AC"
                            />
                            <AppText style={styles.deleteText}>DELETE</AppText>
                          </Pressable>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
              <Pressable
                style={styles.outlineButton}
                onPress={() => router.back()}
              >
                <Ionicons
                  name="checkmark-circle-outline"
                  size={19}
                  color={PALE}
                />
                <AppText style={styles.outlineText}>
                  BACK TO MY LISTINGS
                </AppText>
              </Pressable>
            </>
          ) : null}
        </View>
      </ScrollView>
      <Modal
        visible={!!selectedPhoto}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedPhoto(null)}
      >
        <View style={styles.modalBackdrop}>
          <Pressable
            style={StyleSheet.absoluteFillObject}
            onPress={() => setSelectedPhoto(null)}
            accessibilityLabel="Close photograph options"
          />
          <View style={styles.modalCard}>
            <AppText style={styles.modalTitle}>Manage photograph</AppText>
            <AppText style={styles.modalDescription}>
              Choose what to do with this photograph.
            </AppText>
            <Pressable
              style={styles.modalAction}
              onPress={() =>
                choosePhotoAction((photo) => void replacePhoto(photo))
              }
            >
              <AppText style={styles.modalActionText}>REPLACE</AppText>
            </Pressable>
            {selectedIndex > 0 && (
              <Pressable
                style={styles.modalAction}
                onPress={() =>
                  choosePhotoAction((photo) => void movePhoto(photo, -1))
                }
              >
                <AppText style={styles.modalActionText}>
                  MOVE IMAGE LEFT
                </AppText>
              </Pressable>
            )}
            {selectedIndex >= 0 && selectedIndex < uploaded.length - 1 && (
              <Pressable
                style={styles.modalAction}
                onPress={() =>
                  choosePhotoAction((photo) => void movePhoto(photo, 1))
                }
              >
                <AppText style={styles.modalActionText}>
                  MOVE IMAGE FORWARD
                </AppText>
              </Pressable>
            )}
            <Pressable
              style={styles.modalAction}
              onPress={() => choosePhotoAction((photo) => deletePhoto(photo))}
            >
              <AppText style={styles.modalDeleteText}>DELETE</AppText>
            </Pressable>
            <Pressable
              style={[styles.modalAction, styles.modalCancel]}
              onPress={() => setSelectedPhoto(null)}
              accessibilityRole="button"
              accessibilityLabel="Cancel photograph options"
            >
              <AppText style={styles.modalActionText}>CANCEL</AppText>
            </Pressable>
          </View>
        </View>
      </Modal>
    </MapTextureBackground>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  modalCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: GOLD,
    backgroundColor: "#091B29",
    padding: 22,
  },
  modalTitle: {
    color: PALE,
    fontFamily: typography.heading,
    fontSize: 22,
  },
  modalDescription: {
    color: MUTED,
    fontFamily: typography.body,
    fontSize: 14,
    marginTop: 8,
    marginBottom: 18,
  },
  modalAction: {
    minHeight: 46,
    justifyContent: "center",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#31414A",
  },
  modalActionText: {
    color: PALE,
    fontFamily: typography.button,
    fontSize: 12,
    letterSpacing: 0.5,
  },
  modalDeleteText: {
    color: "#FFB9AC",
    fontFamily: typography.button,
    fontSize: 12,
  },
  modalCancel: {
    borderWidth: 1,
    borderBottomWidth: 1,
    borderColor: GOLD,
    borderRadius: 10,
    marginTop: 16,
    minHeight: 48,
    overflow: "hidden",
  },
  fill: { flex: 1 },
  top: {
    paddingHorizontal: 17,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingBottom: 24,
  },
  back: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: GOLD,
    backgroundColor: "#081B29",
    alignItems: "center",
    justifyContent: "center",
  },
  brand: {
    color: PALE,
    fontFamily: typography.label,
    letterSpacing: 1.3,
    fontSize: 11,
  },
  content: { paddingHorizontal: 17 },
  kicker: {
    color: GOLD,
    fontFamily: typography.label,
    fontSize: 11,
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  title: { color: "#FFF", fontFamily: typography.heading, fontSize: 32 },
  subtitle: {
    color: MUTED,
    fontFamily: typography.body,
    fontSize: 15,
    marginTop: 5,
    marginBottom: 22,
  },
  state: { padding: 40, alignItems: "center" },
  panel: {
    padding: 18,
    borderRadius: 18,
    backgroundColor: "rgba(7,24,37,.96)",
    gap: 13,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    justifyContent: "space-between",
  },
  small: {
    color: MUTED,
    fontFamily: typography.label,
    fontSize: 11,
    letterSpacing: 1,
  },
  listingTitle: {
    color: "#FFF",
    fontFamily: typography.heading,
    fontSize: 17,
    marginTop: 5,
  },
  badge: {
    borderWidth: 1,
    borderColor: GOLD,
    borderRadius: 15,
    paddingVertical: 7,
    paddingHorizontal: 10,
  },
  badgeText: { color: PALE, fontFamily: typography.label, fontSize: 10 },
  divider: { height: 1, backgroundColor: "#4D4A40", marginVertical: 3 },
  counter: { color: PALE, fontFamily: typography.heading, fontSize: 20 },
  warning: {
    color: "#FFD38B",
    fontFamily: typography.body,
    fontSize: 12,
    lineHeight: 19,
  },
  section: {
    color: PALE,
    fontFamily: typography.label,
    fontSize: 13,
    letterSpacing: 1.3,
    marginTop: 25,
    marginBottom: 11,
  },
  mainCard: {
    backgroundColor: "#071825",
    borderRadius: 18,
    overflow: "hidden",
  },
  mainImage: { width: "100%", height: 230 },
  mainEmpty: {
    height: 230,
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
  },
  mainLabel: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    padding: 12,
  },
  mainLabelText: {
    color: "#071421",
    fontFamily: typography.button,
    fontSize: 12,
    letterSpacing: 1,
  },
  info: {
    color: MUTED,
    fontFamily: typography.body,
    fontSize: 13,
    lineHeight: 20,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 13,
    marginBottom: 17,
  },
  tile: {
    width: "47%",
    backgroundColor: "#091B29",
    borderRadius: 13,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#9A7538",
  },
  tileImage: { width: "100%", height: 125 },
  tileEmpty: {
    height: 125,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#102B3A",
  },
  tileFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  tileLabel: {
    color: PALE,
    fontFamily: typography.label,
    fontSize: 10,
    letterSpacing: 0.5,
  },
  tileActions: {
    flexDirection: "row",
    gap: 5,
    paddingHorizontal: 7,
    paddingBottom: 9,
  },
  coverButton: {
    flex: 1,
    minHeight: 35,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: GOLD,
    borderRadius: 8,
    paddingHorizontal: 3,
  },
  deleteButton: {
    flex: 1,
    minHeight: 35,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: "#A86A61",
    borderRadius: 8,
    paddingHorizontal: 3,
  },
  actionDisabled: { opacity: 0.4 },
  actionText: { color: PALE, fontFamily: typography.button, fontSize: 9 },
  deleteText: { color: "#FFB9AC", fontFamily: typography.button, fontSize: 9 },
  disabledButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: "#465560",
    backgroundColor: "#10212B",
    borderRadius: 13,
    padding: 14,
    opacity: 0.72,
  },
  disabledText: {
    color: MUTED,
    fontFamily: typography.button,
    fontSize: 10,
    letterSpacing: 0.4,
  },
  outlineButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: GOLD,
    borderRadius: 14,
    padding: 15,
    marginTop: 17,
    marginBottom: 15,
  },
  outlineText: {
    color: PALE,
    fontFamily: typography.button,
    fontSize: 12,
    letterSpacing: 0.6,
  },
});
