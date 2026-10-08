import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useState } from "react";
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableWithoutFeedback,
  View
} from "react-native";
import AppText from "../../components/AppText";
import HeroHeader from "../../components/HeroHeader";
import MapTextureBackground from "../../components/MapTextureBackground";
import PremiumCard from "../../components/PremiumCard";
import PremiumInput from "../../components/PremiumInput";
import PrimaryButton from "../../components/PrimaryButton";
import SecondaryButton from "../../components/SecondaryButton";
import { supabase } from "../../lib/supabase";
import { isCurrentUserAdmin } from "../../services/adminService";
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
        options: {
          emailRedirectTo: "bitebeacon://auth/callback?type=vendor",
        },
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

      const isAdmin = await isCurrentUserAdmin();

      // ✅ ADMIN GOES TO MAIN APP (NOT ADMIN PANEL)
      if (isAdmin) {
        router.replace("/(tabs)");
        return;
      }

      const vendor = await getVendorByOwnerId(user.id);

      if (vendor) {
        if (vendor.isSuspended) {
          await supabase.auth.signOut();
          Alert.alert(
            "Account suspended",
            "This vendor account has been suspended."
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
        router.replace("/vendor/claim-select");
        return;
      }

      router.replace("/vendor/claim-select");
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
    <MapTextureBackground>
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            contentContainerStyle={styles.container}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >

            <HeroHeader
              showLogo={false}
              kicker="VENDOR / ADMIN PORTAL"
              title="Welcome back"
              subtitle="Log in to manage your BiteBeacon listing, keep your van live, and stay visible to hungry customers."
            />

            <View style={styles.formSection}>
              <LinearGradient
                colors={["#9D6100", "#FFEAA0", "#E8A600", "#FFF4BB", "#B67600"]}
                locations={[0, 0.24, 0.51, 0.74, 1]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.metallicFrame}
              >
              <View style={styles.metallicInset}>
              <PremiumCard>
                <AppText variant="heading" style={styles.sectionTitle}>
                  Vendor / Admin Login
                </AppText>

                <AppText variant="label" style={styles.label}>
                  Email
                </AppText>
                <PremiumInput
                  style={styles.emailInput}
                  placeholder="Enter your email"
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

                <AppText variant="label" style={styles.label}>
                  Password
                </AppText>
                <View style={styles.passwordWrap}>
                  <PremiumInput
                    placeholder="Enter your password"
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
                    <AppText variant="bodyBold" style={styles.showPasswordButtonText}>
                      {showPassword ? "Hide" : "Show"}
                    </AppText>
                  </Pressable>
                </View>

                <PrimaryButton
                  onPress={handleLogin}
                  disabled={isLoggingIn}
                >
                  {isLoggingIn ? "Logging in..." : "Log In"}
                </PrimaryButton>

                <Pressable
                  onPress={() => router.push("/auth/forgot-password")}
                  style={[styles.linkButton, isLoggingIn && styles.buttonDisabled]}
                  disabled={isLoggingIn}
                >
                  <AppText variant="bodyBold" style={styles.linkButtonText}>
                    Forgot password?
                  </AppText>
                </Pressable>

                <Pressable
                  onPress={handleResendConfirmation}
                  style={[styles.linkButton, isResending && styles.buttonDisabled]}
                  disabled={isResending}
                >
                  <AppText variant="bodyBold" style={styles.linkButtonText}>
                    {isResending ? "Sending..." : "Resend confirmation email"}
                  </AppText>
                </Pressable>

                <SecondaryButton
                  onPress={() => router.push("/auth/vendor-signup")}
                  disabled={isLoggingIn}
                >
                  Create Vendor Account
                </SecondaryButton>

                <SecondaryButton
                  onPress={() => router.replace("/welcome")}
                  disabled={isLoggingIn}
                  style={styles.backButton}
                >
                  Back
                </SecondaryButton>
              </PremiumCard>
              </View>
              </LinearGradient>
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </MapTextureBackground>
  );
}

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    backgroundColor: "transparent",
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 48,
  },

  formSection: {
    marginTop: 24,
    shadowColor: "#F7C44A",
    shadowOpacity: 0.24,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 5 },
    elevation: 8,
  },
  metallicFrame: {
    padding: 2,
    borderRadius: 28,
  },
  metallicInset: {
    borderRadius: 26,
    overflow: "hidden",
    backgroundColor: "#0C121B",
  },
  sectionTitle: {
    color: "#FFF0BD",
    fontSize: 23,
    fontWeight: "800",
    letterSpacing: 0.3,
    marginBottom: 22,
  },
  emailInput: {
    flex: 1,
  },

  label: {
    color: "#FFE59A",
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.5,
    marginBottom: 10,
  },

  passwordWrap: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
  },

  showPasswordButton: {
    marginLeft: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#E8B323",
    borderRadius: 12,
    backgroundColor: "rgba(255,212,91,0.10)",
    justifyContent: "center",
  },

  showPasswordButtonText: {
    color: "#FFE59A",
  },

  linkButton: {
    marginTop: 12,
    alignItems: "center",
    marginBottom: 10,
    paddingVertical: 5,
  },
  linkButtonText: {
    color: "#FFE59A",
  },

  backButton: {
    marginTop: 10,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});