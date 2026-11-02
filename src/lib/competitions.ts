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

// Tipo de competición de cada fase, para los selectores del admin.
export const PHASE_LABELS: Record<CompetitionPhase, string> = {
    campeon_invierno: "Liga de invierno",
    liga_campeones: "Liga de ascenso",
    clasificacion_descensos: "Liga de descenso",
    copa_grupos: "Copa · fase de grupos",
    copa_campeon: "Copa · cuadro de campeón",
    copa_consolacion: "Copa · cuadro de consolación",
};
