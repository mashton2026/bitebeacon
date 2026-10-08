import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  getAllVendorReports,
  updateVendorReportStatus,
  type VendorReport,
} from "../../services/reportService";
import {
  adminDeleteVendor,
  getAllVendorsForAdmin,
  suspendVendor,
  unsuspendVendor,
} from "../../services/vendorService";
import { type Van } from "../../types/van";

type ReportFilter = VendorReport["reason"] | "all" | "high_risk";

const REPORT_REASONS: VendorReport["reason"][] = [
  "fake_listing",
  "incorrect_details",
  "wrong_location",
  "abusive_content",
  "spam",
  "other",
];

export default function AdminReportsScreen() {
  const [reports, setReports] = useState<VendorReport[]>([]);
  const [vendors, setVendors] = useState<Van[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});
  const [selectedReasonFilter, setSelectedReasonFilter] =
    useState<ReportFilter>("all");

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  async function loadData() {
    setLoading(true);

    try {
      const [reportData, vendorData] = await Promise.all([
        getAllVendorReports(),
        getAllVendorsForAdmin(),
      ]);

      const sortedReports = [...reportData].sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setReports(sortedReports);
      setVendors(vendorData);

      setAdminNotes((current) => {
        const nextNotes: Record<string, string> = {};

        sortedReports.forEach((report) => {
          if (current[report.id]) {
            nextNotes[report.id] = current[report.id];
          }
        });

        return nextNotes;
      });
    } catch (error) {
      Alert.alert(
        "Load failed",
        error instanceof Error ? error.message : "Unknown error"
      );
      setReports([]);
      setVendors([]);
    } finally {
      setLoading(false);
    }
  }

  const vendorMap = useMemo(() => {
    const nextMap = new Map<string, Van>();

    vendors.forEach((vendor) => {
      nextMap.set(String(vendor.id), vendor);
    });

    return nextMap;
  }, [vendors]);

  const vendorReportCounts = useMemo(() => {
    const nextCounts = new Map<string, number>();

    reports.forEach((report) => {
      const currentCount = nextCounts.get(report.vendor_id) ?? 0;
      nextCounts.set(report.vendor_id, currentCount + 1);
    });

    return nextCounts;
  }, [reports]);

  const highRiskVendorCount = useMemo(() => {
    return Array.from(vendorReportCounts.values()).filter(
      (count) => count >= 3
    ).length;
  }, [vendorReportCounts]);

  const filteredReports = useMemo(() => {
    if (selectedReasonFilter === "all") {
      return reports;
    }

    if (selectedReasonFilter === "high_risk") {
      return reports.filter(
        (report) => (vendorReportCounts.get(report.vendor_id) ?? 0) >= 3
      );
    }

    return reports.filter((report) => report.reason === selectedReasonFilter);
  }, [reports, selectedReasonFilter, vendorReportCounts]);

  function getVendor(vendorId: string) {
    return vendorMap.get(String(vendorId)) ?? null;
  }

  function getVendorName(vendorId: string) {
    return getVendor(vendorId)?.name ?? "Unknown vendor";
  }

  function getVendorReportCount(vendorId: string) {
    return vendorReportCounts.get(vendorId) ?? 0;
  }

  function isVendorSuspended(vendorId: string) {
    return !!getVendor(vendorId)?.isSuspended;
  }

  function getVendorTier(vendorId: string) {
    return (getVendor(vendorId)?.subscriptionTier ?? "free").toUpperCase();
  }

  function getVendorClaimState(vendorId: string) {
    return getVendor(vendorId)?.owner_id ? "Claimed" : "Unclaimed";
  }

  function getVendorListingType(vendorId: string) {
    const match = getVendor(vendorId);

    if (!match) return "Unknown";
    if (match.temporary || match.listingSource === "user_spotted") {
      return "Community Spotted";
    }

    return "Vendor Listing";
  }

  function getVendorLiveState(vendorId: string) {
    const match = getVendor(vendorId);

    if (!match) return "Unknown";
    return match.isLive ? "Live" : "Offline";
  }

  function getVendorCuisine(vendorId: string) {
    return getVendor(vendorId)?.cuisine ?? "Unknown";
  }

  async function handleResolve(reportId: string) {
    if (processingId) return;

    const adminNote = adminNotes[reportId]?.trim() ?? "";

    if (!adminNote) {
      Alert.alert(
        "Admin note required",
        "Please add an admin note before resolving a report."
      );
      return;
    }

    setProcessingId(reportId);

    try {
      await updateVendorReportStatus({
        reportId,
        status: "resolved",
        adminNote,
      });

      Alert.alert("Success", "Report resolved");
      await loadData();
    } catch (error) {
      Alert.alert(
        "Update failed",
        error instanceof Error ? error.message : "Unknown error"
      );
    } finally {
      setProcessingId(null);
    }
  }

  async function handleDismiss(reportId: string) {
    if (processingId) return;

    const adminNote = adminNotes[reportId]?.trim() ?? "";

    if (!adminNote) {
      Alert.alert(
        "Admin note required",
        "Please add an admin note before dismissing a report."
      );
      return;
    }

    setProcessingId(reportId);

    try {
      await updateVendorReportStatus({
        reportId,
        status: "dismissed",
        adminNote,
      });

      Alert.alert("Success", "Report dismissed");
      await loadData();
    } catch (error) {
      Alert.alert(
        "Update failed",
        error instanceof Error ? error.message : "Unknown error"
      );
    } finally {
      setProcessingId(null);
    }
  }

  async function handleSuspendFromReport(reportId: string, vendorId: string) {
    if (processingId) return;

    const adminNote = adminNotes[reportId]?.trim() ?? "";

    if (!adminNote) {
      Alert.alert(
        "Admin note required",
        "Please add an admin note before suspending a vendor from a report."
      );
      return;
    }

    setProcessingId(reportId);

    try {
      await suspendVendor(vendorId, adminNote);

      await updateVendorReportStatus({
        reportId,
        status: "resolved",
        adminNote,
      });

      Alert.alert("Success", "Vendor suspended and report resolved.");
      await loadData();
    } catch (error) {
      Alert.alert(
        "Suspend failed",
        error instanceof Error ? error.message : "Unknown error"
      );
    } finally {
      setProcessingId(null);
    }
  }

  async function handleUnsuspendVendor(vendorId: string) {
    if (processingId) return;

    setProcessingId(vendorId);

    try {
      await unsuspendVendor(vendorId);
      Alert.alert("Success", "Vendor unsuspended.");
      await loadData();
    } catch (error) {
      Alert.alert(
        "Unsuspend failed",
        error instanceof Error ? error.message : "Unknown error"
      );
    } finally {
      setProcessingId(null);
    }
  }

  async function handleDeleteVendor(vendorId: string) {
    if (processingId) return;

    setProcessingId(vendorId);

    try {
      await adminDeleteVendor(vendorId);
      Alert.alert("Success", "Vendor deleted.");
      await loadData();
    } catch (error) {
      Alert.alert(
        "Delete failed",
        error instanceof Error ? error.message : "Unknown error"
      );
    } finally {
      setProcessingId(null);
    }
  }

  function renderItem({ item }: { item: VendorReport }) {
    const isProcessing = processingId === item.id;
    const isAnyProcessing = processingId !== null;
    const reportCount = getVendorReportCount(item.vendor_id);
    const isHighRisk = reportCount >= 3;
    const vendorSuspended = isVendorSuspended(item.vendor_id);

    return (
      <View style={[styles.card, isHighRisk && styles.highRiskCard]}>
        <Text style={styles.vendorName}>{getVendorName(item.vendor_id)}</Text>

        <Text style={styles.meta}>
          Reason:{" "}
          {item.reason
            .replace(/_/g, " ")
            .replace(/\b\w/g, (char) => char.toUpperCase())}
        </Text>

        <Text style={styles.meta}>
          Reported: {new Date(item.created_at).toLocaleString()}
        </Text>

        <Text style={styles.meta}>
          Total reports for this vendor: {reportCount}
        </Text>

        <Text
          style={[
            styles.vendorStateText,
            vendorSuspended
              ? styles.vendorStateSuspended
              : styles.vendorStateActive,
          ]}
        >
          {vendorSuspended ? "Vendor status: Suspended" : "Vendor status: Not suspended"}
        </Text>

        <Text style={styles.meta}>Vendor tier: {getVendorTier(item.vendor_id)}</Text>
        <Text style={styles.meta}>
          Claim state: {getVendorClaimState(item.vendor_id)}
        </Text>
        <Text style={styles.meta}>
          Listing type: {getVendorListingType(item.vendor_id)}
        </Text>
        <Text style={styles.meta}>
          Live state: {getVendorLiveState(item.vendor_id)}
        </Text>
        <Text style={styles.meta}>Cuisine: {getVendorCuisine(item.vendor_id)}</Text>

        {isHighRisk ? (
          <Text style={styles.highRiskText}>
            Multiple reports: this listing has received 3 or more reports. Review the evidence before taking action.
          </Text>
        ) : null}

        {item.details ? <Text style={styles.details}>{item.details}</Text> : null}

        <Pressable
          style={[
            styles.openVendorButton,
            isAnyProcessing && styles.buttonDisabled,
          ]}
          onPress={() =>
            router.push({
              pathname: "/admin/edit-vendor",
              params: { id: item.vendor_id },
            })
          }
          disabled={isAnyProcessing}
        >
          <Text style={styles.openVendorButtonText}>Open Vendor</Text>
        </Pressable>

        <Pressable
          style={[
            styles.viewListingButton,
            isAnyProcessing && styles.buttonDisabled,
          ]}
          onPress={() =>
            router.push({
              pathname: "/vendor/[id]",
              params: { id: item.vendor_id },
            })
          }
          disabled={isAnyProcessing}
        >
          <Text style={styles.viewListingButtonText}>View Listing</Text>
        </Pressable>

        <Text style={styles.meta}>Admin note</Text>

        <TextInput
          style={styles.input}
          placeholder="Add decision note"
          placeholderTextColor="#758496"
          value={adminNotes[item.id] ?? ""}
          onChangeText={(text) =>
            setAdminNotes((current) => ({
              ...current,
              [item.id]: text,
            }))
          }
          editable={!isAnyProcessing}
          maxLength={300}
          multiline
        />

        <View style={styles.actionsRow}>
          <Pressable
            style={[
              styles.button,
              styles.resolveButton,
              isAnyProcessing && styles.buttonDisabled,
            ]}
            onPress={() =>
              Alert.alert(
                "Resolve report?",
                "This will mark the report as resolved.",
                [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Resolve",
                    onPress: () => handleResolve(item.id),
                  },
                ]
              )
            }
            disabled={isAnyProcessing}
          >
            <Text style={styles.buttonText}>
              {isProcessing ? "Working..." : "Resolve"}
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.button,
              styles.dismissButton,
              isAnyProcessing && styles.buttonDisabled,
            ]}
            onPress={() =>
              Alert.alert(
                "Dismiss report?",
                "This will mark the report as dismissed.",
                [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Dismiss",
                    style: "destructive",
                    onPress: () => handleDismiss(item.id),
                  },
                ]
              )
            }
            disabled={isAnyProcessing}
          >
            <Text style={styles.buttonText}>
              {isProcessing ? "Working..." : "Dismiss"}
            </Text>
          </Pressable>
        </View>

        <Pressable
          style={[
            styles.suspendButtonFull,
            vendorSuspended && styles.buttonDisabled,
            isAnyProcessing && styles.buttonDisabled,
          ]}
          onPress={() => {
            if (vendorSuspended) {
              Alert.alert(
                "Already suspended",
                "This vendor is already suspended."
              );
              return;
            }

            Alert.alert(
              "Suspend vendor?",
              "This will suspend the vendor and resolve this report.",
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Suspend",
                  style: "destructive",
                  onPress: () =>
                    handleSuspendFromReport(item.id, item.vendor_id),
                },
              ]
            );
          }}
          disabled={isAnyProcessing || vendorSuspended}
        >
          <Text style={styles.buttonText}>
            {vendorSuspended
              ? "Vendor Already Suspended"
              : isProcessing
                ? "Working..."
                : "Suspend Vendor"}
          </Text>
        </Pressable>

        {/* UNSUSPEND BUTTON */}
        {vendorSuspended && (
          <Pressable
            style={[
              styles.resolveButton,
              styles.button,
              isAnyProcessing && styles.buttonDisabled,
            ]}
            onPress={() =>
              Alert.alert(
                "Unsuspend vendor?",
                "This will restore the vendor to the app.",
                [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Unsuspend",
                    onPress: () => handleUnsuspendVendor(item.vendor_id),
                  },
                ]
              )
            }
            disabled={isAnyProcessing}
          >
            <Text style={styles.buttonText}>Unsuspend Vendor</Text>
          </Pressable>
        )}

        {/* DELETE BUTTON */}
        <Pressable
          style={[
            styles.dismissButton,
            styles.button,
            isAnyProcessing && styles.buttonDisabled,
          ]}
          onPress={() =>
            Alert.alert(
              "Delete vendor?",
              "This will permanently delete this vendor. This cannot be undone.",
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Delete",
                  style: "destructive",
                  onPress: () => handleDeleteVendor(item.vendor_id),
                },
              ]
            )
          }
          disabled={isAnyProcessing}
        >
          <Text style={styles.buttonText}>Delete Vendor</Text>
        </Pressable>

      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={filteredReports}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            <Text style={styles.kicker}>ADMIN</Text>
            <Text style={styles.title}>Reports</Text>
            <Text style={styles.subtitle}>
              Review and moderate user-submitted reports.
            </Text>

            <View style={styles.reasonSummary}>
              <Pressable
                style={[
                  styles.reasonChip,
                  selectedReasonFilter === "all" && styles.reasonChipActive,
                ]}
                onPress={() => setSelectedReasonFilter("all")}
              >
                <Text
                  style={[
                    styles.reasonChipText,
                    selectedReasonFilter === "all" &&
                    styles.reasonChipTextActive,
                  ]}
                >
                  all ({reports.length})
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.reasonChip,
                  selectedReasonFilter === "high_risk" &&
                  styles.reasonChipActive,
                ]}
                onPress={() => setSelectedReasonFilter("high_risk")}
              >
                <Text
                  style={[
                    styles.reasonChipText,
                    selectedReasonFilter === "high_risk" &&
                    styles.reasonChipTextActive,
                  ]}
                >
                  3+ reports ({highRiskVendorCount})
                </Text>
              </Pressable>

              {REPORT_REASONS.map((reason) => {
                const count = reports.filter((r) => r.reason === reason).length;

                if (count === 0) return null;

                return (
                  <Pressable
                    key={reason}
                    style={[
                      styles.reasonChip,
                      selectedReasonFilter === reason &&
                      styles.reasonChipActive,
                    ]}
                    onPress={() => setSelectedReasonFilter(reason)}
                  >
                    <Text
                      style={[
                        styles.reasonChipText,
                        selectedReasonFilter === reason &&
                        styles.reasonChipTextActive,
                      ]}
                    >
                      {reason.replace(/_/g, " ")} ({count})
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.summaryCardsRow}>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryCardLabel}>Total Reports</Text>
                <Text style={styles.summaryCardValue}>{reports.length}</Text>
              </View>

              <View style={styles.highRiskSummaryCard}>
                <Text style={styles.highRiskSummaryLabel}>Frequently Reported</Text>
                <Text style={styles.highRiskSummaryValue}>
                  {highRiskVendorCount}
                </Text>
              </View>
            </View>

            {!loading ? (
              <Text style={styles.activeFilterText}>
                Viewing:{" "}
                {selectedReasonFilter === "all"
                  ? "all reports"
                  : selectedReasonFilter === "high_risk"
                    ? "frequently reported vendors"
                    : selectedReasonFilter.replace(/_/g, " ")}
              </Text>
            ) : null}
          </>
        }
        ListEmptyComponent={
          <Text style={styles.helper}>
            {loading
              ? "Loading reports..."
              : selectedReasonFilter === "all"
                ? "No reports found."
                : selectedReasonFilter === "high_risk"
                  ? "No frequently reported vendors found."
                  : `No ${selectedReasonFilter.replace(/_/g, " ")} reports found.`}
          </Text>
        }
        ListFooterComponent={
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Back</Text>
          </Pressable>
        }
      />
    </View>
  );
}

