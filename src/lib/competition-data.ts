import { cache } from "react";
import { isCompetitionPhase, type CompetitionPhase } from "@/lib/competitions";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type CompetitionStatus = "pendiente" | "en_curso" | "finalizada";
export type Competition = {
    id: string;
    season: string;
    phase: CompetitionPhase;
    group: string;
    name: string;
    slug: string;
    order: number;
    status: CompetitionStatus;
};

export type CompetitionRow = { id: string; temporada: string; fase: string; grupo: string; nombre: string; slug: string; orden: number; estado: string };
export const COMPETITION_COLUMNS = "id,temporada,fase,grupo,nombre,slug,orden,estado";

export function toCompetition(row: CompetitionRow): Competition | null {
    if (!isCompetitionPhase(row.fase)) return null;
    return { id: row.id, season: row.temporada, phase: row.fase, group: row.grupo, name: row.nombre, slug: row.slug, order: row.orden, status: row.estado as CompetitionStatus };
}

// Respaldo mientras no exista la tabla competiciones (p. ej. antes de ejecutar la migración).
const FALLBACK_COMPETITIONS: Competition[] = [
    { id: "fallback", season: "2026-2027", phase: "campeon_invierno", group: "", name: "Liga de invierno", slug: "liga-invierno", order: 1, status: "en_curso" },
];

// Todas las competiciones: temporadas más recientes primero y, dentro de cada una, por orden.
export const getCompetitions = cache(async (): Promise<Competition[]> => {
    try {
        const supabase = await createSupabaseServerClient();
        const { data, error } = await supabase
            .from("competiciones")
            .select(COMPETITION_COLUMNS)
            .order("temporada", { ascending: false })
            .order("orden");
        if (error) throw error;
        const competitions = (data ?? []).flatMap((row) => toCompetition(row) ?? []);
        return competitions.length ? competitions : FALLBACK_COMPETITIONS;
    } catch (error) {
        if (error instanceof Error && "digest" in error && error.digest === "DYNAMIC_SERVER_USAGE") throw error;
        console.error("Could not load competitions, using fallback", error);
        return FALLBACK_COMPETITIONS;
    }
});

// La competición en curso de la temporada más reciente; si no hay ninguna, la primera de esa temporada.
export async function getActiveCompetition(): Promise<Competition> {
    const competitions = await getCompetitions();
    return competitions.find((competition) => competition.status === "en_curso") ?? competitions[0];
}

export async function findCompetition(season: string, slug: string): Promise<Competition | null> {
    return (await getCompetitions()).find((competition) => competition.season === season && competition.slug === slug) ?? null;
}

export async function findCompetitionByScope(season: string, phase: string, group: string): Promise<Competition | null> {
    return (await getCompetitions()).find((competition) => competition.season === season && competition.phase === phase && competition.group === group) ?? null;
}

export async function getSeasonCompetitions(season: string): Promise<Competition[]> {
    return (await getCompetitions()).filter((competition) => competition.season === season);
}

export async function getSeasons(): Promise<string[]> {
    return [...new Set((await getCompetitions()).map((competition) => competition.season))];
}
