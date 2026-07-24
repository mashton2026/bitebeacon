import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import AppText from "../components/AppText";
import MapTextureBackground from "../components/MapTextureBackground";

export default function WelcomeScreen() {
  const [isNavigating, setIsNavigating] = useState(false);
  const logoGlow = useRef(new Animated.Value(0.42)).current;

  useFocusEffect(
    useCallback(() => {
      setIsNavigating(false);
    }, [])
  );

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(logoGlow, {
          toValue: 0.82,
          duration: 2200,
          useNativeDriver: false,
        }),
        Animated.timing(logoGlow, {
          toValue: 0.42,
          duration: 2200,
          useNativeDriver: false,
        }),
      ])
    );

    animation.start();

    return () => {
      animation.stop();
    };
  }, [logoGlow]);

  function handleExplore() {
    if (isNavigating) return;

    setIsNavigating(true);
    router.push("/auth/user-gateway");
  }

  function handleBusinessPortal() {
    if (isNavigating) return;

    setIsNavigating(true);
    router.push("/auth/login");
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
          {/* BRAND */}
          <View style={styles.brandSection}>
            <Animated.View
              style={[
                styles.logoGlow,
                {
                  shadowOpacity: logoGlow,
                  transform: [
                    {
                      scale: logoGlow.interpolate({
                        inputRange: [0.42, 0.82],
                        outputRange: [1, 1.012],
                      }),
                    },
                  ],
                },
              ]}
            >
              <Image
                source={require("../assets/images/bitebeacon-logo-full.png")}
                style={styles.logo}
                resizeMode="contain"
              />
            </Animated.View>

            <AppText variant="label" style={styles.slogan}>
              DISCOVER. GROW. CONNECT.
            </AppText>

            <View style={styles.sloganDivider}>
              <View style={styles.sloganDividerGlow} />
            </View>
          </View>

          {/* HERO */}
          <View style={styles.heroSection}>
            <AppText variant="heading" style={styles.heroTitleWhite}>
              The Home of
            </AppText>

            <AppText variant="heading" style={styles.heroTitleGold}>
              Mobile Food
            </AppText>

            <AppText variant="body" style={styles.heroDescription}>
              Discover amazing food, support independent businesses and connect
              with a community built around great food.
            </AppText>
          </View>

          {/* PORTAL CARDS */}
          <View style={styles.portalContainer}>
            {/* EXPLORE */}
            <Pressable
              onPress={handleExplore}
              disabled={isNavigating}
              accessibilityRole="button"
              accessibilityLabel="Explore BiteBeacon"
              style={({ pressed }) => [
                styles.portalPressable,
                pressed && styles.portalPressed,
                isNavigating && styles.portalDisabled,
              ]}
            >
              <View style={styles.exploreOuterGlow}>
                <LinearGradient
                  colors={[
                    "#164270",
                    "#2E76B9",
                    "#6EB5EE",
                    "#2E76B9",
                    "#164270",
                  ]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.portalBorder}
                >
                  <View style={styles.portalCard}>
                    <View style={styles.portalContent}>
                      <View style={styles.exploreIconHalo}>
                        <MaterialCommunityIcons
                          name="truck-outline"
                          size={30}
                          color="#F4C35B"
                        />
                      </View>

                      <AppText variant="heading" style={styles.portalTitle}>
                        Explore BiteBeacon
                      </AppText>

                      <View style={styles.portalDivider} />

                      <AppText
                        variant="body"
                        style={styles.portalDescription}
                      >
                        Find food trucks, markets, pop-ups and events.
                      </AppText>

                      <View style={styles.cardActionArea}>
                        <LinearGradient
                          colors={[
                            "#FFF8D4",
                            "#FFE083",
                            "#F5BE3E",
                            "#DA8E12",
                          ]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={styles.arrowButton}
                        >
                          <MaterialCommunityIcons
                            name="arrow-right"
                            size={25}
                            color="#071421"
                          />
                        </LinearGradient>
                      </View>
                    </View>
                  </View>
                </LinearGradient>
              </View>
            </Pressable>

            {/* BUSINESS */}
            <Pressable
              onPress={handleBusinessPortal}
              disabled={isNavigating}
              accessibilityRole="button"
              accessibilityLabel="Food Business Portal"
              style={({ pressed }) => [
                styles.portalPressable,
                pressed && styles.portalPressed,
                isNavigating && styles.portalDisabled,
              ]}
            >
              <View style={styles.businessOuterGlow}>
                <LinearGradient
                  colors={[
                    "#69400D",
                    "#A76B18",
                    "#E7B84F",
                    "#A76B18",
                    "#69400D",
                  ]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.portalBorder}
                >
                  <View style={styles.portalCard}>
                    <View style={styles.portalContent}>
                      <View style={styles.businessIconHalo}>
                        <MaterialCommunityIcons
                          name="storefront-outline"
                          size={30}
                          color="#F4C35B"
                        />
                      </View>

                      <AppText variant="heading" style={styles.portalTitle}>
                        Food Business Portal
                      </AppText>

                      <View style={styles.portalDivider} />

                      <AppText
                        variant="body"
                        style={styles.portalDescription}
                      >
                        Manage listings, go live and grow your business.
                      </AppText>

                      <View style={styles.cardActionArea}>
                        <LinearGradient
                          colors={[
                            "#FFF8D4",
                            "#FFE083",
                            "#F5BE3E",
                            "#DA8E12",
                          ]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={styles.arrowButton}
                        >
                          <MaterialCommunityIcons
                            name="arrow-right"
                            size={25}
                            color="#071421"
                          />
                        </LinearGradient>
                      </View>
                    </View>
                  </View>
                </LinearGradient>
              </View>
            </Pressable>
          </View>

          {/* PLATFORM AREAS */}
          <View style={styles.featureOuterGlow}>
            <LinearGradient
              colors={[
                "#68400D",
                "#A66A18",
                "#D9A63F",
                "#A66A18",
                "#68400D",
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.featureBorder}
            >
              <View style={styles.featurePanel}>
                <View style={styles.featureItem}>
                  <MaterialCommunityIcons
                    name="truck-outline"
                    size={24}
                    color="#F4B33B"
                  />

                  <AppText variant="bodyBold" style={styles.featureLabel}>
                    FOOD TRUCKS
                  </AppText>
                </View>

                <View style={styles.featureDivider} />

                <View style={styles.featureItem}>
                  <MaterialCommunityIcons
                    name="storefront-outline"
                    size={24}
                    color="#F4B33B"
                  />

                  <AppText variant="bodyBold" style={styles.featureLabel}>
                    MARKETS
                  </AppText>
                </View>

                <View style={styles.featureDivider} />

                <View style={styles.featureItem}>
                  <MaterialCommunityIcons
                    name="calendar-star"
                    size={24}
                    color="#F4B33B"
                  />

                  <AppText variant="bodyBold" style={styles.featureLabel}>
                    EVENTS
                  </AppText>
                </View>

                <View style={styles.featureDivider} />

                <View style={styles.featureItem}>
                  <MaterialCommunityIcons
                    name="silverware-fork-knife"
                    size={24}
                    color="#F4B33B"
                  />

                  <AppText variant="bodyBold" style={styles.featureLabel}>
                    CATERING
                  </AppText>
                </View>

                <View style={styles.featureDivider} />

                <View style={styles.featureItem}>
                  <MaterialCommunityIcons
                    name="shopping-outline"
                    size={24}
                    color="#F4B33B"
                  />

                  <AppText variant="bodyBold" style={styles.featureLabel}>
                    MARKETPLACE
                  </AppText>
                </View>
              </View>
            </LinearGradient>
          </View>

          {/* FOOTER */}
          <View style={styles.footerDecoration}>
            <View style={styles.footerLine} />

            <View style={styles.heartGlow}>
              <MaterialCommunityIcons
                name="heart-outline"
                size={26}
                color="#F4A62A"
              />
            </View>

            <View style={styles.footerLine} />
          </View>

          <AppText variant="body" style={styles.footerText}>
            Bringing great food and great people together.
          </AppText>

          <AppText variant="bodyBold" style={styles.footerClosing}>
            Every town. Every time.
          </AppText>
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
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 40,
  },

  brandSection: {
    alignItems: "center",
  },

  logoGlow: {
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#FFB52D",
    shadowRadius: 20,
    shadowOffset: {
      width: 0,
      height: 0,
    },
    elevation: 7,
  },

  logo: {
    width: 250,
    height: 142,
  },

  slogan: {
    color: "#E9B95B",
    fontSize: 10,
    letterSpacing: 2.6,
    textAlign: "center",
    marginTop: 0,
    marginBottom: 4,
  },

  sloganDivider: {
    width: 90,
    height: 8,
    alignItems: "center",
    justifyContent: "center",
  },

  sloganDividerGlow: {
    width: 32,
    height: 2,
    borderRadius: 999,
    backgroundColor: "#EFB64A",
    shadowColor: "#FFB52D",
    shadowOpacity: 0.7,
    shadowRadius: 7,
    shadowOffset: {
      width: 0,
      height: 0,
    },
    elevation: 5,
  },

  heroSection: {
    alignItems: "center",
    marginTop: 4,
  },

  heroTitleWhite: {
    color: "#FFFFFF",
    fontSize: 28,
    lineHeight: 32,
    textAlign: "center",
  },

  heroTitleGold: {
    color: "#F0C35B",
    fontSize: 32,
    lineHeight: 36,
    textAlign: "center",
    textShadowColor: "rgba(255,180,40,0.42)",
    textShadowOffset: {
      width: 0,
      height: 0,
    },
    textShadowRadius: 9,
  },

  heroDescription: {
    maxWidth: 335,
    color: "rgba(255,255,255,0.78)",
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
    marginTop: 11,
  },

  portalContainer: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 10,
    marginTop: 18,
  },

  portalPressable: {
    flex: 1,
    borderRadius: 22,
  },

  exploreOuterGlow: {
    flex: 1,
    borderRadius: 22,
    shadowColor: "#2C8BFF",
    shadowOpacity: 0.2,
    shadowRadius: 13,
    shadowOffset: {
      width: 0,
      height: 5,
    },
    elevation: 7,
  },

  businessOuterGlow: {
    flex: 1,
    borderRadius: 22,
    shadowColor: "#F4A62A",
    shadowOpacity: 0.22,
    shadowRadius: 13,
    shadowOffset: {
      width: 0,
      height: 5,
    },
    elevation: 7,
  },

  portalBorder: {
    borderRadius: 22,
    padding: 1.5,
  },

  portalCard: {
    height: 220,
    borderRadius: 20.5,
    backgroundColor: "rgba(5,12,21,0.72)",
    overflow: "hidden",
  },

  portalContent: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 10,
    paddingTop: 12,
    paddingBottom: 11,
  },

  exploreIconHalo: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(18,73,132,0.16)",
    borderWidth: 1,
    borderColor: "rgba(74,155,255,0.3)",
    shadowColor: "#2D8DFF",
    shadowOpacity: 0.24,
    shadowRadius: 9,
    shadowOffset: {
      width: 0,
      height: 0,
    },
  },

  businessIconHalo: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(93,51,9,0.16)",
    borderWidth: 1,
    borderColor: "rgba(244,179,59,0.3)",
    shadowColor: "#F4A62A",
    shadowOpacity: 0.26,
    shadowRadius: 9,
    shadowOffset: {
      width: 0,
      height: 0,
    },
  },

  portalTitle: {
    width: "100%",
    minHeight: 35,
    color: "#FFFFFF",
    fontSize: 13,
    lineHeight: 17,
    textAlign: "center",
    marginTop: 9,
  },

  portalDivider: {
    width: 28,
    height: 2,
    borderRadius: 999,
    backgroundColor: "#EFB64A",
    marginTop: 6,
    marginBottom: 7,
  },

  portalDescription: {
    width: "100%",
    minHeight: 45,
    color: "rgba(255,255,255,0.7)",
    fontSize: 9.5,
    lineHeight: 14,
    textAlign: "center",
  },

  cardActionArea: {
    flex: 1,
    width: "100%",
    alignItems: "center",
    justifyContent: "flex-end",
  },

  arrowButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.68)",
    shadowColor: "#FFD56A",
    shadowOpacity: 0.36,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    elevation: 5,
  },

  featureOuterGlow: {
    marginTop: 16,
    borderRadius: 20,
    shadowColor: "#F4A62A",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    elevation: 4,
  },

  featureBorder: {
    borderRadius: 20,
    padding: 1,
  },

  featurePanel: {
    minHeight: 82,
    borderRadius: 19,
    backgroundColor: "rgba(5,13,22,0.82)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-evenly",
    paddingHorizontal: 3,
    paddingVertical: 12,
  },

  featureItem: {
    flex: 1,
    alignItems: "center",
    gap: 6,
  },

  featureLabel: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 6.5,
    textAlign: "center",
  },

  featureDivider: {
    width: 1,
    height: 38,
    backgroundColor: "rgba(255,255,255,0.1)",
  },

  footerDecoration: {
    marginTop: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  footerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(240,178,58,0.25)",
  },

  heartGlow: {
    marginHorizontal: 16,
    shadowColor: "#FF9F16",
    shadowOpacity: 0.55,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 0,
    },
    elevation: 5,
  },

  footerText: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
    marginTop: 9,
  },

  footerClosing: {
    color: "#E9B95B",
    fontSize: 12,
    textAlign: "center",
    marginTop: 2,
  },

  portalPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.985 }],
  },

  portalDisabled: {
    opacity: 0.62,
  },
});