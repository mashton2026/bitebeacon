import PrimaryButton from "@/components/PrimaryButton";
import SecondaryButton from "@/components/SecondaryButton";
import { router } from "expo-router";
import { useState } from "react";
import {
    Alert,
    StyleSheet,
    View
} from "react-native";
import AppText from "../../components/AppText";
import HeroHeader from "../../components/HeroHeader";
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
                <HeroHeader
                    kicker="PASSWORD RESET"
                    title="Reset your password"
                    subtitle="Enter your email and we'll send you a password reset link."
                />


                <PremiumCard>
                    <AppText variant="heading" style={styles.sectionTitle}>
                        Forgot Password
                    </AppText>

                    <AppText variant="label" style={styles.label}>
                        Email
                    </AppText>
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