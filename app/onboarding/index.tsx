import { MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useRef, useState } from "react";
import {
  Image,
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
import MetallicFrame from "../../components/MetallicFrame";
import SectionGlowLine from "../../components/SectionGlowLine";

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
    text: "Discover burger vans, food trucks, trailers, pop-ups and independent mobile food traders near you.",
    icon: "map-marker-outline",
    accent: "blue",
    pills: ["Near you", "Hidden gems", "Local favourites"],
  },
  {
    eyebrow: "EXPLORE",
    title: "Find great food wherever you go",
    text: "Explore the BiteBeacon map to discover mobile food traders, find nearby locations and plan your next food stop.",
    icon: "map-outline",
    accent: "blue",
    pills: ["Live map", "Nearby food", "Quick discovery"],
  },
  {
    eyebrow: "COMMUNITY",
    title: "Help build the food map",
    text: "Spotted a burger van or mobile food trader that isn't on BiteBeacon? Add their location and help others discover them.",
    icon: "account-group-outline",
    accent: "gold",
    pills: ["Spot a van", "Support local", "Grow the map"],
  },
  {
    eyebrow: "SCOUT REWARDS",
    title: "Get recognised for great finds",
    text: "Earn Scout Points when the businesses you spot are confirmed or claimed. Help grow the community and get recognised for your discoveries.",
    icon: "trophy-outline",
    accent: "gold",
    pills: ["Scout Points", "Confirmed finds", "Future rewards"],
  },
  {
    eyebrow: "FOOD BUSINESSES",
    title: "Put your business on the map",
    text: "Run a burger van, food truck or mobile food business? Claim your listing, update your location and help customers find you.",
    icon: "storefront-outline",
    accent: "gold",
    pills: ["Claim listings", "Go live", "Grow visibility"],
  },
  {
    eyebrow: "WELCOME TO BITEBEACON",
    title: "The Home of Mobile Food",
    text: "Discover mobile food, support independent traders and help build a community that connects great food with the people looking for it.",
    icon: "rocket-launch-outline",
    accent: "gold",
    pills: ["Discover", "Grow", "Connect"],
  },
];

// Decorative, text-free cinematic art. Real labels and controls remain native.
const CINEMATIC_ART = [
  require("../../assets/onboarding/cinematic_1.png"),
  require("../../assets/onboarding/cinematic_2.png"),
  require("../../assets/onboarding/cinematic_3.png"),
  require("../../assets/onboarding/cinematic_4.png"),
  require("../../assets/onboarding/cinematic_5.png"),
  require("../../assets/onboarding/cinematic_6.png"),
];

const TITLE_LINES: Array<[string, string]> = [
  ["Great food is closer", "than you think"],
  ["Find great food", "wherever you go"],
  ["Help build", "the food map"],
  ["Get recognised", "for great finds"],
  ["Put your business", "on the map"],
  ["The Home of", "Mobile Food"],
];

