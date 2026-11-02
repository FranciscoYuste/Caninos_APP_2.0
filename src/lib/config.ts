// Equipo protagonista de la web. Las temporadas y competiciones viven en la tabla competiciones.
export const FEATURED_TEAM = "Bayern D.L.Caninos";

export function isFeaturedMatch(match: { equipo_local: string; equipo_visitante: string }): boolean {
    return match.equipo_local === FEATURED_TEAM || match.equipo_visitante === FEATURED_TEAM;
}
