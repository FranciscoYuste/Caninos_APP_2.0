import type { Metadata } from "next";
import { IntroOverlay } from "@/components/intro-overlay";
import { CompetitionFrame } from "@/components/team/competition-frame";
import { StandingsSection } from "@/components/team/standings-section";
import { getActiveCompetition } from "@/lib/competition-data";
import { competitionPath } from "@/lib/competition-paths";
import { getCompetitionData } from "@/lib/competition-page";
import { FEATURED_TEAM } from "@/lib/config";
import { getEmptyMessage } from "@/lib/team-data";

export const metadata: Metadata = { title: { absolute: FEATURED_TEAM } };

// Portada: la competición en curso con la animación de entrada encima. Al terminar la intro,
// la barra de direcciones pasa a la dirección real de la competición.
export default async function HomePage() {
    const competition = await getActiveCompetition();
    const data = await getCompetitionData(competition);
    return (
        <>
            <CompetitionFrame competition={competition}>
                <StandingsSection table={data?.table ?? []} results={data?.results ?? []} roundMatches={data?.roundMatches ?? []} emptyMessage={getEmptyMessage(data)} season={competition.season} competitionName={competition.name} />
            </CompetitionFrame>
            <IntroOverlay targetPath={competitionPath(competition)} />
        </>
    );
}
