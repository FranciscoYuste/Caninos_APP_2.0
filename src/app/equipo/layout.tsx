import type { ReactNode } from "react";
import { TeamShell } from "@/components/team/team-shell";
import { FEATURED_TEAM } from "@/lib/config";
import { getTeamData } from "@/lib/team-data";
import { recentForm } from "@/lib/team-form";

export default async function TeamLayout({ children }: { children: ReactNode }) {
    const data = await getTeamData();
    const nextMatch = data?.results.find((match) => match.status === "next");
    return (
        <TeamShell
            teamPosition={data?.table.find((team) => team.name === FEATURED_TEAM)?.position}
            nextMatch={nextMatch ? { id: nextMatch.key, date: nextMatch.date, startsAt: nextMatch.startsAt } : undefined}
            teamForm={recentForm(data?.roundMatches ?? [], FEATURED_TEAM)}
        >
            {children}
        </TeamShell>
    );
}
