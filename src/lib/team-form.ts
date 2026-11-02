import type { RoundMatchItem } from "@/lib/team-types";

export type FormResult = "V" | "E" | "D";

// Últimos resultados de un equipo (victoria, empate, derrota), del más antiguo al más reciente.
export function recentForm(matches: RoundMatchItem[], team: string, count = 5): FormResult[] {
    return matches
        .filter((match) => (match.home === team || match.away === team) && match.homeGoals !== null && match.awayGoals !== null)
        .sort((first, second) => first.jornada - second.jornada)
        .slice(-count)
        .map((match) => {
            const own = match.home === team ? match.homeGoals! : match.awayGoals!;
            const rival = match.home === team ? match.awayGoals! : match.homeGoals!;
            return own > rival ? "V" : own === rival ? "E" : "D";
        });
}
