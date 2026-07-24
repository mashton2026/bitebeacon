import {
    BlurMask,
    Canvas,
    Circle,
    Group,
    Line,
    LinearGradient,
    Rect,
    vec,
} from "@shopify/react-native-skia";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import {
    cancelAnimation,
    Easing,
    useDerivedValue,
    useSharedValue,
    withDelay,
    withRepeat,
    withSequence,
    withTiming,
} from "react-native-reanimated";

const WIDTH = 112;
const HEIGHT = 16;
const LINE_Y = HEIGHT / 2;

const SHIMMER_WIDTH = 44;
const SHIMMER_START = -SHIMMER_WIDTH;
const SHIMMER_END = WIDTH + SHIMMER_WIDTH;

export default function SectionGlowLine() {
    const shimmerProgress = useSharedValue(0);

    useEffect(() => {
        shimmerProgress.value = withRepeat(
            withSequence(
                withTiming(1, {
                    duration: 4200,
                    easing: Easing.inOut(Easing.cubic),
                }),
                withDelay(
                    2200,
                    withTiming(0, {
                        duration: 0,
                    })
                )
            ),
            -1,
            false
        );

        return () => {
            cancelAnimation(shimmerProgress);
        };
    }, [shimmerProgress]);

    const shimmerX = useDerivedValue(() => {
        return (
            SHIMMER_START +
            shimmerProgress.value * (SHIMMER_END - SHIMMER_START)
        );
    });

    const shimmerIntensity = useDerivedValue(() => {
        const distanceFromCentre =
            Math.abs(shimmerProgress.value - 0.5) * 2;

        return Math.pow(
            Math.max(0, 1 - distanceFromCentre),
            1.35
        );
    });

    const starBloomRadius = useDerivedValue(() => {
        return 2.5 + shimmerIntensity.value * 5.5;
    });

    const starCoreRadius = useDerivedValue(() => {
        return 0.8 + shimmerIntensity.value * 1.35;
    });

    const shimmerGradientStart = useDerivedValue(() =>
        vec(shimmerX.value, LINE_Y)
    );

    const shimmerGradientEnd = useDerivedValue(() =>
        vec(shimmerX.value + SHIMMER_WIDTH, LINE_Y)
    );

    return (
        <View style={styles.container} pointerEvents="none">
            <Canvas style={styles.canvas}>
                {/* Wide blue-and-gold atmospheric glow */}
                <Line
                    p1={vec(3, LINE_Y)}
                    p2={vec(WIDTH - 3, LINE_Y)}
                    strokeWidth={6}
                    strokeCap="round"
                >
                    <LinearGradient
                        start={vec(0, LINE_Y)}
                        end={vec(WIDTH, LINE_Y)}
                        colors={[
                            "rgba(44,139,255,0)",
                            "rgba(44,139,255,0.5)",
                            "rgba(244,181,71,0.5)",
                            "rgba(244,181,71,0)",
                        ]}
                        positions={[0, 0.3, 0.7, 1]}
                    />

                    <BlurMask blur={7} style="normal" />
                </Line>

                {/* Dark lower edge creates metallic depth */}
                <Line
                    p1={vec(3, LINE_Y + 1.4)}
                    p2={vec(WIDTH - 3, LINE_Y + 1.4)}
                    color="rgba(2,11,19,0.82)"
                    strokeWidth={3.8}
                    strokeCap="round"
                />

                {/* Main metallic body */}
                <Line
                    p1={vec(2, LINE_Y)}
                    p2={vec(WIDTH - 2, LINE_Y)}
                    strokeWidth={3.4}
                    strokeCap="round"
                >
                    <LinearGradient
                        start={vec(0, LINE_Y)}
                        end={vec(WIDTH, LINE_Y)}
                        colors={[
                            "rgba(44,139,255,0)",
                            "rgba(53,146,255,0.85)",
                            "rgba(145,207,255,1)",
                            "rgba(255,235,169,1)",
                            "rgba(244,181,71,0.92)",
                            "rgba(244,181,71,0)",
                        ]}
                        positions={[0, 0.2, 0.4, 0.59, 0.78, 1]}
                    />
                </Line>

                {/* Fine bright upper bevel */}
                <Line
                    p1={vec(8, LINE_Y - 1)}
                    p2={vec(WIDTH - 8, LINE_Y - 1)}
                    strokeWidth={0.8}
                    strokeCap="round"
                >
                    <LinearGradient
                        start={vec(0, LINE_Y)}
                        end={vec(WIDTH, LINE_Y)}
                        colors={[
                            "rgba(255,255,255,0)",
                            "rgba(220,244,255,0.66)",
                            "rgba(255,250,225,0.82)",
                            "rgba(255,255,255,0)",
                        ]}
                        positions={[0, 0.32, 0.68, 1]}
                    />
                </Line>

                {/* Reflection travels across the full line */}
                <Group opacity={shimmerIntensity}>
                    <Rect
                        x={shimmerX}
                        y={LINE_Y - 2.8}
                        width={SHIMMER_WIDTH}
                        height={5.6}
                    >
                        <LinearGradient
                            start={shimmerGradientStart}
                            end={shimmerGradientEnd}
                            colors={[
                                "rgba(255,255,255,0)",
                                "rgba(220,242,255,0.05)",
                                "rgba(228,246,255,0.14)",
                                "rgba(242,251,255,0.30)",
                                "rgba(255,255,255,0.62)",
                                "rgba(255,255,255,0.96)",
                                "rgba(255,255,255,0.62)",
                                "rgba(255,246,218,0.30)",
                                "rgba(255,234,178,0.14)",
                                "rgba(255,255,255,0.05)",
                                "rgba(255,255,255,0)",
                            ]}
                            positions={[
                                0,
                                0.10,
                                0.22,
                                0.34,
                                0.45,
                                0.50,
                                0.55,
                                0.66,
                                0.78,
                                0.90,
                                1,
                            ]}
                        />

                        <BlurMask blur={2.2} style="normal" />
                    </Rect>

                    <Rect
                        x={useDerivedValue(
                            () => shimmerX.value + SHIMMER_WIDTH / 2 - 1.2
                        )}
                        y={LINE_Y - 5}
                        width={2.4}
                        height={10}
                    >
                        <LinearGradient
                            start={vec(0, LINE_Y - 5)}
                            end={vec(0, LINE_Y + 5)}
                            colors={[
                                "rgba(255,255,255,0)",
                                "rgba(255,255,255,0.08)",
                                "rgba(255,255,255,0.28)",
                                "rgba(255,255,255,0.68)",
                                "rgba(255,255,255,1)",
                                "rgba(255,255,255,0.68)",
                                "rgba(255,255,255,0.28)",
                                "rgba(255,255,255,0.08)",
                                "rgba(255,255,255,0)",
                            ]}
                            positions={[
                                0,
                                0.12,
                                0.25,
                                0.4,
                                0.5,
                                0.6,
                                0.75,
                                0.88,
                                1,
                            ]}
                        />

                        <BlurMask blur={1.5} style="normal" />
                    </Rect>

                    {/* Bright star bloom at the reflection centre */}
                    <Circle
                        cx={useDerivedValue(
                            () =>
                                shimmerX.value +
                                SHIMMER_WIDTH / 2
                        )}
                        cy={LINE_Y}
                        r={starBloomRadius}
                        color="rgba(255,248,218,1)"
                        opacity={useDerivedValue(
                            () =>
                                0.14 +
                                shimmerIntensity.value * 0.86
                        )}
                    >
                        <BlurMask blur={5.5} style="normal" />
                    </Circle>

                    {/* Horizontal star ray */}
                    <Line
                        p1={useDerivedValue(() =>
                            vec(
                                shimmerX.value +
                                SHIMMER_WIDTH / 2 -
                                (2 + shimmerIntensity.value * 8),
                                LINE_Y
                            )
                        )}
                        p2={useDerivedValue(() =>
                            vec(
                                shimmerX.value +
                                SHIMMER_WIDTH / 2 +
                                (2 + shimmerIntensity.value * 8),
                                LINE_Y
                            )
                        )}
                        color="rgba(255,255,255,1)"
                        opacity={useDerivedValue(
                            () => 0.15 + shimmerIntensity.value * 0.85
                        )}
                        strokeWidth={1.2}
                        strokeCap="round"
                    >
                        <BlurMask blur={1.4} style="normal" />
                    </Line>

                    {/* Vertical star ray */}
                    <Line
                        p1={useDerivedValue(() =>
                            vec(
                                shimmerX.value +
                                SHIMMER_WIDTH / 2,
                                LINE_Y -
                                (2 +
                                    shimmerIntensity.value *
                                    5)
                            )
                        )}
                        p2={useDerivedValue(() =>
                            vec(
                                shimmerX.value +
                                SHIMMER_WIDTH / 2,
                                LINE_Y +
                                (2 +
                                    shimmerIntensity.value *
                                    5)
                            )
                        )}
                        color="rgba(255,255,255,1)"
                        opacity={useDerivedValue(
                            () =>
                                0.12 +
                                shimmerIntensity.value * 0.88
                        )}
                        strokeWidth={1.1}
                        strokeCap="round"
                    >
                        <BlurMask blur={1.25} style="normal" />
                    </Line>

                    {/* Brilliant white core */}
                    <Circle
                        cx={useDerivedValue(
                            () => shimmerX.value + SHIMMER_WIDTH / 2
                        )}
                        cy={LINE_Y}
                        r={starCoreRadius}
                        color="rgba(255,255,255,1)"
                        opacity={useDerivedValue(
                            () => 0.35 + shimmerIntensity.value * 0.65
                        )}
                    />

                </Group>
            </Canvas>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: WIDTH,
        height: HEIGHT,
        marginTop: 6,
    },

    canvas: {
        flex: 1,
    },
});