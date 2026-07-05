import React from "react";
import {
    Pressable,
    PressableProps,
    StyleProp,
    StyleSheet,
    Text,
    ViewStyle,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";

type PrimaryButtonProps = PressableProps & {
    children: React.ReactNode;
    style?: StyleProp<ViewStyle>;
};

export default function PrimaryButton({
    children,
    disabled,
    style,
    ...props
}: PrimaryButtonProps) {
    return (
        <Pressable
            {...props}
            disabled={disabled}
            style={[style, disabled && styles.disabled]}
        >
            <LinearGradient
                colors={["#FF9A1F", "#FF7A00", "#E85D00"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.button}
            >
                <Text style={styles.text}>{children}</Text>
            </LinearGradient>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    button: {
        paddingVertical: 16,
        borderRadius: 18,
        alignItems: "center",
        justifyContent: "center",
    },

    text: {
        color: "#FFFFFF",
        fontSize: 16,
        fontWeight: "900",
    },

    disabled: {
        opacity: 0.6,
    },
});