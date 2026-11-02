import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/require-admin";

export const runtime = "nodejs";

type TeamBody = { accion?: unknown; codigo?: unknown; nombre?: unknown };

// Alta y baja de equipos rivales. El nombre no se puede cambiar: los partidos guardan el nombre
// como texto, así que renombrar dejaría resultados huérfanos. Solo se borran equipos sin partidos.
export async function POST(request: Request) {
    try {
        const authorization = await requireAdmin();
        if ("response" in authorization) return authorization.response;
        const { adminClient } = authorization;
        const body = await request.json() as TeamBody;
        const code = typeof body.codigo === "string" ? body.codigo.trim().toUpperCase() : "";
        if (!/^[A-Z0-9]{2,5}$/.test(code)) return NextResponse.json({ error: "El código debe tener de 2 a 5 letras o números (p. ej. BAY)." }, { status: 400 });

        if (body.accion === "crear") {
            const name = typeof body.nombre === "string" ? body.nombre.trim() : "";
            if (!name || name.length > 80) return NextResponse.json({ error: "El nombre es obligatorio (máximo 80 caracteres)." }, { status: 400 });
            const { data, error } = await adminClient.from("equipos").insert({ codigo: code, nombre: name }).select("codigo,nombre").single();
            if (error) {
                const message = error.code === "23505" ? "Ya existe un equipo con ese código o ese nombre." : error.message;
                return NextResponse.json({ error: message }, { status: 422 });
            }
            return NextResponse.json({ ok: true, equipo: data });
        }

        if (body.accion === "eliminar") {
            const { data: team, error: teamError } = await adminClient.from("equipos").select("nombre").eq("codigo", code).maybeSingle();
            if (teamError) throw new Error("No se pudo consultar el equipo.");
            if (!team) return NextResponse.json({ error: "El equipo no existe." }, { status: 404 });
            const counts = await Promise.all(["equipo_local", "equipo_visitante"].map((column) =>
                adminClient.from("partidos").select("id", { count: "exact", head: true }).eq(column, team.nombre)));
            if (counts.some((result) => result.error)) throw new Error("No se pudieron consultar los partidos del equipo.");
            if (counts.some((result) => (result.count ?? 0) > 0)) return NextResponse.json({ error: "Este equipo ya tiene partidos: no se puede eliminar." }, { status: 409 });
            const { error } = await adminClient.from("equipos").delete().eq("codigo", code);
            if (error) return NextResponse.json({ error: error.message }, { status: 422 });
            return NextResponse.json({ ok: true });
        }

        return NextResponse.json({ error: "Acción no válida." }, { status: 400 });
    } catch (error) {
        console.error("Team update failed", error);
        const message = error instanceof Error ? error.message : "No se pudo guardar el equipo.";
        return NextResponse.json({ error: message }, { status: 400 });
    }
}
