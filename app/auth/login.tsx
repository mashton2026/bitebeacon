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
import { getCurrentUser } from "../../services/authService";
import { getMyVendorClaims } from "../../services/vendorClaimService";
import { getVendorByOwnerId } from "../../services/vendorService";

export default function VendorLoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isResending, setIsResending] = useState(false);

  async function handleResendConfirmation() {
    if (isResending) return;

    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail) {
      Alert.alert("Missing email", "Enter your email first.");
      return;
    }

    setIsResending(true);

    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: trimmedEmail,
      });

      if (error) {
        Alert.alert("Error", error.message);
        return;
      }

      Alert.alert(
        "Email sent 📩",
        "We’ve sent another confirmation email. Check your inbox and spam."
      );
    } catch (error) {
      Alert.alert(
        "Error",
        error instanceof Error ? error.message : "Unknown error"
      );
    } finally {
      setIsResending(false);
    }
  }

  async function handleLogin() {
    if (isLoggingIn) return;

    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail) {
      Alert.alert("Missing email", "Please enter your email address.");
      return;
    }

    if (!password.trim()) {
      Alert.alert("Missing password", "Please enter your password.");
      return;
    }

    setIsLoggingIn(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });

      if (error) {
        Alert.alert("Login failed", error.message);
        return;
      }

      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (authUser && !authUser.email_confirmed_at) {
        await supabase.auth.signOut();

        Alert.alert(
          "Email not confirmed",
          "Please confirm your email before logging in. Check your inbox or resend the confirmation email."
        );
        return;
      }

      const user = await getCurrentUser();
      if (!user) {
        Alert.alert("Error", "Could not load vendor account.");
        return;
      }

      const vendor = await getVendorByOwnerId(user.id);

      if (vendor) {
        if (vendor.isSuspended) {
          await supabase.auth.signOut();

          Alert.alert(
            "Account suspended",
            "This vendor account has been suspended. Please contact support at support@bitebeacon.uk."
          );

          router.replace("/welcome");
          return;
        }

        router.replace({
          pathname: "/vendor/dashboard",
          params: { id: vendor.id },
        });
        return;
      }

      const claims = await getMyVendorClaims(user.id);

      if (claims.length > 0) {
        router.replace("/vendor/dashboard");
        return;
      }

      await supabase.auth.signOut();

      Alert.alert(
        "Vendor account required",
        "These login details are not linked to a vendor account. Please use the customer login or create a vendor account."
      );
      return;
    } catch (error) {
      Alert.alert(
        "Error",
        error instanceof Error ? error.message : "Unknown error"
      );
    } finally {
      setIsLoggingIn(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.keyboardContainer}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.container}>
          <View style={styles.heroBlock}>
            <Text style={styles.kicker}>VENDOR / ADMIN PORTAL</Text>
            <Text style={styles.title}>Welcome back</Text>
            <Text style={styles.subtitle}>
              Log in to manage your BiteBeacon listing, keep your van live, and stay
              visible to hungry customers.
            </Text>
          </View>

          <View style={styles.formCard}>
            <Text style={styles.sectionTitle}>Vendor / Admin Login</Text>

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
              editable={!isLoggingIn}
            />

            <Text style={styles.label}>Password</Text>
            <View style={styles.passwordWrap}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Enter your password"
                placeholderTextColor="#7A7A7A"
                secureTextEntry={!showPassword}
                autoComplete="password"
                textContentType="password"
                importantForAutofill="yes"
                value={password}
                onChangeText={setPassword}
                editable={!isLoggingIn}
              />

              <Pressable
                style={[
                  styles.showPasswordButton,
                  isLoggingIn && styles.buttonDisabled,
                ]}
                onPress={() => setShowPassword((current) => !current)}
                disabled={isLoggingIn}
              >
                <Text style={styles.showPasswordButtonText}>
                  {showPassword ? "Hide" : "Show"}
                </Text>
              </Pressable>
            </View>

            <Pressable
              style={[styles.primaryButton, isLoggingIn && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={isLoggingIn}
            >
              <Text style={styles.primaryButtonText}>
                {isLoggingIn ? "Logging in..." : "Log In"}
              </Text>
            </Pressable>

            <Pressable
              onPress={() => router.push("/auth/forgot-password")}
              style={[styles.linkButton, isLoggingIn && styles.buttonDisabled]}
              disabled={isLoggingIn}
            >
              <Text style={styles.linkButtonText}>Forgot password?</Text>
            </Pressable>

            <Pressable
              onPress={handleResendConfirmation}
              style={[styles.linkButton, isResending && styles.buttonDisabled]}
              disabled={isResending}
            >
              <Text style={styles.linkButtonText}>
                {isResending ? "Sending..." : "Resend confirmation email"}
              </Text>
            </Pressable>

            <Pressable
              style={[styles.secondaryButton, isLoggingIn && styles.buttonDisabled]}
              onPress={() => router.push("/auth/vendor-signup")}
              disabled={isLoggingIn}
            >
              <Text style={styles.secondaryButtonText}>Create Vendor Account</Text>
            </Pressable>

            <Pressable
              style={[styles.backButton, isLoggingIn && styles.buttonDisabled]}
              onPress={() => router.replace("/welcome")}
              disabled={isLoggingIn}
            >
              <Text style={styles.backButtonText}>Back</Text>
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
  formCard: {
    backgroundColor: theme.colors.card,
    borderRadius: 24,
    padding: 20,
    borderWidth: 2,
    borderColor: theme.colors.border,
    shadowColor: "#000",
    shadowOpacity: 0.14,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
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
    marginBottom: 14,
    color: theme.colors.text,
  },
  passwordWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: theme.colors.border,
    borderRadius: 14,
    marginBottom: 18,
    overflow: "hidden",
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
    color: theme.colors.text,
  },
  showPasswordButton: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: "#FFF3E0",
    borderLeftWidth: 1,
    borderLeftColor: theme.colors.border,
  },
  showPasswordButtonText: {
    color: theme.colors.primary,
    fontSize: 13,
    fontWeight: "800",
  },
  primaryButton: {
    backgroundColor: theme.colors.background,
    paddingVertical: 15,
    borderRadius: 16,
    alignItems: "center",
    marginBottom: 12,
  },
  primaryButtonText: {
    color: theme.colors.textOnDark,
    fontSize: 16,
    fontWeight: "800",
  },
  linkButton: {
    marginTop: 10,
    alignItems: "center",
    marginBottom: 12,
  },
  linkButtonText: {
    color: "#FF7A00",
    fontWeight: "700",
  },
  secondaryButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 15,
    borderRadius: 16,
    alignItems: "center",
    marginBottom: 12,
  },
  secondaryButtonText: {
    color: theme.colors.textOnDark,
    fontSize: 16,
    fontWeight: "800",
  },
  backButton: {
    backgroundColor: "#D9D9D9",
    paddingVertical: 15,
    borderRadius: 16,
    alignItems: "center",
  },
  backButtonText: {
    color: "#222222",
    fontSize: 16,
    fontWeight: "700",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});