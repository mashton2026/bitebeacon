import {
    BlurMask,
    Canvas,
    Circle,
    Group,
    Line,
    Path,
    RadialGradient,
    SweepGradient,
    vec,
} from "@shopify/react-native-skia";
import { useEffect, useMemo } from "react";
import { StyleSheet, View } from "react-native";
import {
    cancelAnimation,
    Easing,
    type SharedValue,
    useDerivedValue,
    useSharedValue,
    withRepeat,
    withTiming,
} from "react-native-reanimated";

const SIZE = 240;
const CENTRE = SIZE / 2;
const TWO_PI = Math.PI * 2;

const SWEEP_DURATION = 6500;
const LEADING_ANGLE = -32 * (Math.PI / 180);

const RADAR_RADIUS = 105;
const RINGS = [28, 50, 72, 94];
const PHOSPHOR_NOISE_COUNT = 24;

type RadarContactProps = {
    x: number;
    y: number;
    rotation: SharedValue<number>;
    size?: number;
    strength?: number;
    baseOpacity?: number;
};

type RingHighlight = {
    key: string;
    path: string;
    opacity: number;
    strokeWidth: number;
};

function normaliseAngle(angle: number) {
    "worklet";

    const normalised = angle % TWO_PI;
    return normalised < 0 ? normalised + TWO_PI : normalised;
}

function polarPoint(angle: number, radius: number) {
    return {
        x: CENTRE + Math.cos(angle) * radius,
        y: CENTRE + Math.sin(angle) * radius,
    };
}

function createArcPath(
    radius: number,
    startAngle: number,
    endAngle: number
) {
    const start = polarPoint(startAngle, radius);
    const end = polarPoint(endAngle, radius);

    const angularDistance = Math.abs(endAngle - startAngle);
    const largeArcFlag = angularDistance > Math.PI ? 1 : 0;

    return [
        `M ${start.x} ${start.y}`,
        `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`,
    ].join(" ");
}

function RadarContact({
    x,
    y,
    rotation,
    size = 2.8,
    strength = 1,
    baseOpacity = 0.18,
}: RadarContactProps) {
    const contactAngle = Math.atan2(y - CENTRE, x - CENTRE);

    /*
     * Measures how far the leading edge has travelled after passing
     * the contact. Zero means the beam is directly over the contact.
     */
    const angularDistanceSincePass = useDerivedValue(() => {
        const beamAngle = normaliseAngle(
            rotation.value + LEADING_ANGLE
        );

        const targetAngle = normaliseAngle(contactAngle);

        return normaliseAngle(beamAngle - targetAngle);
    });

    /*
     * Contacts stay illuminated for a short distance after detection.
     * This produces a flash followed by a phosphor-style decay.
     */
    const response = useDerivedValue(() => {
        const distance = angularDistanceSincePass.value;
        const activeRange = 1.05;

        if (distance > activeRange) {
            return 0;
        }

        const progress = 1 - distance / activeRange;

        return Math.pow(progress, 2.25);
    });

    const coreOpacity = useDerivedValue(() => {
        return Math.min(
            1,
            baseOpacity + response.value * 0.86 * strength
        );
    });

    const glowOpacity = useDerivedValue(() => {
        return response.value * 0.62 * strength;
    });

    const haloOpacity = useDerivedValue(() => {
        return response.value * 0.28 * strength;
    });

    const whiteCoreOpacity = useDerivedValue(() => {
        return Math.pow(response.value, 1.7);
    });

    const coreRadius = useDerivedValue(() => {
        return size + response.value * (0.8 + size * 0.28);
    });

    const glowRadius = useDerivedValue(() => {
        return size * 2.2 + response.value * 4.8;
    });

    const haloRadius = useDerivedValue(() => {
        return size * 3.8 + response.value * 7.5;
    });

    const echoOpacity = useDerivedValue(() => {
        return response.value * 0.12 * strength;
    });

    const echoRadius = useDerivedValue(() => {
        return size * 5.2 + response.value * 5;
    });

    return (
        <Group>

            {/* Soft residual echo */}
            <Circle
                cx={x}
                cy={y}
                r={echoRadius}
                color="rgba(82,190,255,1)"
                opacity={echoOpacity}
            >
                <BlurMask blur={14} style="normal" />
            </Circle>

            {/* Wide atmospheric detection bloom */}
            <Circle
                cx={x}
                cy={y}
                r={haloRadius}
                color="rgba(65,174,255,1)"
                opacity={haloOpacity}
            >
                <BlurMask blur={10} style="normal" />
            </Circle>

            {/* Concentrated contact glow */}
            <Circle
                cx={x}
                cy={y}
                r={glowRadius}
                color="rgba(89,198,255,1)"
                opacity={glowOpacity}
            >
                <BlurMask blur={5} style="normal" />
            </Circle>

            {/* Faint persistent idle glow */}
            <Circle
                cx={x}
                cy={y}
                r={size * 1.75}
                color="rgba(118,220,255,1)"
                opacity={baseOpacity * 0.7}
            >
                <BlurMask blur={5} style="normal" />
            </Circle>

            {/* Crisp persistent contact */}
            <Circle
                cx={x}
                cy={y}
                r={coreRadius}
                color="rgba(218,246,255,1)"
                opacity={coreOpacity}
            />

            {/* White detection flash */}
            <Circle
                cx={x}
                cy={y}
                r={size * 0.44}
                color="rgba(255,255,255,1)"
                opacity={whiteCoreOpacity}
            />
        </Group>
    );
}

