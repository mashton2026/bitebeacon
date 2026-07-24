import { LinearGradient } from "expo-linear-gradient";
import { ReactNode } from "react";
import { StyleSheet, View } from "react-native";

type PremiumCardProps = {
    children: ReactNode;
};

export default function PremiumCard({ children }: PremiumCardProps) {
    return (
        <View style={styles.outerGlow}>
            <LinearGradient
                colors={[
                    "#8F4700",
                    "#FFB547",
                    "#FF7A00",
                    "#FFB547",
                    "#8F4700",
                ]}
                style={styles.borderWrap}
            >
                <View style={styles.card}>
                    <View style={styles.innerHighlight}>
                        {children}
                    </View>
                </View>
            </LinearGradient>
        </View>
    );
}

const styles = StyleSheet.create({
    outerGlow: {
        borderRadius: 36,

        shadowColor: "#FF7A00",
        shadowOpacity: 0.12,
        shadowRadius: 14,
        shadowOffset: {
            width: 0,
            height: 8,
        },

        elevation: 10,
    },

    borderWrap: {
        borderRadius: 36,
        padding: 2,
    },

    card: {
        borderRadius: 34,
        backgroundColor: "rgba(8,12,18,0.94)",
    },

    innerHighlight: {
        borderRadius: 34,
        padding: 16,

        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.06)",
    },
});