import { router } from "expo-router";
import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { theme } from "../../constants/theme";
import { supabase } from "../../lib/supabase";

export default function VendorSignupScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSigningUp, setIsSigningUp] = useState(false);

  async function handleSignup() {
    if (isSigningUp) return;

    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail || !password.trim() || !confirmPassword.trim()) {
      Alert.alert(
        "Missing details",
        "Please enter your email, password, and confirmation password."
      );
      return;
    }

    const emailIsValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail);

    if (!emailIsValid) {
      Alert.alert("Invalid email", "Please enter a valid email address.");
      return;
    }

    if (password.length < 6) {
      Alert.alert(
        "Password too short",
        "Please use at least 6 characters for your password."
      );
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Password mismatch", "Passwords do not match.");
      return;
    }

    setIsSigningUp(true);

    try {
      const { error } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        options: {
          emailRedirectTo: "bitebeacon://auth/callback?type=vendor",
        },
      });

      if (error) {
        Alert.alert("Sign up failed", error.message);
        return;
      }

      Alert.alert(
        "Check your email 📩",
        "We’ve sent you a confirmation link. Please check your inbox and spam. You must confirm your email before setting up your vendor listing."
      );

      await supabase.auth.signOut();

      router.replace("/auth/login");
      return;
    } catch (error) {
      Alert.alert(
        "Sign up failed",
        error instanceof Error ? error.message : "Unknown error"
      );
    } finally {
      setIsSigningUp(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroBlock}>
          <Text style={styles.kicker}>CREATE ACCOUNT</Text>
          <Text style={styles.title}>Start your vendor journey</Text>
          <Text style={styles.subtitle}>
            Create your vendor account and get your food van live on BiteBeacon.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Vendor Signup</Text>

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your email"
            placeholderTextColor="#7A7A7A"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            autoComplete="email"
            textContentType="emailAddress"
            importantForAutofill="yes"
            value={email}
            onChangeText={setEmail}
            editable={!isSigningUp}
          />

          <Text style={styles.label}>Password</Text>
          <View style={styles.passwordWrap}>
            <TextInput
              style={styles.passwordInput}
              placeholder="Create a password"
              placeholderTextColor="#7A7A7A"
              secureTextEntry={!showPassword}
              autoComplete="new-password"
              textContentType="newPassword"
              importantForAutofill="yes"
              value={password}
              onChangeText={setPassword}
              editable={!isSigningUp}
            />

            <Pressable
              onPress={() => setShowPassword((current) => !current)}
              disabled={isSigningUp}
              style={isSigningUp ? styles.buttonDisabled : undefined}
            >
              <Text style={styles.showText}>
                {showPassword ? "Hide" : "Show"}
              </Text>
            </Pressable>
          </View>

          <Text style={styles.label}>Confirm Password</Text>
          <TextInput
            style={styles.input}
            placeholder="Confirm password"
            placeholderTextColor="#7A7A7A"
            secureTextEntry={!showPassword}
            autoComplete="new-password"
            textContentType="newPassword"
            importantForAutofill="yes"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            editable={!isSigningUp}
          />

          <Pressable
            style={[styles.primaryButton, isSigningUp && styles.buttonDisabled]}
            onPress={handleSignup}
            disabled={isSigningUp}
          >
            <Text style={styles.primaryButtonText}>
              {isSigningUp ? "Creating Account..." : "Create Vendor Account"}
            </Text>
          </Pressable>

          <Text style={styles.confirmationHint}>
            After signup, we will send a confirmation email to your inbox. Please also
            check spam or junk.
          </Text>

          <Pressable
            style={[styles.secondaryButton, isSigningUp && styles.buttonDisabled]}
            onPress={() => router.replace("/auth/login")}
            disabled={isSigningUp}
          >
            <Text style={styles.secondaryButtonText}>Back to Login</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
    paddingBottom: 160,
  },
  heroBlock: {
    marginBottom: 24,
  },
  kicker: {
    fontSize: 12,
    fontWeight: "800",
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
    marginBottom: 16,
  },
  label: {
    fontWeight: "700",
    marginBottom: 6,
    color: theme.colors.background,
  },
  input: {
    borderWidth: 2,
    borderColor: theme.colors.border,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    backgroundColor: "#fff",
    color: theme.colors.text,
  },
  passwordWrap: {
    flexDirection: "row",
    borderWidth: 2,
    borderColor: theme.colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 12,
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 12,
    color: theme.colors.text,
  },
  showText: {
    color: theme.colors.primary,
    fontWeight: "700",
  },
  primaryButton: {
    backgroundColor: theme.colors.background,
    padding: 14,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 10,
  },
  primaryButtonText: {
    color: "#fff",
    fontWeight: "800",
  },
  secondaryButton: {
    backgroundColor: theme.colors.primary,
    padding: 14,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 10,
  },
  secondaryButtonText: {
    color: "#fff",
    fontWeight: "800",
  },

  confirmationHint: {
    marginTop: 12,
    fontSize: 13,
    lineHeight: 19,
    color: theme.colors.background,
    textAlign: "center",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});