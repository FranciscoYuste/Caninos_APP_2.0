import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// Comprobación común de los endpoints /api/admin: sesión iniciada y rol "admin".
export async function requireAdmin() {
    const sessionClient = await createSupabaseServerClient();
    const { data: { user } } = await sessionClient.auth.getUser();
    if (!user) return { response: NextResponse.json({ error: "Inicia sesión para continuar." }, { status: 401 }) };

    const adminClient = createSupabaseAdminClient();
    const { data: profile, error: profileError } = await adminClient
        .from("perfiles").select("rol").eq("id", user.id).single();
    if (profileError || profile?.rol !== "admin") {
        return { response: NextResponse.json({ error: "Se requiere el rol de administrador." }, { status: 403 }) };
    }
    return { adminClient };
}
