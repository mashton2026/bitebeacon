import { router } from "expo-router";
import { useState } from "react";
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { theme } from "../../constants/theme";
import { supabase } from "../../lib/supabase";

export default function UserSignupScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  async function handleSignup() {
    if (!email.trim() || !password.trim() || !confirmPassword.trim()) {
      Alert.alert(
        "Missing details",
        "Please enter your email, password, and confirmation password."
      );
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Password mismatch", "Passwords do not match.");
      return;
    }

    const { error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        emailRedirectTo: "bitebeacon://auth/callback",
      },
    });

    if (error) {
      Alert.alert("Sign up failed", error.message);
      return;
    }

    Alert.alert(
      "Check your email 📩",
      "We’ve sent you a confirmation email from BiteBeacon. Please check your inbox (and spam) and confirm your account before logging in."
    );

    router.replace("/auth/user-login");
  }

  return (
    <KeyboardAvoidingView
      style={styles.keyboardContainer}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.container}>
          <View style={styles.heroBlock}>
            <Text style={styles.kicker}>CREATE ACCOUNT</Text>
            <Text style={styles.title}>Join BiteBeacon</Text>
            <Text style={styles.subtitle}>
              Create an account to save favourites and build your own BiteBeacon
              experience.
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>User Signup</Text>

            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your email"
              placeholderTextColor="#7A7A7A"
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              textContentType="emailAddress"
              importantForAutofill="yes"
              value={email}
              onChangeText={setEmail}
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
              />

              <Pressable onPress={() => setShowPassword(!showPassword)}>
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
            />

            <Pressable style={styles.primaryButton} onPress={handleSignup}>
              <Text style={styles.primaryButtonText}>Create Account</Text>
            </Pressable>

            <Pressable
              style={styles.secondaryButton}
              onPress={() => router.replace("/auth/user-login")}
            >
              <Text style={styles.secondaryButtonText}>Back to Login</Text>
            </Pressable>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
  },

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
});