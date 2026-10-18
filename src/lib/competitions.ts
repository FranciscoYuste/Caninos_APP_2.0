export const COMPETITION_PHASES = [
    "campeon_invierno",
    "liga_campeones",
    "clasificacion_descensos",
    "copa_grupos",
    "copa_campeon",
    "copa_consolacion",
] as const;

export type CompetitionPhase = typeof COMPETITION_PHASES[number];

export function isCompetitionPhase(value: string): value is CompetitionPhase {
    return COMPETITION_PHASES.includes(value as CompetitionPhase);
}

export function competitionSlug(phase: CompetitionPhase): string {
    return {
        campeon_invierno: "liga-invierno",
        liga_campeones: "liga-ascenso",
        clasificacion_descensos: "liga-descenso",
        copa_grupos: "copa-grupos",
        copa_campeon: "copa-campeon",
        copa_consolacion: "copa-consolacion",
    }[phase];
}
