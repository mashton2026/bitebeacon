import { router } from "expo-router";
import { useEffect } from "react";
import { Text, View } from "react-native";
import { supabase } from "../../lib/supabase";

export default function AuthCallback() {
    useEffect(() => {
        async function handleAuth() {
            const { data } = await supabase.auth.getSession();

            if (data.session) {
                router.replace("/(tabs)");
            } else {
                router.replace("/auth/user-login");
            }
        }

        handleAuth();
    }, []);

    return (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
            <Text>Signing you in...</Text>
        </View>
    );
}