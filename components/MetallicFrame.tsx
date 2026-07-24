import {
    Canvas,
    LinearGradient,
    RoundedRect,
    vec,
} from "@shopify/react-native-skia";
import {
    type PropsWithChildren,
    useState,
} from "react";
import {
    StyleSheet,
    useWindowDimensions,
    View,
    type StyleProp,
    type ViewStyle,
} from "react-native";

type MetallicTone = "gold" | "blue";

type Props = PropsWithChildren<{
    tone?: MetallicTone;
    borderRadius?: number;
    borderWidth?: number;
    style?: StyleProp<ViewStyle>;
    contentStyle?: StyleProp<ViewStyle>;
}>;

const METALLIC_COLORS: Record<MetallicTone, string[]> = {
    gold: [
        "#3D2204",
        "#8F5A10",
        "#D89A27",
        "#FFE29A",
        "#FFF5D2",
        "#C98516",
        "#4B2A06",
    ],
    blue: [
        "#04111F",
        "#0E3F6A",
        "#56B8FF",
        "#BCE8FF",
        "#4BAFFF",
        "#0D4D82",
        "#04111F",
    ],
};

export default function MetallicFrame({
    children,
    tone = "gold",
    borderRadius = 24,
    borderWidth = 2,
    style,
    contentStyle,
}: Props) {
    const { width: screenWidth } = useWindowDimensions();

    const [size, setSize] = useState({
        width: screenWidth,
        height: 1,
    });

    /*
     * This is only an initial drawing width.
     * The Canvas stretches with the parent container.
     */
    const drawingWidth = size.width;
    const drawingHeight = size.height;

    return (
        <View
            onLayout={(e) => {
                const { width, height } = e.nativeEvent.layout;
                setSize({ width, height });
            }}
            style={[
                styles.container,
                {
                    borderRadius,
                },
                style,
            ]}
        >
            <Canvas
                pointerEvents="none"
                style={StyleSheet.absoluteFill}
            >
                <RoundedRect
                    x={1}
                    y={1}
                    width={Math.max(drawingWidth - 2, 1)}
                    height={Math.max(drawingHeight - 2, 1)}
                    r={borderRadius}
                >
                    <LinearGradient
                        start={vec(0, 0)}
                        end={vec(drawingWidth, drawingHeight * 0.65)}
                        colors={METALLIC_COLORS[tone]}
                        positions={[0, 0.16, 0.32, 0.48, 0.64, 0.82, 1]}
                    />
                </RoundedRect>

                <RoundedRect
                    x={2}
                    y={2}
                    width={Math.max(drawingWidth - 4, 0)}
                    height={6}
                    r={6}
                >
                    <LinearGradient
                        start={vec(0, 0)}
                        end={vec(drawingWidth, 0)}
                        colors={[
                            "rgba(255,255,255,0)",
                            "rgba(255,255,255,0.75)",
                            "rgba(255,255,255,0)",
                        ]}
                    />
                </RoundedRect>
            </Canvas>

            <View
                style={[
                    styles.content,
                    {
                        margin: borderWidth + 1,
                        borderRadius: Math.max(
                            borderRadius - borderWidth,
                            0
                        ),
                    },
                    contentStyle,
                ]}
            >
                {children}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: "relative",
        overflow: "hidden",

        shadowColor: "#38A9FF",
        shadowOpacity: 0.28,
        shadowRadius: 12,
        shadowOffset: {
            width: 0,
            height: 0,
        },

        elevation: 6,
    },

    content: {
        flex: 1,
        overflow: "hidden",
        backgroundColor: "rgba(7,20,33,0.97)",
    },
});