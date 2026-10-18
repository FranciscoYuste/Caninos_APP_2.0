import { createServerClient, type SetAllCookies } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseEnvironment } from "@/lib/supabase/environment";

export async function createSupabaseServerClient() {
    const cookieStore = await cookies();
    const { url, publicKey } = getSupabaseEnvironment();

    if (!url || !publicKey) throw new Error("Faltan las variables públicas de Supabase en Cloudflare o .env.local.");

    return createServerClient(url, publicKey, {
        cookies: {
            getAll: () => cookieStore.getAll(),
            setAll: (cookiesToSet: Parameters<SetAllCookies>[0]) => {
                try {
                    cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
                } catch {
                    // Los Server Components no pueden escribir cookies.
                }
            },
        },
    });
}