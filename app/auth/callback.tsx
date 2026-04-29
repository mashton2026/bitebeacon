import { router, useLocalSearchParams } from "expo-router";
import { useEffect } from "react";
import { Text, View } from "react-native";
import { supabase } from "../../lib/supabase";
import { getVendorByOwnerId } from "../../services/vendorService";

export default function AuthCallback() {
    const { type, code } = useLocalSearchParams();

    useEffect(() => {
        let handled = false;

        async function handleAuth() {
            if (handled) return;
            handled = true;

            if (typeof code === "string") {
                await supabase.auth.exchangeCodeForSession(code);
            }

            const { data, error } = await supabase.auth.getSession();

            if (error || !data.session) {
                router.replace(type === "vendor" ? "/auth/login" : "/auth/user-login");
                return;
            }

            const user = data.session.user;

            if (type === "vendor") {
                const vendor = await getVendorByOwnerId(user.id);

                if (vendor) {
                    router.replace({
                        pathname: "/vendor/dashboard",
                        params: { id: vendor.id },
                    });
                    return;
                }

                router.replace("/vendor/claim-select");
                return;
            }

            router.replace("/(tabs)");
        }

        handleAuth();
    }, [type, code]);

    return (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
            <Text>Signing you in...</Text>
        </View>
    );
}