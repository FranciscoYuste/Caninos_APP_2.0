// Rutas públicas de una competición. Se usa en servidor y en navegador.
export const TEAM_SECTIONS = ["jugadores", "convocatorias", "estadisticas", "katsu", "fantasy", "lesionados"] as const;
export type TeamSection = typeof TEAM_SECTIONS[number];

export function competitionPath(competition: { season: string; slug: string }, section?: TeamSection): string {
    return `/${competition.season}/${competition.slug}${section ? `/${section}` : ""}`;
}

export function isTeamSection(value: string): value is TeamSection {
    return (TEAM_SECTIONS as readonly string[]).includes(value);
}
