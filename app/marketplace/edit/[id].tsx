import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
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
import AppText from "../../../components/AppText";
import MapTextureBackground from "../../../components/MapTextureBackground";
import MetallicFrame from "../../../components/MetallicFrame";
import { supabase } from "../../../lib/supabase";

const GOLD = "#D89A27";
const PALE = "#FFE29A";
const MUTED = "#B3C2CC";
const CATEGORIES = [
  "Vans & Trailers",
  "Cooking",
  "Refrigeration",
  "Power & Utilities",
  "Drinks Equipment",
  "Trading Gear",
  "Complete Setups",
];
const CONDITIONS = ["New", "Excellent", "Good", "Used / Working", "For parts"];
const DELIVERY = ["Collection", "Delivery available", "Both"];
type Form = {
  category: string;
  title: string;
  condition: string;
  description: string;
  price: string;
  location: string;
  specs: Record<string, string>;
  delivery: string;
  workingCondition: string;
  knownFaults: string;
  serviceHistory: string;
  reasonForSale: string;
  paperwork: boolean;
};
const empty: Form = {
  category: "",
  title: "",
  condition: "",
  description: "",
  price: "",
  location: "",
  specs: {},
  delivery: "",
  workingCondition: "",
  knownFaults: "",
  serviceHistory: "",
  reasonForSale: "",
  paperwork: false,
};

