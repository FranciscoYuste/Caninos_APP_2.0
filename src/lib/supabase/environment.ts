import { getCloudflareContext } from "@opennextjs/cloudflare";

declare global {
    interface CloudflareEnv {
        NEXT_PUBLIC_SUPABASE_URL?: string;
        NEXT_PUBLIC_SUPABASE_ANON_KEY?: string;
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?: string;
        SUPABASE_SERVICE_ROLE_KEY?: string;
    }
}

export function getSupabaseEnvironment() {
    const runtimeEnv = getCloudflareContext().env;

    return {
        url: runtimeEnv.NEXT_PUBLIC_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL,
        publicKey: runtimeEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY
            ?? runtimeEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
            ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
            ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
        serviceRoleKey: runtimeEnv.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY,
    };
}
