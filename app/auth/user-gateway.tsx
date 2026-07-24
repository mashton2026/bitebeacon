import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import AppText from "../../components/AppText";
import MapTextureBackground from "../../components/MapTextureBackground";
import { supabase } from "../../lib/supabase";

export default function UserGatewayScreen() {
  const [isNavigating, setIsNavigating] = useState(false);
  useFocusEffect(
    useCallback(() => {
      setIsNavigating(false);
    }, [])
  );

  function handleLogin() {
    if (isNavigating) return;

    setIsNavigating(true);
    router.push("/auth/user-login");
  }

  function handleCreateAccount() {
    if (isNavigating) return;

    setIsNavigating(true);
    router.push("/auth/user-signup");
  }

  async function handleContinueAsGuest() {
    if (isNavigating) return;

    setIsNavigating(true);

    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        console.log("Guest sign-out error:", error.message);
      }

      router.replace("/(tabs)");
    } catch (error) {
      Alert.alert(
        "Guest mode failed",
        error instanceof Error
          ? error.message
          : "We could not open guest mode."
      );

      setIsNavigating(false);
    }
  }

  function handleBack() {
    if (isNavigating) return;

    setIsNavigating(true);
    router.replace("/welcome");
  }

  return (
    <MapTextureBackground>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >
          {/* HERO */}
          <View style={styles.heroSection}>
            <View style={styles.heroLight}>
              <LinearGradient
                colors={["#8F4700", "#FFB547", "#FF7A00"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.heroLightGradient}
              />
            </View>

            <AppText variant="label" style={styles.kicker}>
              EXPLORE BITEBEACON
            </AppText>

            <AppText variant="heading" style={styles.title}>
              How would you like{"\n"}to continue?
            </AppText>

            <AppText variant="body" style={styles.subtitle}>
              Sign in for your saved favourites and personalised experience,
              create a new account, or explore BiteBeacon as a guest.
            </AppText>
          </View>

          {/* PREMIUM CARD */}
          <View style={styles.outerGlow}>
            <LinearGradient
              colors={[
                "#8F4700",
                "#FFB547",
                "#FF7A00",
                "#FFB547",
                "#8F4700",
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.borderWrap}
            >
              <View style={styles.card}>
                <View style={styles.innerHighlight}>
                  <AppText variant="heading" style={styles.cardTitle}>
                    Welcome to BiteBeacon
                  </AppText>

                  <AppText variant="body" style={styles.cardText}>
                    Choose the option that suits you. Guest access lets you
                    start exploring immediately.
                  </AppText>

                  {/* LOGIN */}
                  <Pressable
                    onPress={handleLogin}
                    disabled={isNavigating}
                    accessibilityRole="button"
                    accessibilityLabel="Log in to BiteBeacon"
                    style={({ pressed }) => [
                      styles.optionButton,
                      styles.loginButton,
                      pressed && styles.buttonPressed,
                      isNavigating && styles.buttonDisabled,
                    ]}
                  >
                    <View style={styles.optionIconWrap}>
                      <MaterialCommunityIcons
                        name="login"
                        size={24}
                        color="#F4B547"
                      />
                    </View>

                    <View style={styles.optionTextArea}>
                      <AppText
                        variant="bodyBold"
                        style={styles.optionButtonTitle}
                      >
                        Log In
                      </AppText>

                      <AppText
                        variant="body"
                        style={styles.optionButtonDescription}
                      >
                        Access your account and saved favourites.
                      </AppText>
                    </View>

                    <MaterialCommunityIcons
                      name="chevron-right"
                      size={27}
                      color="#F4B547"
                    />
                  </Pressable>

                  {/* CREATE ACCOUNT */}
                  <Pressable
                    onPress={handleCreateAccount}
                    disabled={isNavigating}
                    accessibilityRole="button"
                    accessibilityLabel="Create a BiteBeacon account"
                    style={({ pressed }) => [
                      styles.createButtonWrap,
                      pressed && styles.buttonPressed,
                      isNavigating && styles.buttonDisabled,
                    ]}
                  >
                    <LinearGradient
                      colors={["#FF9A1F", "#FF7A00", "#E85D00"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.createButton}
                    >
                      <View style={styles.createIconWrap}>
                        <MaterialCommunityIcons
                          name="account-plus-outline"
                          size={24}
                          color="#FFFFFF"
                        />
                      </View>

                      <View style={styles.optionTextArea}>
                        <AppText
                          variant="bodyBold"
                          style={styles.createButtonTitle}
                        >
                          Create Account
                        </AppText>

                        <AppText
                          variant="body"
                          style={styles.createButtonDescription}
                        >
                          Save favourites and personalise BiteBeacon.
                        </AppText>
                      </View>

                      <MaterialCommunityIcons
                        name="chevron-right"
                        size={27}
                        color="#FFFFFF"
                      />
                    </LinearGradient>
                  </Pressable>

                  <View style={styles.dividerRow}>
                    <View style={styles.dividerLine} />

                    <AppText variant="label" style={styles.dividerText}>
                      OR
                    </AppText>

                    <View style={styles.dividerLine} />
                  </View>

                  {/* GUEST */}
                  <Pressable
                    onPress={handleContinueAsGuest}
                    disabled={isNavigating}
                    accessibilityRole="button"
                    accessibilityLabel="Continue as a guest"
                    style={({ pressed }) => [
                      styles.guestButton,
                      pressed && styles.buttonPressed,
                      isNavigating && styles.buttonDisabled,
                    ]}
                  >
                    <MaterialCommunityIcons
                      name="compass-outline"
                      size={23}
                      color="#FFFFFF"
                    />

                    <AppText variant="bodyBold" style={styles.guestButtonText}>
                      {isNavigating
                        ? "Opening BiteBeacon..."
                        : "Continue as Guest"}
                    </AppText>
                  </Pressable>

                  <AppText variant="body" style={styles.guestNote}>
                    Guest mode lets you browse without creating an account.
                  </AppText>

                  {/* BACK */}
                  <Pressable
                    onPress={handleBack}
                    disabled={isNavigating}
                    accessibilityRole="button"
                    accessibilityLabel="Return to the welcome screen"
                    style={({ pressed }) => [
                      styles.backButton,
                      pressed && styles.buttonPressed,
                      isNavigating && styles.buttonDisabled,
                    ]}
                  >
                    <MaterialCommunityIcons
                      name="arrow-left"
                      size={20}
                      color="#F4B547"
                    />

                    <AppText variant="bodyBold" style={styles.backButtonText}>
                      Back
                    </AppText>
                  </Pressable>
                </View>
              </View>
            </LinearGradient>
          </View>
        </ScrollView>
      </SafeAreaView>
    </MapTextureBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "transparent",
  },

  container: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 22,
    paddingTop: 28,
    paddingBottom: 42,
  },

  heroSection: {
    alignItems: "center",
    marginBottom: 28,
  },

  heroLight: {
    width: 126,
    height: 8,
    borderRadius: 999,
    marginBottom: 22,

    shadowColor: "#FF7A00",
    shadowOpacity: 0.72,
    shadowRadius: 13,
    shadowOffset: {
      width: 0,
      height: 0,
    },

    elevation: 8,
  },

  heroLightGradient: {
    flex: 1,
    borderRadius: 999,
  },

  kicker: {
    color: "#F4B547",
    fontSize: 12,
    letterSpacing: 3,
    textAlign: "center",
    marginBottom: 13,
  },

  title: {
    color: "#FFFFFF",
    fontSize: 34,
    lineHeight: 40,
    textAlign: "center",
  },

  subtitle: {
    maxWidth: 365,
    color: "rgba(255,255,255,0.78)",
    fontSize: 15,
    lineHeight: 23,
    textAlign: "center",
    marginTop: 14,
  },

  outerGlow: {
    borderRadius: 36,

    shadowColor: "#FF7A00",
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: {
      width: 0,
      height: 8,
    },

    elevation: 11,
  },

  borderWrap: {
    borderRadius: 36,
    padding: 2,
  },

  card: {
    borderRadius: 34,
    backgroundColor: "rgba(8,12,18,0.94)",
  },

  innerHighlight: {
    borderRadius: 34,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 20,
  },

  cardTitle: {
    color: "#FFFFFF",
    fontSize: 25,
    lineHeight: 31,
    textAlign: "center",
  },

  cardText: {
    color: "rgba(255,255,255,0.68)",
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    marginTop: 8,
    marginBottom: 21,
  },

  optionButton: {
    minHeight: 83,
    borderRadius: 18,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
  },

  loginButton: {
    backgroundColor: "#121820",
    borderColor: "rgba(244,181,71,0.72)",
  },

  optionIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(244,181,71,0.08)",
    borderWidth: 1,
    borderColor: "rgba(244,181,71,0.24)",
    marginRight: 12,
  },

  optionTextArea: {
    flex: 1,
    paddingRight: 8,
  },

  optionButtonTitle: {
    color: "#FFFFFF",
    fontSize: 16,
  },

  optionButtonDescription: {
    color: "rgba(255,255,255,0.57)",
    fontSize: 11.5,
    lineHeight: 17,
    marginTop: 2,
  },

  createButtonWrap: {
    borderRadius: 18,
    marginTop: 12,

    shadowColor: "#FF7A00",
    shadowOpacity: 0.24,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 5,
    },

    elevation: 6,
  },

  createButton: {
    minHeight: 83,
    borderRadius: 18,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
  },

  createIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.14)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.24)",
    marginRight: 12,
  },

  createButtonTitle: {
    color: "#FFFFFF",
    fontSize: 16,
  },

  createButtonDescription: {
    color: "rgba(255,255,255,0.78)",
    fontSize: 11.5,
    lineHeight: 17,
    marginTop: 2,
  },

  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 17,
  },

  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(244,181,71,0.22)",
  },

  dividerText: {
    color: "rgba(244,181,71,0.72)",
    fontSize: 10,
    letterSpacing: 2,
    marginHorizontal: 12,
  },

  guestButton: {
    minHeight: 54,
    borderRadius: 17,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.24)",
    backgroundColor: "#131820",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },

  guestButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
  },

  guestNote: {
    color: "rgba(255,255,255,0.47)",
    fontSize: 11,
    lineHeight: 17,
    textAlign: "center",
    marginTop: 9,
  },

  backButton: {
    minHeight: 47,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "rgba(244,181,71,0.52)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 17,
  },

  backButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
  },

  buttonPressed: {
    opacity: 0.86,
    transform: [{ scale: 0.985 }],
  },

  buttonDisabled: {
    opacity: 0.58,
  },
});