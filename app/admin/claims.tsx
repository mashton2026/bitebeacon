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
import { theme } from "../../constants/theme";
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
                    placeholderTextColor="#7A7A7A"
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
                        <Text style={styles.kicker}>ADMIN</Text>
                        <Text style={styles.title}>Pending Claims</Text>
                        <Text style={styles.subtitle}>
                            Review vendor requests to take ownership of community spotted vans.
                        </Text>
                    </View>
                }
                ListEmptyComponent={
                    <Text style={styles.helperText}>
                        {loading ? "Loading claims..." : "No pending claims right now."}
                    </Text>
                }
                ListFooterComponent={
                    <Pressable style={styles.backButton} onPress={() => router.back()}>
                        <Text style={styles.backButtonText}>Back</Text>
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
    claimCard: {
        backgroundColor: "#FFFFFF",
        borderRadius: 18,
        padding: 16,
        marginBottom: 14,
        borderWidth: 2,
        borderColor: "#FF7A00",
    },
    claimTitle: {
        fontSize: 18,
        fontWeight: "800",
        color: "#0B2A5B",
        marginBottom: 8,
    },
    claimMeta: {
        fontSize: 14,
        color: "#444444",
        marginBottom: 4,
    },
    claimMessageLabel: {
        fontSize: 13,
        fontWeight: "800",
        color: "#FF7A00",
        marginTop: 10,
        marginBottom: 6,
        letterSpacing: 0.5,
    },
    claimMessage: {
        fontSize: 14,
        color: "#222222",
        lineHeight: 20,
    },
    actionsRow: {
        flexDirection: "row",
        gap: 10,
        marginTop: 14,
    },
    actionButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 14,
        alignItems: "center",
    },
    actionButtonDisabled: {
        opacity: 0.6,
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
    input: {
        backgroundColor: "#FFFFFF",
        borderWidth: 2,
        borderColor: "#FF7A00",
        borderRadius: 14,
        paddingHorizontal: 14,
        paddingVertical: 12,
        marginTop: 6,
        marginBottom: 10,
        color: "#222222",
        minHeight: 52,
        textAlignVertical: "top",
    },
});