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
import { theme } from "../../constants/theme";
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

                <Text style={styles.requestType}>
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

                <Text style={styles.reasonLabel}>Reason</Text>
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
                        <Text style={styles.kicker}>ADMIN</Text>
                        <Text style={styles.title}>Deletion Requests</Text>
                        <Text style={styles.subtitle}>
                            Review account deletion and listing removal requests.
                        </Text>
                    </View>
                }
                ListEmptyComponent={
                    <Text style={styles.helperText}>
                        {loading
                            ? "Loading deletion requests..."
                            : "No deletion requests waiting for review."}
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

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
        paddingHorizontal: 24,
        paddingTop: 24,
    },
    headerBlock: {
        marginBottom: 20,
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
    cardTitle: {
        fontSize: 18,
        fontWeight: "800",
        color: "#0B2A5B",
        marginBottom: 8,
    },
    requestType: {
        fontSize: 12,
        fontWeight: "800",
        color: "#FF7A00",
        letterSpacing: 0.8,
        marginBottom: 8,
    },
    meta: {
        fontSize: 14,
        color: "#444444",
        marginBottom: 4,
    },
    reasonLabel: {
        fontSize: 13,
        fontWeight: "800",
        color: "#FF7A00",
        marginTop: 10,
        marginBottom: 6,
        letterSpacing: 0.5,
    },
    reasonText: {
        fontSize: 14,
        color: "#222222",
        lineHeight: 20,
        marginBottom: 12,
    },
    actionsRow: {
        flexDirection: "row",
        gap: 10,
    },
    actionButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 14,
        alignItems: "center",
    },
    approveButton: {
        backgroundColor: "#1DB954",
    },
    rejectButton: {
        backgroundColor: "#C62828",
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
});