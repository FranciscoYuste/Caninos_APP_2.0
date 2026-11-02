import type { Metadata } from "next";
import { PlayersSection } from "@/components/team/players-section";
import { getCompetitionData, requireCompetition, type CompetitionParams } from "@/lib/competition-page";
import { pageMetadata } from "@/lib/metadata";
import { getEmptyMessage } from "@/lib/team-data";

export async function generateMetadata({ params }: { params: CompetitionParams }): Promise<Metadata> {
    const competition = await requireCompetition(params);
    return pageMetadata(`Jugadores · ${competition.name}`, "La plantilla en el campo: elige un jugador para ver su ficha y sus estadísticas.");
}

export default async function PlayersPage({ params }: { params: CompetitionParams }) {
    const competition = await requireCompetition(params);
    const data = await getCompetitionData(competition);
    return <PlayersSection squad={data?.squad ?? []} emptyMessage={getEmptyMessage(data)} season={competition.season} />;
}
