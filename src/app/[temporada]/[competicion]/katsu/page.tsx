import type { Metadata } from "next";
import { KatsuSection } from "@/components/team/katsu-section";
import { getCompetitionData, requireCompetition, type CompetitionParams } from "@/lib/competition-page";
import { pageMetadata } from "@/lib/metadata";

export async function generateMetadata({ params }: { params: CompetitionParams }): Promise<Metadata> {
    const competition = await requireCompetition(params);
    return pageMetadata(`Jugador KATSU · ${competition.name}`, "Un reconocimiento especial en cada partido. Pulsa la carta para descubrirlo.");
}

export default async function KatsuPage({ params }: { params: CompetitionParams }) {
    const competition = await requireCompetition(params);
    const data = await getCompetitionData(competition);
    return <KatsuSection katsuCards={data?.katsuCards ?? []} season={competition.season} />;
}
