import type { ReactNode } from "react";
import { TeamShell, type ShellCompetition } from "@/components/team/team-shell";
import { getCompetitions, type Competition } from "@/lib/competition-data";
import { competitionPath, type TeamSection } from "@/lib/competition-paths";
import { getCompetitionData } from "@/lib/competition-page";
import { FEATURED_TEAM } from "@/lib/config";
import { recentForm } from "@/lib/team-form";

function toShell(competition: Competition): ShellCompetition {
    return { season: competition.season, slug: competition.slug, name: competition.name, status: competition.status };
}

// Cabecera, selector de competición y menú de secciones para una competición concreta.
export async function CompetitionFrame({ competition, activeSection, children }: { competition: Competition; activeSection?: "competition" | TeamSection; children: ReactNode }) {
    const [data, competitions] = await Promise.all([getCompetitionData(competition), getCompetitions()]);
    const nextMatch = data?.results.find((match) => match.status === "next");
    // Cada temporada enlaza a su competición en curso o, si no hay, a la primera.
    const seasons = [...new Set(competitions.map((item) => item.season))].map((season) => {
        const ofSeason = competitions.filter((item) => item.season === season);
        return { season, href: competitionPath(ofSeason.find((item) => item.status === "en_curso") ?? ofSeason[0]) };
    });

    return (
        <TeamShell
            competition={toShell(competition)}
            competitions={competitions.filter((item) => item.season === competition.season).map(toShell)}
            seasons={seasons}
            teamPosition={data?.table.find((team) => team.name === FEATURED_TEAM)?.position}
            nextMatch={nextMatch ? { id: nextMatch.key, date: nextMatch.date, startsAt: nextMatch.startsAt } : undefined}
            teamForm={recentForm(data?.roundMatches ?? [], FEATURED_TEAM)}
            activeSection={activeSection}
        >
            {children}
        </TeamShell>
    );
}
