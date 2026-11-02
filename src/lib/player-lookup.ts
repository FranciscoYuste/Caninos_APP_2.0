import { cache } from "react";
import { getActiveCompetition, getCompetitions, type Competition } from "@/lib/competition-data";
import { getCompetitionData } from "@/lib/competition-page";
import type { Player } from "@/lib/team-types";

export type PlayerCompetitionSummary = { competition: Competition; goals: number; assists: number; games: number };

// Ficha de un jugador: la de la competición en curso (o la más reciente en la que aparece)
// y un resumen de cada competición de esa temporada en la que ha jugado.
export const findPlayerContext = cache(async (id: string) => {
    const [active, competitions] = await Promise.all([getActiveCompetition(), getCompetitions()]);
    const candidates = [active, ...competitions.filter((item) => item.id !== active.id)].filter((item) => item.status !== "pendiente");
    for (const competition of candidates) {
        const player = (await getCompetitionData(competition))?.squad.find((item) => item.id === id);
        if (!player) continue;
        const seasonCompetitions = competitions.filter((item) => item.season === competition.season && item.status !== "pendiente");
        const summaries: PlayerCompetitionSummary[] = [];
        for (const item of seasonCompetitions) {
            const entry: Player | undefined = (await getCompetitionData(item))?.squad.find((candidate) => candidate.id === id);
            if (entry && (entry.games || entry.goals || entry.assists || item.id === competition.id)) {
                summaries.push({ competition: item, goals: entry.goals, assists: entry.assists, games: entry.games });
            }
        }
        return { competition, player, summaries };
    }
    return null;
});
