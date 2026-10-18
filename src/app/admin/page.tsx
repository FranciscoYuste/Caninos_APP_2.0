import { redirect } from "next/navigation";
import { AdminImporter } from "@/components/admin-importer";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function AdminPage() {
    const sessionClient = await createSupabaseServerClient();
    const { data: { user } } = await sessionClient.auth.getUser();
    if (!user) redirect("/login?next=%2Fadmin");

    const adminClient = createSupabaseAdminClient();
    const { data: profile } = await adminClient.from("perfiles").select("rol").eq("id", user.id).single();
    if (profile?.rol !== "admin") redirect("/");

    return <AdminImporter />;
}