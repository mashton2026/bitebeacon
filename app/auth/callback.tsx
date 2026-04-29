import { router, useLocalSearchParams } from "expo-router";
import { useEffect } from "react";
import { Text, View } from "react-native";
import { supabase } from "../../lib/supabase";
import { getVendorByOwnerId } from "../../services/vendorService";

export default function AuthCallback() {
    const { type } = useLocalSearchParams();

    useEffect(() => {
        async function handleAuth() {
            const { data, error } = await supabase.auth.getSession();

            if (error || !data.session) {
                if (type === "vendor") {
                    router.replace("/auth/login");
                } else {
                    router.replace("/auth/user-login");
                }
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
    }, [type]);

    return (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
            <Text>Signing you in...</Text>
        </View>
    );
}