import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { loadAdminCompetition } from "@/lib/admin-competition";
import { COMPETITION_COLUMNS, type Competition } from "@/lib/competition-data";
import { isCompetitionPhase } from "@/lib/competitions";
import { requireAdmin } from "@/lib/supabase/require-admin";

export const runtime = "nodejs";

const STATUSES = ["pendiente", "en_curso", "finalizada"];

type CompetitionBody = {
    accion?: unknown; id?: unknown; temporada?: unknown; fase?: unknown; grupo?: unknown;
    nombre?: unknown; slug?: unknown; orden?: unknown; estado?: unknown;
};

function readFields(body: CompetitionBody) {
    const season = typeof body.temporada === "string" ? body.temporada.trim() : "";
    const phase = typeof body.fase === "string" ? body.fase : "";
    const group = typeof body.grupo === "string" ? body.grupo.trim() : "";
    const name = typeof body.nombre === "string" ? body.nombre.trim() : "";
    const slug = typeof body.slug === "string" ? body.slug.trim() : "";
    const order = typeof body.orden === "number" ? body.orden : Number.NaN;
    const status = typeof body.estado === "string" ? body.estado : "";

    const match = /^(\d{4})-(\d{4})$/.exec(season);
    if (!match || Number(match[2]) !== Number(match[1]) + 1) throw new Error("La temporada debe tener el formato 2026-2027.");
    if (!isCompetitionPhase(phase)) throw new Error("Tipo de competición no válido.");
    if (group.length > 80) throw new Error("El grupo no puede superar 80 caracteres.");
    if (!name || name.length > 80) throw new Error("El nombre es obligatorio (máximo 80 caracteres).");
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) || slug.length > 60) throw new Error("La dirección solo puede tener minúsculas, números y guiones (p. ej. liga-ascenso).");
    if (!Number.isInteger(order) || order < 0 || order > 99) throw new Error("El orden debe ser un número del 0 al 99.");
    if (!STATUSES.includes(status)) throw new Error("Estado no válido.");
    return { temporada: season, fase: phase, grupo: group, nombre: name, slug, orden: order, estado: status };
}

async function hasMatches(adminClient: SupabaseClient, competition: Competition): Promise<boolean> {
    const { count, error } = await adminClient.from("partidos").select("id", { count: "exact", head: true })
        .eq("temporada", competition.season).eq("fase", competition.phase).eq("grupo", competition.group);
    if (error) throw new Error("No se pudieron consultar los partidos de la competición.");
    return (count ?? 0) > 0;
}

function friendlyError(error: { code?: string; message: string }): string {
    if (error.code === "23505") {
        return error.message.includes("slug")
            ? "Ya existe otra competición con esa dirección en esta temporada."
            : "Ya existe una competición de ese tipo y grupo en esta temporada.";
    }
    return error.message;
}

// Alta, edición y baja de competiciones. Cambiar temporada, tipo o grupo, o borrarla, solo se
// permite mientras no tenga partidos: los datos cuelgan de esa combinación.
export async function POST(request: Request) {
    try {
        const authorization = await requireAdmin();
        if ("response" in authorization) return authorization.response;
        const { adminClient } = authorization;
        const body = await request.json() as CompetitionBody;

        if (body.accion === "crear") {
            const fields = readFields(body);
            const { data, error } = await adminClient.from("competiciones").insert(fields).select(COMPETITION_COLUMNS).single();
            if (error) return NextResponse.json({ error: friendlyError(error) }, { status: 422 });
            return NextResponse.json({ ok: true, competicion: data });
        }

        const current = await loadAdminCompetition(adminClient, body.id);
        if (!current) return NextResponse.json({ error: "La competición no existe." }, { status: 404 });

        if (body.accion === "actualizar") {
            const fields = readFields(body);
            const scopeChanged = fields.temporada !== current.season || fields.fase !== current.phase || fields.grupo !== current.group;
            if (scopeChanged && await hasMatches(adminClient, current)) {
                return NextResponse.json({ error: "Esta competición ya tiene partidos: no se puede cambiar su temporada, tipo ni grupo." }, { status: 409 });
            }
            const { data, error } = await adminClient.from("competiciones").update(fields).eq("id", current.id).select(COMPETITION_COLUMNS).single();
            if (error) return NextResponse.json({ error: friendlyError(error) }, { status: 422 });
            return NextResponse.json({ ok: true, competicion: data });
        }

        if (body.accion === "eliminar") {
            if (await hasMatches(adminClient, current)) {
                return NextResponse.json({ error: "Esta competición ya tiene partidos: márcala como finalizada en lugar de eliminarla." }, { status: 409 });
            }
            const { error } = await adminClient.from("competiciones").delete().eq("id", current.id);
            if (error) return NextResponse.json({ error: error.message }, { status: 422 });
            return NextResponse.json({ ok: true });
        }

        return NextResponse.json({ error: "Acción no válida." }, { status: 400 });
    } catch (error) {
        console.error("Competition update failed", error);
        const message = error instanceof Error ? error.message : "No se pudo guardar la competición.";
        return NextResponse.json({ error: message }, { status: 400 });
    }
}
