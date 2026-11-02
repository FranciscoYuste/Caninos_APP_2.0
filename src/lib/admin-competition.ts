import type { SupabaseClient } from "@supabase/supabase-js";
import { COMPETITION_COLUMNS, toCompetition, type Competition, type CompetitionRow } from "@/lib/competition-data";
import type { ImportContext } from "@/lib/imports/parse-jornada";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Utilidades del admin (cliente con service role). Las rutas reciben la competición por su id.
export async function loadAdminCompetitions(adminClient: SupabaseClient): Promise<Competition[]> {
    const { data, error } = await adminClient.from("competiciones").select(COMPETITION_COLUMNS)
        .order("temporada", { ascending: false }).order("orden");
    if (error) throw new Error("No se pudieron consultar las competiciones.");
    return ((data ?? []) as CompetitionRow[]).flatMap((row) => toCompetition(row) ?? []);
}

export async function loadAdminCompetition(adminClient: SupabaseClient, id: unknown): Promise<Competition | null> {
    if (typeof id !== "string" || !UUID_PATTERN.test(id)) return null;
    const { data, error } = await adminClient.from("competiciones").select(COMPETITION_COLUMNS).eq("id", id).maybeSingle();
    if (error) throw new Error("No se pudo consultar la competición.");
    return data ? toCompetition(data as CompetitionRow) : null;
}

// Indica si un partido pertenece a alguna competición dada de alta.
export async function isManagedMatch(adminClient: SupabaseClient, match: { temporada: string; fase: string; grupo: string }): Promise<boolean> {
    const { count, error } = await adminClient.from("competiciones").select("id", { count: "exact", head: true })
        .eq("temporada", match.temporada).eq("fase", match.fase).eq("grupo", match.grupo);
    if (error) throw new Error("No se pudo consultar la competición del partido.");
    return (count ?? 0) > 0;
}

export async function loadImportContext(adminClient: SupabaseClient, competition: Competition): Promise<ImportContext> {
    const { data, error } = await adminClient.from("equipos").select("codigo,nombre");
    if (error) throw new Error("No se pudieron consultar los equipos.");
    return { season: competition.season, teamCodes: Object.fromEntries((data ?? []).map((team) => [team.codigo, team.nombre])) };
}

export function assertSeason(fileSeason: string, competition: Competition) {
    if (fileSeason !== competition.season) {
        throw new Error(`El archivo es de la temporada ${fileSeason}, pero estás gestionando ${competition.name} ${competition.season}.`);
    }
}
