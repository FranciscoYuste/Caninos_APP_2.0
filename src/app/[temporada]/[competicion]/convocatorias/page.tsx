import type { Metadata } from "next";
import { CallupsSection } from "@/components/team/callups-section";
import { getCompetitionData, requireCompetition, type CompetitionParams } from "@/lib/competition-page";
import { pageMetadata } from "@/lib/metadata";
import { getEmptyMessage } from "@/lib/team-data";

export async function generateMetadata({ params }: { params: CompetitionParams }): Promise<Metadata> {
    const competition = await requireCompetition(params);
    return pageMetadata(`Convocatorias · ${competition.name}`, "Quién fue convocado y quién no en cada partido.");
}

export default async function CallupsPage({ params }: { params: CompetitionParams }) {
    const competition = await requireCompetition(params);
    const data = await getCompetitionData(competition);
    return <CallupsSection results={data?.results ?? []} emptyMessage={getEmptyMessage(data)} />;
}
