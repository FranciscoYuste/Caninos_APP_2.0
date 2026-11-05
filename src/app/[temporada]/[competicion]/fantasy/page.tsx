import type { Metadata } from "next";
import { FantasySection } from "@/components/team/fantasy-section";
import { requireCompetition, type CompetitionParams } from "@/lib/competition-page";
import { getFantasyRanking } from "@/lib/fantasy-data";
import { pageMetadata } from "@/lib/metadata";

export async function generateMetadata({ params }: { params: CompetitionParams }): Promise<Metadata> {
    const competition = await requireCompetition(params);
    return pageMetadata(`Fantasy · ${competition.name}`, "Ranking de puntos de los jugadores del Bayern, partido a partido.");
}

export default async function FantasyPage({ params }: { params: CompetitionParams }) {
    const competition = await requireCompetition(params);
    const ranking = await getFantasyRanking(competition.season, competition.phase, competition.group);
    return <FantasySection ranking={ranking} season={competition.season} />;
}
