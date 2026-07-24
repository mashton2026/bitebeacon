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

export default function UserSignupScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSigningUp, setIsSigningUp] = useState(false);

  useFocusEffect(
    useCallback(() => {
      setIsSigningUp(false);
    }, [])
  );

  async function handleSignup() {
    if (isSigningUp) return;

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPassword = password.trim();
    const trimmedConfirmPassword = confirmPassword.trim();

    if (!trimmedEmail || !trimmedPassword || !trimmedConfirmPassword) {
      Alert.alert(
        "Missing details",
        "Please enter your email address, password and confirmation password."
      );
      return;
    }

    if (trimmedPassword.length < 6) {
      Alert.alert(
        "Password too short",
        "Your password must contain at least 6 characters."
      );
      return;
    }

    if (trimmedPassword !== trimmedConfirmPassword) {
      Alert.alert("Password mismatch", "The passwords do not match.");
      return;
    }

    setIsSigningUp(true);

    try {
      const { error } = await supabase.auth.signUp({
        email: trimmedEmail,
        password: trimmedPassword,
        options: {
          emailRedirectTo: "bitebeacon://auth/callback",
        },
      });

      if (error) {
        Alert.alert("Sign up failed", error.message);
        return;
      }

      Alert.alert(
        "Check your email",
        "We’ve sent you a confirmation email from BiteBeacon. Check your inbox and spam folder, then confirm your account before logging in.",
        [
          {
            text: "OK",
            onPress: () => router.replace("/auth/user-login"),
          },
        ]
      );
    } catch (error) {
      Alert.alert(
        "Sign up failed",
        error instanceof Error
          ? error.message
          : "An unknown error occurred while creating your account."
      );
    } finally {
      setIsSigningUp(false);
    }
  }

  function handleBackToLogin() {
    if (isSigningUp) return;

    router.replace("/auth/user-login");
  }

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
                kicker="CREATE ACCOUNT"
                title="Join BiteBeacon"
                subtitle="Create your free account to save favourites, personalise your experience and get more from BiteBeacon."
              />

              <PremiumCard>
                <View style={styles.cardHeading}>
                  <View style={styles.accountIcon}>
                    <MaterialCommunityIcons
                      name="account-plus-outline"
                      size={30}
                      color="#FFB547"
                    />
                  </View>

                  <View style={styles.cardHeadingText}>
                    <AppText variant="heading" style={styles.sectionTitle}>
                      Create your account
                    </AppText>

                    <AppText variant="body" style={styles.sectionSubtitle}>
                      Enter your details below to get started.
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
                  editable={!isSigningUp}
                />

                <AppText variant="label" style={styles.passwordLabel}>
                  Password
                </AppText>

                <View style={styles.passwordRow}>
                  <View style={styles.passwordInputArea}>
                    <PremiumInput
                      placeholder="Create a password"
                      secureTextEntry={!showPassword}
                      autoComplete="new-password"
                      textContentType="newPassword"
                      importantForAutofill="yes"
                      value={password}
                      onChangeText={setPassword}
                      editable={!isSigningUp}
                    />
                  </View>

                  <Pressable
                    onPress={() =>
                      setShowPassword((currentValue) => !currentValue)
                    }
                    disabled={isSigningUp}
                    accessibilityRole="button"
                    accessibilityLabel={
                      showPassword ? "Hide password" : "Show password"
                    }
                    style={({ pressed }) => [
                      styles.showPasswordButton,
                      pressed && styles.pressed,
                      isSigningUp && styles.buttonDisabled,
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

                <AppText variant="label" style={styles.confirmLabel}>
                  Confirm Password
                </AppText>

                <PremiumInput
                  placeholder="Confirm your password"
                  secureTextEntry={!showPassword}
                  autoComplete="new-password"
                  textContentType="newPassword"
                  importantForAutofill="yes"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  editable={!isSigningUp}
                />

                <View style={styles.passwordHint}>
                  <MaterialCommunityIcons
                    name="shield-check-outline"
                    size={17}
                    color="#FFB547"
                  />

                  <AppText variant="body" style={styles.passwordHintText}>
                    Use at least 6 characters.
                  </AppText>
                </View>

                <PrimaryButton
                  onPress={handleSignup}
                  disabled={isSigningUp}
                  style={styles.createButton}
                >
                  {isSigningUp ? "Creating account..." : "Create Account"}
                </PrimaryButton>

                <View style={styles.dividerRow}>
                  <View style={styles.dividerLine} />

                  <AppText variant="label" style={styles.dividerText}>
                    ALREADY REGISTERED?
                  </AppText>

                  <View style={styles.dividerLine} />
                </View>

                <SecondaryButton
                  onPress={handleBackToLogin}
                  disabled={isSigningUp}
                >
                  Back to Login
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
    fontSize: 23,
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

  confirmLabel: {
    color: "#FFB547",
    fontSize: 13,
    marginTop: 15,
    marginBottom: 8,
  },

  passwordRow: {
    flexDirection: "row",
    alignItems: "center",
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

  passwordHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginTop: 9,
  },

  passwordHintText: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 11,
    lineHeight: 16,
  },

  createButton: {
    marginTop: 18,
  },

  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 18,
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
    letterSpacing: 1.2,
    marginHorizontal: 10,
  },

  pressed: {
    opacity: 0.8,
  },

  buttonDisabled: {
    opacity: 0.55,
  },
});