function CinematicTitle({
  slideIndex,
  tone,
}: {
  slideIndex: number;
  tone: "blue" | "gold";
}) {
  const [first, second] = TITLE_LINES[slideIndex];
  return (
    <View style={styles.titleBlock} accessible accessibilityRole="header">
      <AppText variant="heading" style={styles.titleMain}>
        {first}
      </AppText>
      <View style={styles.accentTitleWrap}>
        <AppText
          variant="heading"
          style={[
            styles.titleAccent,
            tone === "blue" ? styles.titleAccentBlue : styles.titleAccentGold,
          ]}
        >
          {second}
        </AppText>
        <LinearGradient
          pointerEvents="none"
          colors={
            tone === "blue"
              ? ["transparent", "rgba(150,222,255,0.24)", "transparent"]
              : ["transparent", "rgba(255,216,143,0.25)", "transparent"]
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.accentReflection}
        />
      </View>
      <View style={styles.titleUnderline}>
        <LinearGradient
          colors={[
            "transparent",
            tone === "blue" ? "#58B9FF" : "#C48620",
            "#FFF3CE",
            tone === "blue" ? "#58B9FF" : "#C48620",
            "transparent",
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.titleUnderlineFill}
        />
      </View>
    </View>
  );
}

export default function OnboardingScreen() {
  const { width, height } = useWindowDimensions();
  const scrollRef = useRef<ScrollView | null>(null);

  const [index, setIndex] = useState(0);
  const [slideHeight, setSlideHeight] = useState(0);
  const [isFinishing, setIsFinishing] = useState(false);

  async function finish() {
    if (isFinishing) return;

    setIsFinishing(true);

    try {
      /*
       * This is still stored normally.
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

  function handleMomentumEnd(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const nextIndex = Math.round(event.nativeEvent.contentOffset.x / width);

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

          <View
            style={styles.slidesViewport}
            onLayout={(event) =>
              setSlideHeight(event.nativeEvent.layout.height)
            }
          >
            <ScrollView
              style={styles.slidesScroller}
              ref={scrollRef}
              horizontal
              pagingEnabled
              bounces={false}
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={handleMomentumEnd}
              scrollEventThrottle={16}
            >
              {slides.map((slide, slideIndex) => {
                const isBlue = slide.accent === "blue";

                return (
                  <View
                    key={slide.title}
                    style={[
                      styles.slide,
                      {
                        width,
                        height: slideHeight || Math.max(340, height - 250),
                      },
                    ]}
                  >
                    <MetallicFrame
                      tone={isBlue ? "blue" : "gold"}
                      borderRadius={30}
                      borderWidth={2}
                      style={[
                        styles.outerGlow,
                        isBlue ? styles.outerGlowBlue : styles.outerGlowGold,
                      ]}
                      contentStyle={styles.frameContent}
                    >
                      <LinearGradient
                        colors={[
                          "rgba(12,37,61,0.97)",
                          "rgba(5,20,35,0.98)",
                          "rgba(4,13,23,0.99)",
                        ]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.card}
                      >
                        <Image
                          source={CINEMATIC_ART[slideIndex]}
                          resizeMode="cover"
                          style={styles.cinematicArt}
                          accessibilityIgnoresInvertColors
                        />
                        <View style={styles.innerHighlight}>
                          <View style={styles.titleStage}>
                            <AppText variant="label" style={styles.eyebrow}>
                              {slide.eyebrow}
                            </AppText>
                            <CinematicTitle
                              slideIndex={slideIndex}
                              tone={slide.accent}
                            />
                          </View>
                          <View style={styles.dividerWrap}>
                            <SectionGlowLine />
                          </View>
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
                      </LinearGradient>
                    </MetallicFrame>
                  </View>
                );
              })}
            </ScrollView>
          </View>

          <View style={styles.footer}>
            <View style={styles.progressRow}>
              <AppText variant="label" style={styles.progressText}>
                {String(index + 1).padStart(2, "0")}
              </AppText>

              <View style={styles.dots}>
                {slides.map((_, dotIndex) => (
                  <View
                    key={dotIndex}
                    style={[styles.dot, dotIndex === index && styles.activeDot]}
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

                  <AppText variant="bodyBold" style={styles.previousButtonText}>
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
                  colors={["#FFF7CF", "#FFD972", "#F5B93D", "#D98108"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.nextButton}
                >
                  <AppText variant="button" style={styles.nextButtonText}>
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

  slidesViewport: {
    flex: 1,
    minHeight: 0,
  },
  slidesScroller: {
    flex: 1,
  },
  slide: {
    paddingHorizontal: 22,
    paddingTop: 8,
    paddingBottom: 10,
    justifyContent: "center",
  },

  outerGlow: {
    flex: 1,
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

  frameContent: {
    flex: 1,
    borderRadius: 28,
    overflow: "hidden",
  },

  titleStage: {
    width: "100%",
    minHeight: 250,
    alignItems: "center",
    justifyContent: "center",
    overflow: "visible",
  },
  dividerWrap: { width: 100, height: 14, marginTop: 4, marginBottom: 15 },

  cardBorder: {
    borderRadius: 32,
    padding: 2,
  },

  card: {
    flex: 1,
    borderRadius: 28,
    backgroundColor: "rgba(5,12,21,0.9)",
    overflow: "hidden",
  },

  cinematicArt: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    width: "100%",
    height: "72%",
    opacity: 0.98,
  },
  innerHighlight: {
    flex: 1,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 10,
  },

  iconHalo: {
    width: 94,
    height: 94,
    borderRadius: 47,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
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
    marginBottom: 22,
  },

  titleBlock: {
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    paddingHorizontal: 8,
  },
  titleMain: {
    color: "#F8FAFF",
    fontSize: 29,
    lineHeight: 38,
    letterSpacing: -0.55,
    textAlign: "center",
    textShadowColor: "rgba(201,224,248,0.28)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  accentTitleWrap: {
    alignSelf: "stretch",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  titleAccent: {
    fontSize: 35,
    lineHeight: 45,
    letterSpacing: -0.75,
    textAlign: "center",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 5,
  },
  titleAccentBlue: {
    color: "#BCE7FF",
    textShadowColor: "rgba(52,151,242,0.48)",
  },
  titleAccentGold: {
    color: "#FFE0A0",
    textShadowColor: "rgba(210,136,35,0.46)",
  },
  accentReflection: {
    height: 1,
    width: "75%",
    marginTop: -1,
    opacity: 0.8,
  },
  titleUnderline: {
    width: 160,
    height: 2,
    marginTop: 18,
    shadowColor: "#FFD580",
    shadowOpacity: 0.8,
    shadowRadius: 11,
    shadowOffset: { width: 0, height: 0 },
  },
  titleUnderlineFill: { flex: 1, borderRadius: 2 },

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
    marginBottom: 16,
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
