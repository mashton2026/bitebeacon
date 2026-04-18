import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { useRef, useState } from "react";
import {
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

const { width } = Dimensions.get("window");

const slides = [
  {
    eyebrow: "DISCOVER",
    title: "Find unreal local food",
    text: "Discover the best food vans, hidden gems and independent favourites around you — all in one place.",
    icon: "📍",
    pills: ["Near you", "Hidden gems", "Top local spots"],
  },
  {
    eyebrow: "EXPLORE",
    title: "See what’s actually worth it",
    text: "Use the live map to find great food nearby and stop wasting time on average places.",
    icon: "🗺️",
    pills: ["Live map", "Nearby food", "Fast discovery"],
  },
  {
    eyebrow: "COMMUNITY",
    title: "Built by the community",
    text: "Seen a great food van missing? Add it and help others discover it. BiteBeacon grows through people like you.",
    icon: "🔥",
    pills: ["Add spots", "Support locals", "Grow the map"],
  },
  {
    eyebrow: "REWARDS",
    title: "Get recognised for great finds",
    text: "When vendors claim listings you spotted, you earn points. The best spotters will be rewarded as BiteBeacon grows.",
    icon: "🏆",
    pills: ["Earn points", "Vendor claims", "Future rewards"],
  },
  {
    eyebrow: "VENDORS",
    title: "Own your listing",
    text: "Vendors can claim their business, manage their presence, and stay visible to nearby customers.",
    icon: "🚚",
    pills: ["Claim listings", "Stay visible", "Grow your business"],
  },
  {
    eyebrow: "EARLY ACCESS",
    title: "You’re early",
    text: "BiteBeacon is just getting started. Early users help shape the platform and will benefit the most as it grows.",
    icon: "🚀",
    pills: ["Early access", "Shape the app", "Be first"],
  },
];

export default function OnboardingScreen() {
  const scrollRef = useRef<ScrollView | null>(null);
  const [index, setIndex] = useState(0);

  async function finish() {
    await AsyncStorage.setItem("seenOnboarding", "true");
    router.replace("/welcome");
  }

  async function next() {
    if (index < slides.length - 1) {
      const nextIndex = index + 1;
      setIndex(nextIndex);
      scrollRef.current?.scrollTo({
        x: nextIndex * width,
        animated: true,
      });
      return;
    }

    await finish();
  }

  async function skip() {
    await finish();
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
    <View style={styles.container}>
      <View style={styles.topRow}>
        <View>
          <Text style={styles.brandTitle}>BiteBeacon</Text>
          <Text style={styles.brandSubtitle}>
            Discover the best local food around you
          </Text>
        </View>
        <Pressable onPress={skip} hitSlop={12}>
          <Text style={styles.skipText}>Skip</Text>
        </Pressable>
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleMomentumEnd}
      >
        {slides.map((slide) => (
          <View key={slide.title} style={styles.slide}>
            <View style={styles.card}>
              <View style={styles.iconOuter}>
                <View style={styles.iconInner}>
                  <Text style={styles.icon}>{slide.icon}</Text>
                </View>
              </View>

              <Text style={styles.eyebrow}>{slide.eyebrow}</Text>
              <Text style={styles.title}>{slide.title}</Text>
              <Text style={styles.text}>{slide.text}</Text>

              <View style={styles.pillWrap}>
                {slide.pills.map((pill) => (
                  <View key={pill} style={styles.pill}>
                    <Text style={styles.pillText}>{pill}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.dots}>
          {slides.map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i === index && styles.activeDot]}
            />
          ))}
        </View>

        <Pressable style={styles.button} onPress={next}>
          <Text style={styles.buttonText}>
            {index === slides.length - 1 ? "Get Started" : "Next"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const NAVY = "#0B2A5B";
const NAVY_DEEP = "#081F47";
const ORANGE = "#FF7A00";
const ORANGE_SOFT = "#FFB067";
const WHITE = "#FFFFFF";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: NAVY,
    paddingTop: 60,
    paddingBottom: 32,
  },
  topRow: {
    paddingHorizontal: 24,
    marginBottom: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  brandTitle: {
    color: WHITE,
    fontSize: 28,
    fontWeight: "800",
  },
  brandSubtitle: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 14,
    marginTop: 4,
    fontWeight: "600",
  },
  skipText: {
    color: WHITE,
    fontSize: 16,
    fontWeight: "800",
  },
  slide: {
    width,
    paddingHorizontal: 24,
    justifyContent: "center",
  },
  card: {
    backgroundColor: NAVY_DEEP,
    borderRadius: 28,
    padding: 26,
    borderWidth: 2,
    borderColor: "rgba(255,122,0,0.7)",
    minHeight: 500,
    justifyContent: "center",
  },
  iconOuter: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: "rgba(255,122,0,0.15)",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 24,
  },
  iconInner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: ORANGE,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: ORANGE_SOFT,
  },
  icon: {
    fontSize: 34,
  },
  eyebrow: {
    color: ORANGE,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.2,
    textAlign: "center",
    marginBottom: 8,
  },
  title: {
    color: WHITE,
    fontSize: 34,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 12,
  },
  text: {
    color: "rgba(255,255,255,0.82)",
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 22,
  },
  pillWrap: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
    flexWrap: "wrap",
  },
  pill: {
    backgroundColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  pillText: {
    color: WHITE,
    fontWeight: "700",
    fontSize: 12,
  },
  footer: {
    paddingHorizontal: 24,
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 16,
    gap: 8,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.3)",
  },
  activeDot: {
    width: 28,
    backgroundColor: ORANGE,
  },
  button: {
    backgroundColor: ORANGE,
    paddingVertical: 18,
    borderRadius: 18,
    alignItems: "center",
    borderWidth: 2,
    borderColor: ORANGE_SOFT,
  },
  buttonText: {
    color: WHITE,
    fontSize: 18,
    fontWeight: "800",
  },
});