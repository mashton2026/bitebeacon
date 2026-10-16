import { Ionicons } from "@expo/vector-icons";
import { router, Stack } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    TextInput,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import AppText from "../../components/AppText";
import MapTextureBackground from "../../components/MapTextureBackground";
import MetallicFrame from "../../components/MetallicFrame";
import { supabase } from "../../lib/supabase";

const NAVY = "#07131F";
const GOLD = "#FFD05C";
const PALE = "#F3DCA1";
const WHITE = "#F7F3EA";
const MUTED = "#AAB7C2";

type SellerType = "individual" | "business";
type Form = {
  display_name: string;
  seller_type: SellerType;
  location: string;
  about: string;
  instagram_url: string;
  facebook_url: string;
  website_url: string;
};

const EMPTY: Form = {
  display_name: "",
  seller_type: "individual",
  location: "",
  about: "",
  instagram_url: "",
  facebook_url: "",
  website_url: "",
};

function cleanUrl(
  value: string,
  label: string,
  hosts?: string[],
): string | null {
  const raw = value.trim();
  if (!raw) return null;
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error(`${label}: enter a full https:// link.`);
  }
  if (parsed.protocol !== "https:" || parsed.username || parsed.password) {
    throw new Error(
      `${label}: use a secure https:// link without a username or password.`,
    );
  }
  if (
    hosts &&
    !hosts.some(
      (host) =>
        parsed.hostname === host || parsed.hostname.endsWith(`.${host}`),
    )
  ) {
    throw new Error(`${label}: please use a link to ${hosts.join(" or ")}.`);
  }
  if (raw.length > 500) throw new Error(`${label}: the link is too long.`);
  return raw;
}

