import { createClient } from "@supabase/supabase-js";
import { getSupabaseEnvironment } from "@/lib/supabase/environment";

export function createSupabaseAdminClient() {
    const { url, serviceRoleKey } = getSupabaseEnvironment();
    if (!url || !serviceRoleKey) throw new Error("Falta configurar Supabase en el servidor.");

    return createClient(url, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
    });
}