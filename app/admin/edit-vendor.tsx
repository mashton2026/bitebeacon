import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
    Alert,
    Image,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import {
    adminDeleteVendor,
    adminRemoveVendorPhoto,
    adminUpdateVendor,
    getVendorById,
} from "../../services/vendorService";
import { type Van } from "../../types/van";

export default function EditVendorScreen() {
    const { id } = useLocalSearchParams();
    const vendorId = id as string;

    const [vendor, setVendor] = useState<Van | null>(null);
    const [name, setName] = useState("");
    const [vendorName, setVendorName] = useState("");
    const [cuisine, setCuisine] = useState("");
    const [menu, setMenu] = useState("");
    const [schedule, setSchedule] = useState("");
    const [subscriptionTier, setSubscriptionTier] = useState<
        "free" | "growth" | "pro"
    >("free");
    const [isLive, setIsLive] = useState(false);

    const [loading, setLoading] = useState(true);
    const [loadFailed, setLoadFailed] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [removingPhotoUri, setRemovingPhotoUri] = useState<string | null>(null);

    useEffect(() => {
        loadVendor();
    }, [vendorId]);

    async function loadVendor() {
        setLoading(true);
        setLoadFailed(false);

        try {
            const data = await getVendorById(vendorId);

            if (!data) {
                setVendor(null);
                setLoadFailed(true);
                return;
            }

            setVendor(data);
            setName(data.name ?? "");
            setVendorName(data.vendorName ?? "");
            setCuisine(data.cuisine ?? "");
            setMenu(data.menu ?? "");
            setSchedule(data.schedule ?? "");
            setSubscriptionTier(data.subscriptionTier ?? "free");
            setIsLive(data.isLive ?? false);
        } catch {
            setVendor(null);
            setLoadFailed(true);
        } finally {
            setLoading(false);
        }
    }

    async function handleSave() {
        if (!vendor || isSaving || isDeleting) return;

        const trimmedName = name.trim();
        const trimmedVendorName = vendorName.trim();
        const trimmedCuisine = cuisine.trim();
        const trimmedMenu = menu.trim();
        const trimmedSchedule = schedule.trim();

        if (!trimmedName) {
            Alert.alert("Missing name", "Vendor name is required.");
            return;
        }

        if (!trimmedCuisine) {
            Alert.alert("Missing cuisine", "Cuisine is required.");
            return;
        }

        setIsSaving(true);

        try {
            await adminUpdateVendor({
                id: vendor.id,
                name: trimmedName,
                vendorName: trimmedVendorName,
                cuisine: trimmedCuisine,
                menu: trimmedMenu,
                schedule: trimmedSchedule,
                vendorMessage: vendor.vendorMessage ?? "",
                foodCategories: vendor.foodCategories ?? [],
                subscriptionTier,
                isLive,
                lat: vendor.lat,
                lng: vendor.lng,
            });

            Alert.alert("Saved", "Vendor updated successfully");
            router.back();
        } catch (error) {
            Alert.alert(
                "Error",
                error instanceof Error ? error.message : "Update failed"
            );
        } finally {
            setIsSaving(false);
        }
    }

    async function handleRemovePhoto(photoUri: string) {
        if (!vendor || isSaving || isDeleting || removingPhotoUri) return;

        setRemovingPhotoUri(photoUri);

        try {
            await adminRemoveVendorPhoto(vendor.id, photoUri);

            setVendor((prev) =>
                prev
                    ? {
                        ...prev,
                        photos: (prev.photos || []).filter((p) => p !== photoUri),
                    }
                    : prev
            );

            Alert.alert("Photo removed", "The photo was removed successfully.");
        } catch {
            Alert.alert("Error", "Failed to remove photo");
        } finally {
            setRemovingPhotoUri(null);
        }
    }

    async function handleDeleteVendor() {
        if (!vendor || isSaving || isDeleting) return;

        setIsDeleting(true);

        try {
            await adminDeleteVendor(vendor.id);
            Alert.alert("Deleted", "Vendor deleted successfully");
            router.replace("/admin/vendors");
        } catch (error) {
            Alert.alert(
                "Error",
                error instanceof Error ? error.message : "Delete failed"
            );
        } finally {
            setIsDeleting(false);
        }
    }

    if (loading) {
        return (
            <View style={styles.center}>
                <Text style={styles.loadingText}>Loading...</Text>
            </View>
        );
    }

    if (loadFailed || !vendor) {
        return (
            <View style={styles.center}>
                <Text style={styles.loadingText}>Vendor could not be loaded.</Text>

                <Pressable style={styles.retryButton} onPress={loadVendor}>
                    <Text style={styles.retryButtonText}>Retry</Text>
                </Pressable>

                <Pressable style={styles.backButtonStandalone} onPress={() => router.back()}>
                    <Text style={styles.backButtonText}>Back</Text>
                </Pressable>
            </View>
        );
    }

    const isBusy = isSaving || isDeleting || removingPhotoUri !== null;

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <Text style={styles.kicker}>ADMIN  /  VENDORS</Text>
            <Text style={styles.title}>Edit Vendor</Text>
            <Text style={styles.subtitle}>Update listing information, photos and status.</Text>

            {vendor.photos && vendor.photos.length > 0 ? (
                <View style={styles.photosSection}>
                    <Text style={styles.sectionEyebrow}>MEDIA</Text>
                    <Text style={styles.photosTitle}>Vendor photos</Text>

                    {(vendor.photos ?? []).map((photoUri, index) => {
                        const isRemovingThisPhoto = removingPhotoUri === photoUri;

                        return (
                            <View key={`${photoUri}-${index}`} style={styles.photoCard}>
                                <Image source={{ uri: photoUri }} style={styles.photoImage} />

                                <Pressable
                                    onPress={() => handleRemovePhoto(photoUri)}
                                    style={[
                                        styles.removeButton,
                                        isBusy && styles.buttonDisabled,
                                    ]}
                                    disabled={isBusy}
                                >
                                    <Text style={styles.removeButtonText}>
                                        {isRemovingThisPhoto ? "Removing..." : "Remove Photo"}
                                    </Text>
                                </Pressable>
                            </View>
                        );
                    })}
                </View>
            ) : null}

            <Text style={styles.sectionEyebrow}>LISTING INFORMATION</Text>
            <Text style={styles.fieldLabel}>Listing name</Text>
            <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Name"
                placeholderTextColor="#7A7A7A"
                editable={!isBusy}
            />

            <Text style={styles.fieldLabel}>Trading name</Text>
            <TextInput
                style={styles.input}
                value={vendorName}
                onChangeText={setVendorName}
                placeholder="Vendor Name"
                placeholderTextColor="#7A7A7A"
                editable={!isBusy}
            />

            <Text style={styles.fieldLabel}>Cuisine</Text>
            <TextInput
                style={styles.input}
                value={cuisine}
                onChangeText={setCuisine}
                placeholder="Cuisine"
                placeholderTextColor="#7A7A7A"
                editable={!isBusy}
            />

            <Text style={styles.fieldLabel}>Menu</Text>
            <TextInput
                style={styles.input}
                value={menu}
                onChangeText={setMenu}
                placeholder="Menu"
                placeholderTextColor="#7A7A7A"
                editable={!isBusy}
                multiline
            />

            <Text style={styles.fieldLabel}>Schedule</Text>
            <TextInput
                style={styles.input}
                value={schedule}
                onChangeText={setSchedule}
                placeholder="Schedule"
                placeholderTextColor="#7A7A7A"
                editable={!isBusy}
                multiline
            />

            <Text style={styles.sectionEyebrow}>ADMIN CONTROLS</Text>
            <Text style={styles.fieldLabel}>Subscription tier</Text>
            <View style={styles.tierRow}>
                {(["free", "growth", "pro"] as const).map((tier) => (
                    <Pressable
                        key={tier}
                        style={[
                            styles.tierButton,
                            subscriptionTier === tier && styles.tierButtonActive,
                            isBusy && styles.buttonDisabled,
                        ]}
                        onPress={() => setSubscriptionTier(tier)}
                        disabled={isBusy}
                    >
                        <Text
                            style={[
                                styles.tierButtonText,
                                subscriptionTier === tier && styles.tierButtonTextActive,
                            ]}
                        >
                            {tier.toUpperCase()}
                        </Text>
                    </Pressable>
                ))}
            </View>

            <Text style={styles.fieldLabel}>Live status</Text>
            <Pressable
                style={[
                    styles.liveToggle,
                    isLive && styles.liveToggleActive,
                    isBusy && styles.buttonDisabled,
                ]}
                onPress={() => setIsLive((current) => !current)}
                disabled={isBusy}
            >
                <Text style={styles.liveToggleText}>{isLive ? "LIVE" : "OFFLINE"}</Text>
            </Pressable>

            <Pressable
                style={[styles.button, isBusy && styles.buttonDisabled]}
                onPress={handleSave}
                disabled={isBusy}
            >
                <Text style={styles.buttonText}>
                    {isSaving ? "Saving..." : "Save Changes"}
                </Text>
            </Pressable>

            <Text style={styles.dangerTitle}>DANGER ZONE</Text>
            <Text style={styles.dangerDescription}>Deleting a vendor permanently removes this listing. This action cannot be undone.</Text>
            <Pressable
                style={[styles.deleteButton, isBusy && styles.buttonDisabled]}
                onPress={() => {
                    if (isBusy) return;

                    Alert.alert(
                        "Delete vendor",
                        "Are you sure you want to permanently delete this vendor listing?",
                        [
                            { text: "Cancel", style: "cancel" },
                            {
                                text: "Delete",
                                style: "destructive",
                                onPress: handleDeleteVendor,
                            },
                        ]
                    );
                }}
                disabled={isBusy}
            >
                <Text style={styles.deleteButtonText}>
                    {isDeleting ? "Deleting..." : "Delete Vendor"}
                </Text>
            </Pressable>
            <Pressable style={styles.bottomBack} onPress={() => router.back()} disabled={isBusy}>
                <Text style={styles.bottomBackText}>Back to vendors</Text>
            </Pressable>
        </ScrollView>
    );
}

