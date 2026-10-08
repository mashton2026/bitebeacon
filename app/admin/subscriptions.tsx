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
    getAllVendors,
    updateVendorSubscriptionTier,
} from "../../services/vendorService";
import { type Van } from "../../types/van";

export default function AdminSubscriptionsScreen() {
    const [vendors, setVendors] = useState<Van[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [processingVendorId, setProcessingVendorId] = useState<string | null>(
        null
    );

    useFocusEffect(
        useCallback(() => {
            loadVendors();
        }, [])
    );

    async function loadVendors() {
        setLoading(true);

        try {
            const data = await getAllVendors();

            const sortedData = [...data].sort((a, b) =>
                a.name.localeCompare(b.name)
            );

            setVendors(sortedData);
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

    const filteredVendors = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();

        if (!query) return vendors;

        return vendors.filter((vendor) => {
            return (
                vendor.name.toLowerCase().includes(query) ||
                (vendor.vendorName ?? "").toLowerCase().includes(query) ||
                vendor.cuisine.toLowerCase().includes(query)
            );
        });
    }, [vendors, searchQuery]);

    async function handleTierChange(
        vendorId: string,
        nextTier: "free" | "growth" | "pro"
    ) {
        if (processingVendorId) return;

        const vendor = vendors.find((v) => v.id === vendorId);
        const currentTier = vendor?.subscriptionTier ?? "free";

        if (currentTier === nextTier) return;

        const isDowngrade =
            (currentTier === "pro" &&
                (nextTier === "growth" || nextTier === "free")) ||
            (currentTier === "growth" && nextTier === "free");

        const confirmMessage = isDowngrade
            ? `Move this vendor from ${currentTier.toUpperCase()} to ${nextTier.toUpperCase()}?\n\nThis may reduce vendor visibility and disable paid features.`
            : `Move this vendor from ${currentTier.toUpperCase()} to ${nextTier.toUpperCase()}?`;

        Alert.alert("Confirm tier change", confirmMessage, [
            { text: "Cancel", style: "cancel" },
            {
                text: "Confirm",
                style: "destructive",
                onPress: async () => {
                    setProcessingVendorId(vendorId);

                    try {
                        await updateVendorSubscriptionTier(vendorId, nextTier);
                        Alert.alert(
                            "Plan updated",
                            `Vendor moved to ${nextTier.toUpperCase()}.`
                        );
                        await loadVendors();
                    } catch (error) {
                        Alert.alert(
                            "Update failed",
                            error instanceof Error ? error.message : "Unknown error"
                        );
                    } finally {
                        setProcessingVendorId(null);
                    }
                },
            },
        ]);
    }

    function renderVendor({ item }: { item: Van }) {
        const isProcessing = processingVendorId === item.id;
        const isAnyProcessing = processingVendorId !== null;
        const currentTier = item.subscriptionTier ?? "free";

        return (
            <View style={styles.card}>
                <Text style={styles.vendorName}>{item.name}</Text>
                <Text style={styles.vendorMeta}>
                    {item.vendorName || "No vendor name"} • {item.cuisine}
                </Text>
                <Text style={styles.currentTier}>
                    Current Tier: {currentTier.toUpperCase()}
                </Text>

                <View style={styles.tierRow}>
                    <Pressable
                        style={[
                            styles.tierButton,
                            currentTier === "free" && styles.tierButtonActive,
                            isAnyProcessing && styles.tierButtonDisabled,
                        ]}
                        onPress={() => handleTierChange(item.id, "free")}
                        disabled={isAnyProcessing}
                    >
                        <Text
                            style={[
                                styles.tierButtonText,
                                currentTier === "free" && styles.tierButtonTextActive,
                            ]}
                        >
                            Free
                        </Text>
                    </Pressable>

                    <Pressable
                        style={[
                            styles.tierButton,
                            currentTier === "growth" && styles.tierButtonActive,
                            isAnyProcessing && styles.tierButtonDisabled,
                        ]}
                        onPress={() => handleTierChange(item.id, "growth")}
                        disabled={isAnyProcessing}
                    >
                        <Text
                            style={[
                                styles.tierButtonText,
                                currentTier === "growth" && styles.tierButtonTextActive,
                            ]}
                        >
                            Growth
                        </Text>
                    </Pressable>

                    <Pressable
                        style={[
                            styles.tierButton,
                            currentTier === "pro" && styles.tierButtonActive,
                            isAnyProcessing && styles.tierButtonDisabled,
                        ]}
                        onPress={() => handleTierChange(item.id, "pro")}
                        disabled={isAnyProcessing}
                    >
                        <Text
                            style={[
                                styles.tierButtonText,
                                currentTier === "pro" && styles.tierButtonTextActive,
                            ]}
                        >
                            Pro
                        </Text>
                    </Pressable>
                </View>

                {isProcessing ? (
                    <Text style={styles.processingText}>Updating...</Text>
                ) : null}
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <FlatList
                data={filteredVendors}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                renderItem={renderVendor}
                ListHeaderComponent={
                    <>
                        <Text style={styles.kicker}>ADMIN</Text>
                        <Text style={styles.title}>Manage Subscription Tiers</Text>
                        <Text style={styles.subtitle}>
                            Move vendors between Free, Growth, and Pro plans.
                        </Text>

                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search by van, vendor, or cuisine"
                            placeholderTextColor="#718693"
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
                    <Pressable style={styles.backButton} onPress={() => router.back()}>
                        <Text style={styles.backButtonText}>Back</Text>
                    </Pressable>
                }
            />
        </View>
    );
}

const BG = "#061522";
const PANEL = "#0B2030";
const GOLD = "#D9A441";
const GOLD_SOFT = "rgba(217,164,65,0.38)";
const TEXT = "#F7F5EE";
const MUTED = "#9AAAB5";

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: BG, paddingHorizontal: 20, paddingTop: 25 },
    kicker: { fontSize: 11, fontWeight: "800", color: GOLD, letterSpacing: 2.2, marginBottom: 9 },
    title: { fontSize: 28, fontWeight: "900", color: TEXT, marginBottom: 9, letterSpacing: 0.2 },
    subtitle: { fontSize: 14, color: MUTED, lineHeight: 21, marginBottom: 23 },
    searchInput: {
        backgroundColor: PANEL, borderWidth: 1, borderColor: GOLD_SOFT,
        borderRadius: 15, paddingHorizontal: 16, paddingVertical: 14,
        marginBottom: 20, color: TEXT, fontSize: 14, minHeight: 51,
    },
    helperText: { fontSize: 14, color: MUTED, lineHeight: 22, marginBottom: 20, textAlign: "center", paddingVertical: 28 },
    listContent: { paddingBottom: 30, flexGrow: 1 },
    card: {
        backgroundColor: PANEL, borderRadius: 20, padding: 19, marginBottom: 14,
        borderWidth: 1, borderColor: GOLD_SOFT,
    },
    vendorName: { fontSize: 18, fontWeight: "800", color: TEXT, marginBottom: 6 },
    vendorMeta: { fontSize: 13, color: MUTED, marginBottom: 17, lineHeight: 19 },
    currentTier: {
        fontSize: 12, fontWeight: "800", color: GOLD,
        marginBottom: 13, letterSpacing: 0.8,
    },
    tierRow: { flexDirection: "row", gap: 9 },
    tierButton: {
        flex: 1, backgroundColor: "#071724", borderWidth: 1,
        borderColor: "#315064", borderRadius: 13, paddingVertical: 13,
        alignItems: "center", justifyContent: "center", minHeight: 45,
    },
    tierButtonActive: { backgroundColor: "#4C3820", borderColor: GOLD },
    tierButtonDisabled: { opacity: 0.45 },
    tierButtonText: { color: MUTED, fontWeight: "800", fontSize: 13 },
    tierButtonTextActive: { color: "#FFE6A5" },
    processingText: { marginTop: 12, fontSize: 13, fontWeight: "700", color: GOLD },
    backButton: {
        backgroundColor: PANEL, borderWidth: 1, borderColor: GOLD_SOFT,
        paddingVertical: 16, borderRadius: 15, alignItems: "center", marginTop: 12,
    },
    backButtonText: { color: GOLD, fontSize: 14, fontWeight: "800" },
});
