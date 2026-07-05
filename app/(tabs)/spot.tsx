import { router, useFocusEffect } from "expo-router";
import { useCallback } from "react";
import { View } from "react-native";

export default function SpotTabRedirect() {
    useFocusEffect(
        useCallback(() => {
            router.replace({
                pathname: "/(tabs)/explore",
                params: { spotMode: "true" },
            });
        }, [])
    );

    return <View style={{ flex: 1, backgroundColor: "#0B2A5B" }} />;
}