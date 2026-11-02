import type { CompetitionPhase } from "@/lib/competitions";

// Punto único para cambiar de temporada o de competición activa.
export const FEATURED_TEAM = "Bayern D.L.Caninos";
export const ACTIVE_SEASON = "2026-2027";
export const ACTIVE_PHASE: CompetitionPhase = "campeon_invierno";

// Variante con raya larga usada en las cartas ("2026—2027").
export const ACTIVE_SEASON_LABEL = ACTIVE_SEASON.replace("-", "—");

export function isFeaturedMatch(match: { equipo_local: string; equipo_visitante: string }): boolean {
    return match.equipo_local === FEATURED_TEAM || match.equipo_visitante === FEATURED_TEAM;
}
