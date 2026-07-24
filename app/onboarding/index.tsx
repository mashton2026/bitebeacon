import { MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useRef, useState } from "react";
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import AppText from "../../components/AppText";
import MapTextureBackground from "../../components/MapTextureBackground";

type OnboardingSlide = {
  eyebrow: string;
  title: string;
  text: string;
  icon:
  | "map-marker-outline"
  | "map-outline"
  | "account-group-outline"
  | "trophy-outline"
  | "storefront-outline"
  | "rocket-launch-outline";
  accent: "blue" | "gold";
  pills: string[];
};

const slides: OnboardingSlide[] = [
  {
    eyebrow: "DISCOVER",
    title: "Great food is closer than you think",
    text: "Discover food trucks, trailers, markets, pop-ups and independent favourites around you.",
    icon: "map-marker-outline",
    accent: "blue",
    pills: ["Near you", "Hidden gems", "Local favourites"],
  },
  {
    eyebrow: "EXPLORE",
    title: "See what’s happening around you",
    text: "Use the live map to explore nearby food businesses, current locations and places worth visiting.",
    icon: "map-outline",
    accent: "blue",
    pills: ["Live map", "Nearby food", "Quick discovery"],
  },
  {
    eyebrow: "COMMUNITY",
    title: "Help build the food map",
    text: "Found a brilliant food business that is missing? Add it and help more people discover something great.",
    icon: "account-group-outline",
    accent: "gold",
    pills: ["Spot a van", "Support local", "Grow the map"],
  },
  {
    eyebrow: "SCOUT REWARDS",
    title: "Get recognised for great finds",
    text: "Earn Scout Points when businesses you discover are confirmed or claimed, with more rewards planned as BiteBeacon grows.",
    icon: "trophy-outline",
    accent: "gold",
    pills: ["Scout Points", "Confirmed finds", "Future rewards"],
  },
  {
    eyebrow: "FOOD BUSINESSES",
    title: "Take control of your presence",
    text: "Business owners can claim listings, update locations, go live and stay connected with nearby customers.",
    icon: "storefront-outline",
    accent: "gold",
    pills: ["Claim listings", "Go live", "Grow visibility"],
  },
  {
    eyebrow: "WELCOME TO BITEBEACON",
    title: "The Home of Mobile Food",
    text: "You’re joining BiteBeacon at the beginning. Discover, contribute and help shape everything mobile food.",
    icon: "rocket-launch-outline",
    accent: "gold",
    pills: ["Discover", "Grow", "Connect"],
  },
];

