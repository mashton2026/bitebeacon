import {
    BlurMask,
    Canvas,
    Group,
    LinearGradient,
    RoundedRect,
    vec,
} from "@shopify/react-native-skia";
import { useEffect, useState } from "react";
import {
    LayoutChangeEvent,
    StyleProp,
    StyleSheet,
    View,
    ViewStyle,
} from "react-native";
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

type Props = {
    accentColor?: string;
    borderColor?: string;
    borderRadius?: number;
    style?: StyleProp<ViewStyle>;
};

const EDGE_INSET = 2;
const SHIMMER_WIDTH = 70;

export default function CardGlowBorder({
    accentColor = "#4FA7FF",
    borderColor = "rgba(79,167,255,0.38)",
    borderRadius = 22,
    style,
}: Props) {
    const [size, setSize] = useState({
        width: 0,
        height: 0,
    });

    const shimmerProgress = useSharedValue(0);
    const pulseProgress = useSharedValue(0);

    useEffect(() => {
        shimmerProgress.value = withRepeat(
            withSequence(
                withDelay(
                    450,
                    withTiming(1, {
                        duration: 1900,
                        easing: Easing.inOut(Easing.cubic),
                    })
                ),
                withDelay(
                    700,
                    withTiming(0, {
                        duration: 0,
                    })
                )
            ),
            -1,
            false
        );

        pulseProgress.value = withRepeat(
            withSequence(
                withTiming(1, {
                    duration: 1800,
                    easing: Easing.inOut(Easing.sin),
                }),
                withTiming(0, {
                    duration: 1800,
                    easing: Easing.inOut(Easing.sin),
                })
            ),
            -1,
            false
        );

        return () => {
            cancelAnimation(shimmerProgress);
            cancelAnimation(pulseProgress);
        };
    }, [pulseProgress, shimmerProgress]);

    const shimmerX = useDerivedValue(() => {
        return (
            -SHIMMER_WIDTH +
            shimmerProgress.value *
            (size.width + SHIMMER_WIDTH * 2)
        );
    });

    const shimmerStart = useDerivedValue(() =>
        vec(shimmerX.value, 0)
    );

    const shimmerEnd = useDerivedValue(() =>
        vec(shimmerX.value + SHIMMER_WIDTH, 0)
    );

    const glowOpacity = useDerivedValue(() => {
        return 0.30 + pulseProgress.value * 0.18;
    });

    const shimmerOpacity = useDerivedValue(() => {
        const distanceFromCentre =
            Math.abs(shimmerProgress.value - 0.5) * 2;

        return Math.pow(
            Math.max(0, 1 - distanceFromCentre),
            0.8
        );
    });

    function handleLayout(event: LayoutChangeEvent) {
        const { width, height } = event.nativeEvent.layout;

        setSize((currentSize) => {
            if (
                currentSize.width === width &&
                currentSize.height === height
            ) {
                return currentSize;
            }

            return {
                width,
                height,
            };
        });
    }

    const drawingWidth = Math.max(
        0,
        size.width - EDGE_INSET * 2
    );

    const drawingHeight = Math.max(
        0,
        size.height - EDGE_INSET * 2
    );

    const drawingRadius = Math.max(
        0,
        borderRadius - EDGE_INSET
    );

    return (
        <View
            pointerEvents="none"
            onLayout={handleLayout}
            style={[styles.container, style]}
        >
            {drawingWidth > 0 && drawingHeight > 0 ? (
                <Canvas style={styles.canvas}>
                    {/* Soft atmospheric glow */}
                    <Group opacity={glowOpacity}>
                        <RoundedRect
                            x={EDGE_INSET}
                            y={EDGE_INSET}
                            width={drawingWidth}
                            height={drawingHeight}
                            r={drawingRadius}
                            color={accentColor}
                            style="stroke"
                            strokeWidth={3.6}
                        >
                            <BlurMask blur={9} style="normal" />
                        </RoundedRect>
                    </Group>

                    {/* Dark metallic foundation */}
                    <RoundedRect
                        x={EDGE_INSET}
                        y={EDGE_INSET}
                        width={drawingWidth}
                        height={drawingHeight}
                        r={drawingRadius}
                        color="rgba(2,9,17,0.92)"
                        style="stroke"
                        strokeWidth={2.4}
                    />

                    {/* Main illuminated metallic edge */}
                    <RoundedRect
                        x={EDGE_INSET}
                        y={EDGE_INSET}
                        width={drawingWidth}
                        height={drawingHeight}
                        r={drawingRadius}
                        style="stroke"
                        strokeWidth={1.8}
                    >
                        <LinearGradient
                            start={vec(0, 0)}
                            end={vec(size.width, size.height)}
                            colors={[
                                "rgba(255,255,255,0.08)",
                                borderColor,
                                accentColor,
                                "rgba(255,255,255,0.28)",
                                borderColor,
                                "rgba(255,255,255,0.07)",
                            ]}
                            positions={[
                                0,
                                0.2,
                                0.42,
                                0.57,
                                0.78,
                                1,
                            ]}
                        />
                    </RoundedRect>

                    {/* Fine inner bevel */}
                    <RoundedRect
                        x={EDGE_INSET + 1.2}
                        y={EDGE_INSET + 1.2}
                        width={Math.max(0, drawingWidth - 2.4)}
                        height={Math.max(0, drawingHeight - 2.4)}
                        r={Math.max(0, drawingRadius - 1.2)}
                        style="stroke"
                        strokeWidth={0.65}
                    >
                        <LinearGradient
                            start={vec(0, 0)}
                            end={vec(size.width, size.height)}
                            colors={[
                                "rgba(255,255,255,0.16)",
                                "rgba(255,255,255,0.03)",
                                "rgba(255,255,255,0.1)",
                                "rgba(255,255,255,0.02)",
                            ]}
                            positions={[0, 0.35, 0.68, 1]}
                        />
                    </RoundedRect>

                    {/* Travelling polished-metal reflection */}
                    <Group opacity={shimmerOpacity}>
                        <RoundedRect
                            x={EDGE_INSET}
                            y={EDGE_INSET}
                            width={drawingWidth}
                            height={drawingHeight}
                            r={drawingRadius}
                            style="stroke"
                            strokeWidth={2.2}
                        >
                            <LinearGradient
                                start={shimmerStart}
                                end={shimmerEnd}
                                colors={[
                                    "rgba(255,255,255,0)",
                                    "rgba(214,239,255,0.05)",
                                    "rgba(232,247,255,0.42)",
                                    "rgba(255,255,255,0.95)",
                                    "rgba(255,242,205,0.55)",
                                    "rgba(255,255,255,0)",
                                ]}
                                positions={[0, 0.22, 0.4, 0.5, 0.66, 1]}
                            />

                            <BlurMask blur={1.2} style="normal" />
                        </RoundedRect>
                    </Group>
                </Canvas>
            ) : null}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 2,
    },

    canvas: {
        flex: 1,
    },
});