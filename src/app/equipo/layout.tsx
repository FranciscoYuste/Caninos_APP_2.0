import type { ReactNode } from "react";
import { TeamShell } from "@/components/team/team-shell";
import { FEATURED_TEAM } from "@/lib/config";
import { getTeamData } from "@/lib/team-data";

export default async function TeamLayout({ children }: { children: ReactNode }) {
    const data = await getTeamData();
    return (
        <TeamShell
            teamPosition={data?.table.find((team) => team.name === FEATURED_TEAM)?.position}
            nextMatchDate={data?.results.find((match) => match.status === "next")?.date}
        >
            {children}
        </TeamShell>
    );
}
