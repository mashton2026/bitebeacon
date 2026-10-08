import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
    Alert,
    FlatList,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";
import {
    approveListingRemovalRequest,
    getAllAccountDeletionRequests,
    updateAccountDeletionRequestStatus,
    type AccountDeletionRequest,
} from "../../services/accountDeletionService";

export default function AdminDeletionRequestsScreen() {
    const [requests, setRequests] = useState<AccountDeletionRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);

    useFocusEffect(
        useCallback(() => {
            loadRequests();
        }, [])
    );

    async function loadRequests() {
        setLoading(true);

        try {
            const data = await getAllAccountDeletionRequests();

            const sortedData = [...data].sort(
                (a, b) =>
                    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            );

            setRequests(sortedData);
        } catch (error) {
            Alert.alert(
                "Load failed",
                error instanceof Error ? error.message : "Unknown error"
            );
            setRequests([]);
        } finally {
            setLoading(false);
        }
    }

    async function handleApprove(request: AccountDeletionRequest) {
        if (processingId) return;

        setProcessingId(request.id);

        try {
            if (request.request_type === "listing_removal") {
                await approveListingRemovalRequest(request.id);

                Alert.alert(
                    "Success",
                    "Listing removal approved. The vendor has been suspended and taken offline."
                );
            } else {
                await updateAccountDeletionRequestStatus({
                    requestId: request.id,
                    status: "approved",
                });

                Alert.alert("Success", "Account deletion request approved.");
            }

            await loadRequests();
        } catch (error) {
            Alert.alert(
                "Update failed",
                error instanceof Error ? error.message : "Unknown error"
            );
        } finally {
            setProcessingId(null);
        }
    }
    async function handleReject(requestId: string) {
        if (processingId) return;

        setProcessingId(requestId);

        try {
            await updateAccountDeletionRequestStatus({
                requestId,
                status: "rejected",
            });

            Alert.alert("Success", "Deletion request rejected.");
            await loadRequests();
        } catch (error) {
            Alert.alert(
                "Update failed",
                error instanceof Error ? error.message : "Unknown error"
            );
        } finally {
            setProcessingId(null);
        }
    }

    function renderItem({ item }: { item: AccountDeletionRequest }) {
        const isProcessing = processingId === item.id;
        const isAnyProcessing = processingId !== null;

        return (
            <View style={styles.card}>
                <Text style={styles.cardTitle}>
                    {item.email ?? "Unknown account"}
                </Text>

                <Text style={[styles.requestType, item.request_type === "listing_removal" ? styles.listingType : styles.accountType]}>
                    {item.request_type === "listing_removal"
                        ? "LISTING REMOVAL"
                        : "ACCOUNT DELETION"}
                </Text>

                <Text style={styles.meta}>User ID: {item.user_id}</Text>

                {item.request_type === "listing_removal" && (
                    <Text style={styles.meta}>
                        Vendor Name: {item.vendor_name ?? "Unknown vendor"}
                    </Text>
                )}

                <Text style={styles.meta}>
                    Vendor ID: {item.vendor_id ?? "No linked vendor"}
                </Text>
                <Text style={styles.meta}>
                    Requested: {new Date(item.created_at).toLocaleString()}
                </Text>

                <View style={styles.divider} />
                <Text style={styles.reasonLabel}>REASON PROVIDED</Text>
                <Text style={styles.reasonText}>
                    {item.reason?.trim() || "No reason provided."}
                </Text>

                <View style={styles.actionsRow}>
                    <Pressable
                        style={[
                            styles.actionButton,
                            styles.approveButton,
                            (isAnyProcessing || isProcessing) && styles.buttonDisabled,
                        ]}
                        onPress={() =>
                            Alert.alert(
                                item.request_type === "listing_removal"
                                    ? "Approve listing removal?"
                                    : "Approve account deletion request?",
                                item.request_type === "listing_removal"
                                    ? "This will suspend the vendor listing, force it offline, and mark the removal request as approved."
                                    : "This will mark the account deletion request as approved.",
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
                            {isProcessing ? "Working..." : "Approve"}
                        </Text>
                    </Pressable>

                    <Pressable
                        style={[
                            styles.actionButton,
                            styles.rejectButton,
                            (isAnyProcessing || isProcessing) && styles.buttonDisabled,
                        ]}
                        onPress={() =>
                            Alert.alert(
                                "Reject deletion request?",
                                "This will mark the request as rejected.",
                                [
                                    { text: "Cancel", style: "cancel" },
                                    {
                                        text: "Reject",
                                        style: "destructive",
                                        onPress: () => handleReject(item.id),
                                    },
                                ]
                            )
                        }
                        disabled={isAnyProcessing}
                    >
                        <Text style={styles.actionButtonText}>
                            {isProcessing ? "Working..." : "Reject"}
                        </Text>
                    </Pressable>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <FlatList
                data={requests}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                ListHeaderComponent={
                    <View style={styles.headerBlock}>
                        <Text style={styles.kicker}>ADMINISTRATION</Text>
                        <Text style={styles.title}>Deletion Requests</Text>
                        <Text style={styles.subtitle}>
                            Review account deletion and listing removal requests securely.
                        </Text>
                    </View>
                }
                ListEmptyComponent={
                    <View style={styles.emptyCard}>
                        <Text style={styles.emptyTitle}>
                            {loading ? "Loading requests" : "All caught up"}
                        </Text>
                        <Text style={styles.helperText}>
                            {loading
                                ? "Loading deletion requests..."
                                : "No deletion requests waiting for review."}
                        </Text>
                    </View>
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

const COLORS = {
    background: "#071426",
    surface: "#0D2038",
    raised: "#112844",
    gold: "#F5B942",
    border: "rgba(245,185,66,0.26)",
    text: "#F8F5EC",
    muted: "#A9B8CA",
    subtle: "#7890A9",
    green: "#248A65",
    red: "#8D3942",
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
        paddingHorizontal: 20,
        paddingTop: 28,
    },
    headerBlock: { marginBottom: 26 },
    kicker: {
        fontSize: 11,
        fontWeight: "800",
        color: COLORS.gold,
        letterSpacing: 2,
        marginBottom: 10,
    },
    title: {
        fontSize: 30,
        fontWeight: "800",
        color: COLORS.text,
        marginBottom: 10,
    },
    subtitle: {
        fontSize: 14,
        color: COLORS.muted,
        lineHeight: 22,
    },
    helperText: {
        fontSize: 14,
        color: COLORS.muted,
        lineHeight: 21,
        textAlign: "center",
    },
    listContent: {
        paddingBottom: 48,
        flexGrow: 1,
    },
    card: {
        backgroundColor: COLORS.surface,
        borderRadius: 18,
        padding: 18,
        marginBottom: 14,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    cardTitle: {
        fontSize: 17,
        fontWeight: "800",
        color: COLORS.text,
        marginBottom: 10,
    },
    requestType: {
        fontSize: 10,
        fontWeight: "800",
        letterSpacing: 1.1,
        marginBottom: 14,
        alignSelf: "flex-start",
        paddingHorizontal: 10,
        paddingVertical: 7,
        borderRadius: 9,
        overflow: "hidden",
    },
    listingType: {
        color: "#8ED7C0",
        backgroundColor: "rgba(36,138,101,0.18)",
    },
    accountType: {
        color: COLORS.gold,
        backgroundColor: "rgba(245,185,66,0.13)",
    },
    meta: {
        fontSize: 12,
        color: COLORS.muted,
        marginBottom: 7,
        lineHeight: 19,
    },
    divider: {
        height: 1,
        backgroundColor: "rgba(245,185,66,0.16)",
        marginTop: 12,
        marginBottom: 15,
    },
    reasonLabel: {
        fontSize: 11,
        fontWeight: "800",
        color: COLORS.gold,
        marginBottom: 9,
        letterSpacing: 1.1,
    },
    reasonText: {
        fontSize: 14,
        color: COLORS.text,
        lineHeight: 21,
        marginBottom: 20,
    },
    actionsRow: {
        flexDirection: "row",
        gap: 10,
    },
    actionButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 13,
        alignItems: "center",
        justifyContent: "center",
        minHeight: 48,
    },
    approveButton: { backgroundColor: COLORS.green },
    rejectButton: { backgroundColor: COLORS.red },
    actionButtonText: {
        color: "#FFFFFF",
        fontWeight: "800",
        fontSize: 14,
    },
    buttonDisabled: { opacity: 0.5 },
    backButton: {
        backgroundColor: COLORS.raised,
        borderWidth: 1,
        borderColor: COLORS.border,
        paddingVertical: 15,
        borderRadius: 14,
        alignItems: "center",
        marginTop: 16,
    },
    backButtonText: {
        color: COLORS.text,
        fontSize: 14,
        fontWeight: "700",
    },
    emptyCard: {
        backgroundColor: COLORS.surface,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 18,
        paddingVertical: 28,
        paddingHorizontal: 18,
        marginBottom: 14,
        alignItems: "center",
    },
    emptyTitle: {
        color: COLORS.gold,
        fontSize: 18,
        fontWeight: "800",
        marginBottom: 9,
    },
});