// Presentation-only palette. No moderation service or action logic changed.
const BG = "#071421";
const PANEL = "#0C1E2E";
const PANEL_ALT = "#102638";
const GOLD = "#E2AE54";
const GOLD_SOFT = "#68522D";
const TEXT = "#F5F2E9";
const MUTED = "#A1AFBE";
const RED = "#E38A8F";
const GREEN = "#74D5A1";

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG, paddingHorizontal: 18, paddingTop: 22 },
  list: { flexGrow: 1, paddingBottom: 34 },
  kicker: { fontSize: 11, fontWeight: "800", color: GOLD, letterSpacing: 2.5, marginBottom: 8 },
  title: { fontSize: 30, fontWeight: "900", color: TEXT, marginBottom: 7 },
  subtitle: { fontSize: 14, color: MUTED, lineHeight: 21, marginBottom: 22 },
  reasonSummary: { flexDirection: "row", flexWrap: "wrap", gap: 9, marginBottom: 20 },
  reasonChip: { backgroundColor: PANEL, borderWidth: 1, borderColor: GOLD_SOFT, borderRadius: 24, paddingVertical: 10, paddingHorizontal: 13 },
  reasonChipActive: { backgroundColor: "#4C3920", borderColor: GOLD },
  reasonChipText: { color: MUTED, fontSize: 12, fontWeight: "700", textTransform: "capitalize" },
  reasonChipTextActive: { color: "#FFE3A5" },
  summaryCardsRow: { flexDirection: "row", gap: 11, marginBottom: 18 },
  summaryCard: { flex: 1, backgroundColor: PANEL_ALT, borderWidth: 1, borderColor: GOLD_SOFT, borderRadius: 19, padding: 17, minHeight: 100 },
  summaryCardLabel: { fontSize: 11, fontWeight: "800", color: MUTED, letterSpacing: 0.7, textTransform: "uppercase", marginBottom: 11 },
  summaryCardValue: { fontSize: 30, fontWeight: "900", color: TEXT },
  highRiskSummaryCard: { flex: 1, backgroundColor: "#291D27", borderWidth: 1, borderColor: "#7C424D", borderRadius: 19, padding: 17, minHeight: 100 },
  highRiskSummaryLabel: { fontSize: 11, fontWeight: "800", color: "#F0B5B7", letterSpacing: 0.6, textTransform: "uppercase", marginBottom: 11 },
  highRiskSummaryValue: { fontSize: 30, fontWeight: "900", color: "#FFE3E3" },
  activeFilterText: { color: MUTED, fontSize: 12, fontWeight: "700", marginBottom: 16 },
  helper: { backgroundColor: PANEL, borderWidth: 1, borderColor: GOLD_SOFT, borderRadius: 18, padding: 24, color: MUTED, fontSize: 14, lineHeight: 21, textAlign: "center", marginBottom: 18 },
  card: { backgroundColor: PANEL, borderWidth: 1, borderColor: GOLD_SOFT, borderRadius: 23, padding: 18, marginBottom: 17 },
  highRiskCard: { borderColor: "#A75C60", borderWidth: 1.5 },
  vendorName: { color: TEXT, fontSize: 20, fontWeight: "900", marginBottom: 14 },
  meta: { color: MUTED, fontSize: 13, lineHeight: 20, marginBottom: 6 },
  vendorStateText: { fontSize: 12, fontWeight: "800", marginTop: 5, marginBottom: 10 },
  vendorStateActive: { color: GREEN },
  vendorStateSuspended: { color: RED },
  highRiskText: { color: "#FFD0D0", backgroundColor: "#3B232D", borderColor: "#8D4B55", borderWidth: 1, borderRadius: 12, overflow: "hidden", padding: 12, fontSize: 12, lineHeight: 19, fontWeight: "700", marginVertical: 12 },
  details: { color: TEXT, backgroundColor: PANEL_ALT, borderWidth: 1, borderColor: "#2A4052", borderRadius: 13, overflow: "hidden", padding: 13, fontSize: 14, lineHeight: 21, marginTop: 7, marginBottom: 14 },
  openVendorButton: { alignSelf: "stretch", alignItems: "center", backgroundColor: "#483820", borderWidth: 1, borderColor: GOLD, borderRadius: 14, paddingVertical: 13, marginTop: 11, marginBottom: 9 },
  openVendorButtonText: { color: "#FFE5AC", fontSize: 13, fontWeight: "800" },
  viewListingButton: { alignSelf: "stretch", alignItems: "center", backgroundColor: PANEL_ALT, borderWidth: 1, borderColor: "#46647C", borderRadius: 14, paddingVertical: 13, marginBottom: 18 },
  viewListingButtonText: { color: TEXT, fontSize: 13, fontWeight: "800" },
  input: { backgroundColor: "#06121D", borderWidth: 1, borderColor: GOLD_SOFT, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 13, marginTop: 4, marginBottom: 16, color: TEXT, minHeight: 76, fontSize: 14, textAlignVertical: "top" },
  actionsRow: { flexDirection: "row", gap: 10, marginBottom: 10 },
  button: { flex: 1, minHeight: 48, paddingVertical: 13, paddingHorizontal: 10, borderRadius: 13, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  buttonDisabled: { opacity: 0.45 },
  resolveButton: { backgroundColor: "#163D31", borderColor: "#378769" },
  dismissButton: { backgroundColor: "#3A2029", borderColor: "#95505B" },
  suspendButtonFull: { marginTop: 3, marginBottom: 10, minHeight: 48, backgroundColor: "#3A2526", borderColor: "#A35B56", borderWidth: 1, paddingVertical: 13, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  buttonText: { color: TEXT, fontWeight: "800", fontSize: 13 },
  backButton: { marginTop: 8, backgroundColor: PANEL, borderWidth: 1, borderColor: GOLD_SOFT, paddingVertical: 15, borderRadius: 15, alignItems: "center" },
  backButtonText: { color: GOLD, fontWeight: "800", fontSize: 14 },
});
