import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { Image, StyleSheet, View } from "react-native";
import { typography } from "../constants/typography";
import AppText from "./AppText";

type HeroHeaderProps = {
    kicker: string;
    title: string;
    subtitle: string;
    showLogo?: boolean;
};

export default function HeroHeader({
    kicker,
    title,
    subtitle,
    showLogo = true,
}: HeroHeaderProps) {
    return (
        <View style={styles.heroBlock}>
            {showLogo ? (
                <Image
                    source={require("../assets/images/bitebeacon-logo-full.png")}
                    style={styles.logo}
                    resizeMode="contain"
                />
            ) : null}

            <LinearGradient
                colors={["#B94A00", "#FFB547", "#FF7A00", "#B94A00"]}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={styles.heroAccent}
            />

            <AppText variant="label" style={styles.kicker}>
                {kicker}
            </AppText>
            <AppText variant="heading" style={styles.title}>
                {title}
            </AppText>
            <AppText variant="body" style={styles.subtitle}>
                {subtitle}
            </AppText>
        </View>
    );
}

const styles = StyleSheet.create({
    heroBlock: {
        marginTop: 10,
        marginBottom: 10,
        alignItems: "center",
    },

    logo: {
        width: 235,
        height: 118,
        marginBottom: 10,
    },

    heroAccent: {
        width: 72,
        height: 5,
        borderRadius: 999,
        marginBottom: 22,

        shadowColor: "#FFA126",
        shadowOpacity: 0.45,
        shadowRadius: 14,
        shadowOffset: {
            width: 0,
            height: 0,
        },

        elevation: 8,
    },

    kicker: {
        fontSize: 12,
        fontFamily: typography.label,
        letterSpacing: 3,
        color: "#FFB547",
        textAlign: "center",
        marginBottom: 12,
    },

    title: {
        fontSize: 30,
        fontFamily: typography.heading,
        color: "#FFFFFF",
        textAlign: "center",
        marginBottom: 10,
    },

    subtitle: {
        fontSize: 15,
        fontFamily: typography.body,
        lineHeight: 24,
        color: "rgba(255,255,255,0.82)",
        textAlign: "center",
        maxWidth: 300,
        marginBottom: -8,
    },
});