import type { Metadata } from "next";
import { StandingsSection } from "@/components/team/standings-section";
import { getCompetitionData, requireCompetition, type CompetitionParams } from "@/lib/competition-page";
import { pageMetadata } from "@/lib/metadata";
import { getEmptyMessage } from "@/lib/team-data";

export async function generateMetadata({ params }: { params: CompetitionParams }): Promise<Metadata> {
    const competition = await requireCompetition(params);
    return pageMetadata(`${competition.name} ${competition.season}`, `Clasificación, calendario y resultados de ${competition.name} ${competition.season}.`);
}

export default async function StandingsPage({ params }: { params: CompetitionParams }) {
    const competition = await requireCompetition(params);
    const data = await getCompetitionData(competition);
    return <StandingsSection table={data?.table ?? []} results={data?.results ?? []} roundMatches={data?.roundMatches ?? []} emptyMessage={getEmptyMessage(data)} season={competition.season} competitionName={competition.name} />;
}
