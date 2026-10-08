import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
    Alert,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import MapTextureBackground from "../../components/MapTextureBackground";
import { supabase } from "../../lib/supabase";
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
        <MapTextureBackground>
        <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <View style={styles.header}>
                <Text style={styles.kicker}>VENDOR VERIFICATION</Text>
                <Text style={styles.title}>Claim This Van</Text>
                <Text style={styles.subtitle}>
                    Submit your request to take ownership of this community spotted listing.
                </Text>
            </View>
            <LinearGradient
                colors={["#A66B00", "#FFECA3", "#FFC531", "#FFF2AE", "#C88705"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.goldFrame}
            >
              <View style={styles.formCard}>
                <View style={styles.formHeading}>
                    <View style={styles.formIcon}><MaterialCommunityIcons name="shield-account-outline" size={27} color="#FFDA70" /></View>
                    <View style={styles.formHeadingCopy}>
                        <Text style={styles.formTitle}>Ownership request</Text>
                        <Text style={styles.formSubtitle}>Tell us about your business and select your proof methods.</Text>
                    </View>
                </View>
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

                    <View style={styles.verificationHeading}>
                        <Text style={styles.label}>Choose 3 verification methods</Text>
                        <Text style={styles.counter}>{verificationMethods.length}/3 SELECTED</Text>
                    </View>

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
                        style={[styles.primaryButton, isSubmitting && styles.buttonDisabled]}
                        onPress={handleSubmitClaim}
                        disabled={isSubmitting}
                    >
                        <LinearGradient
                            colors={["#A66B00", "#FFECA3", "#FFC531", "#FFF2AE", "#C88705"]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.primaryGradient}
                        >
                            <MaterialCommunityIcons name="check-decagram-outline" size={21} color="#17170F" />
                            <Text style={styles.primaryButtonText}>
                                {isSubmitting ? "Submitting..." : "Submit Claim"}
                            </Text>
                        </LinearGradient>
                    </Pressable>
                </>
            )}

              </View>
            </LinearGradient>
            <Pressable
                style={[styles.backButton, isSubmitting && styles.buttonDisabled]}
                onPress={() => router.back()}
                disabled={isSubmitting}
            >
                <Text style={styles.backButtonText}>Back</Text>
            </Pressable>
        </ScrollView>
        </MapTextureBackground>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "transparent" },
    content: { paddingHorizontal: 20, paddingTop: 28, paddingBottom: 54 },
    header: { marginBottom: 23 },
    kicker: { fontSize: 11, fontWeight: "800", color: "#FFE08A", letterSpacing: 2, marginBottom: 9 },
    title: { fontSize: 31, fontWeight: "800", color: "#FFF9EA", marginBottom: 9 },
    subtitle: { fontSize: 14, color: "#C4CFD9", lineHeight: 22 },
    goldFrame: { borderRadius: 26, padding: 2, marginBottom: 15, shadowColor: "#FFC531", shadowOpacity: 0.24, shadowRadius: 18, shadowOffset: { width: 0, height: 0 }, elevation: 7 },
    formCard: { backgroundColor: "#0B1827", borderRadius: 24, padding: 18 },
    formHeading: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 23 },
    formIcon: { width: 51, height: 51, borderRadius: 17, borderWidth: 1, borderColor: "#E3B743", backgroundColor: "#1A2631", alignItems: "center", justifyContent: "center" },
    formHeadingCopy: { flex: 1 },
    formTitle: { fontSize: 19, fontWeight: "800", color: "#FFF3C5" },
    formSubtitle: { color: "#AEBBC8", fontSize: 12, lineHeight: 18, marginTop: 3 },
    loadingText: { color: "#E7D5A8", paddingVertical: 22, textAlign: "center" },
    label: { fontSize: 13, fontWeight: "700", color: "#FFE29A", marginBottom: 9 },
    input: { backgroundColor: "#101F30", borderWidth: 1, borderColor: "#B78A35", borderRadius: 14, padding: 14, marginBottom: 17, color: "#FFFFFF", fontSize: 15 },
    textArea: { minHeight: 120, textAlignVertical: "top" },
    verificationHeading: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, marginTop: 3, marginBottom: 8 },
    counter: { fontSize: 10, fontWeight: "800", color: "#FFD56B", letterSpacing: 0.6, marginBottom: 9 },
    verificationOption: { backgroundColor: "#102033", borderWidth: 1, borderColor: "#705B36", borderRadius: 14, padding: 15, marginBottom: 10 },
    verificationOptionSelected: { backgroundColor: "#332A17", borderColor: "#FFD765", borderWidth: 2 },
    verificationOptionText: { color: "#D6DFE8", fontSize: 13, lineHeight: 19, fontWeight: "600" },
    verificationOptionTextSelected: { color: "#FFF0B7" },
    primaryButton: { marginTop: 17, borderRadius: 16, overflow: "hidden" },
    primaryGradient: { minHeight: 54, flexDirection: "row", gap: 9, alignItems: "center", justifyContent: "center", paddingHorizontal: 12 },
    primaryButtonText: { color: "#17170F", fontSize: 16, fontWeight: "800" },
    backButton: { backgroundColor: "#101F30", padding: 15, minHeight: 52, borderRadius: 16, borderWidth: 1, borderColor: "#DDB45A", alignItems: "center", justifyContent: "center", marginTop: 8 },
    backButtonText: { color: "#FFE29A", fontSize: 15, fontWeight: "700" },
    buttonDisabled: { opacity: 0.6 },
});