const GOLD = "#D7AC60";
const GOLD_SOFT = "rgba(215,172,96,0.52)";
const BG = "#080F1D";
const PANEL = "#101D30";
const TEXT = "#F5F2E9";
const MUTED = "#A7B3C3";

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: BG },
    content: { paddingHorizontal: 20, paddingTop: 28, paddingBottom: 56 },
    kicker: { fontSize: 11, fontWeight: "800", color: GOLD, letterSpacing: 2.2, marginBottom: 10 },
    title: { fontSize: 31, fontWeight: "800", color: TEXT, marginBottom: 7 },
    subtitle: { fontSize: 14, lineHeight: 21, color: MUTED, marginBottom: 30 },
    sectionEyebrow: { color: GOLD, fontSize: 11, letterSpacing: 1.8, fontWeight: "800", marginTop: 16, marginBottom: 16 },
    fieldLabel: { color: "#D6DCE5", fontSize: 13, fontWeight: "700", marginBottom: 8, marginTop: 3 },
    input: {
        backgroundColor: PANEL, color: TEXT, fontSize: 15,
        borderWidth: 1, borderColor: GOLD_SOFT, borderRadius: 14,
        paddingHorizontal: 15, paddingVertical: 14, marginBottom: 17,
        minHeight: 51,
    },
    photosSection: { marginBottom: 12 },
    photosTitle: { color: TEXT, fontSize: 18, fontWeight: "800", marginBottom: 14 },
    photoCard: { backgroundColor: PANEL, borderWidth: 1, borderColor: GOLD_SOFT, borderRadius: 16, padding: 11, marginBottom: 12 },
    photoImage: { width: "100%", height: 190, borderRadius: 11 },
    removeButton: { marginTop: 11, backgroundColor: "#3B1C27", borderWidth: 1, borderColor: "#A85D65", paddingVertical: 11, borderRadius: 11, alignItems: "center" },
    removeButtonText: { color: "#FFD5D7", fontWeight: "800", fontSize: 13 },
    tierRow: { flexDirection: "row", gap: 9, marginBottom: 23 },
    tierButton: { flex: 1, backgroundColor: PANEL, borderWidth: 1, borderColor: GOLD_SOFT, borderRadius: 12, paddingVertical: 13, alignItems: "center" },
    tierButtonActive: { backgroundColor: "#4C3820", borderColor: GOLD, borderWidth: 1.5 },
    tierButtonText: { color: MUTED, fontWeight: "800", fontSize: 12, letterSpacing: 0.6 },
    tierButtonTextActive: { color: "#FFE1A4" },
    liveToggle: { backgroundColor: PANEL, borderWidth: 1, borderColor: "#63758C", paddingVertical: 14, borderRadius: 12, alignItems: "center", marginBottom: 27 },
    liveToggleActive: { backgroundColor: "#123C32", borderColor: "#45C28B" },
    liveToggleText: { color: TEXT, fontWeight: "800", letterSpacing: 1 },
    button: { backgroundColor: "#B98A42", borderWidth: 1, borderColor: "#F1CA80", paddingVertical: 16, borderRadius: 14, alignItems: "center" },
    buttonText: { color: "#101726", fontWeight: "900", fontSize: 15 },
    buttonDisabled: { opacity: 0.45 },
    dangerTitle: { color: "#E7A0A4", fontWeight: "800", fontSize: 11, letterSpacing: 1.8, marginTop: 36, marginBottom: 9 },
    dangerDescription: { color: MUTED, fontSize: 13, lineHeight: 20 },
    deleteButton: { backgroundColor: "#371923", borderColor: "#A6535C", borderWidth: 1, paddingVertical: 15, borderRadius: 13, alignItems: "center", marginTop: 15 },
    deleteButtonText: { color: "#FFD8DA", fontWeight: "800", fontSize: 14 },
    bottomBack: { alignItems: "center", paddingVertical: 18, marginTop: 15 },
    bottomBackText: { color: GOLD, fontWeight: "700", fontSize: 14 },
    center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: BG, padding: 24 },
    loadingText: { color: TEXT, fontSize: 16, textAlign: "center" },
    retryButton: { marginTop: 19, backgroundColor: "#B98A42", paddingVertical: 13, paddingHorizontal: 28, borderRadius: 12, alignItems: "center" },
    retryButtonText: { color: BG, fontWeight: "800" },
    backButtonStandalone: { marginTop: 12, backgroundColor: PANEL, borderWidth: 1, borderColor: GOLD_SOFT, paddingVertical: 13, paddingHorizontal: 28, borderRadius: 12, alignItems: "center" },
    backButtonText: { color: GOLD, fontWeight: "700" },
});
