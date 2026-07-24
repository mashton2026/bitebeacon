import React from "react";
import {
    Pressable,
    PressableProps,
    StyleProp,
    StyleSheet,
    ViewStyle,
} from "react-native";
import AppText from "./AppText";

type SecondaryButtonProps = PressableProps & {
    children: React.ReactNode;
    style?: StyleProp<ViewStyle>;
};

export default function SecondaryButton({
    children,
    disabled,
    style,
    ...props
}: SecondaryButtonProps) {
    return (
        <Pressable
            {...props}
            disabled={disabled}
            style={[
                styles.button,
                style,
                disabled && styles.disabled,
            ]}
        >
            <AppText variant="button" style={styles.text}>
                {children}
            </AppText>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    button: {
        backgroundColor: "rgba(18,22,28,0.95)",

        borderWidth: 1.5,
        borderColor: "#D67A1E",

        borderRadius: 18,

        paddingVertical: 16,

        alignItems: "center",

        marginTop: 14,
    },

    text: {
        color: "#FFFFFF",
        fontSize: 16,
    },

    disabled: {
        opacity: 0.6,
    },
});