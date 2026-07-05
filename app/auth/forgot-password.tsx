import PrimaryButton from "@/components/PrimaryButton";
import SecondaryButton from "@/components/SecondaryButton";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useState } from "react";
import {
    Alert,
    StyleSheet,
    Text,
    View
} from "react-native";
import MapTextureBackground from "../../components/MapTextureBackground";
import PremiumCard from "../../components/PremiumCard";
import PremiumInput from "../../components/PremiumInput";
import { supabase } from "../../lib/supabase";

export default function ForgotPasswordScreen() {
    const [email, setEmail] = useState("");
    const [isSending, setIsSending] = useState(false);

    async function handleResetPassword() {
        const trimmedEmail = email.trim().toLowerCase();

        if (!trimmedEmail) {
            Alert.alert("Missing email", "Please enter your email address.");
            return;
        }

        const emailIsValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail);

        if (!emailIsValid) {
            Alert.alert("Invalid email", "Please enter a valid email address.");
            return;
        }

        setIsSending(true);

        try {
            const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
                redirectTo: "bitebeacon://auth/callback",
            });

            if (error) {
                Alert.alert("Reset failed", error.message);
                return;
            }

            Alert.alert(
                "Reset email sent",
                "If that email exists, a password reset link has been sent."
            );
            router.back();
        } catch (error) {
            Alert.alert(
                "Reset failed",
                error instanceof Error ? error.message : "Unknown error"
            );
        } finally {
            setIsSending(false);
        }
    }

    return (
        <MapTextureBackground>
            <View style={styles.container}>
                <View style={styles.heroBlock}>
                    <LinearGradient
                        colors={["#B94A00", "#FFB547", "#FF7A00", "#B94A00"]}
                        start={{ x: 0, y: 0.5 }}
                        end={{ x: 1, y: 0.5 }}
                        style={styles.heroAccent}
                    />

                    <Text style={styles.kicker}>PASSWORD RESET</Text>
                    <Text style={styles.title}>Reset your password</Text>
                    <Text style={styles.subtitle}>
                        Enter your email and we’ll send you a password reset link.
                    </Text>
                </View>

                <PremiumCard>
                    <Text style={styles.sectionTitle}>Forgot Password</Text>

                    <Text style={styles.label}>Email</Text>
                    <PremiumInput
                        placeholder="Enter your email"
                        autoCapitalize="none"
                        autoCorrect={false}
                        keyboardType="email-address"
                        value={email}
                        onChangeText={setEmail}
                        editable={!isSending}
                    />

                    <PrimaryButton
                        onPress={handleResetPassword}
                        disabled={isSending}
                    >
                        {isSending ? "Sending..." : "Send Reset Email"}
                    </PrimaryButton>

                    <SecondaryButton
                        onPress={() => router.back()}
                        disabled={isSending}
                    >
                        Back
                    </SecondaryButton>
                </PremiumCard>
            </View>
        </MapTextureBackground>
    );
}

const styles = StyleSheet.create({

    container: {
        flex: 1,
        backgroundColor: "transparent",
        paddingHorizontal: 24,
        paddingTop: 20,
        paddingBottom: 30,
        justifyContent: "flex-start",
    },
    heroBlock: {
        marginTop: 90,
        marginBottom: 40,
        alignItems: "center",
    },
    heroAccent: {
        width: 72,
        height: 5,
        borderRadius: 999,

        marginBottom: 22,

        shadowColor: "#FFA126",
        shadowOpacity: 0.45,
        shadowRadius: 14,
        shadowOffset: {
            width: 0,
            height: 0,
        },

        elevation: 8,
    },
    kicker: {
        fontSize: 12,
        fontWeight: "800",
        letterSpacing: 3,
        color: "#FFB547",
        textAlign: "center",
        marginBottom: 12,
    },
    title: {
        fontSize: 28,
        fontWeight: "800",
        color: "#FFFFFF",
        textAlign: "center",
        marginBottom: 10,
    },
    subtitle: {
        fontSize: 15,
        lineHeight: 22,
        color: "rgba(255,255,255,0.82)",
        textAlign: "center",
        maxWidth: 300,
    },
    sectionTitle: {
        fontSize: 26,
        fontWeight: "900",
        color: "#FFFFFF",
        letterSpacing: 0.3,
        marginBottom: 22,
    },
    label: {
        fontSize: 15,
        fontWeight: "800",
        color: "#FFB547",
        letterSpacing: 0.8,
        marginBottom: 10,
    },
});