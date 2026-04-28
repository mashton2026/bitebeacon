import { router } from "expo-router";
import { useState } from "react";
import {
    Alert,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { theme } from "../../constants/theme";
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
        <View style={styles.container}>
            <View style={styles.heroBlock}>
                <Text style={styles.kicker}>PASSWORD RESET</Text>
                <Text style={styles.title}>Reset your password</Text>
                <Text style={styles.subtitle}>
                    Enter your email and we’ll send you a password reset link.
                </Text>
            </View>

            <View style={styles.card}>
                <Text style={styles.sectionTitle}>Forgot Password</Text>

                <Text style={styles.label}>Email</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Enter your email"
                    placeholderTextColor="#7A7A7A"
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                    value={email}
                    onChangeText={setEmail}
                    editable={!isSending}
                />

                <Pressable
                    style={[styles.primaryButton, isSending && styles.buttonDisabled]}
                    onPress={handleResetPassword}
                    disabled={isSending}
                >
                    <Text style={styles.primaryButtonText}>
                        {isSending ? "Sending..." : "Send Reset Email"}
                    </Text>
                </Pressable>

                <Pressable
                    style={[styles.secondaryButton, isSending && styles.buttonDisabled]}
                    onPress={() => router.back()}
                    disabled={isSending}
                >
                    <Text style={styles.secondaryButtonText}>Back</Text>
                </Pressable>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
        padding: 24,
        justifyContent: "center",
    },
    heroBlock: {
        marginBottom: 24,
    },
    kicker: {
        fontSize: 12,
        fontWeight: "800",
        letterSpacing: 1.2,
        color: theme.colors.secondary,
        marginBottom: 8,
    },
    title: {
        fontSize: 34,
        fontWeight: "800",
        color: theme.colors.textOnDark,
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 15,
        lineHeight: 22,
        color: "rgba(255,255,255,0.78)",
    },
    card: {
        backgroundColor: theme.colors.card,
        borderRadius: 24,
        padding: 20,
        borderWidth: 2,
        borderColor: theme.colors.border,
    },
    sectionTitle: {
        fontSize: 22,
        fontWeight: "800",
        color: theme.colors.background,
        marginBottom: 18,
    },
    label: {
        fontSize: 14,
        fontWeight: "700",
        color: theme.colors.background,
        marginBottom: 8,
    },
    input: {
        backgroundColor: "#FFFFFF",
        borderWidth: 2,
        borderColor: theme.colors.border,
        borderRadius: 14,
        paddingHorizontal: 14,
        paddingVertical: 14,
        marginBottom: 18,
        color: theme.colors.text,
    },
    primaryButton: {
        backgroundColor: theme.colors.primary,
        paddingVertical: 15,
        borderRadius: 16,
        alignItems: "center",
        marginBottom: 12,
    },
    primaryButtonText: {
        color: "#FFFFFF",
        fontSize: 16,
        fontWeight: "800",
    },
    secondaryButton: {
        backgroundColor: theme.colors.card,
        borderWidth: 2,
        borderColor: theme.colors.border,
        paddingVertical: 15,
        borderRadius: 16,
        alignItems: "center",
    },
    secondaryButtonText: {
        color: "#222222",
        fontSize: 16,
        fontWeight: "700",
    },
    buttonDisabled: {
        opacity: 0.6,
    },
});