export default function SellerProfileEditor() {
  const insets = useSafeAreaInsets();
  const [form, setForm] = useState<Form>(EMPTY);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!auth.user) {
        setUserId(null);
        setLoadError(true);
        return;
      }
      setUserId(auth.user.id);
      const { data, error } = await supabase
        .from("marketplace_seller_profiles")
        .select(
          "display_name,seller_type,location,about,instagram_url,facebook_url,website_url",
        )
        .eq("user_id", auth.user.id)
        .maybeSingle();
      if (error) throw error;
      setForm(
        data
          ? {
              display_name: data.display_name ?? "",
              seller_type:
                data.seller_type === "business" ? "business" : "individual",
              location: data.location ?? "",
              about: data.about ?? "",
              instagram_url: data.instagram_url ?? "",
              facebook_url: data.facebook_url ?? "",
              website_url: data.website_url ?? "",
            }
          : { ...EMPTY },
      );
    } catch (error) {
      console.warn("Seller profile load failed", error);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const change = (field: keyof Form, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const save = async () => {
    if (loading || saving || loadError || !userId) return;
    const name = form.display_name.trim();
    if (name.length < 2 || name.length > 80) {
      Alert.alert(
        "Display name required",
        "Enter a name between 2 and 80 characters.",
      );
      return;
    }
    if (form.location.trim().length > 120 || form.about.trim().length > 1000) {
      Alert.alert(
        "Text too long",
        "Location must be under 120 characters and About under 1,000.",
      );
      return;
    }
    let instagram: string | null;
    let facebook: string | null;
    let website: string | null;
    try {
      instagram = cleanUrl(form.instagram_url, "Instagram", ["instagram.com"]);
      facebook = cleanUrl(form.facebook_url, "Facebook", [
        "facebook.com",
        "fb.com",
      ]);
      website = cleanUrl(form.website_url, "Website");
    } catch (error) {
      Alert.alert(
        "Check your links",
        error instanceof Error ? error.message : "Please check your links.",
      );
      return;
    }

    setSaving(true);
    try {
      // Recheck identity immediately before writing; RLS also enforces ownership.
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (authError || !auth.user || auth.user.id !== userId) {
        throw new Error("Your sign-in changed. Please reopen this screen.");
      }
      const { error } = await supabase
        .from("marketplace_seller_profiles")
        .upsert(
          {
            user_id: userId,
            display_name: name,
            seller_type: form.seller_type,
            location: form.location.trim() || null,
            about: form.about.trim() || null,
            instagram_url: instagram,
            facebook_url: facebook,
            website_url: website,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" },
        );
      if (error) throw error;
      Alert.alert("Profile saved", "Your seller profile has been saved.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (error) {
      console.warn("Seller profile save failed", error);
      Alert.alert(
        "Could not save profile",
        "Nothing was deleted. Please check your connection and try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  const field = (
    label: string,
    key: Exclude<keyof Form, "seller_type">,
    placeholder: string,
    maxLength: number,
    multiline = false,
  ) => (
    <View style={styles.field}>
      <AppText variant="label" style={styles.label}>
        {label}
      </AppText>
      <TextInput
        style={[styles.input, multiline && styles.multiline]}
        value={form[key]}
        onChangeText={(text) => change(key, text)}
        placeholder={placeholder}
        placeholderTextColor="#758792"
        selectionColor={GOLD}
        maxLength={maxLength}
        multiline={multiline}
        textAlignVertical={multiline ? "top" : "center"}
        autoCapitalize={key.includes("url") ? "none" : "sentences"}
        autoCorrect={!key.includes("url")}
        keyboardType={key.includes("url") ? "url" : "default"}
      />
    </View>
  );

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <MapTextureBackground>
        <KeyboardAvoidingView
          style={styles.screen}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{
              paddingTop: insets.top + 16,
              paddingBottom: insets.bottom + 45,
              paddingHorizontal: 20,
            }}
          >
            <Pressable
              onPress={() => router.back()}
              style={styles.back}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <Ionicons name="chevron-back" size={21} color={PALE} />
              <AppText variant="label" style={styles.backText}>
                BACK
              </AppText>
            </Pressable>
            <AppText variant="label" style={styles.eyebrow}>
              THE TRADER'S EXCHANGE
            </AppText>
            <AppText variant="heading" style={styles.heading}>
              Your Seller Profile
            </AppText>
            <AppText variant="body" style={styles.description}>
              Introduce yourself to buyers. Your profile becomes public only
              while you have an active listing for sale.
            </AppText>

            {loading ? (
              <ActivityIndicator
                color={GOLD}
                size="large"
                style={{ marginTop: 45 }}
              />
            ) : loadError ? (
              <View style={styles.state}>
                <AppText variant="body" style={styles.description}>
                  We couldn't load your seller profile. Sign in and try again.
                </AppText>
                <Pressable onPress={() => void load()} style={styles.retry}>
                  <AppText variant="label" style={styles.retryText}>
                    TRY AGAIN
                  </AppText>
                </Pressable>
              </View>
            ) : (
              <>
                <MetallicFrame
                  tone="gold"
                  borderRadius={18}
                  borderWidth={1.5}
                  style={styles.frame}
                  contentStyle={styles.panel}
                >
                  <AppText variant="label" style={styles.label}>
                    SELLER TYPE
                  </AppText>
                  <View style={styles.typeRow}>
                    {(["individual", "business"] as SellerType[]).map(
                      (type) => (
                        <Pressable
                          key={type}
                          accessibilityRole="button"
                          accessibilityState={{
                            selected: form.seller_type === type,
                          }}
                          onPress={() => change("seller_type", type)}
                          style={[
                            styles.typeButton,
                            form.seller_type === type && styles.typeSelected,
                          ]}
                        >
                          <Ionicons
                            name={
                              type === "business"
                                ? "storefront-outline"
                                : "person-outline"
                            }
                            size={17}
                            color={form.seller_type === type ? NAVY : PALE}
                          />
                          <AppText
                            variant="label"
                            style={[
                              styles.typeText,
                              form.seller_type === type &&
                                styles.typeTextSelected,
                            ]}
                          >
                            {type === "business" ? "BUSINESS" : "INDIVIDUAL"}
                          </AppText>
                        </Pressable>
                      ),
                    )}
                  </View>
                  {field(
                    "DISPLAY NAME *",
                    "display_name",
                    "Your name or trading name",
                    80,
                  )}
                  {field(
                    "GENERAL LOCATION (OPTIONAL)",
                    "location",
                    "e.g. Cornwall, UK",
                    120,
                  )}
                  {field(
                    "ABOUT YOU (OPTIONAL)",
                    "about",
                    "Tell buyers a little about yourself or your business",
                    1000,
                    true,
                  )}
                </MetallicFrame>

                <MetallicFrame
                  tone="gold"
                  borderRadius={18}
                  borderWidth={1.5}
                  style={styles.frame}
                  contentStyle={styles.panel}
                >
                  <View style={styles.socialHeading}>
                    <Ionicons name="link-outline" size={21} color={GOLD} />
                    <AppText variant="heading" style={styles.sectionHeading}>
                      Find You Online
                    </AppText>
                  </View>
                  <AppText variant="body" style={styles.hint}>
                    Optional for businesses and individuals. Only add links you
                    want buyers to see publicly.
                  </AppText>
                  {field(
                    "INSTAGRAM",
                    "instagram_url",
                    "https://www.instagram.com/yourname",
                    500,
                  )}
                  {field(
                    "FACEBOOK",
                    "facebook_url",
                    "https://www.facebook.com/yourpage",
                    500,
                  )}
                  {field(
                    "WEBSITE",
                    "website_url",
                    "https://yourwebsite.com",
                    500,
                  )}
                </MetallicFrame>

                <AppText variant="body" style={styles.privacy}>
                  Your email address and private account details are not
                  included in this profile. Social links may lead buyers to
                  external websites.
                </AppText>
                <Pressable
                  onPress={() => void save()}
                  disabled={saving}
                  style={[styles.saveButton, saving && { opacity: 0.6 }]}
                  accessibilityRole="button"
                >
                  {saving ? (
                    <ActivityIndicator color={NAVY} />
                  ) : (
                    <Ionicons
                      name="checkmark-circle-outline"
                      size={21}
                      color={NAVY}
                    />
                  )}
                  <AppText variant="label" style={styles.saveText}>
                    {saving ? "SAVING…" : "SAVE SELLER PROFILE"}
                  </AppText>
                </Pressable>
              </>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </MapTextureBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: NAVY },
  back: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 10,
    marginBottom: 23,
  },
  backText: { color: PALE, fontSize: 11, letterSpacing: 1.2 },
  eyebrow: { color: GOLD, fontSize: 10, letterSpacing: 1.7, marginBottom: 8 },
  heading: { color: WHITE, fontSize: 29, lineHeight: 36 },
  description: { color: MUTED, fontSize: 13, lineHeight: 21, marginTop: 10 },
  frame: { marginTop: 23 },
  panel: {
    padding: 18,
    backgroundColor: "rgba(7,24,37,.97)",
    borderRadius: 16,
  },
  label: { color: PALE, fontSize: 10, letterSpacing: 1.1, marginBottom: 9 },
  field: { marginTop: 20 },
  input: {
    minHeight: 49,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: "rgba(218,175,89,.50)",
    backgroundColor: "#0B2230",
    color: WHITE,
    fontSize: 14,
    paddingHorizontal: 13,
    paddingVertical: 11,
  },
  multiline: { minHeight: 110 },
  typeRow: { flexDirection: "row", gap: 10 },
  typeButton: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 7,
    borderWidth: 1,
    borderColor: GOLD,
    borderRadius: 11,
    minHeight: 45,
  },
  typeSelected: { backgroundColor: GOLD },
  typeText: { color: PALE, fontSize: 10, letterSpacing: 0.5 },
  typeTextSelected: { color: NAVY },
  socialHeading: { flexDirection: "row", alignItems: "center", gap: 10 },
  sectionHeading: { color: WHITE, fontSize: 21 },
  hint: { color: MUTED, fontSize: 12, lineHeight: 19, marginTop: 9 },
  privacy: {
    color: MUTED,
    fontSize: 12,
    lineHeight: 19,
    marginTop: 24,
    textAlign: "center",
  },
  saveButton: {
    marginTop: 20,
    backgroundColor: GOLD,
    borderRadius: 14,
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 11,
  },
  saveText: { color: NAVY, fontSize: 12, letterSpacing: 0.9 },
  state: { paddingTop: 30, alignItems: "center" },
  retry: {
    padding: 15,
    marginTop: 15,
    borderWidth: 1,
    borderColor: GOLD,
    borderRadius: 12,
  },
  retryText: { color: PALE },
});