export default function EditMarketplaceListing() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const [form, setForm] = useState<Form>(empty);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sellerId, setSellerId] = useState<string | null>(null);
  const [originalUpdatedAt, setOriginalUpdatedAt] = useState<string | null>(
    null,
  );
  const [specKeys, setSpecKeys] = useState<string[]>([]);
  const [newSpecKey, setNewSpecKey] = useState("");
  const [errorText, setErrorText] = useState("");
  const set = (key: keyof Form, value: any) =>
    setForm((prev) => ({ ...prev, [key]: value }));
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        if (typeof id !== "string" || !id)
          throw new Error("Invalid listing ID.");
        const { data: auth, error: authError } = await supabase.auth.getUser();
        if (authError || !auth.user)
          throw new Error("Sign in to edit your listing.");
        const { data, error } = await supabase
          .from("marketplace_listings")
          .select(
            "id,seller_id,status,expires_at,updated_at,category,title,condition,description,price_gbp,location,specifications,delivery_option,working_condition,known_faults,service_history,reason_for_sale,has_paperwork",
          )
          .eq("id", id)
          .eq("seller_id", auth.user.id)
          .eq("status", "published")
          .maybeSingle();
        if (error) throw error;
        if (!data)
          throw new Error(
            "This published listing is unavailable or does not belong to you.",
          );
        if (
          data.expires_at &&
          new Date(data.expires_at).getTime() <= Date.now()
        )
          throw new Error("Expired listings cannot be edited here.");
        if (!active) return;
        const raw = data.specifications;
        const specs: Record<string, string> =
          raw && typeof raw === "object" && !Array.isArray(raw)
            ? Object.fromEntries(
                Object.entries(raw).map(([k, v]) => [
                  k,
                  v == null ? "" : String(v),
                ]),
              )
            : {};
        setForm({
          category: data.category || "",
          title: data.title || "",
          condition: data.condition || "",
          description: data.description || "",
          price: data.price_gbp == null ? "" : String(data.price_gbp),
          location: data.location || "",
          specs,
          delivery: data.delivery_option || "",
          workingCondition: data.working_condition || "",
          knownFaults: data.known_faults || "",
          serviceHistory: data.service_history || "",
          reasonForSale: data.reason_for_sale || "",
          paperwork: Boolean(data.has_paperwork),
        });
        setSpecKeys(Object.keys(specs));
        setOriginalUpdatedAt(data.updated_at);
        setSellerId(auth.user.id);
      } catch (err) {
        if (active)
          setErrorText(
            err instanceof Error ? err.message : "Could not load listing.",
          );
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [id]);

  const save = async () => {
    if (saving || !sellerId || typeof id !== "string") return;
    const price = Number(form.price);
    if (
      !form.title.trim() ||
      !form.category ||
      !form.condition ||
      !form.location.trim() ||
      !form.description.trim() ||
      !form.price.trim() ||
      !Number.isFinite(price) ||
      price <= 0 ||
      !/^\d+(?:\.\d{1,2})?$/.test(form.price.trim())
    ) {
      Alert.alert(
        "Check your listing",
        "Enter a title, category, condition, location, description and valid price greater than zero.",
      );
      return;
    }
    setSaving(true);
    try {
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (authError || auth.user?.id !== sellerId)
        throw new Error("Your session has changed. Sign in again.");
      // Refuse stale writes, including status or expiry changes since opening the form.
      const { data: current, error: checkError } = await supabase
        .from("marketplace_listings")
        .select("id,status,expires_at,updated_at")
        .eq("id", id)
        .eq("seller_id", sellerId)
        .maybeSingle();
      if (checkError) throw checkError;
      if (
        !current ||
        current.status !== "published" ||
        (current.expires_at &&
          new Date(current.expires_at).getTime() <= Date.now())
      )
        throw new Error("This listing is no longer live. Nothing was saved.");
      if (current.updated_at !== originalUpdatedAt)
        throw new Error(
          "This listing changed elsewhere. Reopen it before saving to avoid overwriting newer changes.",
        );
      const payload = {
        category: form.category,
        title: form.title.trim(),
        condition: form.condition,
        description: form.description.trim(),
        price_gbp: price,
        location: form.location.trim(),
        specifications: form.specs,
        delivery_option: form.delivery || null,
        working_condition: form.workingCondition.trim() || null,
        known_faults: form.knownFaults.trim() || null,
        service_history: form.serviceHistory.trim() || null,
        reason_for_sale: form.reasonForSale.trim() || null,
        has_paperwork: form.paperwork,
        updated_at: new Date().toISOString(),
      };
      // Only editable columns. Never write id, status, expiry, seller, or photo fields.
      let query = supabase
        .from("marketplace_listings")
        .update(payload)
        .eq("id", id)
        .eq("seller_id", sellerId)
        .eq("status", "published");
      query =
        originalUpdatedAt === null
          ? query.is("updated_at", null)
          : query.eq("updated_at", originalUpdatedAt);
      const { data: updated, error } = await query.select("id").maybeSingle();
      if (error) throw error;
      if (!updated)
        throw new Error(
          "Save was not accepted. The listing may have changed; reopen it and try again.",
        );
      Alert.alert("Changes saved", "Your published listing has been updated.", [
        { text: "Back to My Listings", onPress: () => router.back() },
      ]);
    } catch (err) {
      Alert.alert(
        "Could not save changes",
        err instanceof Error ? err.message : "Please try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  const input = (label: string, key: keyof Form, multiline = false) => (
    <View style={styles.field} key={key}>
      <AppText style={styles.label}>{label}</AppText>
      <TextInput
        style={[styles.input, multiline && styles.multiline]}
        value={String(form[key] ?? "")}
        onChangeText={(v) => set(key, v)}
        placeholderTextColor={MUTED}
        multiline={multiline}
        textAlignVertical={multiline ? "top" : "center"}
      />
    </View>
  );
  const choices = (
    label: string,
    key: "category" | "condition" | "delivery",
    values: string[],
  ) => (
    <View style={styles.field}>
      <AppText style={styles.label}>{label}</AppText>
      <View style={styles.chips}>
        {values.map((value) => (
          <Pressable
            key={value}
            onPress={() => set(key, value)}
            style={[styles.chip, form[key] === value && styles.selected]}
          >
            <AppText style={styles.chipText}>{value}</AppText>
          </Pressable>
        ))}
      </View>
    </View>
  );
  return (
    <MapTextureBackground>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            styles.container,
            { paddingTop: insets.top + 18, paddingBottom: insets.bottom + 45 },
          ]}
        >
          <Pressable onPress={() => router.back()} style={styles.back}>
            <Ionicons name="arrow-back" size={22} color={PALE} />
            <AppText style={styles.backText}>MY LISTINGS</AppText>
          </Pressable>
          <AppText style={styles.eyebrow}>THE TRADER'S EXCHANGE</AppText>
          <AppText style={styles.heading}>Edit your listing</AppText>
          <AppText style={styles.subheading}>
            Update your equipment details. Your existing photos, listing ID,
            live status and expiry date stay unchanged.
          </AppText>
          {loading ? (
            <ActivityIndicator
              color={PALE}
              size="large"
              style={{ marginTop: 50 }}
            />
          ) : errorText ? (
            <MetallicFrame tone="gold" borderRadius={18}>
              <View style={styles.panel}>
                <AppText style={styles.error}>{errorText}</AppText>
              </View>
            </MetallicFrame>
          ) : (
            <MetallicFrame tone="gold" borderRadius={20} borderWidth={2}>
              <View style={styles.panel}>
                {choices("CATEGORY", "category", CATEGORIES)}
                {input("EQUIPMENT TITLE", "title")}
                {choices("CONDITION", "condition", CONDITIONS)}
                {input("ASKING PRICE (£)", "price")}
                {input("DESCRIPTION", "description", true)}
                {input("GENERAL LOCATION", "location")}
                {choices("DELIVERY OPTIONS", "delivery", DELIVERY)}
                {input("WORKING CONDITION", "workingCondition", true)}
                {input("KNOWN FAULTS", "knownFaults", true)}
                {input("SERVICE HISTORY", "serviceHistory", true)}
                {input("REASON FOR SALE", "reasonForSale", true)}
                <View style={styles.field}>
                  <AppText style={styles.label}>PAPERWORK AVAILABLE?</AppText>
                  <Pressable
                    style={[styles.chip, form.paperwork && styles.selected]}
                    onPress={() => set("paperwork", !form.paperwork)}
                  >
                    <AppText style={styles.chipText}>
                      {form.paperwork
                        ? "YES · TAP TO CHANGE"
                        : "NO · TAP TO CHANGE"}
                    </AppText>
                  </Pressable>
                </View>
                <AppText style={styles.section}>
                  EQUIPMENT SPECIFICATIONS
                </AppText>
                {specKeys.map((key) => (
                  <View key={key} style={styles.field}>
                    <AppText style={styles.label}>{key}</AppText>
                    <TextInput
                      style={styles.input}
                      value={form.specs[key] || ""}
                      onChangeText={(value) =>
                        set("specs", { ...form.specs, [key]: value })
                      }
                      placeholderTextColor={MUTED}
                    />
                  </View>
                ))}
                <View style={styles.field}>
                  <AppText style={styles.label}>ADD SPECIFICATION NAME</AppText>
                  <TextInput
                    style={styles.input}
                    value={newSpecKey}
                    onChangeText={setNewSpecKey}
                    placeholder="e.g. Dimensions"
                    placeholderTextColor={MUTED}
                  />
                  <Pressable
                    style={styles.addSpec}
                    onPress={() => {
                      const key = newSpecKey.trim();
                      if (key && !specKeys.includes(key)) {
                        setSpecKeys((prev) => [...prev, key]);
                        set("specs", { ...form.specs, [key]: "" });
                        setNewSpecKey("");
                      }
                    }}
                  >
                    <Ionicons name="add" size={18} color={PALE} />
                    <AppText style={styles.chipText}>ADD SPECIFICATION</AppText>
                  </Pressable>
                </View>
                <AppText style={styles.photoNote}>
                  Photographs are managed separately using MANAGE PHOTOS in My
                  Listings.
                </AppText>
                <Pressable
                  accessibilityRole="button"
                  disabled={saving}
                  onPress={() => void save()}
                  style={[styles.save, saving && { opacity: 0.5 }]}
                >
                  {saving ? (
                    <ActivityIndicator color="#071421" />
                  ) : (
                    <>
                      <Ionicons
                        name="checkmark-circle-outline"
                        size={22}
                        color="#071421"
                      />
                      <AppText style={styles.saveText}>SAVE CHANGES</AppText>
                    </>
                  )}
                </Pressable>
              </View>
            </MetallicFrame>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </MapTextureBackground>
  );
}
const styles = StyleSheet.create({
  container: { paddingHorizontal: 18 },
  back: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    marginBottom: 25,
  },
  backText: { color: PALE, fontSize: 12, fontWeight: "800", letterSpacing: 1 },
  eyebrow: { color: GOLD, fontSize: 11, letterSpacing: 2, marginBottom: 8 },
  heading: { color: PALE, fontSize: 29, fontWeight: "800", marginBottom: 9 },
  subheading: { color: MUTED, fontSize: 13, lineHeight: 20, marginBottom: 25 },
  panel: {
    padding: 18,
    backgroundColor: "rgba(7,24,37,0.94)",
    borderRadius: 18,
  },
  field: { marginBottom: 20 },
  label: {
    color: PALE,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
    marginBottom: 9,
  },
  input: {
    color: "#FFFFFF",
    fontSize: 15,
    borderWidth: 1,
    borderColor: "#806B42",
    backgroundColor: "#0C2332",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 48,
  },
  multiline: { minHeight: 115 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: "#866F41",
    backgroundColor: "#122938",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 24,
    alignSelf: "flex-start",
  },
  selected: { borderColor: PALE, backgroundColor: "#58441F" },
  chipText: { color: PALE, fontSize: 12, fontWeight: "700" },
  section: {
    color: PALE,
    fontWeight: "800",
    fontSize: 16,
    marginBottom: 17,
    marginTop: 6,
  },
  addSpec: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
    alignSelf: "flex-start",
    borderColor: GOLD,
    borderWidth: 1,
    borderRadius: 20,
    padding: 10,
  },
  photoNote: { color: MUTED, fontSize: 12, lineHeight: 19, marginBottom: 22 },
  save: {
    backgroundColor: PALE,
    borderRadius: 15,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  saveText: { color: "#071421", fontWeight: "900", letterSpacing: 1 },
  error: { color: PALE, fontSize: 14, lineHeight: 21 },
});
