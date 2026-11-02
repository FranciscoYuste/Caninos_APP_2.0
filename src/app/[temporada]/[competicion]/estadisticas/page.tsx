import type { Metadata } from "next";
import { StatsSection } from "@/components/team/stats-section";
import { getCompetitionData, requireCompetition, type CompetitionParams } from "@/lib/competition-page";
import { pageMetadata } from "@/lib/metadata";

export async function generateMetadata({ params }: { params: CompetitionParams }): Promise<Metadata> {
    const competition = await requireCompetition(params);
    return pageMetadata(`Estadísticas · ${competition.name}`, "Goles, asistencias, tarjetas y convocatorias de cada jugador.");
}

export default async function StatsPage({ params }: { params: CompetitionParams }) {
    const competition = await requireCompetition(params);
    const data = await getCompetitionData(competition);
    return <StatsSection squad={data?.squad ?? []} season={competition.season} />;
}