export default function HeroRadar() {
    const rotation = useSharedValue(0);
    const centrePulse = useSharedValue(0);

    const ringHighlights = useMemo<RingHighlight[]>(() => {
        return RINGS.flatMap((radius, ringIndex) => {
            const segments = [
                {
                    startDegrees: -14,
                    endDegrees: 1,
                    opacity: 0.24,
                    strokeWidth: 1.25,
                },
                {
                    startDegrees: -30,
                    endDegrees: -14,
                    opacity: 0.11,
                    strokeWidth: 1.05,
                },
                {
                    startDegrees: -48,
                    endDegrees: -30,
                    opacity: 0.045,
                    strokeWidth: 0.85,
                },
            ];

            return segments.map((segment, segmentIndex) => {
                const startAngle =
                    LEADING_ANGLE +
                    segment.startDegrees * (Math.PI / 180);

                const endAngle =
                    LEADING_ANGLE +
                    segment.endDegrees * (Math.PI / 180);

                return {
                    key: `${ringIndex}-${segmentIndex}`,
                    path: createArcPath(
                        radius,
                        startAngle,
                        endAngle
                    ),
                    opacity:
                        segment.opacity *
                        (0.82 + ringIndex * 0.055),
                    strokeWidth: segment.strokeWidth,
                };
            });
        });
    }, []);

    const phosphorNoise = useMemo(() => {
        return Array.from({ length: PHOSPHOR_NOISE_COUNT }, (_, i) => {
            const angle = Math.random() * TWO_PI;
            const radius =
                Math.sqrt(Math.random()) * (RADAR_RADIUS - 10);

            return {
                key: i,
                x: CENTRE + Math.cos(angle) * radius,
                y: CENTRE + Math.sin(angle) * radius,
                r: 0.35 + Math.random() * 1.1,
                opacity: 0.01 + Math.random() * 0.04,
                blur: Math.random() < 0.3 ? 1.2 : 0,
            };
        });
    }, []);

    useEffect(() => {
        rotation.value = withRepeat(
            withTiming(TWO_PI, {
                duration: SWEEP_DURATION,
                easing: Easing.linear,
            }),
            -1,
            false
        );

        centrePulse.value = withRepeat(
            withTiming(1, {
                duration: 2300,
                easing: Easing.inOut(Easing.sin),
            }),
            -1,
            true
        );

        return () => {
            cancelAnimation(rotation);
            cancelAnimation(centrePulse);
        };
    }, [centrePulse, rotation]);

    const sweepTransform = useDerivedValue(() => [
        { rotate: rotation.value },
    ]);

    const centreGlowOpacity = useDerivedValue(() => {
        return 0.2 + centrePulse.value * 0.16;
    });

    const centreGlowRadius = useDerivedValue(() => {
        return 16 + centrePulse.value * 4;
    });

    const innerPulseOpacity = useDerivedValue(() => {
        return 0.16 + centrePulse.value * 0.1;
    });

    const innerPulseRadius = useDerivedValue(() => {
        return 6.8 + centrePulse.value * 1.2;
    });

    const leadingBeamEnd = polarPoint(
        LEADING_ANGLE,
        RADAR_RADIUS
    );

    const emitterBeamEnd = polarPoint(
        LEADING_ANGLE,
        42
    );

    return (
        <View style={styles.container} pointerEvents="none">
            <Canvas style={styles.canvas}>
                {/* Deep atmospheric radar illumination */}
                <Circle
                    cx={CENTRE}
                    cy={CENTRE}
                    r={116}
                >
                    <RadialGradient
                        c={vec(CENTRE, CENTRE)}
                        r={116}
                        colors={[
                            "rgba(73,164,238,0.15)",
                            "rgba(29,94,163,0.06)",
                            "rgba(4,20,38,0)",
                        ]}
                        positions={[0, 0.58, 1]}
                    />
                </Circle>

                {/* Soft outer optical bloom */}
                <Circle
                    cx={CENTRE}
                    cy={CENTRE}
                    r={100}
                    color="rgba(83,177,245,0.09)"
                    style="stroke"
                    strokeWidth={4}
                >
                    <BlurMask blur={13} style="normal" />
                </Circle>

                {/* Precision range rings */}
                {RINGS.map((radius, index) => (
                    <Circle
                        key={radius}
                        cx={CENTRE}
                        cy={CENTRE}
                        r={radius}
                        color={
                            index === RINGS.length - 1
                                ? "rgba(150,218,255,0.22)"
                                : "rgba(132,210,255,0.16)"
                        }
                        style="stroke"
                        strokeWidth={
                            index === RINGS.length - 1
                                ? 0.95
                                : 0.7
                        }
                    />
                ))}

                {/* Secondary calibration ring */}
                <Circle
                    cx={CENTRE}
                    cy={CENTRE}
                    r={104}
                    color="rgba(130,204,255,0.07)"
                    style="stroke"
                    strokeWidth={0.65}
                />

                {/* Restrained crosshair */}
                <Group color="rgba(155,218,255,0.085)">
                    <Line
                        p1={vec(CENTRE, 15)}
                        p2={vec(CENTRE, SIZE - 15)}
                        strokeWidth={0.65}
                    />

                    <Line
                        p1={vec(15, CENTRE)}
                        p2={vec(SIZE - 15, CENTRE)}
                        strokeWidth={0.65}
                    />
                </Group>

                {/* Fine calibration ticks */}
                <Group color="rgba(174,226,255,0.15)">
                    <Line
                        p1={vec(CENTRE, 16)}
                        p2={vec(CENTRE, 25)}
                        strokeWidth={0.9}
                    />

                    <Line
                        p1={vec(CENTRE, SIZE - 16)}
                        p2={vec(CENTRE, SIZE - 25)}
                        strokeWidth={0.9}
                    />

                    <Line
                        p1={vec(16, CENTRE)}
                        p2={vec(25, CENTRE)}
                        strokeWidth={0.9}
                    />

                    <Line
                        p1={vec(SIZE - 16, CENTRE)}
                        p2={vec(SIZE - 25, CENTRE)}
                        strokeWidth={0.9}
                    />
                </Group>

                {/* Fixed low-level phosphor texture */}
                <Group>
                    {phosphorNoise.map((speck) => (
                        <Circle
                            key={speck.key}
                            cx={speck.x}
                            cy={speck.y}
                            r={speck.r}
                            color="rgba(133,215,255,1)"
                            opacity={speck.opacity}
                        >
                            {speck.blur > 0 && (
                                <BlurMask
                                    blur={speck.blur}
                                    style="normal"
                                />
                            )}
                        </Circle>
                    ))}
                </Group>

                {/* Rotating beam, trail and ring illumination */}
                <Group
                    origin={vec(CENTRE, CENTRE)}
                    transform={sweepTransform}
                >
                    {/* Continuous phosphor sweep — no visible segments */}
                    <Group
                        origin={vec(CENTRE, CENTRE)}
                        transform={[{ rotate: LEADING_ANGLE }]}
                    >
                        {/* Wide diffused energy behind the sweep */}
                        <Circle
                            cx={CENTRE}
                            cy={CENTRE}
                            r={RADAR_RADIUS}
                            opacity={0.62}
                        >
                            <SweepGradient
                                c={vec(CENTRE, CENTRE)}
                                colors={[
                                    "rgba(82,191,255,0)",
                                    "rgba(82,191,255,0.01)",
                                    "rgba(82,191,255,0.03)",
                                    "rgba(82,191,255,0.06)",
                                    "rgba(82,191,255,0.11)",
                                    "rgba(98,206,255,0.18)",
                                    "rgba(130,222,255,0.28)",
                                    "rgba(175,238,255,0.36)",
                                ]}
                                positions={[
                                    0,
                                    0.785,
                                    0.81,
                                    0.84,
                                    0.88,
                                    0.92,
                                    0.965,
                                    1,
                                ]}
                            />

                            <BlurMask blur={9} style="normal" />
                        </Circle>

                        {/* Sharper phosphor body */}
                        <Circle
                            cx={CENTRE}
                            cy={CENTRE}
                            r={RADAR_RADIUS}
                            opacity={0.82}
                        >
                            <SweepGradient
                                c={vec(CENTRE, CENTRE)}
                                colors={[
                                    "rgba(74,182,248,0)",
                                    "rgba(74,182,248,0)",
                                    "rgba(74,182,248,0.018)",
                                    "rgba(84,194,255,0.05)",
                                    "rgba(108,214,255,0.11)",
                                    "rgba(148,228,255,0.24)",
                                    "rgba(205,246,255,0.42)",
                                    "rgba(255,255,255,0.55)",
                                ]}
                                positions={[
                                    0,
                                    0.66,
                                    0.74,
                                    0.82,
                                    0.90,
                                    0.955,
                                    0.988,
                                    1,
                                ]}
                            />
                        </Circle>
                    </Group>

                    {/* Soft atmospheric bloom immediately behind beam */}
                    <Line
                        p1={vec(CENTRE, CENTRE)}
                        p2={vec(
                            leadingBeamEnd.x,
                            leadingBeamEnd.y
                        )}
                        color="rgba(72,183,255,0.19)"
                        strokeWidth={7}
                        strokeCap="round"
                    >
                        <BlurMask blur={10} style="normal" />
                    </Line>

                    {/* Rotating highlights across the range rings */}
                    {ringHighlights.map((highlight) => (
                        <Path
                            key={highlight.key}
                            path={highlight.path}
                            color="rgba(176,229,255,1)"
                            opacity={highlight.opacity}
                            style="stroke"
                            strokeWidth={highlight.strokeWidth}
                            strokeCap="round"
                        />
                    ))}

                    {/* Narrow blue body of the leading beam */}
                    <Line
                        p1={vec(CENTRE, CENTRE)}
                        p2={vec(
                            leadingBeamEnd.x,
                            leadingBeamEnd.y
                        )}
                        color="rgba(120,214,255,0.55)"
                        strokeWidth={2.2}
                        strokeCap="round"
                    >
                        <BlurMask blur={4.5} style="normal" />
                    </Line>

                    {/* Crisp white leading scan edge */}
                    <Line
                        p1={vec(CENTRE, CENTRE)}
                        p2={vec(
                            leadingBeamEnd.x,
                            leadingBeamEnd.y
                        )}
                        color="rgba(232,250,255,0.94)"
                        strokeWidth={1}
                        strokeCap="round"
                    />

                    {/* Concentrated illumination near emitter */}
                    <Line
                        p1={vec(CENTRE, CENTRE)}
                        p2={vec(
                            emitterBeamEnd.x,
                            emitterBeamEnd.y
                        )}
                        color="rgba(214,244,255,0.52)"
                        strokeWidth={4}
                        strokeCap="round"
                    >
                        <BlurMask blur={6} style="normal" />
                    </Line>
                </Group>

                {/* Subtle edge vignette */}
                <Circle
                    cx={CENTRE}
                    cy={CENTRE}
                    r={RADAR_RADIUS + 3}
                >
                    <RadialGradient
                        c={vec(CENTRE, CENTRE)}
                        r={RADAR_RADIUS + 3}
                        colors={[
                            "rgba(0,0,0,0)",
                            "rgba(0,0,0,0)",
                            "rgba(0,0,0,0.04)",
                            "rgba(0,0,0,0.12)",
                        ]}
                        positions={[0, 0.78, 0.92, 1]}
                    />
                </Circle>

                {/*
                 * Contacts are drawn above the sweep so they flare clearly
                 * as the leading edge passes over them.
                 */}
                <RadarContact
                    x={77}
                    y={153}
                    rotation={rotation}
                    size={3}
                    strength={1}
                    baseOpacity={0.12}
                />

                <RadarContact
                    x={172}
                    y={90}
                    rotation={rotation}
                    size={2.6}
                    strength={0.88}
                    baseOpacity={0.1}
                />

                <RadarContact
                    x={64}
                    y={119}
                    rotation={rotation}
                    size={2.2}
                    strength={0.72}
                    baseOpacity={0.08}
                />

                <RadarContact
                    x={145}
                    y={163}
                    rotation={rotation}
                    size={1.9}
                    strength={0.62}
                    baseOpacity={0.07}
                />

                <RadarContact
                    x={154}
                    y={67}
                    rotation={rotation}
                    size={2.3}
                    strength={0.78}
                    baseOpacity={0.08}
                />

                <RadarContact
                    x={96}
                    y={83}
                    rotation={rotation}
                    size={1.8}
                    strength={0.58}
                    baseOpacity={0.06}
                />

                <RadarContact
                    x={190}
                    y={132}
                    rotation={rotation}
                    size={2.1}
                    strength={0.7}
                    baseOpacity={0.07}
                />

                <RadarContact
                    x={111}
                    y={187}
                    rotation={rotation}
                    size={1.7}
                    strength={0.52}
                    baseOpacity={0.05}
                />

                <RadarContact
                    x={49}
                    y={91}
                    rotation={rotation}
                    size={1.9}
                    strength={0.61}
                    baseOpacity={0.06}
                />

                <RadarContact
                    x={133}
                    y={45}
                    rotation={rotation}
                    size={1.65}
                    strength={0.48}
                    baseOpacity={0.045}
                />

                <RadarContact
                    x={180}
                    y={169}
                    rotation={rotation}
                    size={1.75}
                    strength={0.56}
                    baseOpacity={0.05}
                />

                <RadarContact
                    x={84}
                    y={194}
                    rotation={rotation}
                    size={1.55}
                    strength={0.46}
                    baseOpacity={0.04}
                />

                {/* Refined central emitter bloom */}
                <Circle
                    cx={CENTRE}
                    cy={CENTRE}
                    r={centreGlowRadius}
                    color="rgba(63,173,255,1)"
                    opacity={centreGlowOpacity}
                >
                    <BlurMask blur={12} style="normal" />
                </Circle>

                {/* Pulsing inner emitter ring */}
                <Circle
                    cx={CENTRE}
                    cy={CENTRE}
                    r={innerPulseRadius}
                    color="rgba(109,204,255,1)"
                    opacity={innerPulseOpacity}
                    style="stroke"
                    strokeWidth={1}
                />

                {/* Emitter body */}
                <Circle
                    cx={CENTRE}
                    cy={CENTRE}
                    r={7}
                    color="rgba(89,188,255,0.2)"
                />

                {/* Bright central core */}
                <Circle
                    cx={CENTRE}
                    cy={CENTRE}
                    r={3.5}
                    color="rgba(236,250,255,0.98)"
                />

                {/* Small optical highlight */}
                <Circle
                    cx={CENTRE - 0.8}
                    cy={CENTRE - 0.8}
                    r={1.2}
                    color="rgba(255,255,255,0.95)"
                />
            </Canvas>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: SIZE,
        height: SIZE,
    },

    canvas: {
        flex: 1,
    },
});