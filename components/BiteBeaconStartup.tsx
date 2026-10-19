import {
  Canvas,
  Circle,
  Group,
  Image,
  LinearGradient,
  Mask,
  RadialGradient,
  Rect,
  useImage,
  vec,
} from "@shopify/react-native-skia";
import React, { useEffect, useRef } from "react";
import { StyleSheet, useWindowDimensions } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from "react-native-reanimated";

// BiteBeacon startup: slow logo fade, homepage-inspired glow, one shimmer.
// No roads, lines, particles, shockwaves, or new dependencies.
type Props = { onFinished: () => void };
const TOTAL_MS = 4000;
const NIGHT = "#030A14";

export default function BiteBeaconStartup({ onFinished }: Props) {
  const { width: w, height: h } = useWindowDimensions();
  const cx = w / 2;
  const cy = h / 2;
  const logoWidth = Math.min(w * 0.84, 380);
  const logoHeight = logoWidth * (1024 / 1536);
  const logoX = cx - logoWidth / 2;
  const logoY = cy - logoHeight / 2;
  const logo = useImage(
    require("../assets/images/bitebeacon-startup-logo.png"),
  );
  const callbackRef = useRef(onFinished);
  callbackRef.current = onFinished;

  const glowOpacity = useSharedValue(0);
  const logoOpacity = useSharedValue(0);
  const logoScale = useSharedValue(1.065);
  const shimmerPosition = useSharedValue(0);
  const shimmerOpacity = useSharedValue(0);
  const screenOpacity = useSharedValue(1);

  useEffect(() => {
    // Full 2.65-second logo opacity fade (not a delayed instant reveal).
    glowOpacity.value = withDelay(
      0,
      withTiming(0.92, {
        duration: 2650,
        easing: Easing.inOut(Easing.sin),
      }),
    );
    logoOpacity.value = withDelay(
      0,
      withTiming(1, {
        duration: 2650,
        easing: Easing.inOut(Easing.sin),
      }),
    );
    logoScale.value = withDelay(
      0,
      withTiming(1, {
        duration: 2100,
        easing: Easing.out(Easing.cubic),
      }),
    );

    // One deliberate, wide metallic reflection AFTER the logo has appeared.
    shimmerPosition.value = withDelay(
      2700,
      withTiming(1, {
        duration: 900,
        easing: Easing.inOut(Easing.sin),
      }),
    );
    shimmerOpacity.value = withDelay(
      2700,
      withSequence(
        withTiming(0.94, { duration: 120 }),
        withTiming(0.94, { duration: 660 }),
        withTiming(0, { duration: 120 }),
      ),
    );

    // Hold the finished emblem before the transition.
    screenOpacity.value = withDelay(
      3700,
      withTiming(0, {
        duration: 300,
        easing: Easing.inOut(Easing.ease),
      }),
    );
    const timer = setTimeout(() => callbackRef.current(), TOTAL_MS);
    return () => clearTimeout(timer);
  }, [
    glowOpacity,
    logoOpacity,
    logoScale,
    shimmerPosition,
    shimmerOpacity,
    screenOpacity,
  ]);

  const logoTransform = useDerivedValue(() => [
    { translateX: cx * (1 - logoScale.value) },
    { translateY: cy * (1 - logoScale.value) },
    { scale: logoScale.value },
  ]);
  const shimmerX = useDerivedValue(
    () => logoX - 210 + shimmerPosition.value * (logoWidth + 420),
  );
  const shimmerStart = useDerivedValue(() => vec(shimmerX.value, logoY));
  const shimmerEnd = useDerivedValue(() => vec(shimmerX.value + 155, logoY));
  const shimmerAlpha = useDerivedValue(
    () => shimmerOpacity.value * logoOpacity.value,
  );
  const screenStyle = useAnimatedStyle(() => ({
    opacity: screenOpacity.value,
  }));

  return (
    <Animated.View style={[styles.root, screenStyle]}>
      <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
        <Rect x={0} y={0} width={w} height={h}>
          <LinearGradient
            start={vec(0, 0)}
            end={vec(w, h)}
            colors={[NIGHT, "#0A1B30", NIGHT]}
          />
        </Rect>

        {/* BiteBeacon homepage-inspired gold, electric blue and champagne aura. */}
        <Group opacity={glowOpacity}>
          <Circle
            cx={cx + logoWidth * 0.1}
            cy={cy - logoHeight * 0.04}
            r={logoWidth * 1.2}
          >
            <RadialGradient
              c={vec(cx + logoWidth * 0.1, cy - logoHeight * 0.04)}
              r={logoWidth * 1.2}
              colors={[
                "rgba(255,182,55,0.68)",
                "rgba(236,132,30,0.33)",
                "rgba(236,132,30,0.12)",
                "rgba(236,132,30,0.025)",
                "rgba(236,132,30,0)",
              ]}
              positions={[0, 0.27, 0.55, 0.8, 1]}
            />
          </Circle>
          <Circle
            cx={cx - logoWidth * 0.26}
            cy={cy + logoHeight * 0.08}
            r={logoWidth * 0.94}
          >
            <RadialGradient
              c={vec(cx - logoWidth * 0.26, cy + logoHeight * 0.08)}
              r={logoWidth * 0.94}
              colors={[
                "rgba(34,137,248,0.38)",
                "rgba(27,103,197,0.17)",
                "rgba(27,103,197,0.035)",
                "rgba(27,103,197,0)",
              ]}
              positions={[0, 0.42, 0.76, 1]}
            />
          </Circle>
          <Circle cx={cx + logoWidth * 0.39} cy={cy} r={logoWidth * 0.7}>
            <RadialGradient
              c={vec(cx + logoWidth * 0.39, cy)}
              r={logoWidth * 0.7}
              colors={[
                "rgba(255,196,93,0.38)",
                "rgba(255,196,93,0.13)",
                "rgba(255,196,93,0.025)",
                "rgba(255,196,93,0)",
              ]}
              positions={[0, 0.4, 0.76, 1]}
            />
          </Circle>
        </Group>

        {logo && (
          <Group opacity={logoOpacity} transform={logoTransform}>
            <Image
              image={logo}
              x={logoX}
              y={logoY}
              width={logoWidth}
              height={logoHeight}
              fit="contain"
            />
            {/* The reflections are clipped to the transparent PNG's logo pixels. */}
            <Mask
              mode="alpha"
              mask={
                <Image
                  image={logo}
                  x={logoX}
                  y={logoY}
                  width={logoWidth}
                  height={logoHeight}
                  fit="contain"
                />
              }
            >
              <Group opacity={shimmerAlpha}>
                <Rect
                  x={shimmerX}
                  y={logoY - 95}
                  width={155}
                  height={logoHeight + 190}
                  transform={[{ skewX: -0.26 }]}
                >
                  <LinearGradient
                    start={shimmerStart}
                    end={shimmerEnd}
                    colors={[
                      "rgba(255,250,224,0)",
                      "rgba(255,234,159,0.52)",
                      "rgba(255,255,250,1)",
                      "rgba(255,230,145,0.70)",
                      "rgba(255,250,224,0)",
                    ]}
                    positions={[0, 0.25, 0.5, 0.73, 1]}
                  />
                </Rect>
              </Group>
            </Mask>
          </Group>
        )}
      </Canvas>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, overflow: "hidden", backgroundColor: NIGHT },
});
