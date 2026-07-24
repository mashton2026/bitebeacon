import React from "react";
import {
    StyleProp,
    StyleSheet,
    Text,
    TextProps,
    TextStyle,
} from "react-native";
import { typography } from "../constants/typography";

type AppTextVariant =
    | "heading"
    | "title"
    | "subtitle"
    | "body"
    | "bodyBold"
    | "button"
    | "label";

type AppTextProps = TextProps & {
    variant?: AppTextVariant;
    style?: StyleProp<TextStyle>;
};

export default function AppText({
    variant = "body",
    style,
    ...props
}: AppTextProps) {
    return (
        <Text
            {...props}
            style={[
                styles.base,
                styles[variant],
                style,
            ]}
        />
    );
}

const styles = StyleSheet.create({
    base: {
        color: "#FFFFFF",
    },

    heading: {
        fontFamily: typography.heading,
    },

    title: {
        fontFamily: typography.title,
    },

    subtitle: {
        fontFamily: typography.subtitle,
    },

    body: {
        fontFamily: typography.body,
    },

    bodyBold: {
        fontFamily: typography.bodyBold,
    },

    button: {
        fontFamily: typography.button,
    },

    label: {
        fontFamily: typography.label,
    },
});