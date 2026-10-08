import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  adminDeleteVendor,
  approveVendor,
  getAllVendorsForAdmin,
  suspendVendor,
  unsuspendVendor,
} from "../../services/vendorService";
import { type Van } from "../../types/van";

export default function AdminVendorsScreen() {
  const [visibleCount, setVisibleCount] = useState(5);
  const [vendors, setVendors] = useState<Van[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "pending" | "active" | "suspended"
  >("all");
  const [processingVendorId, setProcessingVendorId] = useState<string | null>(
    null
  );
  const [expandedVendorId, setExpandedVendorId] = useState<string | null>(null);
  const [suspensionReasons, setSuspensionReasons] = useState<
    Record<string, string>
  >({});


  useFocusEffect(
    useCallback(() => {
      setVisibleCount(5); // 👈 RESET HERE
      loadVendors();
    }, [])
  );

  async function loadVendors() {
    setLoading(true);

    try {
      const data = await getAllVendorsForAdmin();
      const sortedData = [...data].sort((a, b) =>
        a.name.localeCompare(b.name)
      );

      setVendors(sortedData);

      setSuspensionReasons((current) => {
        const nextReasons: Record<string, string> = {};

        sortedData.forEach((vendor) => {
          if (current[vendor.id]) {
            nextReasons[vendor.id] = current[vendor.id];
          }
        });

        return nextReasons;
      });
    } catch (error) {
      Alert.alert(
        "Load failed",
        error instanceof Error ? error.message : "Unknown error"
      );
      setVendors([]);
    } finally {
      setLoading(false);
    }
  }

  const vendorCounts = useMemo(() => {
    return {
      all: vendors.length,
      pending: vendors.filter((v) => !v.isApproved && !v.isSuspended).length,
      active: vendors.filter((v) => v.isApproved && !v.isSuspended).length,
      suspended: vendors.filter((v) => v.isSuspended).length,
    };
  }, [vendors]);

  const filteredVendors = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return vendors.filter((vendor) => {
      const matchesSearch =
        !query ||
        vendor.name.toLowerCase().includes(query) ||
        (vendor.vendorName ?? "").toLowerCase().includes(query) ||
        vendor.cuisine.toLowerCase().includes(query);

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "pending" &&
          !vendor.isApproved &&
          !vendor.isSuspended) ||
        (statusFilter === "active" &&
          vendor.isApproved &&
          !vendor.isSuspended) ||
        (statusFilter === "suspended" && vendor.isSuspended);

      return matchesSearch && matchesStatus;
    });
  }, [vendors, searchQuery, statusFilter]);

  async function handleSuspend(vendor: Van) {
    if (processingVendorId) return;

    const suspensionReason = (suspensionReasons[vendor.id] ?? "").trim();

    if (!suspensionReason) {
      Alert.alert(
        "Suspension reason required",
        "Please add a suspension reason before suspending this vendor."
      );
      return;
    }

    setProcessingVendorId(vendor.id);

    try {
      await suspendVendor(vendor.id, suspensionReason);
      Alert.alert("Vendor suspended", `${vendor.name} has been suspended.`);
      await loadVendors();
    } catch (error) {
      Alert.alert(
        "Suspend failed",
        error instanceof Error ? error.message : "Unknown error"
      );
    } finally {
      setProcessingVendorId(null);
    }
  }

  async function handleUnsuspend(vendor: Van) {
    if (processingVendorId) return;

    setProcessingVendorId(vendor.id);

    try {
      await unsuspendVendor(vendor.id);
      Alert.alert("Vendor restored", `${vendor.name} has been unsuspended.`);
      await loadVendors();
    } catch (error) {
      Alert.alert(
        "Unsuspend failed",
        error instanceof Error ? error.message : "Unknown error"
      );
    } finally {
      setProcessingVendorId(null);
    }
  }

  async function handleDelete(vendor: Van) {
    if (processingVendorId) return;

    setProcessingVendorId(vendor.id);

    try {
      await adminDeleteVendor(vendor.id);
      Alert.alert("Vendor deleted", `${vendor.name} has been deleted.`);
      await loadVendors();
    } catch (error) {
      Alert.alert(
        "Delete failed",
        error instanceof Error ? error.message : "Unknown error"
      );
    } finally {
      setProcessingVendorId(null);
    }
  }

  function openVendorLocation(vendor: Van) {
    if (!vendor.lat || !vendor.lng) {
      Alert.alert("Location unavailable", "This vendor does not have a saved location.");
      return;
    }

    const url = `https://www.google.com/maps/search/?api=1&query=${vendor.lat},${vendor.lng}`;

    Linking.openURL(url);
  }

  async function handleApprove(vendor: Van) {
    if (processingVendorId) return;
    setProcessingVendorId(vendor.id);
    try {
      await approveVendor(vendor.id);
      Alert.alert("Vendor approved", `${vendor.name} is now approved.`);
      await loadVendors();
    } catch (error) {
      Alert.alert(
        "Approval failed",
        error instanceof Error ? error.message : "Unknown error"
      );
    } finally {
      setProcessingVendorId(null);
    }
  }

  function renderVendor({ item }: { item: Van }) {
    const isProcessing = processingVendorId === item.id;
    const isAnyProcessing = processingVendorId !== null;
    const isOpen = expandedVendorId === item.id;

    return (
      <View style={styles.card}>
        {/* 🔹 HEADER (always visible) */}
        <Pressable
          onPress={() =>
            setExpandedVendorId((current) =>
              current === item.id ? null : item.id
            )
          }
        >
          <View style={styles.topRow}>
            <View style={styles.textBlock}>
              <Text style={styles.vendorName}>{item.name}</Text>

              <Text style={styles.vendorMeta}>
                {item.vendorName || "No vendor name"} • {item.cuisine}
              </Text>
            </View>

            <View
              style={[
                styles.statusBadge,
                item.isSuspended
                  ? styles.statusSuspended
                  : item.isApproved
                    ? styles.statusActive
                    : styles.statusPending,
              ]}
            >
              <Text style={styles.statusBadgeText}>
                {item.isSuspended
                  ? "SUSPENDED"
                  : item.isApproved
                    ? "ACTIVE"
                    : "PENDING"}
              </Text>
            </View>
          </View>
        </Pressable>

        {/* 🔻 EVERYTHING BELOW ONLY SHOWS WHEN OPEN */}
        {isOpen && (
          <>
            <Pressable
              disabled={isAnyProcessing}
              onPress={() =>
                router.push({
                  pathname: "/admin/edit-vendor",
                  params: { id: item.id },
                })
              }
            >
              <Text
                style={[
                  styles.editLink,
                  isAnyProcessing && styles.buttonDisabled,
                ]}
              >
                Edit
              </Text>
            </Pressable>

            <Text style={styles.adminSectionTitle}>Vehicle verification</Text>

            {item.photo ? (
              <Image
                source={{ uri: item.photo }}
                style={styles.adminVehiclePhoto}
                resizeMode="cover"
              />
            ) : (
              <Text style={[styles.detailText, styles.missingInfo]}>
                Vehicle photo: Not provided
              </Text>
            )}

            <Text style={styles.adminSectionTitle}>Trading location</Text>

            <Text style={styles.detailText}>
              {item.lat && item.lng
                ? "A trading location has been supplied for this vendor."
                : "No trading location has been supplied."}
            </Text>

            {item.lat && item.lng ? (
              <Pressable
                style={styles.mapButton}
                onPress={() => openVendorLocation(item)}
              >
                <Text style={styles.mapButtonText}>Open in Google Maps</Text>
              </Pressable>
            ) : null}

            <Text style={styles.detailText}>
              what3words: {item.what3words || "Not provided"}
            </Text>

            <Text style={styles.adminSectionTitle}>Listing details</Text>

            <Text style={styles.detailText}>
              Tier: {(item.subscriptionTier ?? "free").toUpperCase()}
            </Text>

            <Text style={styles.detailText}>
              Owner: {item.owner_id ? "Assigned" : "Unclaimed"}
            </Text>

            <Text style={styles.detailText}>
              Menu: {item.menu || "Not provided"}
            </Text>

            <Text style={styles.detailText}>
              Schedule: {item.schedule || "Not provided"}
            </Text>

            <Text style={styles.detailText}>
              Type: {(item.vendorType ?? "food_van").replaceAll("_", " ")}
            </Text>

            <Text style={styles.detailText}>
              Community notes: {item.spotNotes || "None provided"}
            </Text>

            <Text style={styles.adminSectionTitle}>Online presence</Text>

            {item.instagramUrl ? (
              <Pressable
                style={styles.socialLinkBox}
                onPress={() => Linking.openURL(item.instagramUrl!)}
              >
                <Text style={styles.socialLinkLabel}>Instagram</Text>
                <Text style={styles.socialLinkValue}>{item.instagramUrl} ↗</Text>
              </Pressable>
            ) : (
              <Text style={[styles.detailText, styles.missingInfo]}>Instagram: Not provided</Text>
            )}

            {item.facebookUrl ? (
              <Pressable
                style={styles.socialLinkBox}
                onPress={() => Linking.openURL(item.facebookUrl!)}
              >
                <Text style={styles.socialLinkLabel}>Facebook</Text>
                <Text style={styles.socialLinkValue}>{item.facebookUrl} ↗</Text>
              </Pressable>
            ) : (
              <Text style={[styles.detailText, styles.missingInfo]}>Facebook: Not provided</Text>
            )}

            {item.websiteUrl ? (
              <Pressable
                style={styles.socialLinkBox}
                onPress={() => Linking.openURL(item.websiteUrl!)}
              >
                <Text style={styles.socialLinkLabel}>Website</Text>
                <Text style={styles.socialLinkValue}>{item.websiteUrl} ↗</Text>
              </Pressable>
            ) : (
              <Text style={[styles.detailText, styles.missingInfo]}>Website: Not provided</Text>
            )}

            <View style={styles.checklistBox}>
              <Text style={styles.checklistTitle}>Verification checks</Text>

              <Text style={styles.checklistScore}>
                {[
                  item.photo,
                  item.what3words,
                  item.instagramUrl,
                  item.facebookUrl,
                  item.websiteUrl,
                ].filter(Boolean).length}
                {" / 5 verification items supplied"}
              </Text>

              <Text style={styles.checklistItem}>
                {item.photo ? "✅" : "⚠️"} Vehicle photo
              </Text>

              <Text style={styles.checklistItem}>
                {item.what3words ? "✅" : "⚠️"} what3words
              </Text>

              <Text style={styles.checklistItem}>
                {item.instagramUrl ? "✅" : "⚠️"} Instagram
              </Text>

              <Text style={styles.checklistItem}>
                {item.facebookUrl ? "✅" : "⚠️"} Facebook
              </Text>

              <Text style={styles.checklistItem}>
                {item.websiteUrl ? "✅" : "⚠️"} Website
              </Text>
            </View>

            <View style={styles.summaryBox}>
              <Text style={styles.summaryTitle}>Approval Summary</Text>

              <Text style={styles.summaryText}>
                {item.photo &&
                  item.what3words &&
                  (item.instagramUrl || item.facebookUrl || item.websiteUrl)
                  ? "🟢 This listing contains enough information for a confident approval."
                  : "🟠 This listing may require additional verification before approval."}
              </Text>
            </View>



            {!item.isApproved ? (
              <Pressable
                style={[
                  styles.actionButton,
                  styles.approveButton,
                  isAnyProcessing && styles.buttonDisabled,
                ]}
                onPress={() =>
                  Alert.alert(
                    "Approve vendor?",
                    "This will make the vendor visible on the map.",
                    [
                      { text: "Cancel", style: "cancel" },
                      {
                        text: "Approve",
                        onPress: () => handleApprove(item),
                      },
                    ]
                  )
                }
                disabled={isAnyProcessing}
              >
                <Text style={styles.actionButtonText}>
                  {processingVendorId === item.id
                    ? "Working..."
                    : "Approve Vendor"}
                </Text>
              </Pressable>
            ) : null}

            {item.isSuspended && item.suspensionReason ? (
              <>
                <Text style={styles.noteLabel}>Suspension reason</Text>
                <Text style={styles.noteText}>
                  {item.suspensionReason}
                </Text>
              </>
            ) : null}

            {!item.isSuspended ? (
              <>
                <Text style={styles.noteLabel}>Suspension reason</Text>

                <TextInput
                  style={styles.input}
                  placeholder="Add suspension reason"
                  placeholderTextColor="rgba(235,241,250,0.45)"
                  value={suspensionReasons[item.id] ?? ""}
                  onChangeText={(text) =>
                    setSuspensionReasons((current) => ({
                      ...current,
                      [item.id]: text,
                    }))
                  }
                  editable={!isAnyProcessing}
                  maxLength={300}
                  multiline
                />

                <Pressable
                  style={[
                    styles.actionButton,
                    styles.suspendButton,
                    isAnyProcessing && styles.buttonDisabled,
                  ]}
                  onPress={() =>
                    Alert.alert(
                      "Suspend vendor?",
                      "This will suspend the vendor listing.",
                      [
                        { text: "Cancel", style: "cancel" },
                        {
                          text: "Suspend",
                          style: "destructive",
                          onPress: () => handleSuspend(item),
                        },
                      ]
                    )
                  }
                  disabled={isAnyProcessing}
                >
                  <Text style={styles.actionButtonText}>
                    {isProcessing ? "Working..." : "Suspend Vendor"}
                  </Text>
                </Pressable>
              </>
            ) : (
              <Pressable
                style={[
                  styles.actionButton,
                  styles.unsuspendButton,
                  isAnyProcessing && styles.buttonDisabled,
                ]}
                onPress={() =>
                  Alert.alert(
                    "Unsuspend vendor?",
                    "This will restore this vendor listing.",
                    [
                      { text: "Cancel", style: "cancel" },
                      {
                        text: "Restore",
                        onPress: () => handleUnsuspend(item),
                      },
                    ]
                  )
                }
                disabled={isAnyProcessing}
              >
                <Text style={styles.actionButtonText}>
                  {isProcessing ? "Working..." : "Unsuspend Vendor"}
                </Text>
              </Pressable>
            )}

            <Pressable
              style={[
                styles.actionButton,
                styles.deleteButton,
                isAnyProcessing && styles.buttonDisabled,
              ]}
              onPress={() =>
                Alert.alert(
                  "Delete vendor?",
                  "This will permanently delete this vendor.",
                  [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Delete",
                      style: "destructive",
                      onPress: () => handleDelete(item),
                    },
                  ]
                )
              }
              disabled={isAnyProcessing}
            >
              <Text style={styles.actionButtonText}>
                {isProcessing ? "Working..." : "Delete Vendor"}
              </Text>
            </Pressable>
          </>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={filteredVendors.slice(0, visibleCount)}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={renderVendor}
        ListHeaderComponent={
          <>
            <Text style={styles.kicker}>ADMIN</Text>
            <Text style={styles.title}>Manage Vendors</Text>
            <Text style={styles.subtitle}>
              Review vendor listings, approvals and community moderation.
            </Text>

            <View style={styles.filterRow}>
              {(["all", "pending", "active", "suspended"] as const).map((filter) => (
                <Pressable
                  key={filter}
                  style={[
                    styles.filterChip,
                    statusFilter === filter && styles.filterChipActive,
                  ]}
                  onPress={() => setStatusFilter(filter as typeof statusFilter)}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      statusFilter === filter && styles.filterChipTextActive,
                    ]}
                  >
                    {filter.toUpperCase()} ({vendorCounts[filter as keyof typeof vendorCounts]})
                  </Text>
                </Pressable>
              ))}
            </View>

            <TextInput
              style={styles.searchInput}
              placeholder="Search by van, vendor, or cuisine"
              placeholderTextColor="rgba(255,255,255,0.6)"
              value={searchQuery}
              onChangeText={setSearchQuery}
              editable={!processingVendorId}
            />
          </>
        }
        ListEmptyComponent={
          <Text style={styles.helperText}>
            {loading ? "Loading vendors..." : "No vendors found."}
          </Text>
        }
        ListFooterComponent={
          <>
            {visibleCount < filteredVendors.length && (
              <Pressable
                style={styles.loadMoreButton}
                onPress={() => setVisibleCount((prev) => prev + 5)}
              >
                <Text style={styles.loadMoreText}>Load More</Text>
              </Pressable>
            )}

            <Pressable style={styles.backButton} onPress={() => router.back()}>
              <Text style={styles.backButtonText}>Back</Text>
            </Pressable>
          </>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#071426", paddingHorizontal: 20, paddingTop: 22 },
  listContent: { paddingBottom: 48, flexGrow: 1 },
  kicker: { fontSize: 12, fontWeight: "900", color: "#F7B733", letterSpacing: 2, marginBottom: 12 },
  title: { fontSize: 32, fontWeight: "800", color: "#F7F8FC", marginBottom: 10 },
  subtitle: { fontSize: 15, color: "#A9B9CE", lineHeight: 23, marginBottom: 24 },
  filterRow: { flexDirection: "row", flexWrap: "wrap", gap: 9, marginBottom: 18 },
  filterChip: { backgroundColor: "#10243E", borderWidth: 1, borderColor: "#31435A", paddingVertical: 10, paddingHorizontal: 13, borderRadius: 999 },
  filterChipActive: { backgroundColor: "#332813", borderColor: "#E3A93A" },
  filterChipText: { color: "#BBC8D8", fontSize: 12, fontWeight: "800" },
  filterChipTextActive: { color: "#FFD77D" },
  searchInput: { backgroundColor: "#10243E", borderWidth: 1, borderColor: "#8D6D36", borderRadius: 15, paddingHorizontal: 16, paddingVertical: 14, marginBottom: 20, color: "#F8FAFC", fontSize: 15 },
  helperText: { fontSize: 15, color: "#A9B9CE", lineHeight: 23, marginBottom: 20 },
  card: { backgroundColor: "#10223A", borderRadius: 20, padding: 17, marginBottom: 13, borderWidth: 1, borderColor: "#665532" },
  topRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 4 },
  textBlock: { flex: 1 },
  vendorName: { fontSize: 17, fontWeight: "800", color: "#F7F8FC", marginBottom: 7 },
  vendorMeta: { fontSize: 13, lineHeight: 19, color: "#A8B8CD" },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, alignSelf: "flex-start", borderWidth: 1 },
  statusActive: { backgroundColor: "#12382F", borderColor: "#2AB989" },
  statusSuspended: { backgroundColor: "#401F2A", borderColor: "#E46A78" },
  statusPending: { backgroundColor: "#3A2D18", borderColor: "#DFA943" },
  statusBadgeText: { color: "#F7F8FC", fontSize: 10, fontWeight: "900" },
  editLink: { color: "#FFD17A", fontWeight: "800", marginTop: 15, marginBottom: 12, fontSize: 14 },
  adminSectionTitle: { fontSize: 13, fontWeight: "900", color: "#F3C66A", marginTop: 19, marginBottom: 10, letterSpacing: 0.6 },
  detailText: { fontSize: 14, color: "#D0DAE8", lineHeight: 21, marginBottom: 8 },
  missingInfo: { color: "#E6A6A6", fontWeight: "700" },
  adminVehiclePhoto: { width: "100%", height: 220, borderRadius: 14, marginTop: 8, marginBottom: 12 },
  mapButton: { backgroundColor: "#1A3554", borderWidth: 1, borderColor: "#6C6B60", paddingVertical: 13, borderRadius: 12, alignItems: "center", marginBottom: 12 },
  mapButtonText: { color: "#F5E4C3", fontWeight: "800" },
  socialLinkBox: { backgroundColor: "#0B1A2D", borderRadius: 12, padding: 13, borderWidth: 1, borderColor: "#34435B", marginBottom: 9 },
  socialLinkLabel: { fontSize: 11, fontWeight: "900", color: "#C4D1E1", marginBottom: 5, textTransform: "uppercase" },
  socialLinkValue: { fontSize: 13, color: "#F0BC5E", fontWeight: "700", lineHeight: 19 },
  checklistBox: { backgroundColor: "#0B1A2D", borderRadius: 14, padding: 15, borderWidth: 1, borderColor: "#4E503E", marginTop: 12, marginBottom: 13 },
  checklistTitle: { fontSize: 14, fontWeight: "900", color: "#F6E4C1", marginBottom: 8 },
  checklistScore: { fontSize: 13, fontWeight: "800", color: "#F0BC5E", marginBottom: 12 },
  checklistItem: { fontSize: 13, color: "#CFD9E6", marginBottom: 8, fontWeight: "600" },
  summaryBox: { backgroundColor: "#172A3B", borderRadius: 14, padding: 15, borderWidth: 1, borderColor: "#786137", marginBottom: 16 },
  summaryTitle: { fontSize: 14, fontWeight: "900", color: "#F6E4C1", marginBottom: 7 },
  summaryText: { fontSize: 13, color: "#CFD9E6", lineHeight: 21 },
  noteLabel: { fontSize: 13, fontWeight: "900", color: "#F3C66A", marginTop: 14, marginBottom: 9 },
  noteText: { fontSize: 14, color: "#D0DAE8", lineHeight: 21, marginBottom: 12 },
  input: { backgroundColor: "#0B1A2D", borderWidth: 1, borderColor: "#7B6746", borderRadius: 13, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 13, color: "#FFFFFF", minHeight: 75, textAlignVertical: "top" },
  actionButton: { paddingVertical: 15, paddingHorizontal: 12, borderRadius: 13, alignItems: "center", marginTop: 8 },
  approveButton: { backgroundColor: "#B97D1F" },
  suspendButton: { backgroundColor: "#8C3842" },
  unsuspendButton: { backgroundColor: "#176C54" },
  deleteButton: { backgroundColor: "#49232C", borderWidth: 1, borderColor: "#A7515A", marginTop: 13 },
  actionButtonText: { color: "#FFFFFF", fontWeight: "900", fontSize: 14 },
  buttonDisabled: { opacity: 0.5 },
  loadMoreButton: { backgroundColor: "#172E4A", borderWidth: 1, borderColor: "#8D6D36", paddingVertical: 15, borderRadius: 14, alignItems: "center", marginBottom: 14 },
  loadMoreText: { color: "#F5D28C", fontWeight: "800" },
  backButton: { backgroundColor: "#10243E", borderWidth: 1, borderColor: "#39495E", paddingVertical: 15, borderRadius: 15, alignItems: "center", marginTop: 10 },
  backButtonText: { color: "#D4DDEA", fontSize: 15, fontWeight: "800" },
  linkText: { color: "#F0BC5E", fontWeight: "800", marginBottom: 8 },
});
