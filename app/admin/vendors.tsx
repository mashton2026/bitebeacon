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
import { theme } from "../../constants/theme";
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
                  placeholderTextColor="#7A7A7A"
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
              Suspend or restore vendors safely before launch.
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

  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },

  filterChip: {
    backgroundColor: "rgba(255,255,255,0.08)",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
  },

  filterChipActive: {
    backgroundColor: theme.colors.primary,
  },

  filterChipText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },

  filterChipTextActive: {
    color: "#FFFFFF",
  },
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  kicker: {
    fontSize: 12,
    fontWeight: "800",
    color: theme.colors.secondary,
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  title: {
    fontSize: 30,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: "rgba(255,255,255,0.75)",
    lineHeight: 22,
    marginBottom: 20,
  },
  searchInput: {
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 2,
    borderColor: theme.colors.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 20,
    color: "#FFFFFF",
  },
  helperText: {
    fontSize: 15,
    color: "rgba(255,255,255,0.75)",
    lineHeight: 22,
    marginBottom: 20,
  },
  listContent: {
    paddingBottom: 20,
    flexGrow: 1,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 2,
    borderColor: theme.colors.border,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 10,
  },
  textBlock: {
    flex: 1,
  },
  vendorName: {
    fontSize: 18,
    fontWeight: "800",
    color: theme.colors.background,
    marginBottom: 4,
  },
  editLink: {
    color: "#FF7A00",
    fontWeight: "700",
    marginTop: 6,
    marginBottom: 6,
  },
  vendorMeta: {
    fontSize: 14,
    color: "#555555",
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    alignSelf: "flex-start",
  },
  statusActive: {
    backgroundColor: "#1DB954",
  },
  statusSuspended: {
    backgroundColor: "#C62828",
  },
  statusPending: {
    backgroundColor: "#FF7A00",
  },
  statusBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
  },
  detailText: {
    fontSize: 14,
    color: "#333333",
    marginBottom: 6,
  },

  missingInfo: {
    color: "#C62828",
    fontWeight: "700",
  },
  noteLabel: {
    fontSize: 13,
    fontWeight: "800",
    color: theme.colors.primary,
    marginTop: 10,
    marginBottom: 6,
  },
  noteText: {
    fontSize: 14,
    color: "#222222",
    lineHeight: 20,
    marginBottom: 10,
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: theme.colors.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
    color: "#222222",
    minHeight: 52,
    textAlignVertical: "top",
  },
  actionButton: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  suspendButton: {
    backgroundColor: "#C62828",
  },
  unsuspendButton: {
    backgroundColor: "#1DB954",
  },
  deleteButton: {
    backgroundColor: "#7A1F1F",
    marginTop: 10,
  },
  actionButtonText: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  backButton: {
    backgroundColor: "#D9D9D9",
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 8,
  },
  backButtonText: {
    color: "#222222",
    fontSize: 16,
    fontWeight: "700",
  },

  approveButton: {
    backgroundColor: "#FF7A00",
    marginTop: 10,
  },

  loadMoreButton: {
    backgroundColor: "#444",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    marginBottom: 10,
  },

  loadMoreText: {
    color: "#FFF",
    fontWeight: "800",
  },

  adminVehiclePhoto: {
    width: "100%",
    height: 220,
    borderRadius: 14,
    marginTop: 10,
    marginBottom: 12,
  },

  mapButton: {
    backgroundColor: "#0B2A5B",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 10,
  },

  mapButtonText: {
    color: "#FFFFFF",
    fontWeight: "800",
  },

  linkText: {
    color: "#FF7A00",
    fontWeight: "800",
    marginBottom: 8,
  },

  checklistBox: {
    backgroundColor: "#F8FBFF",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(11,42,91,0.18)",
    marginTop: 8,
    marginBottom: 12,
  },

  checklistTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0B2A5B",
    marginBottom: 8,
  },

  checklistItem: {
    fontSize: 14,
    color: "#333333",
    marginBottom: 5,
    fontWeight: "700",
  },

  adminSectionTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: "#0B2A5B",
    marginTop: 12,
    marginBottom: 8,
  },

  summaryBox: {
    backgroundColor: "#FFF8E8",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#FFD27A",
    marginBottom: 14,
  },

  summaryTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: "#0B2A5B",
    marginBottom: 6,
  },

  summaryText: {
    fontSize: 13,
    color: "#444444",
    lineHeight: 20,
  },

  socialLinkBox: {
    backgroundColor: "#F8FBFF",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(11,42,91,0.16)",
    marginBottom: 8,
  },

  socialLinkLabel: {
    fontSize: 12,
    fontWeight: "900",
    color: "#0B2A5B",
    marginBottom: 4,
    textTransform: "uppercase",
  },

  socialLinkValue: {
    fontSize: 13,
    color: "#FF7A00",
    fontWeight: "800",
  },

  checklistScore: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0B2A5B",
    marginBottom: 10,
  },
});