export default function OnboardingScreen() {
  const { width } = useWindowDimensions();
  const scrollRef = useRef<ScrollView | null>(null);

  const [index, setIndex] = useState(0);
  const [isFinishing, setIsFinishing] = useState(false);

  async function finish() {
    if (isFinishing) return;

    setIsFinishing(true);

    try {
      /*
       * This is still stored normally.
       * The temporary useEffect above clears it again while we are editing.
       */
      await AsyncStorage.setItem("seenOnboarding", "true");
      router.replace("/welcome");
    } catch (error) {
      console.log("Could not finish onboarding:", error);
      router.replace("/welcome");
    } finally {
      setIsFinishing(false);
    }
  }

  function next() {
    if (isFinishing) return;

    if (index < slides.length - 1) {
      const nextIndex = index + 1;

      setIndex(nextIndex);

      scrollRef.current?.scrollTo({
        x: nextIndex * width,
        animated: true,
      });

      return;
    }

    finish();
  }

  function previous() {
    if (isFinishing || index === 0) return;

    const previousIndex = index - 1;

    setIndex(previousIndex);

    scrollRef.current?.scrollTo({
      x: previousIndex * width,
      animated: true,
    });
  }

  function skip() {
    if (isFinishing) return;

    finish();
  }

  function handleMomentumEnd(
    event: NativeSyntheticEvent<NativeScrollEvent>
  ) {
    const nextIndex = Math.round(
      event.nativeEvent.contentOffset.x / width
    );

    setIndex(nextIndex);
  }

  return (
    <MapTextureBackground>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <View style={styles.topRow}>
            <View style={styles.brandArea}>
              <AppText variant="heading" style={styles.brandTitle}>
                BiteBeacon
              </AppText>

              <AppText variant="label" style={styles.brandSlogan}>
                DISCOVER. GROW. CONNECT.
              </AppText>
            </View>

            <Pressable
              onPress={skip}
              disabled={isFinishing}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Skip onboarding"
              style={({ pressed }) => [
                styles.skipButton,
                pressed && styles.pressed,
                isFinishing && styles.disabled,
              ]}
            >
              <AppText variant="bodyBold" style={styles.skipText}>
                Skip
              </AppText>
            </Pressable>
          </View>

          <ScrollView
            ref={scrollRef}
            horizontal
            pagingEnabled
            bounces={false}
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={handleMomentumEnd}
            scrollEventThrottle={16}
          >
            {slides.map((slide) => {
              const isBlue = slide.accent === "blue";

              return (
                <View
                  key={slide.title}
                  style={[styles.slide, { width }]}
                >
                  <View
                    style={[
                      styles.outerGlow,
                      isBlue
                        ? styles.outerGlowBlue
                        : styles.outerGlowGold,
                    ]}
                  >
                    <LinearGradient
                      colors={
                        isBlue
                          ? [
                            "#174A86",
                            "#3D8FE8",
                            "#8AC8FF",
                            "#3D8FE8",
                            "#174A86",
                          ]
                          : [
                            "#704006",
                            "#C98217",
                            "#FFD06C",
                            "#C98217",
                            "#704006",
                          ]
                      }
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.cardBorder}
                    >
                      <View style={styles.card}>
                        <View style={styles.innerHighlight}>
                          <View
                            style={[
                              styles.iconHalo,
                              isBlue
                                ? styles.iconHaloBlue
                                : styles.iconHaloGold,
                            ]}
                          >
                            <MaterialCommunityIcons
                              name={slide.icon}
                              size={54}
                              color="#F4C35B"
                            />
                          </View>

                          <AppText
                            variant="label"
                            style={styles.eyebrow}
                          >
                            {slide.eyebrow}
                          </AppText>

                          <AppText
                            variant="heading"
                            style={styles.title}
                          >
                            {slide.title}
                          </AppText>

                          <View style={styles.titleDivider} />

                          <AppText variant="body" style={styles.text}>
                            {slide.text}
                          </AppText>

                          <View style={styles.pillWrap}>
                            {slide.pills.map((pill) => (
                              <View key={pill} style={styles.pill}>
                                <MaterialCommunityIcons
                                  name="check"
                                  size={14}
                                  color="#F4B547"
                                />

                                <AppText
                                  variant="bodyBold"
                                  style={styles.pillText}
                                >
                                  {pill}
                                </AppText>
                              </View>
                            ))}
                          </View>
                        </View>
                      </View>
                    </LinearGradient>
                  </View>
                </View>
              );
            })}
          </ScrollView>

          <View style={styles.footer}>
            <View style={styles.progressRow}>
              <AppText variant="label" style={styles.progressText}>
                {String(index + 1).padStart(2, "0")}
              </AppText>

              <View style={styles.dots}>
                {slides.map((_, dotIndex) => (
                  <View
                    key={dotIndex}
                    style={[
                      styles.dot,
                      dotIndex === index && styles.activeDot,
                    ]}
                  />
                ))}
              </View>

              <AppText variant="label" style={styles.progressText}>
                {String(slides.length).padStart(2, "0")}
              </AppText>
            </View>

            <View style={styles.navigationRow}>
              {index > 0 ? (
                <Pressable
                  onPress={previous}
                  disabled={isFinishing}
                  accessibilityRole="button"
                  accessibilityLabel="Previous onboarding page"
                  style={({ pressed }) => [
                    styles.previousButton,
                    pressed && styles.pressed,
                    isFinishing && styles.disabled,
                  ]}
                >
                  <MaterialCommunityIcons
                    name="arrow-left"
                    size={22}
                    color="#F4B547"
                  />

                  <AppText
                    variant="bodyBold"
                    style={styles.previousButtonText}
                  >
                    Back
                  </AppText>
                </Pressable>
              ) : (
                <View style={styles.previousPlaceholder} />
              )}

              <Pressable
                onPress={next}
                disabled={isFinishing}
                accessibilityRole="button"
                accessibilityLabel={
                  index === slides.length - 1
                    ? "Get started with BiteBeacon"
                    : "Next onboarding page"
                }
                style={({ pressed }) => [
                  styles.nextButtonOuter,
                  pressed && styles.nextButtonPressed,
                  isFinishing && styles.disabled,
                ]}
              >
                <LinearGradient
                  colors={[
                    "#FFF7CF",
                    "#FFD972",
                    "#F5B93D",
                    "#D98108",
                  ]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.nextButton}
                >
                  <AppText
                    variant="button"
                    style={styles.nextButtonText}
                  >
                    {isFinishing
                      ? "Opening..."
                      : index === slides.length - 1
                        ? "Get Started"
                        : "Next"}
                  </AppText>

                  <MaterialCommunityIcons
                    name={
                      index === slides.length - 1
                        ? "rocket-launch-outline"
                        : "arrow-right"
                    }
                    size={23}
                    color="#071421"
                  />
                </LinearGradient>
              </Pressable>
            </View>
          </View>
        </View>
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
    flex: 1,
    paddingTop: 8,
    paddingBottom: 20,
  },

  topRow: {
    paddingHorizontal: 22,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },

  brandArea: {
    flex: 1,
  },

  brandTitle: {
    color: "#FFFFFF",
    fontSize: 23,
    lineHeight: 28,
  },

  brandSlogan: {
    color: "#F4B547",
    fontSize: 8.5,
    letterSpacing: 2.1,
    marginTop: 2,
  },

  skipButton: {
    minWidth: 64,
    minHeight: 42,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: "rgba(255,181,71,0.36)",
    backgroundColor: "rgba(7,20,33,0.58)",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 14,
  },

  skipText: {
    color: "#F4B547",
    fontSize: 13,
  },

  slide: {
    flex: 1,
    paddingHorizontal: 22,
    paddingTop: 14,
    paddingBottom: 18,
    justifyContent: "center",
  },

  outerGlow: {
    borderRadius: 32,
  },

  outerGlowBlue: {
    shadowColor: "#2C8BFF",
    shadowOpacity: 0.18,
    shadowRadius: 17,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    elevation: 9,
  },

  outerGlowGold: {
    shadowColor: "#FF9C24",
    shadowOpacity: 0.2,
    shadowRadius: 17,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    elevation: 9,
  },

  cardBorder: {
    borderRadius: 32,
    padding: 2,
  },

  card: {
    minHeight: 490,
    borderRadius: 30,
    backgroundColor: "rgba(5,12,21,0.9)",
    overflow: "hidden",
  },

  innerHighlight: {
    minHeight: 490,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 30,
  },

  iconHalo: {
    width: 112,
    height: 112,
    borderRadius: 56,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 25,
    borderWidth: 1,
  },

  iconHaloBlue: {
    backgroundColor: "rgba(22,79,140,0.2)",
    borderColor: "rgba(89,169,255,0.36)",
    shadowColor: "#2C8BFF",
    shadowOpacity: 0.32,
    shadowRadius: 18,
    shadowOffset: {
      width: 0,
      height: 0,
    },
    elevation: 6,
  },

  iconHaloGold: {
    backgroundColor: "rgba(111,61,8,0.2)",
    borderColor: "rgba(255,190,71,0.36)",
    shadowColor: "#FF9C24",
    shadowOpacity: 0.34,
    shadowRadius: 18,
    shadowOffset: {
      width: 0,
      height: 0,
    },
    elevation: 6,
  },

  eyebrow: {
    color: "#F4B547",
    fontSize: 10,
    letterSpacing: 2.7,
    textAlign: "center",
    marginBottom: 10,
  },

  title: {
    maxWidth: 320,
    color: "#FFFFFF",
    fontSize: 29,
    lineHeight: 36,
    textAlign: "center",
  },

  titleDivider: {
    width: 42,
    height: 3,
    borderRadius: 999,
    backgroundColor: "#F4B547",
    marginTop: 17,
    marginBottom: 17,
    shadowColor: "#FF9C24",
    shadowOpacity: 0.6,
    shadowRadius: 9,
    shadowOffset: {
      width: 0,
      height: 0,
    },
    elevation: 5,
  },

  text: {
    maxWidth: 330,
    color: "rgba(255,255,255,0.76)",
    fontSize: 14,
    lineHeight: 22,
    textAlign: "center",
    marginBottom: 24,
  },

  pillWrap: {
    flexDirection: "row",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: 8,
  },

  pill: {
    minHeight: 36,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,181,71,0.22)",
    backgroundColor: "rgba(255,181,71,0.06)",
    paddingHorizontal: 11,
    paddingVertical: 7,
  },

  pillText: {
    color: "rgba(255,255,255,0.78)",
    fontSize: 10,
  },

  footer: {
    paddingHorizontal: 22,
  },

  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },

  progressText: {
    width: 24,
    color: "rgba(255,181,71,0.68)",
    fontSize: 9,
    textAlign: "center",
  },

  dots: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 7,
  },

  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.22)",
  },

  activeDot: {
    width: 27,
    backgroundColor: "#F4B547",
    shadowColor: "#FF9C24",
    shadowOpacity: 0.7,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 0,
    },
    elevation: 5,
  },

  navigationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  previousPlaceholder: {
    width: 96,
  },

  previousButton: {
    width: 96,
    minHeight: 56,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: "rgba(255,181,71,0.42)",
    backgroundColor: "rgba(7,20,33,0.72)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },

  previousButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
  },

  nextButtonOuter: {
    flex: 1,
    borderRadius: 18,
    shadowColor: "#FF9C24",
    shadowOpacity: 0.32,
    shadowRadius: 12,
    shadowOffset: {
      width: 0,
      height: 6,
    },
    elevation: 8,
  },

  nextButton: {
    minHeight: 56,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.62)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    paddingHorizontal: 18,
  },

  nextButtonText: {
    color: "#071421",
    fontSize: 15,
  },

  pressed: {
    opacity: 0.78,
  },

  nextButtonPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.985 }],
  },

  disabled: {
    opacity: 0.55,
  },
});