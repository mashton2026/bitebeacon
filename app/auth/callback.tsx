import { router, useLocalSearchParams } from "expo-router";
import { useEffect } from "react";
import { Text, View } from "react-native";
import { supabase } from "../../lib/supabase";

export default function AuthCallback() {
    const { type } = useLocalSearchParams();

    useEffect(() => {
        async function handleAuth() {
            const { data } = await supabase.auth.getSession();

            if (data.session) {
                if (type === "vendor") {
                    router.replace("/vendor/claim-select");
                } else {
                    router.replace("/(tabs)");
                }
            } else {
                router.replace("/auth/user-login");
            }
        }

        handleAuth();
    }, [type]);

    return (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
            <Text>Signing you in...</Text>
        </View>
    );
}