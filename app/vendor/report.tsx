import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { validateModeratedText } from "../../lib/contentModeration";
import { getCurrentUser } from "../../services/authService";
import {
  createVendorReport,
  type VendorReportReason,
} from "../../services/reportService";

const GOLD = "#FFD66B";
const GOLD_LIGHT = "#FFF2B8";
const NAVY = "#081725";
const PANEL = "#102538";
const MUTED = "#B9C6D1";

const REPORT_REASONS: { label: string; value: VendorReportReason }[] = [
  { label: "Fake listing", value: "fake_listing" },
  { label: "Incorrect details", value: "incorrect_details" },
  { label: "Wrong location", value: "wrong_location" },
  { label: "Abusive content", value: "abusive_content" },
  { label: "Spam", value: "spam" },
  { label: "Other", value: "other" },
];

export default function ReportVendorScreen() {
  const params = useLocalSearchParams();
  const vendorId = String(params.id ?? "");
  const [selectedReason, setSelectedReason] = useState<VendorReportReason | null>(null);
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submitReport() {
    if (submitting) return;
    if (!vendorId) {
      Alert.alert("Error", "No vendor listing was provided.");
      return;
    }
    if (!selectedReason) {
      Alert.alert("Missing info", "Please choose a report reason.");
      return;
    }
    const detailsError = validateModeratedText(details, {
      fieldLabel: "Report details",
      allowEmpty: true,
      maxLength: 300,
    });
    if (detailsError) {
      Alert.alert("Report blocked", detailsError);
      return;
    }
    const user = await getCurrentUser();
    if (!user) {
      Alert.alert("Login required", "Please log in or create an account to submit a report.");
      return;
    }
    setSubmitting(true);
    try {
      await createVendorReport({
        vendorId,
        reporterUserId: user.id,
        reason: selectedReason,
        details: details.trim(),
      });
      Alert.alert("Report submitted", "Thank you. Your report has been sent for review.");
      router.back();
    } catch (error) {
      Alert.alert("Submit failed", error instanceof Error ? error.message : "Unknown error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.kicker}>COMMUNITY SAFETY</Text>
      <Text style={styles.title}>Report Listing</Text>
      <Text style={styles.subtitle}>
        Tell us what is wrong with this listing so BiteBeacon can review it.
      </Text>

      <View style={styles.frame}>
        <LinearGradient
          colors={["#FFF3BE", "#C58A24", "#FFE59A", "#805013", "#FFD66B"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.frameGradient}
        >
          <View style={styles.panel}>
            <Text style={styles.sectionTitle}>Reason</Text>
            <Text style={styles.sectionHint}>Choose the option that best describes the issue.</Text>
            <View style={styles.reasonList}>
              {REPORT_REASONS.map((reason) => {
                const isSelected = selectedReason === reason.value;
                return (
                  <Pressable
                    key={reason.value}
                    style={[styles.reasonButton, isSelected && styles.reasonButtonSelected]}
                    onPress={() => setSelectedReason(reason.value)}
                    disabled={submitting}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: isSelected, disabled: submitting }}
                  >
                    <View style={[styles.radioCircle, isSelected && styles.radioCircleSelected]}>
                      {isSelected ? <View style={styles.radioDot} /> : null}
                    </View>
                    <Text style={[styles.reasonButtonText, isSelected && styles.reasonButtonTextSelected]}>
                      {reason.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.divider} />
            <Text style={styles.sectionTitle}>Extra Details</Text>
            <TextInput
              style={styles.input}
              placeholder="Add any helpful detail"
              placeholderTextColor="#8293A2"
              multiline
              maxLength={300}
              value={details}
              onChangeText={setDetails}
              editable={!submitting}
            />
            <View style={styles.helperRow}>
              <Text style={styles.helperText}>Keep it factual. Profanity and spam are blocked.</Text>
              <Text style={styles.counter}>{details.length}/300</Text>
            </View>
          </View>
        </LinearGradient>
      </View>

      <Pressable
        style={[styles.submitOuter, submitting && styles.disabledButton]}
        onPress={submitReport}
        disabled={submitting}
      >
        <LinearGradient
          colors={["#FFF3BE", "#FFD66B", "#D3972D", "#FFE59A"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.submitButton}
        >
          <Text style={styles.submitButtonText}>
            {submitting ? "Submitting..." : "Submit Report"}
          </Text>
        </LinearGradient>
      </Pressable>

      <Pressable style={styles.backButton} onPress={() => router.back()} disabled={submitting}>
        <Text style={styles.backButtonText}>Back</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: NAVY },
  content: { padding: 22, paddingTop: 32, paddingBottom: 52 },
  kicker: { fontSize: 12, fontWeight: "900", color: GOLD, marginBottom: 10, letterSpacing: 1.8 },
  title: { fontSize: 31, fontWeight: "900", color: "#FFFFFF", marginBottom: 10 },
  subtitle: { fontSize: 15, color: MUTED, lineHeight: 23, marginBottom: 24 },
  frame: { borderRadius: 22, marginBottom: 20, shadowColor: GOLD, shadowOpacity: 0.19, shadowRadius: 18, elevation: 5 },
  frameGradient: { borderRadius: 22, padding: 1.7 },
  panel: { borderRadius: 20, backgroundColor: PANEL, padding: 18 },
  sectionTitle: { fontSize: 14, fontWeight: "900", color: GOLD_LIGHT, letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 },
  sectionHint: { fontSize: 13, color: MUTED, lineHeight: 19, marginBottom: 14 },
  reasonList: { marginBottom: 12 },
  reasonButton: {
    backgroundColor: "#0B1B2B", borderWidth: 1, borderColor: "rgba(255,214,107,0.34)",
    borderRadius: 13, paddingVertical: 14, paddingHorizontal: 13, marginBottom: 10,
    flexDirection: "row", alignItems: "center", gap: 12,
  },
  reasonButtonSelected: { backgroundColor: "rgba(255,214,107,0.12)", borderColor: GOLD, borderWidth: 1.5 },
  radioCircle: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: "#A4B0B9", alignItems: "center", justifyContent: "center" },
  radioCircleSelected: { borderColor: GOLD },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: GOLD },
  reasonButtonText: { color: "#E6EDF3", fontSize: 15, fontWeight: "700", flex: 1 },
  reasonButtonTextSelected: { color: GOLD_LIGHT },
  divider: { height: 1, backgroundColor: "rgba(255,214,107,0.25)", marginBottom: 18 },
  input: {
    backgroundColor: "#091929", borderRadius: 13, padding: 14, minHeight: 125,
    textAlignVertical: "top", marginTop: 5, marginBottom: 10, color: "#FFFFFF",
    borderWidth: 1.5, borderColor: "rgba(255,214,107,0.65)", fontSize: 15,
  },
  helperRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 10 },
  helperText: { fontSize: 12, color: MUTED, lineHeight: 18, flex: 1 },
  counter: { fontSize: 12, color: GOLD_LIGHT, fontWeight: "700" },
  submitOuter: { borderRadius: 15, overflow: "hidden", marginBottom: 12 },
  submitButton: { paddingVertical: 16, alignItems: "center", borderRadius: 15 },
  submitButtonText: { color: "#162130", fontWeight: "900", fontSize: 16 },
  disabledButton: { opacity: 0.65 },
  backButton: { padding: 15, borderRadius: 15, alignItems: "center", borderWidth: 1.5, borderColor: GOLD },
  backButtonText: { color: GOLD_LIGHT, fontWeight: "800", fontSize: 16 },
});
