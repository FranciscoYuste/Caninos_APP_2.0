import type { Metadata } from "next";
import { InjuriesSection } from "@/components/team/injuries-section";
import { getCompetitionData, requireCompetition, type CompetitionParams } from "@/lib/competition-page";
import { pageMetadata } from "@/lib/metadata";

export async function generateMetadata({ params }: { params: CompetitionParams }): Promise<Metadata> {
    await requireCompetition(params);
    return pageMetadata("Lesionados", "Parte médico del equipo.");
}

export default async function InjuriesPage({ params }: { params: CompetitionParams }) {
    const competition = await requireCompetition(params);
    const data = await getCompetitionData(competition);
    return <InjuriesSection squad={data?.squad ?? []} />;
}
