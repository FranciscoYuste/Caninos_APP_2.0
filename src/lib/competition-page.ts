import { notFound } from "next/navigation";
import { findCompetition, type Competition } from "@/lib/competition-data";
import { getTeamData } from "@/lib/team-data";

export type CompetitionParams = Promise<{ temporada: string; competicion: string }>;

// Competición de la ruta /[temporada]/[competicion]; si no existe, 404.
export async function requireCompetition(params: CompetitionParams): Promise<Competition> {
    const { temporada, competicion } = await params;
    const competition = await findCompetition(temporada, competicion);
    if (!competition) notFound();
    return competition;
}

export function getCompetitionData(competition: Competition) {
    return getTeamData(competition.season, competition.phase, competition.group);
}
