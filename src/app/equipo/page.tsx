import { StandingsSection } from "@/components/team/standings-section";
import { ACTIVE_SEASON } from "@/lib/config";
import { pageMetadata } from "@/lib/metadata";
import { getEmptyMessage, getTeamData } from "@/lib/team-data";

export const metadata = pageMetadata("Clasificación y partidos", `Clasificación, calendario y resultados de la temporada ${ACTIVE_SEASON}.`);

export default async function StandingsPage() {
    const data = await getTeamData();
    return <StandingsSection table={data?.table ?? []} results={data?.results ?? []} roundMatches={data?.roundMatches ?? []} emptyMessage={getEmptyMessage(data)} />;
}
