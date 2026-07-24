import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import AppText from "../../components/AppText";
import HeroHeader from "../../components/HeroHeader";
import MapTextureBackground from "../../components/MapTextureBackground";
import PremiumCard from "../../components/PremiumCard";
import PremiumInput from "../../components/PremiumInput";
import PrimaryButton from "../../components/PrimaryButton";
import SecondaryButton from "../../components/SecondaryButton";
import { supabase } from "../../lib/supabase";

export default function UserLoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isResending, setIsResending] = useState(false);

  useFocusEffect(
    useCallback(() => {
      setIsLoggingIn(false);
      setIsResending(false);
    }, [])
  );

  async function handleResendConfirmation() {
    if (isResending || isLoggingIn) return;

    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail) {
      Alert.alert(
        "Missing email",
        "Enter your email address first so we know where to resend the confirmation."
      );
      return;
    }

    setIsResending(true);

    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: trimmedEmail,
        options: {
          emailRedirectTo: "bitebeacon://auth/callback",
        },
      });

      if (error) {
        Alert.alert("Could not resend email", error.message);
        return;
      }

      Alert.alert(
        "Confirmation email sent",
        "Check your inbox and spam folder for a new confirmation email from BiteBeacon."
      );
    } catch (error) {
      Alert.alert(
        "Could not resend email",
        error instanceof Error ? error.message : "An unknown error occurred."
      );
    } finally {
      setIsResending(false);
    }
  }

  async function handleLogin() {
    if (isLoggingIn || isResending) return;

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
        data: { user },
      } = await supabase.auth.getUser();

      if (user && !user.email_confirmed_at) {
        await supabase.auth.signOut();

        Alert.alert(
          "Email not confirmed",
          "Please confirm your email before logging in. You can resend the confirmation email below."
        );
        return;
      }

      router.replace("/(tabs)/account");
    } catch (error) {
      Alert.alert(
        "Login failed",
        error instanceof Error ? error.message : "An unknown error occurred."
      );
    } finally {
      setIsLoggingIn(false);
    }
  }

  function handleCreateAccount() {
    if (isLoggingIn || isResending) return;

    router.push("/auth/user-signup");
  }

  function handleBack() {
    if (isLoggingIn || isResending) return;

    router.replace("/auth/user-gateway");
  }

  const controlsDisabled = isLoggingIn || isResending;

  return (
    <MapTextureBackground>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          style={styles.keyboardContainer}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <ScrollView
              contentContainerStyle={styles.container}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              <HeroHeader
                showLogo={false}
                kicker="USER LOGIN"
                title="Welcome back"
                subtitle="Log in to access your favourites, account settings and personalised BiteBeacon experience."
              />

              <PremiumCard>
                <View style={styles.cardHeading}>
                  <View style={styles.accountIcon}>
                    <MaterialCommunityIcons
                      name="account-outline"
                      size={30}
                      color="#FFB547"
                    />
                  </View>

                  <View style={styles.cardHeadingText}>
                    <AppText variant="heading" style={styles.sectionTitle}>
                      User Login
                    </AppText>

                    <AppText variant="body" style={styles.sectionSubtitle}>
                      Enter your account details below.
                    </AppText>
                  </View>
                </View>

                <AppText variant="label" style={styles.label}>
                  Email
                </AppText>

                <PremiumInput
                  placeholder="Enter your email"
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  autoComplete="email"
                  textContentType="emailAddress"
                  importantForAutofill="yes"
                  value={email}
                  onChangeText={setEmail}
                  editable={!controlsDisabled}
                />

                <AppText variant="label" style={styles.passwordLabel}>
                  Password
                </AppText>

                <View style={styles.passwordRow}>
                  <View style={styles.passwordInputArea}>
                    <PremiumInput
                      placeholder="Enter your password"
                      secureTextEntry={!showPassword}
                      autoComplete="password"
                      textContentType="password"
                      importantForAutofill="yes"
                      value={password}
                      onChangeText={setPassword}
                      editable={!controlsDisabled}
                    />
                  </View>

                  <Pressable
                    onPress={() =>
                      setShowPassword((currentValue) => !currentValue)
                    }
                    disabled={controlsDisabled}
                    accessibilityRole="button"
                    accessibilityLabel={
                      showPassword ? "Hide password" : "Show password"
                    }
                    style={({ pressed }) => [
                      styles.showPasswordButton,
                      pressed && styles.pressed,
                      controlsDisabled && styles.buttonDisabled,
                    ]}
                  >
                    <MaterialCommunityIcons
                      name={showPassword ? "eye-off-outline" : "eye-outline"}
                      size={21}
                      color="#FFB547"
                    />

                    <AppText
                      variant="bodyBold"
                      style={styles.showPasswordText}
                    >
                      {showPassword ? "Hide" : "Show"}
                    </AppText>
                  </Pressable>
                </View>

                <PrimaryButton
                  onPress={handleLogin}
                  disabled={controlsDisabled}
                  style={styles.loginButton}
                >
                  {isLoggingIn ? "Logging in..." : "Log In"}
                </PrimaryButton>

                <Pressable
                  onPress={() => router.push("/auth/forgot-password")}
                  disabled={controlsDisabled}
                  accessibilityRole="button"
                  accessibilityLabel="Reset forgotten password"
                  style={({ pressed }) => [
                    styles.textLink,
                    pressed && styles.pressed,
                    controlsDisabled && styles.buttonDisabled,
                  ]}
                >
                  <MaterialCommunityIcons
                    name="lock-question"
                    size={18}
                    color="#FF8A1F"
                  />

                  <AppText variant="bodyBold" style={styles.textLinkLabel}>
                    Forgot password?
                  </AppText>
                </Pressable>

                <Pressable
                  onPress={handleResendConfirmation}
                  disabled={controlsDisabled}
                  accessibilityRole="button"
                  accessibilityLabel="Resend confirmation email"
                  style={({ pressed }) => [
                    styles.textLink,
                    styles.resendLink,
                    pressed && styles.pressed,
                    controlsDisabled && styles.buttonDisabled,
                  ]}
                >
                  <MaterialCommunityIcons
                    name="email-sync-outline"
                    size={18}
                    color="#FF8A1F"
                  />

                  <AppText variant="bodyBold" style={styles.textLinkLabel}>
                    {isResending
                      ? "Sending confirmation..."
                      : "Resend confirmation email"}
                  </AppText>
                </Pressable>

                <View style={styles.dividerRow}>
                  <View style={styles.dividerLine} />

                  <AppText variant="label" style={styles.dividerText}>
                    NEW TO BITEBEACON?
                  </AppText>

                  <View style={styles.dividerLine} />
                </View>

                <SecondaryButton
                  onPress={handleCreateAccount}
                  disabled={controlsDisabled}
                >
                  Create User Account
                </SecondaryButton>

                <SecondaryButton
                  onPress={handleBack}
                  disabled={controlsDisabled}
                  style={styles.backButton}
                >
                  Back
                </SecondaryButton>
              </PremiumCard>
            </ScrollView>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </MapTextureBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "transparent",
  },

  keyboardContainer: {
    flex: 1,
  },

  container: {
    flexGrow: 1,
    paddingHorizontal: 22,
    paddingTop: 18,
    paddingBottom: 42,
  },

  cardHeading: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 22,
  },

  accountIcon: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,122,0,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,181,71,0.28)",
    marginRight: 14,

    shadowColor: "#FF7A00",
    shadowOpacity: 0.2,
    shadowRadius: 9,
    shadowOffset: {
      width: 0,
      height: 0,
    },

    elevation: 4,
  },

  cardHeadingText: {
    flex: 1,
  },

  sectionTitle: {
    color: "#FFFFFF",
    fontSize: 24,
    lineHeight: 29,
  },

  sectionSubtitle: {
    color: "rgba(255,255,255,0.58)",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 2,
  },

  label: {
    color: "#FFB547",
    fontSize: 13,
    marginBottom: 8,
  },

  passwordLabel: {
    color: "#FFB547",
    fontSize: 13,
    marginTop: 15,
    marginBottom: 8,
  },

  passwordRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
  },

  passwordInputArea: {
    flex: 1,
  },

  showPasswordButton: {
    minWidth: 74,
    minHeight: 50,
    marginLeft: 8,
    paddingHorizontal: 8,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },

  showPasswordText: {
    color: "#FFB547",
    fontSize: 11,
  },

  loginButton: {
    marginTop: 2,
  },

  textLink: {
    minHeight: 36,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    marginTop: 8,
  },

  resendLink: {
    marginTop: 1,
  },

  textLinkLabel: {
    color: "#FF7A00",
    fontSize: 13,
    textAlign: "center",
  },

  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
    marginBottom: 15,
  },

  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(255,181,71,0.2)",
  },

  dividerText: {
    color: "rgba(255,181,71,0.7)",
    fontSize: 8.5,
    letterSpacing: 1.3,
    marginHorizontal: 10,
  },

  backButton: {
    marginTop: 9,
  },

  pressed: {
    opacity: 0.8,
  },

  buttonDisabled: {
    opacity: 0.55,
  },
});