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
    approveVendorClaim,
    getPendingVendorClaims,
    rejectVendorClaim,
    type VendorClaim,
} from "../../services/vendorClaimService";
import { getAllVendors } from "../../services/vendorService";
import { type Van } from "../../types/van";

export default function AdminClaimsScreen() {
    const [claims, setClaims] = useState<VendorClaim[]>([]);
    const [vendors, setVendors] = useState<Van[]>([]);
    const [loading, setLoading] = useState(true);
    const [processingClaimId, setProcessingClaimId] = useState<string | null>(
        null
    );
    const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});

    useFocusEffect(
        useCallback(() => {
            loadScreen();
        }, [])
    );

    const vendorNameMap = useMemo(() => {
        const nextMap = new Map<string, string>();

        vendors.forEach((vendor) => {
            nextMap.set(String(vendor.id), vendor.name);
        });

        return nextMap;
    }, [vendors]);

    async function loadScreen() {
        setLoading(true);

        try {
            const [pendingClaims, allVendors] = await Promise.all([
                getPendingVendorClaims(),
                getAllVendors(),
            ]);

            setClaims(pendingClaims);
            setVendors(allVendors);

            setAdminNotes((current) => {
                const nextNotes: Record<string, string> = {};

                pendingClaims.forEach((claim) => {
                    if (current[claim.id]) {
                        nextNotes[claim.id] = current[claim.id];
                    }
                });

                return nextNotes;
            });
        } catch (error) {
            Alert.alert(
                "Load failed",
                error instanceof Error ? error.message : "Unknown error"
            );
            setClaims([]);
            setVendors([]);
        } finally {
            setLoading(false);
        }
    }

    function getVendorName(spottedVendorId: string) {
        return vendorNameMap.get(String(spottedVendorId)) ?? "Unknown spotted van";
    }

    async function handleApprove(claimId: string) {
        setProcessingClaimId(claimId);

        try {
            await approveVendorClaim(claimId, (adminNotes[claimId] ?? "").trim());

            Alert.alert("Approved", "The claim has been approved.");
            await loadScreen();
        } catch (error) {
            Alert.alert(
                "Approval failed",
                error instanceof Error ? error.message : "Unknown error"
            );
        } finally {
            setProcessingClaimId(null);
        }
    }

    async function handleReject(claimId: string) {
        setProcessingClaimId(claimId);

        try {
            await rejectVendorClaim(claimId, (adminNotes[claimId] ?? "").trim());
            Alert.alert("Rejected", "The claim has been rejected.");
            await loadScreen();
        } catch (error) {
            Alert.alert(
                "Rejection failed",
                error instanceof Error ? error.message : "Unknown error"
            );
        } finally {
            setProcessingClaimId(null);
        }
    }

    function renderClaim(item: VendorClaim) {
        const isProcessing = processingClaimId === item.id;

        return (
            <View style={styles.claimCard}>
                <Text style={styles.cardEyebrow}>OWNERSHIP REQUEST</Text>
                <Text style={styles.claimTitle}>{getVendorName(item.spotted_vendor_id)}</Text>

                <Text style={styles.claimMeta}>Business: {item.claim_name}</Text>
                <Text style={styles.claimMeta}>Email: {item.claim_email}</Text>

                <Text style={styles.claimMessageLabel}>Claim message</Text>
                <Text style={styles.claimMessage}>{item.claim_message}</Text>

                <Text style={styles.claimMessageLabel}>Verification methods</Text>
                {item.verification_methods?.length ? (
                    item.verification_methods.map((method) => (
                        <Text key={method} style={styles.claimMeta}>
                            • {method}
                        </Text>
                    ))
                ) : (
                    <Text style={styles.claimMeta}>No verification methods provided.</Text>
                )}

                <Text style={styles.claimMessageLabel}>Admin note</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Add decision note"
                    placeholderTextColor="#8393AA"
                    value={adminNotes[item.id] ?? ""}
                    onChangeText={(text) =>
                        setAdminNotes((current) => ({
                            ...current,
                            [item.id]: text,
                        }))
                    }
                    editable={!isProcessing}
                    maxLength={300}
                    multiline
                />

                <View style={styles.actionsRow}>
                    <Pressable
                        style={[
                            styles.actionButton,
                            styles.approveButton,
                            isProcessing && styles.actionButtonDisabled,
                        ]}
                        onPress={() => handleApprove(item.id)}
                        disabled={isProcessing}
                    >
                        <Text style={styles.actionButtonText}>
                            {isProcessing ? "Working..." : "Approve"}
                        </Text>
                    </Pressable>

                    <Pressable
                        style={[
                            styles.actionButton,
                            styles.rejectButton,
                            isProcessing && styles.actionButtonDisabled,
                        ]}
                        onPress={() => handleReject(item.id)}
                        disabled={isProcessing}
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
                data={claims}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                ListHeaderComponent={
                    <View style={styles.headerBlock}>
                        <Text style={styles.kicker}>ADMINISTRATION</Text>
                        <Text style={styles.title}>Pending Claims</Text>
                        <Text style={styles.subtitle}>
                            Review vendor requests to take ownership of community spotted vans.
                        </Text>
                    </View>
                }
                ListEmptyComponent={
                    <View style={styles.emptyCard}>
                        <Text style={styles.emptyAccent}>{loading ? "PLEASE WAIT" : "ALL CAUGHT UP"}</Text>
                        <Text style={styles.emptyTitle}>{loading ? "Loading claims" : "No pending claims"}</Text>
                        <Text style={styles.helperText}>
                            {loading
                                ? "Checking for ownership requests..."
                                : "There are no ownership requests waiting for review right now."}
                        </Text>
                    </View>
                }
                ListFooterComponent={
                    <Pressable style={styles.backButton} onPress={() => router.back()}>
                        <Text style={styles.backButtonText}>Back to Control Centre</Text>
                    </Pressable>
                }
                renderItem={({ item }) => renderClaim(item)}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#061426",
        paddingHorizontal: 20,
        paddingTop: 24,
    },
    listContent: {
        paddingBottom: 48,
        flexGrow: 1,
    },
    headerBlock: {
        marginBottom: 24,
    },
    kicker: {
        fontSize: 12,
        fontWeight: "800",
        color: "#F7B43B",
        letterSpacing: 2,
        marginBottom: 12,
    },
    title: {
        fontSize: 32,
        fontWeight: "800",
        color: "#FFFFFF",
        marginBottom: 10,
    },
    subtitle: {
        fontSize: 15,
        color: "#A8B8CE",
        lineHeight: 23,
    },
    emptyCard: {
        backgroundColor: "#10233B",
        borderWidth: 1,
        borderColor: "rgba(236,175,65,0.32)",
        borderRadius: 22,
        paddingHorizontal: 22,
        paddingVertical: 30,
        alignItems: "center",
    },
    emptyAccent: {
        fontSize: 11,
        fontWeight: "800",
        letterSpacing: 1.8,
        color: "#F7B43B",
        marginBottom: 12,
    },
    emptyTitle: {
        fontSize: 21,
        fontWeight: "800",
        color: "#FFFFFF",
        marginBottom: 8,
        textAlign: "center",
    },
    helperText: {
        fontSize: 14,
        color: "#A8B8CE",
        lineHeight: 22,
        textAlign: "center",
    },
    claimCard: {
        backgroundColor: "#10233B",
        borderRadius: 22,
        padding: 20,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: "rgba(236,175,65,0.34)",
    },
    cardEyebrow: {
        color: "#F7B43B",
        fontSize: 11,
        fontWeight: "800",
        letterSpacing: 1.5,
        marginBottom: 10,
    },
    claimTitle: {
        fontSize: 20,
        fontWeight: "800",
        color: "#FFFFFF",
        marginBottom: 12,
    },
    claimMeta: {
        fontSize: 14,
        color: "#C4D0DF",
        marginBottom: 6,
        lineHeight: 21,
    },
    claimMessageLabel: {
        fontSize: 12,
        fontWeight: "800",
        color: "#F7B43B",
        marginTop: 16,
        marginBottom: 8,
        letterSpacing: 0.8,
    },
    claimMessage: {
        fontSize: 14,
        color: "#E6ECF4",
        lineHeight: 22,
    },
    input: {
        backgroundColor: "#09192D",
        borderWidth: 1,
        borderColor: "rgba(236,175,65,0.42)",
        borderRadius: 14,
        paddingHorizontal: 14,
        paddingVertical: 12,
        marginTop: 4,
        marginBottom: 8,
        color: "#FFFFFF",
        minHeight: 70,
        textAlignVertical: "top",
        fontSize: 14,
    },
    actionsRow: {
        flexDirection: "row",
        gap: 10,
        marginTop: 16,
    },
    actionButton: {
        flex: 1,
        minHeight: 48,
        paddingVertical: 14,
        borderRadius: 14,
        alignItems: "center",
        justifyContent: "center",
    },
    actionButtonDisabled: {
        opacity: 0.6,
    },
    approveButton: {
        backgroundColor: "#168C62",
    },
    rejectButton: {
        backgroundColor: "#A83742",
    },
    actionButtonText: {
        color: "#FFFFFF",
        fontWeight: "800",
        fontSize: 15,
    },
    backButton: {
        backgroundColor: "#122B48",
        borderWidth: 1,
        borderColor: "rgba(236,175,65,0.32)",
        paddingVertical: 16,
        paddingHorizontal: 14,
        borderRadius: 16,
        alignItems: "center",
        marginTop: 22,
    },
    backButtonText: {
        color: "#F1F5FA",
        fontSize: 15,
        fontWeight: "700",
    },
});
