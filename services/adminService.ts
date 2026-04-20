import { supabase } from "../lib/supabase";

export async function isCurrentUserAdmin(): Promise<boolean> {
    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user?.id) {
        return false;
    }

    const { data, error } = await supabase
        .from("admin_users")
        .select("user_id")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .maybeSingle();

    if (error) {
        throw new Error(error.message);
    }

    return Boolean(data);
}