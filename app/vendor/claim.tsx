import { router, useLocalSearchParams } from "expo-router";
import { supabase } from "../../lib/supabase";
import { useEffect, useRef, useState } from "react";
import {
    Alert,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
} from "react-native";
import { theme } from "../../constants/theme";
import { getCurrentUser } from "../../services/authService";
import {
    createVendorClaim,
    getMyVendorClaimForSpottedVan,
} from "../../services/vendorClaimService";
import { getVendorById } from "../../services/vendorService";

const VERIFICATION_OPTIONS = [
    "Email from official business email",
    "Photo of branded van with today's date",
    "Social media page matching the van",
    "Website or Google Business profile",
    "Photo of menu or signage matching the listing",
];

export default function ClaimVendorScreen() {
    const params = useLocalSearchParams();
    const spottedVendorId = (params.id as string) ?? "";

    const [claimName, setClaimName] = useState("");
    const [claimEmail, setClaimEmail] = useState("");
    const [claimMessage, setClaimMessage] = useState("");
    const [verificationMethods, setVerificationMethods] = useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isChecking, setIsChecking] = useState(true);

    const isActiveRef = useRef(true);

    async function checkVendorAccess() {
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user || !user.email_confirmed_at) {
            await supabase.auth.signOut();
            router.replace("/auth/login");
            return false;
        }

        return true;
    }

    useEffect(() => {
        isActiveRef.current = true;

        async function init() {
            const allowed = await checkVendorAccess();

            if (!allowed) return;

            if (!spottedVendorId) {
                Alert.alert("Invalid request", "Missing vendor ID.");
                router.back();
                return;
            }

            loadClaimDefaults();
        }

        init();

        return () => {
            isActiveRef.current = false;
        };
    }, [spottedVendorId]);

    async function loadClaimDefaults() {
        try {
            const user = await getCurrentUser();

            if (!user) {
                Alert.alert("Login required", "Please log in as a vendor first.");
                router.back();
                return;
            }

            const vendor = await getVendorById(spottedVendorId);

            if (!vendor) {
                Alert.alert("Not found", "This spotted van could not be found.");
                router.back();
                return;
            }

            if (vendor.isSuspended) {
                Alert.alert(
                    "Unavailable",
                    "This spotted van is not available for claiming."
                );
                router.back();
                return;
            }

            if (!vendor.temporary) {
                Alert.alert(
                    "Already claimed",
                    "Only community spotted vans can be claimed."
                );
                router.back();
                return;
            }

            const existingClaim = await getMyVendorClaimForSpottedVan(
                spottedVendorId,
                user.id
            );

            if (existingClaim) {
                Alert.alert(
                    "Claim submitted",
                    "Your claim is now under review.\n\nNext step:\nSend your 3 selected proof methods to support@bitebeacon.uk using the same email as this claim.\n\nYou will gain access once approved."
                );
                router.replace("/vendor/dashboard");
                return;
            }

            if (!isActiveRef.current) return;

            setClaimName(vendor.name || "");
            setClaimEmail(user.email ?? "");
            setClaimMessage(
                "I am the real owner of this van and would like to claim this listing."
            );
        } catch (error) {
            Alert.alert(
                "Load failed",
                error instanceof Error ? error.message : "Unknown error"
            );
            router.back();
        } finally {
            if (isActiveRef.current) {
                setIsChecking(false);
            }
        }
    }

    function toggleVerificationMethod(method: string) {
        if (isSubmitting) return;

        setVerificationMethods((current) => {
            if (current.includes(method)) {
                return current.filter((item) => item !== method);
            }

            if (current.length >= 3) {
                Alert.alert(
                    "3 methods required",
                    "Please choose exactly 3 verification methods."
                );
                return current;
            }

            return [...current, method];
        });
    }

    async function handleSubmitClaim() {
        if (isSubmitting) return;

        const trimmedEmail = claimEmail.trim().toLowerCase();

        if (!claimName.trim() || !trimmedEmail || !claimMessage.trim()) {
            Alert.alert(
                "Missing details",
                "Please fill in business name, contact email, and claim message."
            );
            return;
        }

        if (verificationMethods.length !== 3) {
            Alert.alert(
                "Verification required",
                "Please choose exactly 3 verification methods."
            );
            return;
        }

        setIsSubmitting(true);

        try {
            const user = await getCurrentUser();

            if (!user) {
                Alert.alert("Login required", "Please log in as a vendor first.");
                return;
            }

            await createVendorClaim({
                spottedVendorId,
                claimingUserId: user.id,
                claimName: claimName.trim(),
                claimEmail: trimmedEmail,
                claimMessage: claimMessage.trim(),
                verificationMethods,
            });

            Alert.alert(
                "Claim submitted",
                "Your claim has been submitted. Please send your 3 selected proof methods to support@bitebeacon.uk using the same email."
            );

            router.back();
        } catch (error) {
            Alert.alert(
                "Claim failed",
                error instanceof Error ? error.message : "Unknown error"
            );
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <Text style={styles.kicker}>CLAIM</Text>
            <Text style={styles.title}>Claim This Van</Text>
            <Text style={styles.subtitle}>
                Submit your request to take ownership of this community spotted listing.
            </Text>

            {isChecking ? (
                <Text style={styles.loadingText}>Checking listing...</Text>
            ) : (
                <>
                    <Text style={styles.label}>Business Name</Text>
                    <TextInput
                        style={styles.input}
                        value={claimName}
                        onChangeText={setClaimName}
                        editable={!isSubmitting}
                    />

                    <Text style={styles.label}>Contact Email</Text>
                    <TextInput
                        style={styles.input}
                        value={claimEmail}
                        onChangeText={setClaimEmail}
                        autoCapitalize="none"
                        keyboardType="email-address"
                        editable={!isSubmitting}
                    />

                    <Text style={styles.label}>Claim Message</Text>
                    <TextInput
                        style={[styles.input, styles.textArea]}
                        value={claimMessage}
                        onChangeText={setClaimMessage}
                        multiline
                        editable={!isSubmitting}
                    />

                    <Text style={styles.label}>Choose 3 verification methods</Text>

                    {VERIFICATION_OPTIONS.map((method) => {
                        const isSelected = verificationMethods.includes(method);

                        return (
                            <Pressable
                                key={method}
                                style={[
                                    styles.verificationOption,
                                    isSelected && styles.verificationOptionSelected,
                                ]}
                                onPress={() => toggleVerificationMethod(method)}
                                disabled={isSubmitting}
                            >
                                <Text
                                    style={[
                                        styles.verificationOptionText,
                                        isSelected && styles.verificationOptionTextSelected,
                                    ]}
                                >
                                    {isSelected ? "✓ " : ""}
                                    {method}
                                </Text>
                            </Pressable>
                        );
                    })}

                    <Pressable
                        style={[
                            styles.primaryButton,
                            isSubmitting && styles.buttonDisabled,
                        ]}
                        onPress={handleSubmitClaim}
                        disabled={isSubmitting}
                    >
                        <Text style={styles.primaryButtonText}>
                            {isSubmitting ? "Submitting..." : "Submit Claim"}
                        </Text>
                    </Pressable>
                </>
            )}

            <Pressable
                style={[styles.backButton, isSubmitting && styles.buttonDisabled]}
                onPress={() => router.back()}
                disabled={isSubmitting}
            >
                <Text style={styles.backButtonText}>Back</Text>
            </Pressable>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    content: { padding: 24, paddingBottom: 40 },

    kicker: {
        fontSize: 12,
        fontWeight: "800",
        color: theme.colors.secondary,
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
        marginBottom: 24,
    },

    loadingText: { color: "rgba(255,255,255,0.75)" },

    label: {
        fontSize: 14,
        fontWeight: "700",
        color: "#FFFFFF",
        marginBottom: 8,
    },

    input: {
        backgroundColor: "#FFFFFF",
        borderWidth: 2,
        borderColor: theme.colors.border,
        borderRadius: 14,
        padding: 14,
        marginBottom: 14,
    },

    textArea: { minHeight: 120, textAlignVertical: "top" },

    verificationOption: {
        backgroundColor: "#FFFFFF",
        borderWidth: 2,
        borderColor: theme.colors.border,
        borderRadius: 14,
        padding: 12,
        marginBottom: 10,
    },

    verificationOptionSelected: {
        backgroundColor: theme.colors.primary,
    },

    verificationOptionText: {
        color: "#222",
        fontWeight: "700",
    },

    verificationOptionTextSelected: {
        color: "#FFF",
    },

    primaryButton: {
        backgroundColor: theme.colors.primary,
        padding: 15,
        borderRadius: 16,
        alignItems: "center",
        marginTop: 10,
    },

    primaryButtonText: {
        color: "#FFF",
        fontWeight: "800",
    },

    backButton: {
        backgroundColor: "#D9D9D9",
        padding: 15,
        borderRadius: 16,
        alignItems: "center",
        marginTop: 10,
    },

    backButtonText: {
        color: "#222",
        fontWeight: "700",
    },

    buttonDisabled: {
        opacity: 0.6,
    },
});